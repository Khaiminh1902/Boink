export class Player {
  x: number;
  y: number;
  size: number;
  speed: number;

  isDazed: boolean;
  dazedUntil: number;
  canBeDazed: boolean;

  boinkSound: HTMLAudioElement;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.speed = 5;

    this.isDazed = false;
    this.dazedUntil = 0;
    this.canBeDazed = true;

    this.boinkSound = new Audio("/sound/boink.mp3");
  }

  move(
    keys: Record<string, boolean>,
    canvasWidth: number,
    canvasHeight: number,
    obstacles: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [],
  ) {
    const now = Date.now();

    if (this.isDazed) {
      if (now > this.dazedUntil) {
        this.isDazed = false;
      } else {
        return;
      }
    }

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) dy -= this.speed;
    if (keys["s"] || keys["arrowdown"]) dy += this.speed;
    if (keys["a"] || keys["arrowleft"]) dx -= this.speed;
    if (keys["d"] || keys["arrowright"]) dx += this.speed;

    const newX = this.x + dx;
    const newY = this.y + dy;

    if (!this.collidesWithObstacles(newX, this.y, obstacles)) {
      this.x = newX;
    }
    if (!this.collidesWithObstacles(this.x, newY, obstacles)) {
      this.y = newY;
    }

    let hitWall = false;

    if (this.x < 0) {
      this.x = 0;
      hitWall = true;
    }

    if (this.x + this.size > canvasWidth) {
      this.x = canvasWidth - this.size;
      hitWall = true;
    }

    if (this.y < 0) {
      this.y = 0;
      hitWall = true;
    }

    if (this.y + this.size > canvasHeight) {
      this.y = canvasHeight - this.size;
      hitWall = true;
    }

    if (hitWall && this.canBeDazed) {
      this.daze(now + 2000);
    }

    const margin = 30;

    const nearEdge =
      this.x < margin ||
      this.y < margin ||
      this.x + this.size > canvasWidth - margin ||
      this.y + this.size > canvasHeight - margin;

    if (!nearEdge) {
      this.canBeDazed = true;
    }
  }

  daze(until: number = Date.now() + 2000) {
    this.isDazed = true;
    this.dazedUntil = until;
    this.canBeDazed = false;

    this.boinkSound.currentTime = 0;
    this.boinkSound.play();
  }

  collidesWithObstacles(
    newX: number,
    newY: number,
    obstacles: { x1: number; y1: number; x2: number; y2: number; width: number }[],
  ): boolean {
    const playerLeft = newX;
    const playerRight = newX + this.size;
    const playerTop = newY;
    const playerBottom = newY + this.size;

    for (const obs of obstacles) {
      const wallLeft = Math.min(obs.x1, obs.x2) - obs.width / 2;
      const wallRight = Math.max(obs.x1, obs.x2) + obs.width / 2;
      const wallTop = Math.min(obs.y1, obs.y2) - obs.width / 2;
      const wallBottom = Math.max(obs.y1, obs.y2) + obs.width / 2;

      if (playerRight > wallLeft && playerLeft < wallRight && 
          playerBottom > wallTop && playerTop < wallBottom) {
        return true;
      }
    }
    return false;
  }

  lineIntersectsLine(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number,
  ): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.isDazed ? "yellow" : "blue";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
