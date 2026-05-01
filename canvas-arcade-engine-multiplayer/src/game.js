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
    this.maxFloors = 12;
    this.floorSpacing = 360;
    this.viewWidth = 1280;
    this.viewHeight = 720;
    this.groundHeight = 120;
    this.height = this.maxFloors * this.floorSpacing + 720;
    this.groundY = this.height - this.groundHeight;
    this.states = {
      PLAYING: 'PLAYING',
      GAME_OVER: 'GAME_OVER',
      WIN: 'WIN'
    };
    this.state = this.states.PLAYING;
    this.score = 0;
    this.currentFloor = 1;
    this.lastCompletedFloor = 0;
    this.checkpointFloor = 1;

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
    this.floors = this.createTowerFloors();
    this.platforms = this.floors.flatMap((floor) => floor.platforms);
    this.player = new Player(this);
    this.enemies = this.floors.flatMap((floor) => floor.enemies);
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

    this.movePlayerToCheckpoint(this.checkpointFloor);
  }

  update(deltaTime) {
    if (this.state === this.states.GAME_OVER) {
      if (this.input.isJustPressed('r')) {
        this.restartFromCheckpoint();
      }
    } else if (this.state === this.states.WIN) {
      if (this.input.isJustPressed('r')) {
        this.restartRun();
      }
    } else {
      this.player.update(this.input, deltaTime);

      for (const enemy of this.enemies) {
        enemy.update(this.input, deltaTime);
      }

      this.updateBullets(deltaTime);
      this.updateExplosions(deltaTime);
      this.refreshFloorProgression();
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
    context.fillText(`Floor: ${Math.min(this.currentFloor, this.maxFloors)}/${this.maxFloors}`, 24, 116);
    context.fillText(`Enemies: ${this.getEnemiesRemainingOnCurrentFloor()}`, 24, 154);

    if (this.state === this.states.GAME_OVER) {
      context.textAlign = 'center';
      context.fillStyle = '#f8fafc';
      context.font = 'bold 56px sans-serif';
      context.fillText('GAME OVER', this.canvas.width * 0.5, this.canvas.height * 0.5 - 10);
      context.font = '24px sans-serif';
      context.fillText('Press R to Restart', this.canvas.width * 0.5, this.canvas.height * 0.5 + 36);
    }

    if (this.state === this.states.WIN) {
      context.textAlign = 'center';
      context.fillStyle = '#f8fafc';
      context.font = 'bold 56px sans-serif';
      context.fillText('YOU WIN', this.canvas.width * 0.5, this.canvas.height * 0.5 - 10);
      context.font = '24px sans-serif';
      context.fillText('Press R for a New Run', this.canvas.width * 0.5, this.canvas.height * 0.5 + 36);
    }

    context.restore();
  }

  createTowerFloors() {
    const floors = [];

    for (let floorNumber = 1; floorNumber <= this.maxFloors; floorNumber += 1) {
      floors.push(this.spawnFloor(floorNumber));
    }

    return floors;
  }

  spawnFloor(floorNumber) {
    const index = floorNumber - 1;
    const baseY = this.groundY - index * this.floorSpacing - 100;
    const layoutType = index % 3;
    const platforms = [];

    if (layoutType === 0) {
      platforms.push({ x: 140, y: baseY, width: 520, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 980, y: baseY, width: 560, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 700, y: baseY - 150, width: 220, height: 20, floor: floorNumber, isFloor: false });
    } else if (layoutType === 1) {
      platforms.push({ x: 220, y: baseY, width: 460, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 900, y: baseY, width: 620, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 500, y: baseY - 130, width: 180, height: 20, floor: floorNumber, isFloor: false });
      platforms.push({ x: 1120, y: baseY - 190, width: 160, height: 20, floor: floorNumber, isFloor: false });
    } else {
      platforms.push({ x: 140, y: baseY, width: 600, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 1020, y: baseY, width: 400, height: 20, floor: floorNumber, isFloor: true });
      platforms.push({ x: 820, y: baseY - 140, width: 180, height: 20, floor: floorNumber, isFloor: false });
      platforms.push({ x: 440, y: baseY - 220, width: 180, height: 20, floor: floorNumber, isFloor: false });
    }

    const checkpoint = {
      x: platforms[0].x + 60,
      y: platforms[0].y - 60
    };

    const enemies = this.spawnEnemiesForFloor(floorNumber, platforms);

    return {
      number: floorNumber,
      baseY,
      checkpoint,
      platforms,
      enemies,
      completed: false
    };
  }

  spawnEnemiesForFloor(floorNumber, platforms) {
    const enemyCount = Math.min(2 + Math.floor((floorNumber - 1) / 2), 5);
    const enemyTypes = ['scout', 'brute', 'gunner'];
    const enemies = [];

    for (let index = 0; index < enemyCount; index += 1) {
      const platform = platforms[index % platforms.length];
      const type = enemyTypes[(floorNumber + index) % enemyTypes.length];
      const width = type === 'brute' ? 64 : 50;
      const height = type === 'brute' ? 64 : 50;

      enemies.push(new Enemy({
        game: this,
        type,
        floor: floorNumber,
        x: platform.x + 40 + (index * 90) % Math.max(120, platform.width - 120),
        y: platform.y - height,
        width,
        height,
        speed: 90 + floorNumber * 6 + index * 10,
        minX: platform.x + 10,
        maxX: platform.x + platform.width - 10,
        patrolPlatform: platform,
        detectionRange: 280 + floorNumber * 10,
        health: 35 + floorNumber * 10 + index * 5
      }));
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

  refreshFloorProgression() {
    const reachedFloor = this.computeFloorFromPlayerPosition();
    this.currentFloor = Math.max(this.currentFloor, reachedFloor);

    for (const floor of this.floors) {
      if (floor.completed) {
        continue;
      }

      const remaining = floor.enemies.filter((enemy) => enemy.isAlive).length;
      if (remaining === 0) {
        floor.completed = true;
        this.lastCompletedFloor = Math.max(this.lastCompletedFloor, floor.number);
        this.checkpointFloor = Math.min(floor.number + 1, this.maxFloors);
      }
    }

    if (this.lastCompletedFloor >= this.maxFloors) {
      this.currentFloor = this.maxFloors + 1;
      this.state = this.states.WIN;
    }
  }

  computeFloorFromPlayerPosition() {
    const progress = this.groundY - this.player.y;
    return Math.max(1, Math.min(this.maxFloors, Math.floor(progress / this.floorSpacing) + 1));
  }

  getEnemiesRemainingOnCurrentFloor() {
    const floorNumber = Math.min(this.currentFloor, this.maxFloors);
    const floor = this.floors.find((item) => item.number === floorNumber);

    if (!floor) {
      return 0;
    }

    return floor.enemies.filter((enemy) => enemy.isAlive).length;
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

  movePlayerToCheckpoint(floorNumber) {
    const floor = this.floors.find((item) => item.number === floorNumber) ?? this.floors[0];
    this.player.reset(floor.checkpoint);
    this.currentFloor = floor.number;
    this.camera.setTarget(this.player);
    this.camera.x = clampFloor(this.player.x + this.player.width * 0.5 - this.viewWidth * 0.5, 0, this.width - this.viewWidth);
    this.camera.y = clampFloor(this.player.y + this.player.height * 0.5 - this.viewHeight * 0.5, 0, this.height - this.viewHeight);
  }

  restartFromCheckpoint() {
    this.state = this.states.PLAYING;
    this.bullets = [];
    this.explosions = [];
    this.movePlayerToCheckpoint(this.checkpointFloor);
  }

  restartRun() {
    this.score = 0;
    this.state = this.states.PLAYING;
    this.currentFloor = 1;
    this.lastCompletedFloor = 0;
    this.checkpointFloor = 1;
    this.floors = this.createTowerFloors();
    this.platforms = this.floors.flatMap((floor) => floor.platforms);
    this.player.reset(this.floors[0].checkpoint);
    this.enemies = this.floors.flatMap((floor) => floor.enemies);
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
}

function clampFloor(value, min, max) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}
