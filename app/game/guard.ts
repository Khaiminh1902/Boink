type Obstacle = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
};

type Actor = {
  x: number;
  y: number;
  size: number;
};

export class Guard {
  x: number;
  y: number;
  size: number;

  speed: number;
  chaseSpeed: number;
  retreatSpeed: number;

  direction: number;
  targetDirection: number;
  turnSpeed: number;
  fov: number;
  range: number;

  targetX: number;
  targetY: number;
  patrolPoints: { x: number; y: number }[];

  canvasWidth: number;
  canvasHeight: number;

  isChasing: boolean;

  moveTimer: number;
  moveChangeInterval: number;

  collisionCooldown: number;
  retreatDirection: number;

  constructor(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    patrolPoints: { x: number; y: number }[],
    obstacles: Obstacle[] = [],
  ) {
    this.x = x;
    this.y = y;
    this.size = 20;

    this.speed = 1.4;
    this.chaseSpeed = 3.8;
    this.retreatSpeed = 2.6;

    this.direction = 0;
    this.targetDirection = 0;
    this.turnSpeed = 0.028;
    this.fov = Math.PI / 3;
    this.range = 150;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.targetX = x;
    this.targetY = y;
    this.patrolPoints = patrolPoints;

    this.isChasing = false;

    this.moveTimer = 0;
    this.moveChangeInterval = Math.random() * 90 + 60;

    this.collisionCooldown = 0;
    this.retreatDirection = Math.random() * Math.PI * 2;

    this.pickNewTarget(obstacles);
  }

  setPatrolPoints(patrolPoints: { x: number; y: number }[]) {
    this.patrolPoints = patrolPoints;
  }

  pickNewTarget(obstacles: Obstacle[] = []) {
    if (this.patrolPoints.length === 0) {
      this.targetX = this.x;
      this.targetY = this.y;
      return;
    }

    const shuffled = [...this.patrolPoints].sort(() => Math.random() - 0.5);

    for (const point of shuffled) {
      const dx = point.x - this.x;
      const dy = point.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.size * 2) {
        continue;
      }

      const fromX = this.x + this.size / 2;
      const fromY = this.y + this.size / 2;
      const toX = point.x + this.size / 2;
      const toY = point.y + this.size / 2;

      if (!this.lineIntersectsObstacle(fromX, fromY, toX, toY, obstacles)) {
        this.targetX = point.x;
        this.targetY = point.y;
        return;
      }
    }

