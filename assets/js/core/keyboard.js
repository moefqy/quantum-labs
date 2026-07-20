// QUANTUM LABS — Keyboard
// Global keyboard handler for the circuit builder modal.

import { CircuitModel } from "../circuit/circuit-model.js";
import { CircuitRenderer } from "../circuit/circuit-renderer.js";
import { SimulatorPage } from "../pages/simulator.js";
import { updateQubitDisplay } from "../circuit/circuit-display.js";
import { EventBus } from "./event-bus.js";

// Sets up global keyboard shortcuts for the simulation (e.g., Undo, Redo, Delete, Run).
export function bindKeyboard(runSimulation) {
  document.addEventListener("keydown", (e) => {
    // Don't intercept when typing in inputs
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    // Escape closes modal / popover / menus / selection
    if (e.key === "Escape") {
      const popover = document.getElementById("param-popover");
      if (popover && popover.classList.contains("show")) {
        document.getElementById("param-cancel")?.click();
        return;
      }

      if (SimulatorPage.isModalOpen()) {
        SimulatorPage.closeTool();
        return;
      }

      EventBus.emit("circuit:cancel-pending");
      document.getElementById("context-menu")?.classList.remove("show");
      document.getElementById("preset-menu")?.classList.remove("show");
      document
        .querySelectorAll(".placed-gate.selected")
        .forEach((g) => g.classList.remove("selected"));
      return;
    }

    // Only handle circuit shortcuts when modal is open
    if (!SimulatorPage.isModalOpen()) {
      return;
    }

    // Keyboard shortcuts
    // Undo: Cmd+Z
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (CircuitModel.undo()) {
        CircuitRenderer.render();
        updateQubitDisplay();
      }
    // Redo: Cmd+Y or Cmd+Z+Shift
    } else if (
      (e.metaKey || e.ctrlKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      if (CircuitModel.redo()) {
        CircuitRenderer.render();
        updateQubitDisplay();
      }
    // Run: Cmd+Enter
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runSimulation(null);
    // Delete: Delete or Backspace
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const selected = document.querySelector(".placed-gate.selected");
      if (selected) {
        e.preventDefault();
        const step = parseInt(selected.dataset.step);
        const qubit = parseInt(selected.dataset.qubit);
        CircuitModel.removeGate(step, qubit);
        CircuitRenderer.render();
        UI.showToast("Gate deleted");
      }
    }
  });
}
