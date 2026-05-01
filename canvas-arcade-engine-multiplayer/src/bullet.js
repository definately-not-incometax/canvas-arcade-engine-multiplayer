export class Bullet {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.damage = config.damage;
    this.weaponType = config.weaponType;
    this.width = config.size;
    this.height = config.size;
    this.color = config.color;
    this.isAlive = true;
  }

  update(_input, deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}
