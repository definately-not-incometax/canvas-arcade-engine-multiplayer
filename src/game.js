import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Camera } from './camera.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { Explosion } from './explosion.js';

export class Game {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.context = context;
    this.width = 2000;
    this.floorCount = 12;
    this.floorSpacing = 360;
    this.viewWidth = 1280;
    this.viewHeight = 720;
    this.groundHeight = 120;
    this.height = this.floorCount * this.floorSpacing + 720;
    this.groundY = this.height - this.groundHeight;
    this.platforms = this.createTowerPlatforms();
    this.states = {
      PLAYING: 'PLAYING',
      GAME_OVER: 'GAME_OVER'
    };
    this.state = this.states.PLAYING;
    this.score = 0;

    this.settings = {
      showGrid: true,
      showTrail: true,
      showCameraDebug: false,
      enableScreenShake: true
    };

    this.viewport = {
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
      scale: 1
    };

    this.input = new InputHandler(this.canvas);
    this.player = new Player(this);
    this.enemies = this.createEnemies();
    this.bullets = [];
    this.explosions = [];
    this.entities = [this.player, ...this.enemies];
    this.camera = new Camera(
      this.width,
      this.height,
      this.viewWidth,
      this.viewHeight,
      this.player
    );
  }

  update(deltaTime) {
    if (this.state === this.states.GAME_OVER) {
      if (this.input.isJustPressed('r')) {
        this.restart();
      }
    } else {
      this.player.update(this.input, deltaTime);

      for (const enemy of this.enemies) {
        enemy.update(this.input, deltaTime);
      }

      this.updateBullets(deltaTime);
      this.updateExplosions(deltaTime);
      this.removeDefeatedEnemies();
      this.checkEnemyCollisions();
      this.score += deltaTime * 10;
    }

    if (this.input.isJustPressed('g')) {
      this.settings.showGrid = !this.settings.showGrid;
    }

    if (this.input.isJustPressed('t')) {
      this.settings.showTrail = !this.settings.showTrail;
    }

    if (this.input.isJustPressed('b')) {
      this.settings.showCameraDebug = !this.settings.showCameraDebug;
    }

    if (this.settings.enableScreenShake && this.input.isJustPressed('h')) {
      this.camera.shake(12, 0.2);
    }

    this.entities = [this.player, ...this.enemies, ...this.bullets, ...this.explosions];
    this.camera.update(deltaTime);
    this.input.endFrame();
  }

  draw() {
    const { context, canvas } = this;
    const cameraPosition = this.camera.getRenderPosition();

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#020617';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.translate(this.viewport.x, this.viewport.y);
    context.scale(this.viewport.scale, this.viewport.scale);
    context.translate(-cameraPosition.x, -cameraPosition.y);
    this.drawWorld(context);
    context.restore();

    this.drawUI(context);
  }

  handleResize() {
    const scale = Math.min(
      this.canvas.width / this.viewWidth,
      this.canvas.height / this.viewHeight
    );
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const viewportWidth = this.viewWidth * safeScale;
    const viewportHeight = this.viewHeight * safeScale;

    this.viewport.scale = safeScale;
    this.viewport.width = viewportWidth;
    this.viewport.height = viewportHeight;
    this.viewport.x = (this.canvas.width - viewportWidth) * 0.5;
    this.viewport.y = (this.canvas.height - viewportHeight) * 0.5;

    this.camera.resize(this.viewWidth, this.viewHeight);
    this.player.clampToBounds();
  }

  drawWorld(context) {
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, this.width, this.height);

    if (this.settings.showGrid) {
      this.drawGrid(context);
    }

    this.drawGround(context);
    this.drawPlatforms(context);

    for (const entity of this.entities) {
      entity.draw(context);
    }

    if (this.settings.showCameraDebug) {
      this.drawCameraDebug(context);
    }
  }

  drawGrid(context) {
    const gridSize = 100;

    context.save();
    context.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    context.lineWidth = 1;

    for (let x = 0; x <= this.width; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
      context.stroke();
    }

    for (let y = 0; y <= this.height; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }

    context.restore();
  }

  drawGround(context) {
    context.save();
    context.fillStyle = '#1e293b';
    context.fillRect(0, this.groundY, this.width, this.groundHeight);
    context.restore();
  }

  drawPlatforms(context) {
    context.save();

    for (const platform of this.platforms) {
      context.fillStyle = platform.isFloor ? '#334155' : '#475569';
      context.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    context.restore();
  }

  drawCameraDebug(context) {
    const center = this.camera.getCenter();
    const playerCenterX = this.player.x + this.player.width * 0.5;
    const playerCenterY = this.player.y + this.player.height * 0.5;
    const debugBoxSize = 28;

    context.save();
    context.strokeStyle = 'rgba(248, 250, 252, 0.7)';
    context.lineWidth = 2;
    context.strokeRect(
      center.x - debugBoxSize * 0.5,
      center.y - debugBoxSize * 0.5,
      debugBoxSize,
      debugBoxSize
    );

    context.beginPath();
    context.moveTo(center.x - 16, center.y);
    context.lineTo(center.x + 16, center.y);
    context.moveTo(center.x, center.y - 16);
    context.lineTo(center.x, center.y + 16);
    context.stroke();

    context.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    context.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);

    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(playerCenterX, playerCenterY);
    context.stroke();
    context.restore();
  }

  drawUI(context) {
    context.save();
    context.fillStyle = '#e2e8f0';
    context.font = 'bold 28px sans-serif';
    context.textAlign = 'left';
    context.fillText(`Score: ${Math.floor(this.score)}`, 24, 40);
    context.fillText(`Weapon: ${this.player.weapon.name}`, 24, 78);
    context.fillText(`Floor: ${this.getCurrentFloor()}`, 24, 116);

    if (this.state === this.states.GAME_OVER) {
      context.textAlign = 'center';
      context.fillStyle = '#f8fafc';
      context.font = 'bold 56px sans-serif';
      context.fillText('GAME OVER', this.canvas.width * 0.5, this.canvas.height * 0.5 - 10);
      context.font = '24px sans-serif';
      context.fillText('Press R to Restart', this.canvas.width * 0.5, this.canvas.height * 0.5 + 36);
    }

    context.restore();
  }

  createTowerPlatforms() {
    const platforms = [];

    for (let floor = 0; floor < this.floorCount; floor += 1) {
      const floorY = this.groundY - floor * this.floorSpacing - 100;
      platforms.push({
        x: 140,
        y: floorY,
        width: 560,
        height: 20,
        floor,
        isFloor: true
      });
      platforms.push({
        x: 980,
        y: floorY,
        width: 560,
        height: 20,
        floor,
        isFloor: true
      });
      platforms.push({
        x: 660,
        y: floorY - 140,
        width: 240,
        height: 20,
        floor,
        isFloor: false
      });
    }

    return platforms;
  }

  createEnemies() {
    const enemies = [];

    for (let floor = 0; floor < this.floorCount; floor += 1) {
      const leftPlatform = this.platforms.find((platform) => platform.floor === floor && platform.x === 140);
      const rightPlatform = this.platforms.find((platform) => platform.floor === floor && platform.x === 980);

      if (leftPlatform) {
        enemies.push(new Enemy({
          game: this,
          x: leftPlatform.x + 120,
          y: leftPlatform.y - 50,
          width: 50,
          height: 50,
          speed: 100 + floor * 4,
          minX: leftPlatform.x + 20,
          maxX: leftPlatform.x + leftPlatform.width - 20,
          patrolPlatform: leftPlatform,
          detectionRange: 320,
          health: 40 + floor * 10
        }));
      }

      if (rightPlatform) {
        enemies.push(new Enemy({
          game: this,
          x: rightPlatform.x + 180,
          y: rightPlatform.y - 50,
          width: 50,
          height: 50,
          speed: 110 + floor * 4,
          minX: rightPlatform.x + 20,
          maxX: rightPlatform.x + rightPlatform.width - 20,
          patrolPlatform: rightPlatform,
          detectionRange: 320,
          health: 40 + floor * 10
        }));
      }
    }

    return enemies;
  }

  createBullet(config) {
    this.bullets.push(new Bullet(config));
  }

  createExplosion(config) {
    const explosion = new Explosion(config);
    explosion.applyDamage(this.enemies);
    this.explosions.push(explosion);
    this.camera.shake(18, 0.24);
  }

  updateBullets(deltaTime) {
    for (const bullet of this.bullets) {
      bullet.update(this.input, deltaTime);

      if (!bullet.isAlive) {
        continue;
      }

      if (this.isBulletOutOfBounds(bullet) || this.isBulletHittingPlatform(bullet)) {
        this.resolveBulletImpact(bullet, null);
        continue;
      }

      for (const enemy of this.enemies) {
        if (!enemy.isAlive) {
          continue;
        }

        const intersects =
          bullet.x < enemy.x + enemy.width &&
          bullet.x + bullet.width > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + bullet.height > enemy.y;

        if (intersects) {
          this.resolveBulletImpact(bullet, enemy);
          break;
        }
      }
    }

    this.bullets = this.bullets.filter((bullet) => bullet.isAlive);
  }

  updateExplosions(deltaTime) {
    for (const explosion of this.explosions) {
      explosion.update(this.input, deltaTime);
    }

    this.explosions = this.explosions.filter((explosion) => explosion.isAlive);
  }

  resolveBulletImpact(bullet, enemy) {
    if (!bullet.isAlive) {
      return;
    }

    bullet.isAlive = false;

    if (bullet.weaponType === 'rpg') {
      this.createExplosion({
        x: bullet.x + bullet.width * 0.5,
        y: bullet.y + bullet.height * 0.5,
        radius: 100,
        damage: bullet.damage
      });
      return;
    }

    if (enemy) {
      enemy.takeDamage(bullet.damage);
    }
  }

  isBulletOutOfBounds(bullet) {
    return (
      bullet.x + bullet.width < 0 ||
      bullet.x > this.width ||
      bullet.y + bullet.height < 0 ||
      bullet.y > this.height
    );
  }

  isBulletHittingPlatform(bullet) {
    const solidSurfaces = [
      ...this.platforms,
      { x: 0, y: this.groundY, width: this.width, height: this.groundHeight }
    ];

    return solidSurfaces.some((platform) => {
      return (
        bullet.x < platform.x + platform.width &&
        bullet.x + bullet.width > platform.x &&
        bullet.y < platform.y + platform.height &&
        bullet.y + bullet.height > platform.y
      );
    });
  }

  removeDefeatedEnemies() {
    this.enemies = this.enemies.filter((enemy) => enemy.isAlive);
  }

  checkEnemyCollisions() {
    const playerBounds = this.player.getBounds();

    for (const enemy of this.enemies) {
      const enemyBounds = enemy.getBounds();
      const intersects =
        playerBounds.x < enemyBounds.x + enemyBounds.width &&
        playerBounds.x + playerBounds.width > enemyBounds.x &&
        playerBounds.y < enemyBounds.y + enemyBounds.height &&
        playerBounds.y + playerBounds.height > enemyBounds.y;

      if (intersects) {
        this.player.die();
        this.state = this.states.GAME_OVER;
        return;
      }
    }
  }

  restart() {
    this.score = 0;
    this.state = this.states.PLAYING;
    this.platforms = this.createTowerPlatforms();
    this.player.reset();
    this.enemies = this.createEnemies();
    this.bullets = [];
    this.explosions = [];
    this.entities = [this.player, ...this.enemies];
    this.camera.setTarget(this.player);
    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.clampToWorld();
  }

  getMouseWorldPosition() {
    const scale = this.viewport.scale || 1;

    return {
      x: (this.input.mouseX - this.viewport.x) / scale + this.camera.x,
      y: (this.input.mouseY - this.viewport.y) / scale + this.camera.y
    };
  }

  getCurrentFloor() {
    const distanceFromGround = this.groundY - this.player.y;
    return Math.max(1, Math.min(this.floorCount, Math.floor(distanceFromGround / this.floorSpacing) + 1));
  }
}
