// QUANTUM LABS — App
// Slim orchestrator: wires router, pages, modal, and delegates to dedicated modules.

// Core modules
import { AppState } from "./core/app-state.js";
import { EventBus } from "./core/event-bus.js";
import { GateMath } from "./core/math-renderer.js";
import { Icons } from "./core/ui-icons.js";
import { bindKeyboard } from "./core/keyboard.js";
import { UI } from "./core/ui-helpers.js";
import { bindToolbar } from "./core/toolbar.js";
import { ParamPopover } from "./core/param-popover.js";
import { syncUrl, restoreFromUrl } from "./core/url-manager.js";

// Page modules
import { AboutPage } from "./pages/about.js";
import { DocumentationPage } from "./pages/docs.js";
import { ExamplesPage } from "./pages/examples.js";
import { HomePage } from "./pages/home.js";
import { SimulatorPage } from "./pages/simulator.js";

// Circuit modules
import { CircuitModel } from "./circuit/circuit-model.js";
import { CircuitRenderer } from "./circuit/circuit-renderer.js";
import { EngineProxy } from "./core/engine-proxy.js";
import { ResultsPanel } from "./circuit/results-panel.js";
import { Router } from "./router.js";
import { QuantumGates } from "./core/quantum-gates.js";

// App controller
export const App = (() => {
  "use strict";

  let isRunning = false;
  let playbackStep = null;

  const SIMULATION_TIMEOUT_MS = 8000;

  // Bootstraps the application, sets up routing, global UI handlers, and syncs URL state.
  function init() {
    // Inject static SVGs into index.html
    const injectIcon = (id, svg) => {
      const el = document.getElementById(id);
      if (el) {
        el.outerHTML = svg;
      }
    };
    injectIcon("icon-theme-sun", Icons.sun);
    injectIcon("icon-theme-moon", Icons.moon);
    injectIcon("icon-nav-hamburger", Icons.hamburger);
    injectIcon("icon-modal-tool", Icons.toolDefault);
    injectIcon("icon-modal-close", Icons.close);
    injectIcon("icon-ctx-edit", Icons.edit);
    injectIcon("icon-ctx-delete", Icons.trash);

    // Register routes
    Router.register("/", HomePage.render);
    Router.register("/home", HomePage.render);
    Router.register("/simulator", SimulatorPage.render);
    Router.register("/examples", ExamplesPage.render);
    Router.register("/documentation", DocumentationPage.render);
    Router.register("/about", AboutPage.render);

    // Start router
    Router.init("page-content");

    // Modal close
    document.getElementById("modal-close")?.addEventListener("click", () => {
      SimulatorPage.closeTool();
    });

    // Close modal on overlay click
    document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") {
        SimulatorPage.closeTool();
      }
    });

    // Mobile hamburger
    document.getElementById("nav-hamburger")?.addEventListener("click", () => {
      document.getElementById("nav-links")?.classList.toggle("open");
    });

    // Close mobile menu on nav link click
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        document.getElementById("nav-links")?.classList.remove("open");
      });
    });

    // Param Popover Logic
    ParamPopover.init();

    // Theme toggle
    initTheme();

    // Init results panel and inject into AppState for tab switching
    ResultsPanel.init();
    AppState.init(ResultsPanel);

    // Wire URL sync to circuit render events
    EventBus.on("circuit:rendered", syncUrl);

    // Delegate to focused modules
    bindKeyboard(runSimulation);

    // Restore circuit from URL if params are present on page load
    restoreFromUrl();

    console.log(
      "%cQuantum Labs initialized",
      "color: #C44B2B; font-weight: bold; font-size: 14px",
    );
  }

  // Configures the global dark/light theme toggler based on system or local storage preferences.
  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";

      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("quantum-labs-theme", next);

      // Remove the attribute entirely for dark (default)
      if (next === "dark") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("quantum-labs-theme");
      }
    });
  }

  // Binds hover interactions to the gate palette items to display rich tooltip popovers.
  function bindTooltips() {
    const tooltip = document.getElementById("tooltip");
    const tooltipTitle = document.getElementById("tooltip-title");
    const tooltipDesc = document.getElementById("tooltip-desc");
    const tooltipMatrix = document.getElementById("tooltip-matrix");

    let hoverTimeout = null;

    document.querySelectorAll(".ql-gate-btn[data-desc]").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          const gate = item.dataset.gate;
          const desc = item.dataset.desc;
          const info = QuantumGates.get(gate);
          const mathInfo = info?.latex;

          // Title with KaTeX symbol
          if (tooltipTitle) {
            if (mathInfo) {
              tooltipTitle.innerHTML = `${info?.name || gate} <span>${GateMath.toHTML(mathInfo.symbol)}</span>`;
            } else {
              tooltipTitle.textContent = info?.name || gate;
            }
          }

          if (tooltipDesc) {
            tooltipDesc.innerHTML = desc;
            if (mathInfo?.ket) {
              tooltipDesc.innerHTML += "<br><br><div class=\"tooltip-ket\"></div>";
              GateMath.renderLatex(
                mathInfo.ket,
                tooltipDesc.querySelector(".tooltip-ket"),
                true,
              );
            }
          }

          // Matrix
          if (tooltipMatrix && mathInfo?.matrix) {
            GateMath.renderLatex(mathInfo.matrix, tooltipMatrix, true);
          } else if (tooltipMatrix) {
            tooltipMatrix.innerHTML = "";
          }

          const rect = item.getBoundingClientRect();
          tooltip.style.left = `${rect.right + 8}px`;
          tooltip.style.top = `${rect.top}px`;
          tooltip.classList.add("show");
        }, 1500);
      });

      item.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimeout);
        tooltip.classList.remove("show");
      });
    });
  }

  // Triggers the quantum simulation engine and routes the output results to the UI.
  // Accepts a step number for playback stepping, or null for full run.
  async function runSimulation(stepOverride) {
    if (isRunning) {
      return;
    }
    isRunning = true;

    if (stepOverride === "step") {
      const numSteps = CircuitModel.getNumSteps();
      if (playbackStep === null) {
        playbackStep = 0;
      } else {
        playbackStep++;
      }
      if (playbackStep >= numSteps) {
        playbackStep = numSteps - 1;
      }
    } else {
      playbackStep = null;
    }

    const btn = document.getElementById("btn-run");
    btn?.classList.add("running");

    EventBus.emit("simulation:start");
    CircuitRenderer.animateSimulation();

    try {
      let ops = CircuitModel.toOperations();
      const numQubits = CircuitModel.getNumQubits();
      const numCbits = CircuitModel.getNumCbits();

      // Filter by playback step if active
      if (playbackStep !== null) {
        ops = ops.filter((op) => op.step <= playbackStep);
        document
          .querySelectorAll(".step-active")
          .forEach((el) => el.classList.remove("step-active"));
        document
          .querySelectorAll(`.gate-slot[data-step="${playbackStep}"]`)
          .forEach((el) => el.classList.add("step-active"));
      } else {
        document
          .querySelectorAll(".step-active")
          .forEach((el) => el.classList.remove("step-active"));
      }

      const mode = AppState.getMode();
      let result;

      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Simulation timed out — circuit may be too complex"),
            ),
          SIMULATION_TIMEOUT_MS,
        ),
      );

      if (mode === "shots") {
        const shots = AppState.getShots();
        result = await Promise.race([
          EngineProxy.simulateShots(numQubits, numCbits, ops, shots),
          timeout,
        ]);
      } else {
        result = await Promise.race([
          EngineProxy.simulate(numQubits, numCbits, ops),
          timeout,
        ]);
      }

      EventBus.emit("simulation:complete", { result, mode });
      UI.showToast("Simulation complete");
    } catch (err) {
      console.error("Simulation error:", err);
      UI.showToast(err.message || "Simulation failed", "error");
    } finally {
      isRunning = false;
      btn?.classList.remove("running");
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    runSimulation,
    bindToolbar: () => bindToolbar(runSimulation),
    bindTooltips,
  };
})();
