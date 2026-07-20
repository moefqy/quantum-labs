// QUANTUM LABS — Circuit Export
// Handles exporting the quantum circuit to PNG, LaTeX, Qiskit, and Cirq.

import { CircuitModel } from "./circuit-model.js";

import { QuantumGates } from "../core/quantum-gates.js";
import { Icons } from "../core/ui-icons.js";
import { UI } from "../core/ui-helpers.js";

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
      backgroundColor:
        document.documentElement.getAttribute("data-theme") === "light"
          ? "#FFFFFF"
          : "#0A0A0A",
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

  // Safely convert a param value to a display string
  function _paramToStr(param) {
    if (param == null) {
      return "";
    }
    return String(param);
  }

  // Generates and displays LaTeX code using the Qcircuit package for the current circuit.
  function exportToLatex() {
    const numQubits = CircuitModel.getNumQubits();
    const numSteps = CircuitModel.getNumSteps();
    const grid = CircuitModel.getGrid();

    const lines = [];
    lines.push("\\documentclass{article}");
    lines.push("\\usepackage{qcircuit}");
    lines.push("\\usepackage{braket}");
    lines.push("\\begin{document}");
    lines.push("");
    lines.push("\\Qcircuit @C=1em @R=.7em {");

    for (let q = 0; q < numQubits; q++) {
      const parts = [`  \\lstick{\\ket{q_{${q}}}}`];
      for (let s = 0; s < numSteps; s++) {
        const cell = grid[s][q];
        if (!cell) {
          parts.push("\\qw");
          continue;
        }

        const gate = cell.gate;
        if (cell.linkedQubits) {
          if (gate === "CNOT" || gate === "CZ") {
            const isControl = cell.linkedQubits[0] === q;
            const targetQ = cell.linkedQubits[1];
            if (isControl) {
              parts.push(`\\ctrl{${targetQ - q}}`);
            } else {
              parts.push(gate === "CNOT" ? "\\targ" : "\\gate{Z}");
            }
          } else if (gate === "SWAP") {
            const otherQ =
              cell.linkedQubits[0] === q
                ? cell.linkedQubits[1]
                : cell.linkedQubits[0];
            parts.push(`\\qswap \\qwx[${otherQ - q}]`);
          } else {
            parts.push(`\\gate{${gate}}`);
          }
        } else {
          const pStr = _paramToStr(cell.param);
          const label = pStr ? `${gate}(${pStr})` : gate;
          parts.push(`\\gate{${label}}`);
        }
      }
      parts.push("\\qw");
      lines.push(`${parts.join(" & ")} \\\\`);
    }

    lines.push("}");
    lines.push("");
    lines.push("\\end{document}");

    showExportModal("LaTeX (Qcircuit)", lines.join("\n"));
  }

  // Generates and displays Python code using the Qiskit library for the current circuit.
  function exportToQiskit() {
    const numQubits = CircuitModel.getNumQubits();
    const numSteps = CircuitModel.getNumSteps();
    const grid = CircuitModel.getGrid();

    const lines = [];
    lines.push("from qiskit import QuantumCircuit");
    lines.push("import numpy as np");
    lines.push("");
    lines.push(`qc = QuantumCircuit(${numQubits})`);
    lines.push("");

    for (let s = 0; s < numSteps; s++) {
      const processed = new Set();
      for (let q = 0; q < numQubits; q++) {
        const cell = grid[s][q];
        if (!cell || processed.has(q)) {
          continue;
        }

        const gate = cell.gate;
        const gateInfo = QuantumGates.get(gate);

        if (cell.linkedQubits) {
          cell.linkedQubits.forEach((lq) => processed.add(lq));
          const qargs = cell.linkedQubits.join(", ");

          if (gateInfo && gateInfo.qiskit) {
            if (gateInfo.param) {
              const param = _paramToStr(cell.param);
              const paramQiskit = param.replace(/π|pi/gi, "np.pi");
              lines.push(
                `qc.${gateInfo.qiskit}(${paramQiskit || "0"}, ${qargs})`,
              );
            } else {
              lines.push(`qc.${gateInfo.qiskit}(${qargs})`);
            }
          }
        } else {
          processed.add(q);
          const param = _paramToStr(cell.param);
          const paramQiskit = param.replace(/π|pi/gi, "np.pi");

          if (gate === "M") {
            // Skip measurement for now — would need classical register
            lines.push(`# qc.measure(${q}, ${q})`);
          } else if (gateInfo && gateInfo.qiskit) {
            if (gateInfo.param) {
              lines.push(`qc.${gateInfo.qiskit}(${paramQiskit || "0"}, ${q})`);
            } else {
              lines.push(`qc.${gateInfo.qiskit}(${q})`);
            }
          }
        }
      }
    }

    lines.push("");
    lines.push("print(qc.draw())");

    showExportModal("Qiskit Python Code", lines.join("\n"));
  }

  // Generates and displays Python code using the Google Cirq library for the current circuit.
  function exportToCirq() {
    const numQubits = CircuitModel.getNumQubits();
    const numSteps = CircuitModel.getNumSteps();
    const grid = CircuitModel.getGrid();

    const lines = [];
    lines.push("import cirq");
    lines.push("import numpy as np");
    lines.push("");
    lines.push(`qubits = cirq.LineQubit.range(${numQubits})`);
    lines.push("circuit = cirq.Circuit()");
    lines.push("");

    for (let s = 0; s < numSteps; s++) {
      const processed = new Set();
      const stepOps = [];

      for (let q = 0; q < numQubits; q++) {
        const cell = grid[s][q];
        if (!cell || processed.has(q)) {
          continue;
        }

        const gate = cell.gate;
        const gateInfo = QuantumGates.get(gate);

        if (cell.linkedQubits) {
          cell.linkedQubits.forEach((lq) => processed.add(lq));
          const qargs = cell.linkedQubits
            .map((lq) => `qubits[${lq}]`)
            .join(", ");

          if (gateInfo && gateInfo.cirq) {
            if (gateInfo.param) {
              const param = _paramToStr(cell.param);
              const paramCirq = param.replace(/π|pi/gi, "np.pi");
              // Use cphase or similar functions that accept (theta)(qubits...)
              const cirqGateName =
                gateInfo.cirq === "CZPowGate" ? "cphase" : gateInfo.cirq;
              stepOps.push(
                `cirq.${cirqGateName}(${paramCirq || "0"})(${qargs})`,
              );
            } else {
              stepOps.push(`cirq.${gateInfo.cirq}(${qargs})`);
            }
          }
        } else {
          processed.add(q);
          const param = _paramToStr(cell.param);
          const paramCirq = param.replace(/π|pi/gi, "np.pi");

          if (gate === "M") {
            stepOps.push(`cirq.measure(qubits[${q}], key='m${q}')`);
          } else if (gateInfo && gateInfo.cirq) {
            if (gateInfo.param) {
              stepOps.push(
                `cirq.${gateInfo.cirq}(${paramCirq || "0"})(qubits[${q}])`,
              );
            } else {
              stepOps.push(`cirq.${gateInfo.cirq}(qubits[${q}])`);
            }
          }
        }
      }

      if (stepOps.length > 0) {
        if (stepOps.length === 1) {
          lines.push(`circuit.append(${stepOps[0]})`);
        } else {
          lines.push("circuit.append([");
          stepOps.forEach((op, i) => {
            lines.push(`    ${op}${i < stepOps.length - 1 ? "," : ""}`);
          });
          lines.push("])");
        }
      }
    }

    lines.push("");
    lines.push("print(circuit)");

    showExportModal("Cirq Python Code", lines.join("\n"));
  }

  return {
    exportToPNG,
    exportToLatex,
    exportToQiskit,
    exportToCirq,
  };
})();
