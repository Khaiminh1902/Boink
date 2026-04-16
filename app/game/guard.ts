export class Guard {
  x: number;
  y: number;
  size: number;

  speed: number;
  chaseSpeed: number;

  direction: number;
  fov: number;
  range: number;

  targetX: number;
  targetY: number;

  canvasWidth: number;
  canvasHeight: number;

  isChasing: boolean;

  constructor(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    this.x = x;
    this.y = y;
    this.size = 20;

    this.speed = 2;
    this.chaseSpeed = 9;

    this.direction = 0;
    this.fov = Math.PI / 3;
    this.range = 150;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.targetX = x;
    this.targetY = y;

    this.isChasing = false;

    this.pickNewTarget();
  }

  pickNewTarget() {
    const margin = 40;

    this.targetX = Math.random() * (this.canvasWidth - margin * 2) + margin;
    this.targetY = Math.random() * (this.canvasHeight - margin * 2) + margin;
  }

  update(player: { x: number; y: number; size: number }) {
    const seesPlayer = this.canSee(player);

    this.isChasing = seesPlayer;

    if (this.isChasing) {
      const px = player.x;
      const py = player.y;

      const dx = px - this.x;
      const dy = py - this.y;

      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        this.x += (dx / dist) * this.chaseSpeed;
        this.y += (dy / dist) * this.chaseSpeed;
      }

      this.direction = Math.atan2(dy, dx);
    } else {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        this.pickNewTarget();
        return;
      }

      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;

      this.direction = Math.atan2(dy, dx);
    }
  }

  canSee(player: { x: number; y: number; size: number }) {
    const px = player.x + player.size / 2;
    const py = player.y + player.size / 2;

    const gx = this.x + this.size / 2;
    const gy = this.y + this.size / 2;

    const dx = px - gx;
    const dy = py - gy;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > this.range) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    let diff = angleToPlayer - this.direction;

    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    return Math.abs(diff) < this.fov / 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(
      cx,
      cy,
      this.range,
      this.direction - this.fov / 2,
      this.direction + this.fov / 2,
    );
    ctx.closePath();
    ctx.fillStyle = this.isChasing
      ? "rgba(255,0,0,0.3)"
      : "rgba(255,255,0,0.2)";
    ctx.fill();

    ctx.fillStyle = this.isChasing ? "red" : "green";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
