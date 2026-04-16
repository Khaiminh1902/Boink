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
    this.speed = 10;

    this.isDazed = false;
    this.dazedUntil = 0;
    this.canBeDazed = true;

    this.boinkSound = new Audio("/sound/boink.mp3");
  }

  move(
    keys: Record<string, boolean>,
    canvasWidth: number,
    canvasHeight: number,
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

    if (keys["w"]) dy -= this.speed;
    if (keys["s"]) dy += this.speed;
    if (keys["a"]) dx -= this.speed;
    if (keys["d"]) dx += this.speed;

    this.x += dx;
    this.y += dy;

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
      this.isDazed = true;
      this.dazedUntil = now + 2000;
      this.canBeDazed = false;

      this.boinkSound.currentTime = 0;
      this.boinkSound.play();
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.isDazed ? "yellow" : "blue";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
