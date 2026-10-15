import { useEffect, useRef } from 'react';

/**
 * Global animated network / constellation background.
 * Light Theme: darker visible black/slate lines + crisp nodes.
 */
const NetworkBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles();
    };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;

        // Smooth movement
        this.vx = (Math.random() - 0.5) * 0.42;
        this.vy = (Math.random() - 0.5) * 0.42;

        // Slightly larger darker nodes
        this.radius = Math.random() * 1.6 + 1.1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // DARKER NODES
        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];

      // Slightly denser network
      const count = Math.floor((width * height) / 13500);

      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const drawConnections = () => {
      const maxDistance = 155;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const strength = 1 - dist / maxDistance;

            ctx.beginPath();

            // DARKER + STRONGER LINES
            const lineAlpha = strength * 0.55;

            ctx.strokeStyle = `rgba(2, 6, 23, ${lineAlpha})`;

            // Thicker visible line
            ctx.lineWidth = Math.max(0.65, strength * 1.45);

            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => particle.update());

      // Lines first
      drawConnections();

      // Nodes above lines
      particles.forEach((particle) => particle.draw());

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Network Canvas */}
      <canvas ref={canvasRef} className="network-canvas-global" />

      {/* Light Ambient Glow */}
      <div className="network-glow-global" />

      {/* Slightly darker edge vignette */}
      <div
        className="network-vignette-global"
        style={{
          position: 'fixed',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 46%, rgba(148, 163, 184, 0.38) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
};

export default NetworkBackground;