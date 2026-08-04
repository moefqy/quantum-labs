// QUANTUM LABS — Circuit Export
// UI coordinator for circuit export: modal overlay, copy-to-clipboard, and PNG capture.
// Code generation is delegated to core exporter modules.

import { CircuitModel } from "./circuit-model.js";

import { exportQiskit } from "../../core/exporters/qiskit-exporter.js";
import { exportCirq } from "../../core/exporters/cirq-exporter.js";
import { exportLatex } from "../../core/exporters/latex-exporter.js";
import { Icons } from "../../ui/ui-icons.js";
import { AppState } from "../../core/app-state.js";
import { UI } from "../../ui/ui-helpers.js";

export const ExportManager = (function () {
  // Creates and displays a custom modal overlay for showing exported code.
  function showExportModal(title, code) {
    // Use our own dedicated export overlay — NOT the main tool modal
    let overlay = document.getElementById("export-overlay");
    if (!overlay) {
      // Create it dynamically if it doesn't exist yet
      overlay = document.createElement("div");
      overlay.id = "export-overlay";
      overlay.className = "export-overlay";
      overlay.innerHTML = `
        <div class="export-backdrop"></div>
        <div class="export-dialog">
          <div class="export-dialog-header">
            <h3 class="export-dialog-title"></h3>
            <button class="modal-close" id="export-close" title="Close">
              ${Icons.close}
            </button>
          </div>
          <div class="export-dialog-body">
            <div class="export-code-wrap">
              <pre class="export-code"><code id="export-code-content"></code></pre>
              <button class="btn btn-primary export-copy-btn" id="export-copy-btn">Copy</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    // Populate content
    overlay.querySelector(".export-dialog-title").textContent = title;
    document.getElementById("export-code-content").textContent = code;

    // Show
    overlay.classList.add("open");

    // Close handlers
    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("export-close").onclick = closeModal;
    overlay.querySelector(".export-backdrop").onclick = closeModal;

    // Escape key
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);

    // Copy
    document.getElementById("export-copy-btn").onclick = () => {
      const btn = document.getElementById("export-copy-btn");
      UI.copyToClipboard(code)
        .then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy"), 2000);
        })
        .catch(() => {
          UI.showToast("Copy failed", "error");
        });
    };
  }

  // Captures the current quantum circuit DOM element and exports it as a downloadable PNG image.
  function exportToPNG() {
    const board = document.getElementById("circuit-board");
    if (!board) {
      return;
    }

    if (typeof html2canvas === "undefined") {
      UI.showToast("PNG library is still loading, try again", "error");
      return;
    }

    UI.showToast("Exporting PNG…");

    // Temporarily shrink board to fit its contents exactly
    const originalMinHeight = board.style.minHeight;
    const originalMinWidth = board.style.minWidth;
    board.style.minHeight = "auto";
    board.style.minWidth = "max-content";

    html2canvas(board, {
      backgroundColor: getComputedStyle(document.body).getPropertyValue("--obsidian").trim(),
      scale: 2,
      useCORS: true,
    })
      .then((canvas) => {
        // Restore original dimensions
        board.style.minHeight = originalMinHeight;
        board.style.minWidth = originalMinWidth;

        const link = document.createElement("a");
        link.download = "quantum-circuit.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        UI.showToast("PNG saved");
      })
      .catch(() => {
        // Restore on error
        board.style.minHeight = originalMinHeight;
        board.style.minWidth = originalMinWidth;
        UI.showToast("PNG export failed", "error");
      });
  }

  // Read current circuit state from CircuitModel and AppState
  function getCircuitData() {
    return {
      numQubits: CircuitModel.getNumQubits(),
      numCbits: CircuitModel.getNumCbits(),
      numSteps: CircuitModel.getNumSteps(),
      grid: CircuitModel.getGrid(),
      operations: CircuitModel.toOperations(),
      mode: AppState.getMode(),
      shots: AppState.getShots(),
    };
  }

  // Generates and displays LaTeX code for the current circuit.
  function exportToLatex() {
    const code = exportLatex(getCircuitData());
    showExportModal("LaTeX (Qcircuit)", code);
  }

  // Generates and displays Qiskit Python code for the current circuit.
  function exportToQiskit() {
    const code = exportQiskit(getCircuitData());
    showExportModal("Qiskit Python Code", code);
  }

  // Generates and displays Cirq Python code for the current circuit.
  function exportToCirq() {
    const code = exportCirq(getCircuitData());
    showExportModal("Cirq Python Code", code);
  }

  return {
    exportToPNG,
    exportToLatex,
    exportToQiskit,
    exportToCirq,
  };
})();
