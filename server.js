const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {}; // { roomCode: { players: {}, bullets: [] } }

// 🔹 방 생성 또는 참가
function getOrCreateRoom(roomCode) {
  if (!rooms[roomCode]) {
    rooms[roomCode] = { players: {}, bullets: [] };
  }
  return rooms[roomCode];
}

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  let currentRoom = null;

  socket.on("joinRoom", ({ nickname, roomCode }) => {
    currentRoom = getOrCreateRoom(roomCode);
    socket.join(roomCode);

    currentRoom.players[socket.id] = {
      id: socket.id,
      name: nickname,
      x: 400 + Math.random() * 200,
      y: 300 + Math.random() * 200,
      hp: 100,
      alive: true,
      kills: 0,
    };

    io.to(roomCode).emit("playerList", Object.values(currentRoom.players));
  });

  socket.on("move", (data) => {
    const player = currentRoom?.players[socket.id];
    if (!player || !player.alive) return;
    player.x = data.x;
    player.y = data.y;
  });

  socket.on("shoot", (bullet) => {
    if (!currentRoom) return;
    currentRoom.bullets.push({ ...bullet, owner: socket.id });
  });

  socket.on("chat", (msg) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentRoom.players[socket.id]) {
      delete currentRoom.players[socket.id];
      io.to(currentRoom).emit("playerList", Object.values(currentRoom.players));
    }
  });
});

// 🔁 게임 상태 업데이트 (모든 방 처리)
setInterval(() => {
  for (const [roomCode, room] of Object.entries(rooms)) {
    let { players, bullets } = room;

    bullets.forEach((b) => {
      b.x += b.dx * 10;
      b.y += b.dy * 10;

      for (let id in players) {
        const p = players[id];
        if (!p.alive) continue;
        const dist = Math.hypot(b.x - p.x, b.y - p.y);
        if (dist < 10 && b.owner !== id) {
          p.hp -= 25;
          if (p.hp <= 0) {
            p.alive = false;
            players[b.owner].kills++;
            io.to(roomCode).emit("killLog", {
              killer: players[b.owner].name,
              victim: p.name,
            });
            setTimeout(() => {
              p.alive = true;
              p.hp = 100;
              p.x = 400 + Math.random() * 200;
              p.y = 300 + Math.random() * 200;
            }, 3000);
          }
        }
      }
    });

    room.bullets = room.bullets.filter(
      (b) => b.x >= 0 && b.x <= 800 && b.y >= 0 && b.y <= 600
    );

    io.to(roomCode).emit("update", { players, bullets });
  }
}, 50);

server.listen(3000, () =>
  console.log("✅ 서버 실행 중: http://localhost:3000")
);
