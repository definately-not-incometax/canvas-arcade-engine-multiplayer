export class Enemy {
  constructor(config) {
    this.game = config.game;
    this.startX = config.x;
    this.startY = config.y;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width ?? 50;
    this.height = config.height ?? 50;
    this.speed = config.speed ?? 120;
    this.direction = config.direction ?? 1;
    this.startDirection = this.direction;
    this.minX = config.minX ?? config.x - 100;
    this.maxX = config.maxX ?? config.x + 100;
    this.patrolPlatform = config.patrolPlatform ?? null;
    this.detectionRange = config.detectionRange ?? 280;
    this.maxHealth = config.health ?? 50;
    this.health = this.maxHealth;
    this.isAlive = true;
    this.color = '#ef4444';
  }

  update(_input, deltaTime) {
    if (!this.isAlive) {
      return;
    }

    const player = this.game?.player ?? null;
    if (player) {
      const sameLevel = Math.abs((player.y + player.height) - (this.y + this.height)) < 140;
      const closeEnough = Math.abs(player.x - this.x) < this.detectionRange;

      if (sameLevel && closeEnough) {
        this.direction = player.x < this.x ? -1 : 1;
      }
    }

    this.x += this.speed * this.direction * deltaTime;

    if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    } else if (this.x + this.width >= this.maxX) {
      this.x = this.maxX - this.width;
      this.direction = -1;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.isAlive = false;
    }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.direction = this.startDirection;
    this.health = this.maxHealth;
    this.isAlive = true;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  draw(context) {
    if (!this.isAlive) {
      return;
    }

    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);

    const healthRatio = Math.max(0, this.health / this.maxHealth);
    context.fillStyle = '#111827';
    context.fillRect(this.x, this.y - 10, this.width, 6);
    context.fillStyle = '#22c55e';
    context.fillRect(this.x, this.y - 10, this.width * healthRatio, 6);
  }
}
