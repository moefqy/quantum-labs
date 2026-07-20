// QUANTUM LABS — Home
// Controller logic for the Home page.

import { Icons } from "../core/ui-icons.js";

export const HomePage = (() => {
  "use strict";

  // Renders the Home page landing content and initializes the background canvas animation.
  function render(container) {
    container.innerHTML = `
      <!-- Hero -->
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            Quantum Computing<br>
            <span class="gradient-text">Made Visual</span>
          </h1>
          <p class="hero-desc">
            Build, simulate, and visualize quantum circuits with an intuitive drag-and-drop interface.
            No code required. Runs entirely in your browser.
          </p>
          <div class="hero-actions">
            <a href="/simulator" class="btn btn-primary btn-lg">
              Open Simulator
              ${Icons.arrowRight}
            </a>
            <a href="/documentation" class="btn btn-outline btn-lg">
              ${Icons.preset}
              Documentation
            </a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-value">8</span>
              <span class="hero-stat-label">Qubits</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">8</span>
              <span class="hero-stat-label">C-Bits</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">20+</span>
              <span class="hero-stat-label">Gate Operations</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">100%</span>
              <span class="hero-stat-label">Client-Side</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-circuit-preview" id="hero-preview">
            <canvas id="hero-canvas"></canvas>
          </div>
        </div>
      </section>

      <footer class="site-footer">
        <p>© 2026 Quantum Labs by <a href="https://moefqy.com" target="_blank">moefqy.com</a>. All rights reserved.</p>
      </footer>
    `;

    // Draw hero animation
    drawHeroPreview();
  }

  // Initializes and loops a Canvas 2D animation of floating particles and circuit elements.
  function drawHeroPreview() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const w = parent.clientWidth;
    const h = parent.clientHeight;

    // Animate floating quantum circuit elements
    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: 2 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    // Draw some circuit-like elements (Teleportation)
    const gates = [
      { label: "Rx", col: 0.5, wire: 0 },
      { label: "H", col: 1.5, wire: 1 },
      { label: "●", col: 2.5, wire: 1, isDot: true },
      { label: "CX", col: 2.5, wire: 2, isTarget: true },
      { label: "●", col: 3.5, wire: 0, isDot: true },
      { label: "CX", col: 3.5, wire: 1, isTarget: true },
      { label: "H", col: 4.5, wire: 0 },
      { label: "M", col: 5.5, wire: 0 },
      { label: "M", col: 6.5, wire: 1 },
    ];

    // Get connections between gates
    const connections = [
      { col: 2.5, w1: 1, w2: 2 },
      { col: 3.5, w1: 0, w2: 1 },
    ];

    // Get gate positions
    const gatePositions = gates.map((g) => ({
      label: g.label,
      x: 40 + g.col * 60,
      y: h * 0.3 + g.wire * 40,
      alpha: 0.6,
      isDot: g.isDot,
      isTarget: g.isTarget,
    }));

    // Extract theme variables dynamically
    const styles = getComputedStyle(document.body);
    let hexWireLight = styles.getPropertyValue("--wire-light").trim();
    let hexEmber = styles.getPropertyValue("--ember").trim();
    let hexGraphite = styles.getPropertyValue("--graphite").trim();
    let hexBone = styles.getPropertyValue("--bone").trim();
    let currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";

    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Animation loop
    function frame() {
      const actualTheme =
        document.documentElement.getAttribute("data-theme") || "dark";
      if (currentTheme !== actualTheme) {
        currentTheme = actualTheme;
        hexWireLight = styles.getPropertyValue("--wire-light").trim();
        hexEmber = styles.getPropertyValue("--ember").trim();
        hexGraphite = styles.getPropertyValue("--graphite").trim();
        hexBone = styles.getPropertyValue("--bone").trim();
      }

      ctx.clearRect(0, 0, w, h);

      // Wires
      ctx.strokeStyle = hexToRgba(hexWireLight, 0.5);
      ctx.lineWidth = 1;
      for (let wire = 0; wire < 3; wire++) {
        const y = h * 0.3 + wire * 40;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) {
          p.vx *= -1;
        }
        if (p.y < 0 || p.y > h) {
          p.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(hexEmber, p.alpha);
        ctx.fill();
      }

      // Connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = hexToRgba(hexEmber, 0.1 * (1 - dist / 100));
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Vertical connections for multi-qubit gates
      ctx.strokeStyle = hexToRgba(hexEmber, 0.3);
      ctx.lineWidth = 1;
      for (const conn of connections) {
        const x = 40 + conn.col * 60;
        const y1 = h * 0.3 + conn.w1 * 40;
        const y2 = h * 0.3 + conn.w2 * 40;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }

      // Gate labels
      ctx.font = "bold 14px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const g of gatePositions) {
        if (g.isDot) {
          ctx.fillStyle = hexToRgba(hexEmber, g.alpha);
          ctx.beginPath();
          ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (g.isTarget) {
          ctx.strokeStyle = hexToRgba(hexEmber, g.alpha);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(g.x - 10, g.y);
          ctx.lineTo(g.x + 10, g.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(g.x, g.y - 10);
          ctx.lineTo(g.x, g.y + 10);
          ctx.stroke();
        } else {
          // Box
          ctx.fillStyle = hexToRgba(hexEmber, g.alpha * 0.15);
          ctx.strokeStyle = hexToRgba(hexEmber, g.alpha * 0.5);
          ctx.lineWidth = 1;
          const bx = g.x - 16;
          const by = g.y - 16;
          ctx.fillRect(bx, by, 32, 32);
          ctx.strokeRect(bx, by, 32, 32);

          // Text
          ctx.fillStyle = hexToRgba(hexBone, g.alpha);
          ctx.fillText(g.label, g.x, g.y);
        }
      }

      requestAnimationFrame(frame);
    }

    frame();
  }

  return { render };
})();
