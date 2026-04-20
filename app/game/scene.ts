import { Guard } from "./guard";
import { Player } from "./player";

export interface Obstacle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

type MazeCell = {
  row: number;
  col: number;
  walls: [boolean, boolean, boolean, boolean];
};

type SpawnPoint = {
  row: number;
  col: number;
  x: number;
  y: number;
};

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  guards: Guard[];
  keys: Record<string, boolean>;
  obstacles: Obstacle[];
  spawnPoints: SpawnPoint[];
  exitX: number;
  exitY: number;
  exitCellRow: number;
  exitCellCol: number;
  mapMargin: number;
  mazeOffsetX: number;
  mazeOffsetY: number;
  wallWidth: number;
  cellSize: number;
  mazeCols: number;
  mazeRows: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = new Player(100, 100);
    this.guards = [];
    this.keys = {};
    this.obstacles = [];
    this.spawnPoints = [];
    this.exitX = 0;
    this.exitY = 0;
    this.exitCellRow = 0;
    this.exitCellCol = 0;
    this.mapMargin = 48;
    this.mazeOffsetX = 48;
    this.mazeOffsetY = 48;
    this.wallWidth = 16;
    this.cellSize = 96;
    this.mazeCols = 0;
    this.mazeRows = 0;

    this.setupInput();
    this.resize();
    window.addEventListener("resize", this.resize);

    this.loop();
  }

  private createCellGrid(rows: number, cols: number): MazeCell[][] {
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        row,
        col,
        walls: [true, true, true, true],
      })),
    );
  }

  private shuffle<T>(items: T[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }

  private carveMaze(cells: MazeCell[][]) {
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const directions = [
      { dr: -1, dc: 0, wall: 0, opposite: 2 },
      { dr: 0, dc: 1, wall: 1, opposite: 3 },
      { dr: 1, dc: 0, wall: 2, opposite: 0 },
      { dr: 0, dc: -1, wall: 3, opposite: 1 },
    ];

    const carve = (row: number, col: number) => {
      visited[row][col] = true;

      for (const dir of this.shuffle([...directions])) {
        const nextRow = row + dir.dr;
        const nextCol = col + dir.dc;

        if (
          nextRow < 0 ||
          nextRow >= rows ||
          nextCol < 0 ||
          nextCol >= cols ||
          visited[nextRow][nextCol]
        ) {
          continue;
        }

        cells[row][col].walls[dir.wall] = false;
        cells[nextRow][nextCol].walls[dir.opposite] = false;
        carve(nextRow, nextCol);
      }
    };

    carve(0, 0);

    const extraPassages = Math.max(1, Math.floor((rows * cols) / 8));
    for (let i = 0; i < extraPassages; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const possible = directions.filter(({ dr, dc, wall, opposite }) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
          return false;
        }

        return (
          cells[row][col].walls[wall] && cells[nextRow][nextCol].walls[opposite]
        );
      });

      if (possible.length === 0) {
        continue;
      }

      const passage = possible[Math.floor(Math.random() * possible.length)];
      const nextRow = row + passage.dr;
      const nextCol = col + passage.dc;
      cells[row][col].walls[passage.wall] = false;
      cells[nextRow][nextCol].walls[passage.opposite] = false;
    }
  }

  private findFarthestCell(
    cells: MazeCell[][],
    start: { row: number; col: number },
  ) {
    const rows = cells.length;
    const cols = cells[0]?.length ?? 0;
    const queue = [{ ...start, distance: 0 }];
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    visited[start.row][start.col] = true;
    let farthest = queue[0];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance > farthest.distance) {
        farthest = current;
      }

      const neighbors = [
        {
          row: current.row - 1,
          col: current.col,
          open: !cells[current.row][current.col].walls[0],
        },
        {
          row: current.row,
          col: current.col + 1,
          open: !cells[current.row][current.col].walls[1],
        },
        {
          row: current.row + 1,
          col: current.col,
          open: !cells[current.row][current.col].walls[2],
        },
        {
          row: current.row,
          col: current.col - 1,
          open: !cells[current.row][current.col].walls[3],
        },
      ];

      for (const neighbor of neighbors) {
        if (
          !neighbor.open ||
          neighbor.row < 0 ||
          neighbor.row >= rows ||
          neighbor.col < 0 ||
          neighbor.col >= cols ||
          visited[neighbor.row][neighbor.col]
        ) {
          continue;
        }

        visited[neighbor.row][neighbor.col] = true;
        queue.push({
          row: neighbor.row,
          col: neighbor.col,
          distance: current.distance + 1,
        });
      }
    }

    return farthest;
  }

  generateMap() {
    const margin = 48;
    const desiredCell = 96;
    const cols = Math.max(
      4,
      Math.floor((this.canvas.width - margin * 2) / desiredCell),
    );
    const rows = Math.max(
      4,
      Math.floor((this.canvas.height - margin * 2) / desiredCell),
    );
    const cellSize = Math.floor(
      Math.min(
        (this.canvas.width - margin * 2) / cols,
        (this.canvas.height - margin * 2) / rows,
      ),
    );
    const offsetX = Math.floor((this.canvas.width - cols * cellSize) / 2);
    const offsetY = Math.floor((this.canvas.height - rows * cellSize) / 2);

    this.mapMargin = Math.min(offsetX, offsetY);
    this.mazeOffsetX = offsetX;
    this.mazeOffsetY = offsetY;
    this.cellSize = cellSize;
    this.mazeCols = cols;
    this.mazeRows = rows;
    this.wallWidth = Math.max(14, Math.floor(cellSize * 0.16));

    const cells = this.createCellGrid(rows, cols);
    this.carveMaze(cells);

    this.obstacles = [];
    this.spawnPoints = [];

    const addWall = (x1: number, y1: number, x2: number, y2: number) => {
      this.obstacles.push({ x1, y1, x2, y2, width: this.wallWidth });
    };

    for (const row of cells) {
      for (const cell of row) {
        const left = offsetX + cell.col * cellSize;
        const top = offsetY + cell.row * cellSize;
        const right = left + cellSize;
        const bottom = top + cellSize;

        this.spawnPoints.push({
          row: cell.row,
          col: cell.col,
          x: left + cellSize / 2 - this.player.size / 2,
          y: top + cellSize / 2 - this.player.size / 2,
        });

        if (cell.walls[0]) addWall(left, top, right, top);
        if (cell.walls[3]) addWall(left, top, left, bottom);
        if (cell.row === rows - 1 && cell.walls[2])
          addWall(left, bottom, right, bottom);
        if (cell.col === cols - 1 && cell.walls[1])
          addWall(right, top, right, bottom);
      }
    }

    const exitCell = this.findFarthestCell(cells, { row: 0, col: 0 });
    const startSpawn = this.spawnPoints.find(
      (point) => point.row === 0 && point.col === 0,
    );
    const exitSpawn = this.spawnPoints.find(
      (point) => point.row === exitCell.row && point.col === exitCell.col,
    );

    if (startSpawn) {
      this.player.x = startSpawn.x;
      this.player.y = startSpawn.y;
    }

    if (exitSpawn) {
      this.exitCellRow = exitCell.row;
      this.exitCellCol = exitCell.col;
      this.exitX = exitSpawn.x + this.player.size / 2;
      this.exitY = exitSpawn.y + this.player.size / 2;
    }
  }

  private wallCollidesPoint(x: number, y: number, size: number = 20): boolean {
    for (const obs of this.obstacles) {
      const dist = this.distToSegment(x, y, obs.x1, obs.y1, obs.x2, obs.y2);
      if (dist < obs.width / 2 + size / 2) {
        return true;
      }
    }

    return false;
  }

  private distToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  private isValidSpawn(x: number, y: number, size: number = 20): boolean {
    if (this.wallCollidesPoint(x + size / 2, y + size / 2, size)) {
      return false;
    }

    for (const obs of this.obstacles) {
      const closest = this.closestPointOnSegment(
        x + size / 2,
        y + size / 2,
        obs.x1,
        obs.y1,
        obs.x2,
        obs.y2,
      );
      const dist = Math.hypot(
        x + size / 2 - closest.x,
        y + size / 2 - closest.y,
      );
      if (dist < obs.width / 2 + size / 2 + 6) {
        return false;
      }
    }

    return true;
  }

  private closestPointOnSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): { x: number; y: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return { x: x1, y: y1 };

    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy };
  }

  generateGuards() {
    this.guards = [];

    const minGuardDistance = Math.max(
      3,
      Math.floor((this.mazeCols + this.mazeRows) / 3),
    );
    const playerCell = { row: 0, col: 0 };
    const exitCell = { row: this.exitCellRow, col: this.exitCellCol };

    const patrolPoints = this.spawnPoints.map(({ x, y }) => ({ x, y }));
    const preferredSpawns = this.shuffle(
      this.spawnPoints.filter((point) => {
        const fromPlayer =
          Math.abs(point.row - playerCell.row) +
          Math.abs(point.col - playerCell.col);
        const fromExit =
          Math.abs(point.row - exitCell.row) +
          Math.abs(point.col - exitCell.col);
        return fromPlayer >= minGuardDistance && fromExit >= 2;
      }),
    );

    const numGuards = Math.min(
      7,
      Math.max(4, Math.floor(this.spawnPoints.length / 10)),
    );
    const used = new Set<string>();

    for (const spawn of preferredSpawns) {
      if (this.guards.length >= numGuards) {
        break;
      }

      const key = `${spawn.row}:${spawn.col}`;
      if (used.has(key)) {
        continue;
      }

      used.add(key);
      this.guards.push(
        new Guard(
          spawn.x,
          spawn.y,
          this.canvas.width,
          this.canvas.height,
          patrolPoints,
          this.obstacles,
        ),
      );
    }

    while (this.guards.length < numGuards) {
      const fallback =
        this.spawnPoints[this.guards.length % this.spawnPoints.length];
      if (
        !fallback ||
        !this.isValidSpawn(fallback.x, fallback.y, this.player.size)
      ) {
        break;
      }

      this.guards.push(
        new Guard(
          fallback.x,
          fallback.y,
          this.canvas.width,
          this.canvas.height,
          patrolPoints,
          this.obstacles,
        ),
      );
    }
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.generateMap();
    this.generateGuards();
  };

  setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  private intersects(guard: Guard) {
    return (
      guard.x < this.player.x + this.player.size &&
      guard.x + guard.size > this.player.x &&
      guard.y < this.player.y + this.player.size &&
      guard.y + guard.size > this.player.y
    );
  }

  update() {
    this.player.move(
      this.keys,
      this.canvas.width,
      this.canvas.height,
      this.obstacles,
    );

    const playerCenterX = this.player.x + this.player.size / 2;
    const playerCenterY = this.player.y + this.player.size / 2;
    const distToExit = Math.hypot(
      playerCenterX - this.exitX,
      playerCenterY - this.exitY,
    );

    if (distToExit < this.cellSize * 0.22) {
      this.generateMap();
      this.generateGuards();
    }

    const playerState = {
      x: this.player.x,
      y: this.player.y,
      size: this.player.size,
    };

    for (const guard of this.guards) {
      guard.update(playerState, this.obstacles);

      if (!this.player.isDazed && this.intersects(guard)) {
        this.player.daze();
        guard.disengageFromPlayer(playerState, this.obstacles);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#0f0d0c";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const mazeWidth = this.mazeCols * this.cellSize;
    const mazeHeight = this.mazeRows * this.cellSize;
    const mazeLeft = this.mazeOffsetX;
    const mazeTop = this.mazeOffsetY;

    this.ctx.fillStyle = "#17120f";
    this.ctx.fillRect(mazeLeft, mazeTop, mazeWidth, mazeHeight);

    this.ctx.strokeStyle = "rgba(74, 57, 46, 0.2)";
    this.ctx.lineWidth = 1;
    for (let row = 0; row <= this.mazeRows; row++) {
      const y = mazeTop + row * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(mazeLeft, y);
      this.ctx.lineTo(mazeLeft + mazeWidth, y);
      this.ctx.stroke();
    }
    for (let col = 0; col <= this.mazeCols; col++) {
      const x = mazeLeft + col * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, mazeTop);
      this.ctx.lineTo(x, mazeTop + mazeHeight);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = "#4da45b";
    this.ctx.fillRect(this.exitX - 16, this.exitY - 16, 32, 32);
    this.ctx.strokeStyle = "#b5f0b4";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.exitX - 16, this.exitY - 16, 32, 32);

    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#8e7967";
    for (const obs of this.obstacles) {
      this.ctx.lineWidth = obs.width;
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x1, obs.y1);
      this.ctx.lineTo(obs.x2, obs.y2);
      this.ctx.stroke();
    }

    for (const guard of this.guards) {
      guard.drawWithObstacles(this.ctx, this.obstacles);
    }

    this.player.draw(this.ctx);

    const playerCenterX = this.player.x + this.player.size / 2;
    const playerCenterY = this.player.y + this.player.size / 2;
    const lightRadius = this.cellSize * 0.9;
    const lightFadeRadius = this.cellSize * 1.8;

    const darkness = this.ctx.createRadialGradient(
      playerCenterX,
      playerCenterY,
      lightRadius,
      playerCenterX,
      playerCenterY,
      lightFadeRadius,
    );
    darkness.addColorStop(0, "rgba(0, 0, 0, 0)");
    darkness.addColorStop(0.12, "rgba(0, 0, 0, 0.05)");
    darkness.addColorStop(0.28, "rgba(0, 0, 0, 0.78)");
    darkness.addColorStop(1, "rgba(0, 0, 0, 1)");

    this.ctx.fillStyle = darkness;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const exitGlow = this.ctx.createRadialGradient(
      this.exitX,
      this.exitY,
      this.cellSize * 0.05,
      this.exitX,
      this.exitY,
      this.cellSize * 0.4,
    );
    exitGlow.addColorStop(0, "rgba(182, 255, 158, 0.42)");
    exitGlow.addColorStop(1, "rgba(182, 255, 158, 0)");

    this.ctx.fillStyle = exitGlow;
    this.ctx.fillRect(
      this.exitX - this.cellSize * 0.35,
      this.exitY - this.cellSize * 0.35,
      this.cellSize * 0.9,
      this.cellSize * 0.9,
    );

    this.ctx.fillStyle = "#4da45b";
    this.ctx.fillRect(this.exitX - 16, this.exitY - 16, 32, 32);
    this.ctx.strokeStyle = "#b5f0b4";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.exitX - 16, this.exitY - 16, 32, 32);
  }

  loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };
}
