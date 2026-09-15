"use client";

import React, { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Initialize node count based on viewport density
    const nodeCount = Math.floor((width * height) / 18000);
    const nodes: Node[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
    }));

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw individual nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(71, 85, 105, 0.45)"; // Slate tone matching your cloud palette
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(100, 116, 139, ${0.25 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Draw interactive connection line to cursor
        const dxMouse = node.x - mouse.x;
        const dyMouse = node.y - mouse.y;
        const mouseDist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (mouseDist < 160) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(37, 99, 235, ${0.45 * (1 - mouseDist / 160)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-700">
      {/* Light Overcast Daytime Sky Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200 via-slate-300 to-zinc-200 dark:from-zinc-950 dark:via-slate-950 dark:to-zinc-900 transition-colors" />

      {/* Realistic Heavy Grey Storm Cloud 1 - Top Left */}
      <div 
        className="absolute -top-32 -left-20 w-[700px] h-[600px] rounded-full bg-slate-400/50 dark:bg-slate-800/40 blur-[100px] animate-pulse"
        style={{ animationDuration: '12s' }}
      />

      {/* Dark Charcoal Pre-Rain Cloud Mass - Top Right */}
      <div 
        className="absolute -top-10 -right-20 w-[800px] h-[600px] rounded-full bg-zinc-400/40 dark:bg-zinc-900/60 blur-[120px]" 
      />

      {/* Moody Low-Hanging Cloud Shadow - Center */}
      <div 
        className="absolute top-[35%] left-[20%] w-[650px] h-[450px] rounded-full bg-slate-400/35 dark:bg-slate-800/30 blur-[110px]" 
      />

      {/* Interactive Career Nodes Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Storm Horizon Fog - Bottom Blur */}
      <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-slate-300/60 dark:from-zinc-950 via-slate-200/20 to-transparent blur-lg pointer-events-none" />
    </div>
  );
}