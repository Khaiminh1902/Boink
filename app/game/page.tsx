"use client";

import { useEffect, useRef } from "react";
import { Scene } from "./scene";

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = 800;
    canvas.height = 600;

    new Scene(canvas);
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
}
