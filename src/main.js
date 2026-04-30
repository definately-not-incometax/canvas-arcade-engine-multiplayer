import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const MAX_DELTA_TIME = 1 / 20;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
ctx.imageSmoothingEnabled = false;

const game = new Game(canvas, ctx);
let lastTime = 0;

function animate(timestamp) {
  if (lastTime === 0) {
    lastTime = timestamp;
  }

  const rawDeltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  const deltaTime = Math.min(rawDeltaTime, MAX_DELTA_TIME);

  game.update(deltaTime);
  game.draw();

  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  game.handleResize();
});

game.handleResize();
requestAnimationFrame(animate);
