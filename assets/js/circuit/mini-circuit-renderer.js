// QUANTUM LABS — Mini Circuit Renderer
// Renders a compact, interactive mini-circuit grid for modals.

import { GateMath } from "../core/math-renderer.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { CircuitRenderer } from "./circuit-renderer.js";
import { Icons } from "../core/ui-icons.js";

export const MiniCircuitRenderer = (() => {
  "use strict";

  // Renders a compact, mini interactive circuit grid
  function render(container, state, editor) {
    const { numQubits, steps, pendingMulti } = state;
    if (!container) {
      return;
    }

    let html = `<div class="et-grid" style="--et-steps:${steps.length + 1};--et-qubits:${numQubits};">`;
    html += "<div class=\"et-grid-corner\"></div>";
    for (let s = 0; s < steps.length; s++) {
      html += `<div class="et-col-head">${GateMath.toHTML(`T_{${s + 1}}`)}</div>`;
    }
    html += "<div class=\"et-col-head add-step-btn\" title=\"Add Step\">+</div>";

    // Render the grid cells
    for (let q = 0; q < numQubits; q++) {
      html += `<div class="et-row-head">${GateMath.toHTML(`|q_{${q}}\\rangle`)}</div>`;
      for (let s = 0; s < steps.length; s++) {
        const cell = steps[s][q];
        const hasGate = cell !== null;
        const isTarget = cell && cell.role === "target";
        const isControl = cell && cell.role === "control";
        const isPending =
          pendingMulti &&
          pendingMulti.step === s &&
          pendingMulti.qubits.includes(q);

        let cellClass = "et-cell ql-drop-zone";
        if (hasGate) {
          cellClass += " et-cell-filled ql-placed-gate";
        }
        if (isTarget) {
          cellClass += " et-cell-target";
        }
        if (isControl) {
          cellClass += " et-cell-control";
        }
        if (isPending) {
          cellClass += " et-cell-pending";
        }

        html += `<div class="${cellClass}" data-step="${s}" data-qubit="${q}">`;

        // if the cell is a wire or control gate, render the wire
        if ((isControl || isTarget || (cell && cell.role === "wire")) && cell.linkedQubits && cell.linkedQubits.length > 1) {
          const minQ = Math.min(...cell.linkedQubits);
          if (q === minQ) {
            const maxQ = Math.max(...cell.linkedQubits);
            
            const minCell = steps[s][minQ];
            const maxCell = steps[s][maxQ];
            
            const isBoxTarget = (c) => {
              if (c && c.role === "target") {
                const gDef = QuantumGates.get(c.gate);
                const sym = gDef?.render?.target;
                return sym && sym !== "cross" && sym !== "swap" && sym !== "dot";
              }
              return false;
            };
            
            let topOffset = 15;
            let height = (maxQ - minQ) * 34;
            
            if (isBoxTarget(minCell)) {
               topOffset = 30;
               height -= 15;
            }
            if (isBoxTarget(maxCell)) {
               height -= 15;
            }
            
            html += `<div class="et-connector" style="top:${topOffset}px;height:${height}px;"></div>`;
          }
        }

        // if it is a control gate, render the control symbol
        if (isControl) {
          const gateDef = QuantumGates.get(cell.gate);
          const controlSymbol = gateDef?.render?.control;
          if (controlSymbol === "swap") {
            html += "<div class=\"et-swap-x\"></div>";
          } else {
            html += "<div class=\"et-ctrl-dot\"></div>";
          }
        // if the cell is a target gate, render the target symbol
        } else if (isTarget) {
          const gateDef = QuantumGates.get(cell.gate);
          const targetSymbol = gateDef?.render?.target;
          if (targetSymbol === "cross") {
            html += "<div class=\"et-targ-circle\"><div class=\"et-targ-cross\"></div></div>";
          } else if (targetSymbol === "swap") {
            html += "<div class=\"et-swap-x\"></div>";
          } else if (targetSymbol === "dot") {
            html += "<div class=\"et-ctrl-dot\"></div>";
          } else if (targetSymbol) {
            html += `<div class="box-target"><div class="et-cell-label">${GateMath.toHTML(targetSymbol)}</div></div>`;
          }
        // if it is a single gate, render the gate symbol
        } else if (hasGate && cell.role === "single") {
          const gateDef = QuantumGates.get(cell.gate);
          const label = gateDef?.palette?.label ?? `\\mathbf{${cell.gate}}`;
          html += `<span class="et-cell-label">${GateMath.toHTML(label)}</span>`;
          
          if (cell.param != null && cell.param !== "") {
            let badgeText = "";
            if (cell.gate === "U1") {
              try {
                const p = JSON.parse(cell.param);
                badgeText = p.name || "U₁";
              } catch {
                badgeText = "U₁";
              }
            } else {
              badgeText = GateMath.toHTML(CircuitRenderer.formatParam(cell.param));
            }
            html += `<span class="param-badge">${badgeText}</span>`;
          }
          if (gateDef?.param) {
            html += `<div class="edit-param-btn" title="Edit Parameters">${Icons.edit}</div>`;
          }
        // if the cell is empty, render the empty cell
        } else if (!hasGate) {
          html += "<div class=\"et-cell-empty-inner\"></div>";
        }

        html += "</div>";
      }
      html += "<div class=\"et-cell empty\"></div>";
    }
    html += "</div>";
    container.innerHTML = html;

    if (editor) {
      editor.bindSlots();
    }
  }

  return {
    render,
  };
})();
