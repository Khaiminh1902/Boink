import { Player } from "./player";
import { Guard } from "./guard";

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  guard: Guard;
  keys: Record<string, boolean>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.player = new Player(100, 100);
    this.guard = new Guard(300, 200, this.canvas.width, this.canvas.height);
    this.keys = {};

    this.setupInput();
    this.resize();
    window.addEventListener("resize", this.resize);

    this.loop();
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.guard.canvasWidth = this.canvas.width;
    this.guard.canvasHeight = this.canvas.height;
  };

  setupInput() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  update() {
    this.player.move(this.keys, this.canvas.width, this.canvas.height);
    this.guard.update(this.player);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const detected = this.guard.canSee(this.player);

    this.guard.draw(this.ctx);
    this.player.draw(this.ctx);

    if (detected) {
      this.ctx.fillStyle = "red";
    }
  }

  loop = () => {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  };
}
