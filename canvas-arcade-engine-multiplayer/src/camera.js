import { clamp, lerp } from './utils.js';

export class Camera {
  constructor(worldWidth, worldHeight, viewportWidth, viewportHeight, target = null) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.width = viewportWidth;
    this.height = viewportHeight;
    this.target = target;
    this.x = 0;
    this.y = 0;
    this.lerpFactor = 0.25;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
  }

  setTarget(target) {
    this.target = target;
  }

  resize(viewportWidth, viewportHeight) {
    this.width = viewportWidth;
    this.height = viewportHeight;
    this.clampToWorld();
  }

  update(deltaTime) {
    this.followTarget();
    this.updateShake(deltaTime);
  }

  followTarget() {
    if (!this.target) {
      return;
    }

    const focusX = this.target.cameraFocusX ?? 0.5;
    const focusY = this.target.cameraFocusY ?? 0.5;
    const desiredX = this.target.x + this.target.width * 0.5 - this.width * focusX;
    const desiredY = this.target.y + this.target.height * 0.5 - this.height * focusY;
    const clampedX = clamp(desiredX, 0, Math.max(0, this.worldWidth - this.width));
    const clampedY = clamp(desiredY, 0, Math.max(0, this.worldHeight - this.height));

    this.x = lerp(this.x, clampedX, this.lerpFactor);
    this.y = lerp(this.y, clampedY, this.lerpFactor);
    this.clampToWorld();
  }

  clampToWorld() {
    this.x = clamp(this.x, 0, Math.max(0, this.worldWidth - this.width));
    this.y = clamp(this.y, 0, Math.max(0, this.worldHeight - this.height));
  }

  shake(magnitude = 10, duration = 0.18) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = this.shakeDuration;
  }

  updateShake(deltaTime) {
    if (this.shakeTime <= 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    this.shakeTime = Math.max(0, this.shakeTime - deltaTime);
    const intensity = this.shakeDuration === 0 ? 0 : this.shakeTime / this.shakeDuration;
    const magnitude = this.shakeMagnitude * intensity;

    this.shakeOffsetX = (Math.random() * 2 - 1) * magnitude;
    this.shakeOffsetY = (Math.random() * 2 - 1) * magnitude;

    if (this.shakeTime === 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeMagnitude = 0;
      this.shakeDuration = 0;
    }
  }

  getRenderPosition() {
    const renderX = this.x + this.shakeOffsetX;
    const renderY = this.y + this.shakeOffsetY;

    return {
      x: Number.isFinite(renderX) ? renderX : 0,
      y: Number.isFinite(renderY) ? renderY : 0
    };
  }

  getCenter() {
    return {
      x: this.x + this.width * 0.5,
      y: this.y + this.height * 0.5
    };
  }
}
