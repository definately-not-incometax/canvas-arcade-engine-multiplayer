export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.mouseButtons = new Set();
    this.justPressedMouseButtons = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.wheelDirection = 0;
    this.lastWheelDirection = 0;
    this.allowedKeys = new Set([
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'space',
      'w',
      'a',
      's',
      'd',
      'r',
      'g',
      't',
      'b',
      'h'
    ]);

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  handleKeyDown(event) {
    const inputKey = this.normalizeKey(event);

    if (!inputKey) {
      return;
    }

    event.preventDefault();

    if (!this.keys.has(inputKey)) {
      this.justPressedKeys.add(inputKey);
    }

    this.keys.add(inputKey);
  }

  handleKeyUp(event) {
    const inputKey = this.normalizeKey(event);

    if (!inputKey) {
      return;
    }

    event.preventDefault();
    this.keys.delete(inputKey);
  }

  handleMouseMove(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }

  handleMouseDown(event) {
    if (!this.mouseButtons.has(event.button)) {
      this.justPressedMouseButtons.add(event.button);
    }

    this.mouseButtons.add(event.button);
  }

  handleMouseUp(event) {
    this.mouseButtons.delete(event.button);
  }

  handleWheel(event) {
    event.preventDefault();
    this.wheelDirection = event.deltaY > 0 ? 1 : -1;
    this.lastWheelDirection = this.wheelDirection;
  }

  handleBlur() {
    this.keys.clear();
    this.justPressedKeys.clear();
    this.mouseButtons.clear();
    this.justPressedMouseButtons.clear();
    this.wheelDirection = 0;
    this.lastWheelDirection = 0;
  }

  isPressed(key) {
    return this.keys.has(this.normalizeQuery(key));
  }

  isJustPressed(key) {
    return this.justPressedKeys.has(this.normalizeQuery(key));
  }

  isMouseDown(button = 0) {
    return this.mouseButtons.has(button);
  }

  isMouseJustPressed(button = 0) {
    return this.justPressedMouseButtons.has(button);
  }

  getWheelDirection() {
    return this.wheelDirection;
  }

  consumeWheelDirection() {
    const direction = this.wheelDirection;
    this.wheelDirection = 0;
    return direction;
  }

  endFrame() {
    this.justPressedKeys.clear();
    this.justPressedMouseButtons.clear();
    this.wheelDirection = 0;
  }

  normalizeKey(event) {
    const key = this.normalizeQuery(event.key);
    return this.allowedKeys.has(key) ? key : null;
  }

  normalizeQuery(key) {
    return String(key).toLowerCase();
  }
}
