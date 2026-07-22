import { useEffect, useRef } from "react";

interface StarfieldBackgroundProps {
  density?: number;
  className?: string;
  withVignette?: boolean;
  transparent?: boolean;
}

export function StarfieldBackground({
  density = 1,
  className = "",
  withVignette = true,
  transparent = false,
}: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    interface Star { x: number; y: number; z: number; size: number; speed: number; orange: boolean; phase: number; }

    const stars: Star[] = [];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const maxDepth = 1600;
    const minDepth = 10;
    let width = 0, height = 0, dpr = 1, focalLength = 620;
    let lastFrame = performance.now();
    let frame = 0;

    function resetStar(star: Star, scatter: boolean) {
      const spread = Math.max(width, height, 900);
      star.x = (Math.random() - 0.5) * spread * 2.3;
      star.y = (Math.random() - 0.5) * spread * 1.55;
      star.z = scatter ? 70 + Math.random() * maxDepth : maxDepth;
      star.size = 0.5 + Math.random() * 1.6;
      star.speed = 0.16 + Math.random() * 0.32;
      star.orange = Math.random() > 0.66;
      star.phase = Math.random() * Math.PI * 2;
    }

    function createStar(scatter: boolean): Star {
      const s: Star = { x: 0, y: 0, z: 0, size: 0, speed: 0, orange: false, phase: 0 };
      resetStar(s, scatter);
      return s;
    }

    function resize() {
      if (!canvas || !context) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      focalLength = Math.min(width, height) * 0.9;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const baseCount = Math.min(900, Math.max(420, Math.floor((width * height) / 2300)));
      const targetCount = Math.round(baseCount * density);
      while (stars.length < targetCount) stars.push(createStar(true));
      if (stars.length > targetCount) stars.length = targetCount;
    }

    function project(star: Star) {
      const depth = Math.max(minDepth, star.z);
      const perspective = focalLength / depth;
      const centerX = width / 2 + pointer.x * 44;
      const centerY = height / 2 + pointer.y * 32;
      return { x: centerX + star.x * perspective, y: centerY + star.y * perspective, perspective };
    }

    function draw(now: number) {
      if (!context) return;
      const delta = Math.min(2.2, Math.max(0.65, (now - lastFrame) / 16.67));
      lastFrame = now;
      pointer.x += (pointer.targetX - pointer.x) * 0.024;
      pointer.y += (pointer.targetY - pointer.y) * 0.024;
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        star.z -= (0.42 + 2.65 * star.speed) * delta;
        const point = project(star);
        if (star.z <= minDepth || point.x < -180 || point.x > width + 180 || point.y < -180 || point.y > height + 180) {
          resetStar(star, false); continue;
        }
        const closeness = 1 - star.z / maxDepth;
        const color = star.orange ? "251,160,38" : "255,255,255";
        const twinkle = 0.78 + Math.sin(now * 0.003 + star.phase) * 0.2;
        const alpha = Math.min(0.96, 0.16 + closeness * 1.08) * twinkle;
        const radius = Math.max(0.45, star.size * (0.52 + closeness * 3.2));
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${alpha})`;
        context.fill();
        if (closeness > 0.72) {
          context.beginPath();
          context.arc(point.x, point.y, radius * 3.4, 0, Math.PI * 2);
          context.fillStyle = `rgba(${color}, ${alpha * 0.08})`;
          context.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.targetX = (event.clientX / Math.max(width, 1) - 0.5) * 2;
      pointer.targetY = (event.clientY / Math.max(height, 1) - 0.5) * 2;
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [density]);

  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      {!transparent && (
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #050505 0%, #0a0a0a 58%, #020202 100%)" }} />
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-[0.98]" />
      {withVignette && (
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.3) 48%, rgba(0, 0, 0, 0.9) 100%)" }} />
      )}
    </div>
  );
}
