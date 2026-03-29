"use client";

import { useEffect, useRef } from "react";

interface ElectricitySparkProps {
  intensity: "high" | "medium";
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * Gentle electric sparks between two close word cards.
 * Tiny bright dots drift and flicker; occasionally a thin wispy arc forms.
 * Respects prefers-reduced-motion by showing a static subtle glow instead.
 */
export default function ElectricitySpark({ intensity }: ElectricitySparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const maxParticles = intensity === "high" ? 8 : 5;
    const arcChance = intensity === "high" ? 0.04 : 0.02;
    const particles: Particle[] = [];

    function spawnParticle() {
      particles.push({
        x: cx + (Math.random() - 0.5) * w * 0.6,
        y: cy + (Math.random() - 0.5) * h * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 20 + Math.random() * 40,
        size: 0.5 + Math.random() * 1.5,
      });
    }

    function drawArc(c: CanvasRenderingContext2D) {
      const y1 = h * 0.25 + Math.random() * h * 0.5;
      const y2 = h * 0.25 + Math.random() * h * 0.5;
      const segments = 4 + Math.floor(Math.random() * 3);
      const dx = w / segments;

      c.beginPath();
      c.moveTo(0, y1);
      for (let i = 1; i < segments; i++) {
        c.lineTo(dx * i + (Math.random() - 0.5) * 6, y1 + (y2 - y1) * (i / segments) + (Math.random() - 0.5) * 5);
      }
      c.lineTo(w, y2);

      // Faint glow
      c.strokeStyle = "rgba(180, 210, 255, 0.15)";
      c.lineWidth = 2;
      c.shadowColor = "rgba(150, 200, 255, 0.3)";
      c.shadowBlur = 4;
      c.stroke();

      // Thin bright core
      c.strokeStyle = "rgba(220, 240, 255, 0.5)";
      c.lineWidth = 0.5;
      c.shadowBlur = 2;
      c.stroke();

      c.shadowBlur = 0;
    }

    let tick = 0;

    function animate() {
      tick++;

      // Run at ~20fps for gentle feel (every 3rd frame at 60fps)
      if (tick % 3 !== 0) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx!.clearRect(0, 0, w, h);

      // Spawn particles gradually
      if (particles.length < maxParticles && Math.random() < 0.3) {
        spawnParticle();
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        // Fade in, hold, fade out
        const progress = p.life / p.maxLife;
        let alpha: number;
        if (progress < 0.2) alpha = progress / 0.2;
        else if (progress > 0.7) alpha = (1 - progress) / 0.3;
        else alpha = 1;

        alpha *= intensity === "high" ? 0.8 : 0.6;

        // Flicker
        if (Math.random() < 0.15) alpha *= 0.3;

        // Bright dot with soft glow
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(150, 200, 255, ${alpha * 0.15})`;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(220, 240, 255, ${alpha})`;
        ctx!.fill();
      }

      // Occasional thin wispy arc
      if (Math.random() < arcChance) {
        drawArc(ctx!);
      }

      frameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={60}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
      style={{ width: 40, height: 60 }}
    />
  );
}
