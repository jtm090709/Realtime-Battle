const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const lobby = document.getElementById('lobby');
const joinBtn = document.getElementById('joinBtn');
const nicknameInput = document.getElementById('nickname');
const roomCodeInput = document.getElementById('roomCode');
const gameDiv = document.getElementById('game');
const playerListDiv = document.getElementById('playerList');
const killLogDiv = document.getElementById('killLog');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');

let players = {};
let bullets = [];
let me = { x: 400, y: 300 };
let keys = {};
let speed = 5;

joinBtn.onclick = () => {
  const name = nicknameInput.value.trim();
  const room = roomCodeInput.value.trim().toUpperCase();
  if (!name || !room) return alert('닉네임과 방 코드를 입력하세요!');
  socket.emit('joinRoom', { nickname: name, roomCode: room });
  lobby.style.display = 'none';
  gameDiv.style.display = 'flex';
};

const shootSound = new Audio('/sounds/bullet.mp3');
const hitSound = new Audio('/sounds/hit.mp3');

// 마우스 클릭 → 총알 발사
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const dx = mx - me.x;
  const dy = my - me.y;
  const angle = Math.atan2(dy, dx);
  socket.emit('shoot', { x: me.x, y: me.y, dx: Math.cos(angle), dy: Math.sin(angle) });
  shootSound.currentTime = 0;
  shootSound.play();
});

// 스킬 입력
window.addEventListener("keydown", (e) => {
  if (e.key === "Shift") socket.emit("skill", "dash");
  if (e.key.toLowerCase() === "e") socket.emit("skill", "explosion");
  if (e.key.toLowerCase() === "q") socket.emit("skill", "heal");
});

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const msg = chatInput.value.trim();
    if (msg) socket.emit('chat', msg);
    chatInput.value = '';
  }
});

socket.on('chatMessage', (msg) => {
  const p = document.createElement('p');
  p.textContent = msg;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on('playerList', (list) => {
  playerListDiv.innerHTML = '<b>👥 접속자</b><br>' + list.map(p => p.name).join('<br>');
});

socket.on('killLog', ({ killer, victim }) => {
  const div = document.createElement('div');
  div.className = 'kill-item';
  div.textContent = `${killer} ▶ ${victim}`;
  killLogDiv.appendChild(div);
  setTimeout(() => div.remove(), 3000);
  hitSound.play();
});

socket.on('update', (data) => {
  players = data.players;
  bullets = data.bullets;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let id in players) {
    const p = players[id];
    if (!p.alive) continue;
    ctx.fillStyle = id === socket.id ? 'lime' : 'red';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`${p.name} (${p.hp})`, p.x - 25, p.y - 15);
  }

  bullets.forEach((b) => {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}
draw();

setInterval(() => {
  if (keys['w']) me.y -= speed;
  if (keys['s']) me.y += speed;
  if (keys['a']) me.x -= speed;
  if (keys['d']) me.x += speed;
  socket.emit('move', { x: me.x, y: me.y });
}, 1000