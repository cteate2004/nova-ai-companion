import React, { useRef, useEffect } from 'react';

const PARTICLE_COUNT = 50;
const COLORS = [
  { r: 0, g: 212, b: 170 },   // teal #00d4aa
  { r: 212, g: 165, b: 116 },  // warm gold #d4a574
];

function createParticle(width, height) {
  const color = COLORS[Math.random() > 0.5 ? 0 : 1];
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    r: 2 + Math.random() * 6,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.2,
    opacity: 0.08 + Math.random() * 0.15,
    color,
    phase: Math.random() * Math.PI * 2,
  };
}

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(canvas.width, canvas.height)
      );
    }

    resize();
    window.addEventListener('resize', resize);

    function draw(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy + Math.sin(time * 0.0005 + p.phase) * 0.15;

        // Wrap around
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        const { r, g, b } = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.5})`;
        ctx.shadowBlur = p.r * 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}
