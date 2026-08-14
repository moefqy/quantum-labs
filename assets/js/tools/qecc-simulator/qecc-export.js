// QUANTUM LABS — QECC Export
// UI coordinator for QECC export: modal overlay, copy-to-clipboard.
// Code generation is delegated to core exporter modules.

import { exportQeccQiskit } from "../../core/exporters/qecc-qiskit-exporter.js";
import { exportQeccCirq } from "../../core/exporters/qecc-cirq-exporter.js";
import { Icons } from "../../ui/ui-icons.js";
import { UI } from "../../ui/ui-helpers.js";

export const QECCExportManager = (function () {
  // Creates and displays a custom modal overlay for showing exported code.
  function showExportModal(title, code) {
    // Use our own dedicated export overlay
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

  // Generates and displays Qiskit Python code for the analyzed QECC code.
  function exportToQiskit(qeccData) {
    if (!qeccData) return;
    const code = exportQeccQiskit(qeccData);
    showExportModal("Qiskit Python Code", code);
  }

  // Generates and displays Cirq Python code for the analyzed QECC code.
  function exportToCirq(qeccData) {
    if (!qeccData) return;
    const code = exportQeccCirq(qeccData);
    showExportModal("Cirq Python Code", code);
  }

  return {
    exportToQiskit,
    exportToCirq,
  };
})();
