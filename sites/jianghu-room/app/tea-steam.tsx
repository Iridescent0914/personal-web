"use client";

import { useEffect, useRef } from "react";

export function TeaSteam() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const bases = [55, 76, 96];
    const draw = (time: number) => {
      if (!document.hidden) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (let index = 0; index < bases.length; index++) {
          const age = (time / (3900 + index * 500) + index * .31) % 1;
          const fade = Math.sin(Math.PI * age);
          if (fade < .025) continue;
          const length = 18 + Math.min(1, age * 1.7) * (108 + index * 8);
          const bottom = 196;
          context.filter = "blur(5px)";
          for (let step = 0; step <= 12; step++) {
            const progress = step / 12;
            const y = bottom - progress * length;
            const curl = Math.sin(progress * 6.4 + age * 3.6 + index * 1.6) * (2 + progress * 14);
            const ripple = Math.sin(progress * 10.3 + time / 1300 + index * 2) * progress * 4;
            const x = bases[index] + curl + ripple;
            const opacity = fade * (.16 + progress * .08) * (1 - progress * .55);
            context.fillStyle = `rgba(255, 253, 248, ${opacity})`;
            context.beginPath();
            context.ellipse(x, y, 6 + progress * 9, 11 + progress * 9, progress * .22, 0, Math.PI * 2);
            context.fill();
          }
        }
        context.filter = "none";
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <canvas className="tea-steam" ref={canvasRef} width={150} height={205} aria-hidden="true" />;
}
