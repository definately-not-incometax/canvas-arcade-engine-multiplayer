import { clamp, isColliding } from './utils.js';
import { Weapon } from './weapon.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.width = 60;
    this.height = 60;
    this.speed = 320;
    this.acceleration = 2000;
    this.friction = 1500;
    this.vx = 0;
    this.vy = 0;
    this.isOnGround = false;
    this.gravity = 1200;
    this.jumpForce = -612;
    this.jumpCount = 0;
    this.maxJumps = 3;
    this.maxFallSpeed = 1000;
    this.jumpCutMultiplier = 0.45;
    this.wallClimbBoost = -720;
    this.isAlive = true;
    this.isTouchingWallLeft = false;
    this.isTouchingWallRight = false;
    this.color = '#38bdf8';
    this.trail = [];
    this.maxTrailLength = 8;
    this.trailSpawnInterval = 0.05;
    this.trailTimer = 0;
    this.trailLifetime = 0.28;
    this.spawnX = 220;
    this.spawnY = this.game.groundY - this.height;
    this.weapon = new Weapon(this);
    this.reset();
  }

  update(input, deltaTime) {
    this.weapon.update(input, deltaTime);

    if (!this.isAlive) {
      return;
    }

    this.handleInput(input, deltaTime);
    this.applyGravity(deltaTime);
    this.applyPhysics(deltaTime);
    this.updateTrail(deltaTime);
    this.handleCombat(input);
  }

  handleInput(input, deltaTime) {
    let moveX = 0;

    if (input.isPressed('a') || input.isPressed('arrowleft')) {
      moveX -= 1;
    }

    if (input.isPressed('d') || input.isPressed('arrowright')) {
      moveX += 1;
    }

    if ((input.isJustPressed('w') || input.isJustPressed('space')) && this.jumpCount < this.maxJumps) {
      this.vy = this.jumpForce;
      this.isOnGround = false;
      this.jumpCount += 1;
    }

    if (input.getWheelDirection() < 0 && this.isTouchingWall()) {
      this.vy = Math.min(this.vy, this.wallClimbBoost);
      this.isOnGround = false;
    }

    const horizontalAcceleration = this.isOnGround ? this.acceleration : this.acceleration * 0.5;

    if (moveX !== 0) {
      this.vx += horizontalAcceleration * moveX * deltaTime;
    } else if (this.isOnGround) {
      const frictionStep = this.friction * deltaTime;

      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - frictionStep);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + frictionStep);
      }
    }

    if (!(input.isPressed('w') || input.isPressed('space')) && this.vy < 0) {
      this.vy *= this.jumpCutMultiplier;
    }

    this.vx = clamp(this.vx, -this.speed, this.speed);
    if (Math.abs(this.vx) < 1) {
      this.vx = 0;
    }
  }

  handleCombat(input) {
    if (!input.isMouseDown(0)) {
      return;
    }

    const mouseWorld = this.game.getMouseWorldPosition();
    const origin = {
      x: this.x + this.width * 0.5,
      y: this.y + this.height * 0.4
    };

    this.weapon.tryShoot(origin, mouseWorld);
  }

  applyGravity(deltaTime) {
    const gravityScale = this.vy > 0 ? 1.5 : 1;
    this.vy += this.gravity * gravityScale * deltaTime;
    this.vy = Math.min(this.vy, this.maxFallSpeed);
  }

  applyPhysics(deltaTime) {
    const previousX = this.x;
    const previousY = this.y;
    this.isTouchingWallLeft = false;
    this.isTouchingWallRight = false;

    this.x += this.vx * deltaTime;
    this.resolveHorizontalCollisions(previousX);

    this.y += this.vy * deltaTime;
    this.isOnGround = false;
    this.resolveVerticalCollisions(previousY);
    this.clampToBounds();
  }

  resolveHorizontalCollisions(previousX) {
    const previousRight = previousX + this.width;
    const previousLeft = previousX;
    const currentRight = this.x + this.width;
    const currentLeft = this.x;

    for (const platform of this.game.platforms) {
      const intersectsY =
        this.y < platform.y + platform.height &&
        this.y + this.height > platform.y;

      if (!intersectsY) {
        continue;
      }

      if (this.vx > 0 && previousRight <= platform.x && currentRight >= platform.x) {
        this.x = platform.x - this.width;
        this.isTouchingWallRight = true;
      } else if (
        this.vx < 0 &&
        previousLeft >= platform.x + platform.width &&
        currentLeft <= platform.x + platform.width
      ) {
        this.x = platform.x + platform.width;
        this.isTouchingWallLeft = true;
      }
    }
  }

  resolveVerticalCollisions(previousY) {
    const previousBottom = previousY + this.height;
    const previousTop = previousY;
    const currentBounds = this.getBounds();
    const solidSurfaces = [
      ...this.game.platforms,
      {
        x: 0,
        y: this.game.groundY,
        width: this.game.width,
        height: this.game.groundHeight
      }
    ];

    for (const platform of solidSurfaces) {
      const currentBottom = this.y + this.height;
      const currentTop = this.y;
      const isLanding =
        this.vy >= 0 &&
        previousBottom <= platform.y &&
        currentBottom >= platform.y &&
        isColliding(currentBounds, platform);

      if (isLanding) {
        this.vy = 0;
        this.isOnGround = true;
        this.jumpCount = 0;
        this.y = platform.y - this.height;
        return;
      }

      const hitUnderside =
        this.vy < 0 &&
        previousTop >= platform.y + platform.height &&
        currentTop <= platform.y + platform.height &&
        isColliding(currentBounds, platform);

      if (hitUnderside) {
        this.vy = 0;
        this.y = platform.y + platform.height;
        return;
      }
    }
  }

  updateTrail(deltaTime) {
    for (const segment of this.trail) {
      segment.life -= deltaTime;
    }

    this.trail = this.trail.filter((segment) => segment.life > 0);
    this.trailTimer += deltaTime;

    if ((this.vx !== 0 || this.vy !== 0) && this.trailTimer >= this.trailSpawnInterval) {
      this.trailTimer = 0;
      this.trail.push({
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        life: this.trailLifetime,
        maxLife: this.trailLifetime
      });

      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    }

    if (this.vx === 0 && this.vy === 0) {
      this.trailTimer = this.trailSpawnInterval;
    }
  }

  clampToBounds() {
    this.x = clamp(this.x, 0, this.game.width - this.width);
    this.y = clamp(this.y, 0, this.game.height - this.height);

    if (this.x <= 0) {
      this.isTouchingWallLeft = true;
    }

    if (this.x >= this.game.width - this.width) {
      this.isTouchingWallRight = true;
    }
  }

  die() {
    this.isAlive = false;
    this.vx = 0;
    this.vy = 0;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.isAlive = true;
    this.isOnGround = true;
    this.jumpCount = 0;
    this.trail = [];
    this.trailTimer = 0;
    this.weapon.cooldownTimer = 0;
    this.weapon.index = 0;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  isTouchingWall() {
    return this.isTouchingWallLeft || this.isTouchingWallRight;
  }

  draw(context) {
    if (this.game.settings.showTrail) {
      this.drawTrail(context);
    }

    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
    this.drawAimLine(context);
  }

  drawTrail(context) {
    context.save();

    for (const segment of this.trail) {
      const normalizedLife = segment.life / segment.maxLife;
      const alpha = normalizedLife * normalizedLife * 0.24;
      context.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      context.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    context.restore();
  }

  drawAimLine(context) {
    const mouseWorld = this.game.getMouseWorldPosition();
    const originX = this.x + this.width * 0.5;
    const originY = this.y + this.height * 0.4;

    context.save();
    context.strokeStyle = 'rgba(226, 232, 240, 0.28)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(originX, originY);
    context.lineTo(mouseWorld.x, mouseWorld.y);
    context.stroke();
    context.restore();
  }
}
