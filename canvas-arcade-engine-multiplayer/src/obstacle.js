export class Obstacle {
  constructor(config) {
    this.type = config.type ?? 'spike';
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.color = '#ef4444';
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
    if (this.type === 'spike') {
      this.drawSpikes(context);
      return;
    }

    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }

  drawSpikes(context) {
    const spikeCount = Math.max(2, Math.floor(this.width / 20));
    const spikeWidth = this.width / spikeCount;

    context.save();
    context.fillStyle = this.color;

    for (let index = 0; index < spikeCount; index += 1) {
      const spikeX = this.x + index * spikeWidth;
      context.beginPath();
      context.moveTo(spikeX, this.y + this.height);
      context.lineTo(spikeX + spikeWidth * 0.5, this.y);
      context.lineTo(spikeX + spikeWidth, this.y + this.height);
      context.closePath();
      context.fill();
    }

    context.restore();
  }
}
