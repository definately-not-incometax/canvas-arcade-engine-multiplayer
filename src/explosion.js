export class Explosion {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.damage = config.damage;
    this.life = 0.22;
    this.maxLife = 0.22;
    this.isAlive = true;
  }

  applyDamage(enemies) {
    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }

      const enemyCenterX = enemy.x + enemy.width * 0.5;
      const enemyCenterY = enemy.y + enemy.height * 0.5;
      const distance = Math.hypot(enemyCenterX - this.x, enemyCenterY - this.y);

      if (distance <= this.radius) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  update(_input, deltaTime) {
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.isAlive = false;
    }
  }

  draw(context) {
    const normalizedLife = Math.max(0, this.life / this.maxLife);
    context.save();
    context.fillStyle = `rgba(251, 146, 60, ${normalizedLife * 0.4})`;
    context.beginPath();
    context.arc(this.x, this.y, this.radius * (1 - normalizedLife * 0.2), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}