    const fallback = shuffled[0];
    this.targetX = fallback.x;
    this.targetY = fallback.y;
  }

  canPassThrough(newX: number, newY: number, obstacles: Obstacle[]): boolean {
    const guardLeft = newX;
    const guardRight = newX + this.size;
    const guardTop = newY;
    const guardBottom = newY + this.size;

    for (const obs of obstacles) {
      const wallLeft = Math.min(obs.x1, obs.x2) - obs.width / 2;
      const wallRight = Math.max(obs.x1, obs.x2) + obs.width / 2;
      const wallTop = Math.min(obs.y1, obs.y2) - obs.width / 2;
      const wallBottom = Math.max(obs.y1, obs.y2) + obs.width / 2;

      if (
        guardRight > wallLeft &&
        guardLeft < wallRight &&
        guardBottom > wallTop &&
        guardTop < wallBottom
      ) {
        return false;
      }
    }

    return (
      newX >= 0 &&
      newY >= 0 &&
      newX + this.size <= this.canvasWidth &&
      newY + this.size <= this.canvasHeight
    );
  }

  lerpAngle(from: number, to: number, t: number): number {
    let diff = to - from;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return from + diff * t;
  }

  lineIntersectsObstacle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    obstacles: Obstacle[],
  ): boolean {
    for (const obs of obstacles) {
      if (this.lineIntersectsLine(x1, y1, x2, y2, obs.x1, obs.y1, obs.x2, obs.y2)) {
        return true;
      }
    }

    return false;
  }

  lineIntersectsLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  moveAlong(angle: number, speed: number, obstacles: Obstacle[]): boolean {
    const stepX = Math.cos(angle) * speed;
    const stepY = Math.sin(angle) * speed;
    const newX = this.x + stepX;
    const newY = this.y + stepY;

    if (this.canPassThrough(newX, newY, obstacles)) {
      this.x = newX;
      this.y = newY;
      return true;
    }

    const axisX = this.x + stepX;
    if (this.canPassThrough(axisX, this.y, obstacles)) {
      this.x = axisX;
      return true;
    }

    const axisY = this.y + stepY;
    if (this.canPassThrough(this.x, axisY, obstacles)) {
      this.y = axisY;
      return true;
    }

    return false;
  }

  disengageFromPlayer(player: Actor, obstacles: Obstacle[]) {
    const guardCenterX = this.x + this.size / 2;
    const guardCenterY = this.y + this.size / 2;
    const playerCenterX = player.x + player.size / 2;
    const playerCenterY = player.y + player.size / 2;

    let angle = Math.atan2(guardCenterY - playerCenterY, guardCenterX - playerCenterX);
    if (Number.isNaN(angle)) {
      angle = this.direction + Math.PI;
    }

    this.retreatDirection = angle;
    this.targetDirection = angle;
    this.isChasing = false;
    this.collisionCooldown = 90;

    const separation = player.size + this.size + 18;
    const candidateAngles = [0, Math.PI / 6, -Math.PI / 6, Math.PI / 3, -Math.PI / 3].map(
      (offset) => angle + offset,
    );

    for (const candidate of candidateAngles) {
      const candidateX =
        playerCenterX + Math.cos(candidate) * separation - this.size / 2;
      const candidateY =
        playerCenterY + Math.sin(candidate) * separation - this.size / 2;

      if (this.canPassThrough(candidateX, candidateY, obstacles)) {
        this.x = candidateX;
        this.y = candidateY;
        return;
      }
    }
  }

  update(player: Actor, obstacles: Obstacle[] = []) {
    if (this.collisionCooldown > 0) {
      this.collisionCooldown--;
      this.isChasing = false;
      this.targetDirection = this.retreatDirection;

      const moved = this.moveAlong(this.retreatDirection, this.retreatSpeed, obstacles);
      if (!moved) {
        const turnOffsets = [Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4];
        for (const offset of turnOffsets) {
          const angle = this.retreatDirection + offset;
          if (this.moveAlong(angle, this.retreatSpeed * 0.8, obstacles)) {
            this.retreatDirection = angle;
            this.targetDirection = angle;
            break;
          }
        }
      }

      this.updateDirection();
      return;
    }

    const seesPlayer = this.canSee(player, obstacles);
    this.isChasing = seesPlayer;

    this.moveTimer++;
    if (this.moveTimer >= this.moveChangeInterval) {
      this.moveTimer = 0;
      this.moveChangeInterval = Math.random() * 120 + 80;

      if (!this.isChasing) {
        this.pickNewTarget(obstacles);
      }
    }

    if (this.isChasing) {
      const px = player.x + player.size / 2;
      const py = player.y + player.size / 2;
      const gx = this.x + this.size / 2;
      const gy = this.y + this.size / 2;
      const dx = px - gx;
      const dy = py - gy;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const angle = Math.atan2(dy, dx);
        this.targetDirection = angle;

        if (!this.moveAlong(angle, this.chaseSpeed, obstacles)) {
          this.pickNewTarget(obstacles);
        }
      }
    } else {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 4) {
        this.pickNewTarget(obstacles);
      } else {
        const angle = Math.atan2(dy, dx);
        this.targetDirection = angle;

        if (!this.moveAlong(angle, this.speed, obstacles)) {
          this.pickNewTarget(obstacles);
        }
      }
    }

    this.updateDirection();
  }

  updateDirection() {
    this.direction = this.lerpAngle(this.direction, this.targetDirection, this.turnSpeed);
  }

  canSee(player: Actor, obstacles: Obstacle[] = []) {
    const px = player.x + player.size / 2;
    const py = player.y + player.size / 2;
    const gx = this.x + this.size / 2;
    const gy = this.y + this.size / 2;
    const dx = px - gx;
    const dy = py - gy;

    const distance = Math.hypot(dx, dy);
    if (distance > this.range) return false;

    if (this.lineIntersectsObstacle(gx, gy, px, py, obstacles)) {
      return false;
    }

    const angleToPlayer = Math.atan2(dy, dx);
    let diff = angleToPlayer - this.direction;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    return Math.abs(diff) < this.fov / 2;
  }

  drawVisionCone(ctx: CanvasRenderingContext2D, obstacles: Obstacle[] = []) {
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;

    const coneOffset = 10;
    const coneX = cx + Math.cos(this.direction) * coneOffset;
    const coneY = cy + Math.sin(this.direction) * coneOffset;

    const startAngle = this.direction - this.fov / 2;
    const endAngle = this.direction + this.fov / 2;
    const numRays = 30;

    ctx.beginPath();
    ctx.moveTo(coneX, coneY);

    for (let i = 0; i <= numRays; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / numRays);
      const rayEnd = this.castRay(coneX, coneY, angle, this.range, obstacles);
      ctx.lineTo(rayEnd.x, rayEnd.y);
    }

    ctx.closePath();
    ctx.fillStyle = this.isChasing
      ? "rgba(220, 56, 39, 0.28)"
      : "rgba(236, 212, 96, 0.18)";
    ctx.fill();
  }

  castRay(
    x: number,
    y: number,
    angle: number,
    maxDist: number,
    obstacles: Obstacle[],
  ) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let closestDist = maxDist;

    for (const obs of obstacles) {
      const endX = x + dx * maxDist;
      const endY = y + dy * maxDist;

      if (this.lineIntersectsLine(x, y, endX, endY, obs.x1, obs.y1, obs.x2, obs.y2)) {
        const hit = this.getLineLineIntersection(
          x,
          y,
          endX,
          endY,
          obs.x1,
          obs.y1,
          obs.x2,
          obs.y2,
        );
        if (hit && hit.dist < closestDist) {
          closestDist = hit.dist;
        }
      }
    }

    return {
      x: x + dx * closestDist,
      y: y + dy * closestDist,
    };
  }

  getLineLineIntersection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): { x: number; y: number; dist: number } | null {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      const ix = x1 + ua * (x2 - x1);
      const iy = y1 + ua * (y2 - y1);
      const dist = Math.hypot(ix - x1, iy - y1);
      return { x: ix, y: iy, dist };
    }

    return null;
  }

  drawWithObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
    this.drawVisionCone(ctx, obstacles);

    ctx.fillStyle = this.isChasing ? "#c73a2a" : "#5d7f49";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
