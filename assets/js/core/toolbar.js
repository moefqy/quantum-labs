// QUANTUM LABS — Toolbar
// Binds all circuit builder toolbar button events:
// Run, Step, Reset, Clear, Undo/Redo, Register controls,
// Shots slider, Mode toggle, Presets, Save, Copy Link, Export.

import { AppState } from "./app-state.js";
import { CircuitModel } from "../circuit/circuit-model.js";
import { CircuitRenderer } from "../circuit/circuit-renderer.js";
import { CircuitSerializer } from "../circuit/circuit-serializer.js";
import { EventBus } from "./event-bus.js";
import { ExportManager } from "../circuit/circuit-export.js";
import { UI } from "./ui-helpers.js";
import { syncUrl } from "./url-manager.js";
import { updateQubitDisplay } from "../circuit/circuit-display.js";

// Positions a dropdown menu contextually beneath its triggering button.
function positionMenu(btn, menu) {
  if (!btn || !menu) {
    return;
  }
  if (menu.parentNode !== document.body) {
    document.body.appendChild(menu);
  }
  const rect = btn.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  let left = rect.left;
  menu.classList.add("show");
  const menuWidth = menu.offsetWidth;
  if (left + menuWidth > window.innerWidth - 8) {
    left = rect.right - menuWidth;
  }
  menu.style.left = `${left}px`;
}

// Attaches event listeners for all top toolbar actions.
export function bindToolbar(runSimulation) {
  // Run simulation
  document.getElementById("btn-run")?.addEventListener("click", () => {
    runSimulation(null);
  });

  // Step-forward simulation
  document.getElementById("btn-step-forward")?.addEventListener("click", () => {
    runSimulation("step");
  });

  // Reset simulation
  document
    .getElementById("btn-reset-playback")
    ?.addEventListener("click", () => {
      EventBus.emit("simulation:clear");
      UI.showToast("Simulation results cleared");
    });

  // Clear circuit
  document.getElementById("btn-clear")?.addEventListener("click", () => {
    CircuitModel.clear();
    EventBus.emit("simulation:clear");
    CircuitRenderer.render();
    UI.showToast("Circuit cleared");
  });

  // Undo circuit
  document.getElementById("btn-undo")?.addEventListener("click", () => {
    if (CircuitModel.undo()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    }
  });

  // Redo circuit
  document.getElementById("btn-redo")?.addEventListener("click", () => {
    if (CircuitModel.redo()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    }
  });

  // Add qubit
  document.getElementById("btn-add-qubit")?.addEventListener("click", () => {
    if (CircuitModel.addQubit()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    } else {
      UI.showToast("Maximum 8 qubits", "error");
    }
  });

  // Remove qubit
  document.getElementById("btn-remove-qubit")?.addEventListener("click", () => {
    if (CircuitModel.removeQubit()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    } else {
      UI.showToast("Minimum 1 qubit", "error");
    }
  });

  // Add cbit
  document.getElementById("btn-add-cbit")?.addEventListener("click", () => {
    if (CircuitModel.addCbit()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    } else {
      UI.showToast("Maximum 5 classical bits", "error");
    }
  });

  // Remove cbit
  document.getElementById("btn-remove-cbit")?.addEventListener("click", () => {
    if (CircuitModel.removeCbit()) {
      CircuitRenderer.render();
      updateQubitDisplay();
    } else {
      UI.showToast("Minimum 0 classical bits", "error");
    }
  });

  // Shots Slider Sync
  const shotsSlider = document.getElementById("sim-shots-slider");
  const shotsInput = document.getElementById("sim-shots-input");
  UI.bindSlider(shotsSlider, shotsInput, (val) => {
    let intVal = parseInt(val, 10);
    if (isNaN(intVal) || intVal < 1) {
      intVal = 1024;
    }
    AppState.setShots(intVal);
    syncUrl();
  });

  // Simulation mode segmented buttons
  document.querySelectorAll(".segmented-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const mode = e.currentTarget.dataset.mode;
      AppState.setMode(mode);
      syncUrl();
    });
  });

  // Presets
  const presetBtn = document.getElementById("btn-presets");
  const presetMenu = document.getElementById("preset-menu");
  const exportMenu = document.getElementById("export-menu");

  presetBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu?.classList.remove("show");
    if (presetMenu?.classList.contains("show")) {
      presetMenu.classList.remove("show");
    } else {
      positionMenu(presetBtn, presetMenu);
    }
  });

  // Preset menu items
  document.querySelectorAll(".preset-menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      const url = item.dataset.url;
      const result = CircuitModel.loadFromUrlParams(url);
      if (result) {
        AppState.restoreFromResult(result);
        CircuitRenderer.render();
        updateQubitDisplay();
        EventBus.emit("simulation:clear");
        presetMenu?.classList.remove("show");
        UI.showToast(
          `Loaded preset: ${item.querySelector(".preset-name")?.textContent}`,
        );
      }
    });
  });

  // Save Circuit Button
  document.getElementById("btn-save-circuit")?.addEventListener("click", () => {
    const name = prompt("Name your circuit:", "My Circuit");
    if (!name || !name.trim()) {
      return;
    }

    const mode = AppState.getMode();
    const shots = AppState.getShots();
    const url = CircuitSerializer.encode(CircuitModel, mode, shots);

    const saved = JSON.parse(localStorage.getItem("ql_saved_circuits") || "[]");
    saved.push({ name: name.trim(), url });
    localStorage.setItem("ql_saved_circuits", JSON.stringify(saved));
    UI.showToast(`Saved "${name.trim()}" to My Circuits`);
  });

  // Copy Link Button
  document.getElementById("btn-copy-link")?.addEventListener("click", () => {
    UI.copyToClipboard(window.location.href)
      .then(() => {
        UI.showToast("Link copied to clipboard!");
      })
      .catch(() => {
        UI.showToast("Failed to copy link", "error");
      });
  });

  // Export Menu
  const exportBtn = document.getElementById("btn-export");
  exportBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    presetMenu?.classList.remove("show");
    if (exportMenu?.classList.contains("show")) {
      exportMenu.classList.remove("show");
    } else {
      positionMenu(exportBtn, exportMenu);
    }
  });

  // Close menus on click outside
  document.addEventListener("click", () => {
    presetMenu?.classList.remove("show");
    exportMenu?.classList.remove("show");
  });

  // Export Actions
  // Export PNG
  document.getElementById("btn-save-png")?.addEventListener("click", () => {
    exportMenu?.classList.remove("show");
    ExportManager.exportToPNG();
  });

  // Export LaTeX
  document.getElementById("btn-save-latex")?.addEventListener("click", () => {
    exportMenu?.classList.remove("show");
    ExportManager.exportToLatex();
  });

  // Export Qiskit
  document.getElementById("btn-export-qiskit")?.addEventListener("click", () => {
    exportMenu?.classList.remove("show");
    ExportManager.exportToQiskit();
  });

  // Export Cirq
  document.getElementById("btn-export-cirq")?.addEventListener("click", () => {
    exportMenu?.classList.remove("show");
    ExportManager.exportToCirq();
  });

  // Initial disable check so the palette reflects the current circuit
  updateQubitDisplay();
}
