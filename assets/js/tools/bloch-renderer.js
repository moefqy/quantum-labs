// QUANTUM LABS — Bloch Renderer
// Interactive 3D Bloch sphere rendered on Canvas 2D.
// Operates as a standalone state engine with its own qubit state.

import { BlochMath } from "../core/bloch-math.js";
import { GateMath } from "../core/math-renderer.js";
import { QuantumGates } from "../core/quantum-gates.js";

export const BlochSphere = (() => {
  "use strict";

  // State Management
  // Canvas and context
  let canvas, ctx;
  let rotX = -0.4; // camera rotation
  let rotY = 0.6;
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };

  // Internal single-qubit pure state: [alpha_real, alpha_imag, beta_real, beta_imag]
  // Represents alpha|0⟩ + beta|1⟩, starting at |0⟩
  let stateRe = [1, 0]; // [alpha_r, beta_r]
  let stateIm = [0, 0]; // [alpha_i, beta_i]

  // Derived Bloch coordinates (updated on every setState/applyGate)
  let currentCoords = { x: 0, y: 0, z: 1, theta: 0, phi: 0, purity: 1 };

  // Get current Bloch coordinates
  function getCoords() {
    return { ...currentCoords };
  }

  // Compute Bloch coordinates from state vector
  function _computeCoords() {
    // rho = |psi><psi|, bloch: x=2Re(alpha*conj(beta)), y=2Im(alpha*conj(beta)), z=|alpha|^2 - |beta|^2
    const ar = stateRe[0],
      ai = stateIm[0];
    const br = stateRe[1],
      bi = stateIm[1];

    // Compute Bloch coordinates
    const x = 2 * (ar * br + ai * bi);
    const y = 2 * (ar * bi - ai * br);
    const z = ar * ar + ai * ai - (br * br + bi * bi);

    // Compute radius, theta, and phi
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = r > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
    const phi =
      x * x + y * y > 1e-10
        ? Math.atan2(y, x)
        : currentCoords
          ? currentCoords.phi
          : 0;

    // Update current coordinates
    currentCoords = { x, y, z, theta, phi, purity: r };
    return currentCoords;
  }

  // Set state from polar and azimuthal angles
  function setFromAngles(theta, phi) {
    stateRe = [Math.cos(theta / 2), Math.sin(theta / 2) * Math.cos(phi)];
    stateIm = [0, Math.sin(theta / 2) * Math.sin(phi)];
    _computeCoords();
    currentCoords.phi = phi; // Override computed phi to preserve exact input at poles
    draw();
    _updateExplorerInfo();
  }

  // Snap the internal state to a named basis or superposition preset (e.g., '|0⟩', '|+⟩').
  function setPreset(name) {
    switch (name) {
      case "|0⟩":
        setFromAngles(0, 0);
        break;
      case "|1⟩":
        setFromAngles(Math.PI, 0);
        break;
      case "|+⟩":
        setFromAngles(Math.PI / 2, 0);
        break;
      case "|−⟩":
        setFromAngles(Math.PI / 2, Math.PI);
        break;
      case "|i⟩":
        setFromAngles(Math.PI / 2, Math.PI / 2);
        break;
      case "|−i⟩":
        setFromAngles(Math.PI / 2, -Math.PI / 2);
        break;
      default:
        break;
    }
  }

  // Multiplies the internal state vector by a 2x2 matrix representing the chosen quantum gate.
  function applyGate(gateName, param) {
    const SQRT2_INV = 1 / Math.sqrt(2);
    let m; // 2x2 matrix as [[a_r,a_i],[b_r,b_i],[c_r,c_i],[d_r,d_i]]

    switch (gateName) {
      case "H":
        m = [
          [SQRT2_INV, 0],
          [SQRT2_INV, 0],
          [SQRT2_INV, 0],
          [-SQRT2_INV, 0],
        ];
        break;
      case "X":
        m = [
          [0, 0],
          [1, 0],
          [1, 0],
          [0, 0],
        ];
        break;
      case "Y":
        m = [
          [0, 0],
          [0, -1],
          [0, 1],
          [0, 0],
        ];
        break;
      case "Z":
        m = [
          [1, 0],
          [0, 0],
          [0, 0],
          [-1, 0],
        ];
        break;
      case "S":
        m = [
          [1, 0],
          [0, 0],
          [0, 0],
          [0, 1],
        ];
        break;
      case "Sdg":
        m = [
          [1, 0],
          [0, 0],
          [0, 0],
          [0, -1],
        ];
        break;
      case "T":
        m = [
          [1, 0],
          [0, 0],
          [0, 0],
          [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)],
        ];
        break;
      case "Tdg":
        m = [
          [1, 0],
          [0, 0],
          [0, 0],
          [Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4)],
        ];
        break;
      case "Rx": {
        const t = QuantumGates.parseAngle(param);
        const c = Math.cos(t / 2),
          s = Math.sin(t / 2);
        m = [
          [c, 0],
          [0, -s],
          [0, -s],
          [c, 0],
        ];
        break;
      }
      case "Ry": {
        const t = QuantumGates.parseAngle(param);
        const c = Math.cos(t / 2),
          s = Math.sin(t / 2);
        m = [
          [c, 0],
          [-s, 0],
          [s, 0],
          [c, 0],
        ];
        break;
      }
      case "Rz": {
        const t = QuantumGates.parseAngle(param);
        const c = Math.cos(t / 2),
          s = Math.sin(t / 2);
        m = [
          [c, -s],
          [0, 0],
          [0, 0],
          [c, s],
        ];
        break;
      }
      default:
        return;
    }

    // Apply 2x2 matrix: new = M * old
    const ar = stateRe[0],
      ai = stateIm[0];
    const br = stateRe[1],
      bi = stateIm[1];

    // new_alpha = m[0]*a + m[1]*b
    const nar = m[0][0] * ar - m[0][1] * ai + m[1][0] * br - m[1][1] * bi;
    const nai = m[0][0] * ai + m[0][1] * ar + m[1][0] * bi + m[1][1] * br;
    // new_beta  = m[2]*a + m[3]*b
    const nbr = m[2][0] * ar - m[2][1] * ai + m[3][0] * br - m[3][1] * bi;
    const nbi = m[2][0] * ai + m[2][1] * ar + m[3][0] * bi + m[3][1] * br;

    stateRe = [nar, nbr];
    stateIm = [nai, nbi];
    _computeCoords();
    draw();
    _updateExplorerInfo();
  }

  // Canvas / Rendering
  // Initialize 2D canvas context and bind mouse dragging events for 3D rotation.
  function init(canvasId) {
    canvas = document.getElementById(canvasId || "bloch-canvas");
    if (!canvas) {
      return;
    }
    ctx = canvas.getContext("2d");

    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) {
        return;
      }
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      rotY += dx * 0.008;
      rotX += dy * 0.008;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
      lastMouse = { x: e.clientX, y: e.clientY };
      draw();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    const observer = new ResizeObserver(() => {
      resizeCanvas();
      draw();
    });
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    resizeCanvas();
    _computeCoords();
    draw();
  }

  // Resize canvas to fit parent container
  function resizeCanvas() {
    if (!canvas) {
      return;
    }
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(
      parent.clientWidth,
      parent.clientHeight || parent.clientWidth,
    );
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
  }

  // Project 3D coordinates to 2D canvas coordinates
  function project(x, y, z, cx, cy, scale) {
    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
    const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { x: cx + x1 * scale, y: cy - y1 * scale, z: z2 };
  }

  // Clear the canvas and orchestrate the drawing of the wireframe, axes, and state vector.
  function draw() {
    if (!canvas || !ctx) {
      return;
    }
    const size = parseInt(canvas.style.width) || 280;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.34;

    ctx.clearRect(0, 0, size, size);

    drawSphereWireframe(cx, cy, radius);
    drawAxes(cx, cy, radius);
    drawStateVector(cx, cy, radius);
  }

  // Draw sphere wireframe
  function drawSphereWireframe(cx, cy, radius) {
    const isDark =
      document.documentElement.getAttribute("data-theme") !== "light";
    ctx.strokeStyle = isDark
      ? "rgba(80, 80, 80, 0.45)"
      : "rgba(180, 180, 180, 0.5)";
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      for (let j = 0; j <= 32; j++) {
        const phi = (j / 32) * Math.PI;
        const x = Math.sin(phi) * Math.cos(angle);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(angle);
        const p = project(x, y, z, cx, cy, radius);
        if (j === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }

    for (let i = 1; i < 6; i++) {
      const phi = (i / 6) * Math.PI;
      ctx.beginPath();
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(angle);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(angle);
        const p = project(x, y, z, cx, cy, radius);
        if (j === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }
  }

  // Draw axes 
  function drawAxes(cx, cy, radius) {
    const isDark =
      document.documentElement.getAttribute("data-theme") !== "light";
    const labelColor = isDark ? "#F5F0EB" : "#1A1A1A";
    const axisLen = 1.22;
    const axes = [
      { dir: [axisLen, 0, 0], label: "X", color: "#2ECC71" },
      { dir: [0, axisLen, 0], label: "Z", color: isDark ? "#F5F0EB" : "#555" },
      { dir: [0, 0, axisLen], label: "Y", color: "#3498DB" },
    ];

    const projected = axes.map((a) => ({
      ...a,
      start: project(0, 0, 0, cx, cy, radius),
      end: project(a.dir[0], a.dir[1], a.dir[2], cx, cy, radius),
      negEnd: project(-a.dir[0], -a.dir[1], -a.dir[2], cx, cy, radius),
    }));

    for (const a of projected) {
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(a.start.x, a.start.y);
      ctx.lineTo(a.negEnd.x, a.negEnd.y);
      ctx.stroke();

      ctx.globalAlpha = 0.85;
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.start.x, a.start.y);
      ctx.lineTo(a.end.x, a.end.y);
      ctx.stroke();

      ctx.fillStyle = a.color;
      ctx.globalAlpha = 1;
      ctx.font = "bold 12px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(a.label, a.end.x, a.end.y - 8);
    }

    const top = project(0, 1.4, 0, cx, cy, radius);
    const bottom = project(0, -1.4, 0, cx, cy, radius);
    ctx.fillStyle = labelColor;
    ctx.globalAlpha = 0.8;
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("|0⟩", top.x, top.y);
    ctx.fillText("|1⟩", bottom.x, bottom.y);
    ctx.globalAlpha = 1;
  }

  // Draw state vector
  function drawStateVector(cx, cy, radius) {
    const { x, y, z, purity } = currentCoords;
    if (purity < 0.01) {
      return;
    }

    const origin = project(0, 0, 0, cx, cy, radius);
    const tip = project(x, z, y, cx, cy, radius);

    // Extract dynamic colors
    const styles = getComputedStyle(document.body);
    const hexMolten = styles.getPropertyValue("--molten").trim() || "#FF6B42";

    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Vector line
    ctx.strokeStyle = hexMolten;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    // Tip dot
    ctx.fillStyle = hexMolten;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Projection on equatorial plane (dashed)
    const projLen = Math.sqrt(x * x + y * y);
    if (projLen > 0.05) {
      const proj = project(x, 0, y, cx, cy, radius);
      ctx.strokeStyle = hexToRgba(hexMolten, 0.35);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(proj.x, proj.y);
      ctx.lineTo(origin.x, origin.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Explorer UI sync
  // Update explorer UI
  function _updateExplorerInfo() {
    const { theta, phi, x, y, z } = currentCoords;
    const toDeg = (v) => ((v * 180) / Math.PI).toFixed(1);

    const el = (id) => document.getElementById(id);

    if (el("bex-theta-val")) {
      el("bex-theta-val").textContent = `${toDeg(theta)}°`;
    }
    if (el("bex-phi-val")) {
      el("bex-phi-val").textContent =
        `${toDeg(((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))}°`;
    }
    if (el("bex-x")) {
      el("bex-x").textContent = x.toFixed(3);
    }
    if (el("bex-y")) {
      el("bex-y").textContent = y.toFixed(3);
    }
    if (el("bex-z")) {
      el("bex-z").textContent = z.toFixed(3);
    }

    if (el("bex-p0")) {
      const p0 = Math.cos(theta / 2) ** 2;
      el("bex-p0").textContent = `${(p0 * 100).toFixed(1)}%`;
    }
    if (el("bex-p1")) {
      const p1 = Math.sin(theta / 2) ** 2;
      el("bex-p1").textContent = `${(p1 * 100).toFixed(1)}%`;
    }

    // Sync sliders back to match the state
    const thetaSlider = el("bex-slider-theta");
    const phiSlider = el("bex-slider-phi");
    const thetaInput = el("bex-input-theta");
    const phiInput = el("bex-input-phi");

    if (thetaSlider && !thetaSlider._dragging) {
      const thetaDeg = Math.round((theta * 180) / Math.PI);
      thetaSlider.value = thetaDeg;
      if (thetaInput) {
        thetaInput.value = thetaDeg;
      }
    }
    if (phiSlider && !phiSlider._dragging) {
      const phiDeg = Math.round(((phi * 180) / Math.PI + 360) % 360);
      phiSlider.value = phiDeg;
      if (phiInput) {
        phiInput.value = phiDeg;
      }
    }

    // Update ket notation
    const ketEl = el("bex-ket");
    if (ketEl) {
      // Named state detection
      const eps = 0.015;
      const { x: bx, y: by, z: bz } = currentCoords;
      let ketName = null;
      if (bz > 1 - eps) {
        ketName = "|0\\rangle";
      } else if (bz < -1 + eps) {
        ketName = "|1\\rangle";
      } else if (Math.abs(bx - 1) < eps) {
        ketName = "|+\\rangle";
      } else if (Math.abs(bx + 1) < eps) {
        ketName = "|-\\rangle";
      } else if (Math.abs(by - 1) < eps) {
        ketName = "|i\\rangle";
      } else if (Math.abs(by + 1) < eps) {
        ketName = "|-i\\rangle";
      }
      if (ketName) {
        ketEl.innerHTML = GateMath.toHTML(ketName);
      } else {
        const a0 = Math.cos(theta / 2);
        const a1 = Math.sin(theta / 2);

        const a0Str = a0.toFixed(2);
        let a1Str = "";

        const a1Real = a1 * Math.cos(phi);
        const a1Imag = a1 * Math.sin(phi);

        if (Math.abs(a1Imag) < 0.01) {
          const val = a1Real;
          a1Str =
            val < 0 ? `- ${Math.abs(val).toFixed(2)}` : `+ ${val.toFixed(2)}`;
        } else if (Math.abs(a1Real) < 0.01) {
          const val = a1Imag;
          a1Str =
            val < 0 ? `- ${Math.abs(val).toFixed(2)}i` : `+ ${val.toFixed(2)}i`;
        } else {
          const r = a1Real.toFixed(2);
          const i = Math.abs(a1Imag).toFixed(2);
          const sign = a1Imag < 0 ? "-" : "+";
          a1Str = `+ (${r} ${sign} ${i}i)`;
        }

        ketEl.innerHTML = GateMath.toHTML(
          `${a0Str} |0\\rangle ${a1Str} |1\\rangle`,
        );
      }
    }
  }

  // Calculate single-qubit Bloch coordinates from a multi-qubit engine state.
  function render(state, qubit) {
    if (!canvas) {
      init();
    }
    resizeCanvas();
    const coords = BlochMath.getBlochCoords(state, qubit);
    currentCoords = coords;
    // Also sync internal qubit state from coords (approximate)
    const { theta, phi } = coords;
    stateRe = [Math.cos(theta / 2), Math.sin(theta / 2) * Math.cos(phi)];
    stateIm = [0, Math.sin(theta / 2) * Math.sin(phi)];
    draw();
    _updateExplorerInfo();
  }

  // Reset the internal state to |0⟩ and redraws the sphere and UI readouts.
  function clear() {
    stateRe = [1, 0];
    stateIm = [0, 0];
    _computeCoords();
    if (canvas && ctx) {
      resizeCanvas();
      draw();
    }
    _updateExplorerInfo();
  }

  return {
    init,
    render,
    clear,
    draw,
    setFromAngles,
    setPreset,
    applyGate,
    getCoords,
  };
})();
