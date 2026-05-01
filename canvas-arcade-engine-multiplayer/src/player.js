import { clamp, isColliding } from './utils.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.width = 52;
    this.height = 52;
    this.runSpeed = 460;
    this.runDirection = 1;
    this.vx = 0;
    this.vy = 0;
    this.isOnGround = false;
    this.gravity = 2100;
    this.jumpForce = -760;
    this.maxFallSpeed = 1500;
    this.jumpCutMultiplier = 0.58;
    this.isAlive = true;
    this.color = '#38bdf8';
    this.cameraFocusX = 0.36;
    this.cameraFocusY = 0.52;
    this.trail = [];
    this.maxTrailLength = 6;
    this.trailSpawnInterval = 0.04;
    this.trailTimer = 0;
    this.trailLifetime = 0.18;
    this.spawnX = 120;
    this.spawnY = 700;
    this.reset();
  }

  update(input, deltaTime) {
    if (!this.isAlive) {
      return;
    }

    this.handleInput(input);
    this.applyGravity(deltaTime);
    this.applyPhysics(deltaTime);
    this.updateTrail(deltaTime);
  }

  handleInput(input) {
    if (input.isPressed('a') || input.isPressed('arrowleft')) {
      this.runDirection = -1;
    }

    if (input.isPressed('d') || input.isPressed('arrowright')) {
      this.runDirection = 1;
    }

    if ((input.isJustPressed('w') || input.isJustPressed('space')) && this.isOnGround) {
      this.vy = this.jumpForce;
      this.isOnGround = false;
    }

    if (!(input.isPressed('w') || input.isPressed('space')) && this.vy < 0) {
      this.vy *= this.jumpCutMultiplier;
    }

    this.vx = this.runSpeed * this.runDirection;
  }

  applyGravity(deltaTime) {
    this.vy += this.gravity * deltaTime;
    this.vy = Math.min(this.vy, this.maxFallSpeed);
  }

  applyPhysics(deltaTime) {
    const previousX = this.x;
    const previousY = this.y;

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

    for (const platform of this.game.getSolidSurfaces()) {
      const intersectsY =
        this.y < platform.y + platform.height &&
        this.y + this.height > platform.y;

      if (!intersectsY) {
        continue;
      }

      if (this.vx > 0 && previousRight <= platform.x && currentRight >= platform.x) {
        this.x = platform.x - this.width;
      } else if (
        this.vx < 0 &&
        previousLeft >= platform.x + platform.width &&
        currentLeft <= platform.x + platform.width
      ) {
        this.x = platform.x + platform.width;
      }
    }
  }

  resolveVerticalCollisions(previousY) {
    const previousBottom = previousY + this.height;
    const previousTop = previousY;
    const currentBounds = this.getBounds();

    for (const platform of this.game.getSolidSurfaces()) {
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
  }

  clampToBounds() {
    this.x = clamp(this.x, 0, this.game.width - this.width);
    this.y = Math.max(0, this.y);
  }

  die() {
    this.isAlive = false;
    this.vx = 0;
    this.vy = 0;
  }

  reset(spawnPoint = null) {
    const nextSpawnX = spawnPoint?.x ?? this.spawnX;
    const nextSpawnY = spawnPoint?.y ?? this.spawnY;

    this.x = nextSpawnX;
    this.y = nextSpawnY;
    this.vx = this.runSpeed;
    this.vy = 0;
    this.runDirection = 1;
    this.isAlive = true;
    this.isOnGround = false;
    this.trail = [];
    this.trailTimer = 0;
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
    if (this.game.settings.showTrail) {
      this.drawTrail(context);
    }

    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }

  drawTrail(context) {
    context.save();

    for (const segment of this.trail) {
      const normalizedLife = segment.life / segment.maxLife;
      const alpha = normalizedLife * normalizedLife * 0.2;
      context.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      context.fillRect(segment.x, segment.y, segment.width, segment.height);
    }

    context.restore();
  }
}
