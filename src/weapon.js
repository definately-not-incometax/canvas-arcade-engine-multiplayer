export class Weapon {
  constructor(owner) {
    this.owner = owner;
    this.index = 0;
    this.cooldownTimer = 0;
    this.weapons = [
      {
        name: 'Minigun',
        type: 'minigun',
        damage: 8,
        projectileSpeed: 1200,
        cooldown: 0.08,
        projectileSize: 8,
        color: '#f8fafc'
      },
      {
        name: 'RPG',
        type: 'rpg',
        damage: 60,
        projectileSpeed: 700,
        cooldown: 0,
        projectileSize: 14,
        color: '#fb923c'
      }
    ];
  }

  get current() {
    return this.weapons[this.index];
  }

  get name() {
    return this.current.name;
  }

  update(input, deltaTime) {
    this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaTime);

    const wheelDirection = input.getWheelDirection();

    if (wheelDirection !== 0) {
      this.switchWeapon(wheelDirection);
    }
  }

  switchWeapon(direction) {
    const weaponCount = this.weapons.length;
    this.index = (this.index + direction + weaponCount) % weaponCount;
  }

  tryShoot(origin, target) {
    if (this.cooldownTimer > 0) {
      return;
    }

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const directionX = dx / length;
    const directionY = dy / length;
    const weapon = this.current;

    this.owner.game.createBullet({
      x: origin.x - weapon.projectileSize * 0.5,
      y: origin.y - weapon.projectileSize * 0.5,
      vx: directionX * weapon.projectileSpeed,
      vy: directionY * weapon.projectileSpeed,
      damage: weapon.damage,
      weaponType: weapon.type,
      size: weapon.projectileSize,
      color: weapon.color
    });

    this.cooldownTimer = weapon.cooldown;
  }
}
