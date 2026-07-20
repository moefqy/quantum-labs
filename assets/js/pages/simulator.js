// QUANTUM LABS — Simulator
// Shows available tools as cards. Clicking opens a full-screen modal.

import { Router } from "../router.js";
import { GateMath } from "../core/math-renderer.js";
import { Icons } from "../core/ui-icons.js";
import { renderBlochExplorer } from "../tools/bloch-explorer.js";
import { renderCircuitBuilder } from "../tools/circuit-builder.js";
import { renderEntanglementTracker } from "../tools/entanglement-tracker.js";
import { renderStateAnalyzer } from "../tools/state-analyzer.js";

export const SimulatorPage = (() => {
  "use strict";

  let modalOpen = false;

  const TOOLS = [
    {
      id: "circuit-builder",
      name: "Circuit Builder",
      desc: "Drag-and-drop quantum circuit designer with real-time state-vector simulation. Build circuits visually, run simulations, and analyze results.",
      icon: Icons.moduleGrid,
      status: "ready",
      statusLabel: "Available",
    },
    {
      id: "bloch-explorer",
      name: "Bloch Sphere Explorer",
      desc: "Interactive 3D Bloch sphere visualization. Explore single-qubit states, apply gates, and see transformations on the sphere.",
      icon: Icons.moduleSphere,
      status: "ready",
      statusLabel: "Available",
    },
    {
      id: "state-analyzer",
      name: "State & Matrix Analyzer",
      desc: "Mathematical playground for quantum computing. Build tensor products, view unitary matrices, and analyze state vectors.",
      icon: Icons.moduleState,
      status: "ready",
      statusLabel: "Available",
    },
    {
      id: "entanglement-tracker",
      name: "Entanglement Tracker",
      get desc() {
        return `Visualize Von Neumann entropy, quantum mutual information, and conditional entropy. Discover the quantum signature: ${GateMath.toHTML("S(q_i|q_j) < 0")}.`;
      },
      icon: Icons.moduleNetwork,
      status: "ready",
      statusLabel: "Available",
    },
  ];

  // Injects the Simulator page HTML, generating the grid of available quantum tools.
  function render(container) {
    container.innerHTML = `
      <section class="section">
        <h2 class="section-title">Quantum Tools</h2>
        <p class="section-desc">Select a tool to open it. Each tool runs entirely in your browser.</p>
        <div class="tools-grid">
          ${TOOLS.map(
            (tool) => `
            <div class="tool-card ${tool.status === "soon" ? "disabled" : ""}" data-tool="${tool.id}">
              <div class="tool-card-icon">${tool.icon}</div>
              <div class="tool-card-arrow">
                ${Icons.arrowRight}
              </div>
              <h3>${tool.name}</h3>
              <p>${tool.desc}</p>
              <span class="tool-card-badge ${tool.status}">${tool.statusLabel}</span>
            </div>
          `,
          ).join("")}
        </div>
      </section>

      <footer class="site-footer">
        <p>© 2026 Quantum Labs by <a href="https://moefqy.com" target="_blank">moefqy.com</a>. All rights reserved.</p>
      </footer>
    `;

    // Bind tool card clicks
    container.querySelectorAll(".tool-card:not(.disabled)").forEach((card) => {
      card.addEventListener("click", () => openTool(card.dataset.tool));
    });
  }

  // Triggers the full-screen modal overlay and renders the selected tool's interface inside it.
  function openTool(toolId) {
    const tool = TOOLS.find((t) => t.id === toolId);
    if (!tool || tool.status === "soon") {
      return;
    }

    const overlay = document.getElementById("modal-overlay");
    const title = overlay.querySelector(".modal-title h2");
    const icon = overlay.querySelector(".modal-title .modal-icon");
    const body = overlay.querySelector(".modal-body");

    title.textContent = tool.name;
    icon.innerHTML = tool.icon;

    // Render tool content
    if (toolId === "circuit-builder") {
      if (typeof renderCircuitBuilder === "function") {
        renderCircuitBuilder(body);
      }
    } else if (toolId === "bloch-explorer") {
      if (typeof renderBlochExplorer === "function") {
        renderBlochExplorer(body);
      }
    } else if (toolId === "state-analyzer") {
      if (typeof renderStateAnalyzer === "function") {
        renderStateAnalyzer(body);
      }
    } else if (toolId === "entanglement-tracker") {
      if (typeof renderEntanglementTracker === "function") {
        renderEntanglementTracker(body);
      }
    }

    // Show modal
    overlay.classList.add("entering");
    overlay.classList.add("open");
    requestAnimationFrame(() => {
      overlay.classList.remove("entering");
    });

    modalOpen = true;
    document.body.style.overflow = "hidden";
  }

  // Hides the full-screen modal overlay and clears its DOM contents.
  function closeTool() {
    const overlay = document.getElementById("modal-overlay");
    overlay.classList.remove("open");
    modalOpen = false;

    document.body.style.overflow = "";

    // Clean up modal body
    setTimeout(() => {
      const body = overlay.querySelector(".modal-body");
      body.innerHTML = "";
    }, 300);
  }

  // Returns true if the tool modal is currently visible on screen.
  function isModalOpen() {
    return modalOpen;
  }

  return { render, openTool, closeTool, isModalOpen };
})();
