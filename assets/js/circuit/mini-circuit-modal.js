// QUANTUM LABS — Mini Circuit Modal
// Controls the modal interface for composing custom sub-circuits.

import { GateMath } from "../core/math-renderer.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { CircuitEditor } from "./circuit-editor.js";
import { MiniCircuitRenderer } from "./mini-circuit-renderer.js";
import { ParamPopover } from "../core/param-popover.js";
import { CircuitSerializer } from "./circuit-serializer.js";
import { UI } from "../core/ui-helpers.js";

// Ensure this matches the available gates in the builder
export const U2_PALETTE_GATES = [
  "H", "X", "Y", "Z", "S", "Sdg", "T", "Tdg", "Rx", "Ry", "Rz",
  "CNOT", "CY", "CZ", "CH", "CRx", "CRy", "CRz", "SWAP",
  "Toffoli", "CSWAP", "MCX"
];

export const MiniCircuitModal = (() => {
  "use strict";

  let modalEl = null;
  let miniEditor = null;
  let activeResolve = null;

  // Render the UI HTML template
  function createModalHTML() {
    if (document.getElementById("mini-circuit-modal")) {
      return;
    }
    
    const div = document.createElement("div");
    div.className = "modal-overlay";
    div.id = "mini-circuit-modal";
    div.innerHTML = `
      <div class="modal-container">
        <div class="modal-body et-container" id="mini-circuit-body">
          <div class="param-header">
            <label id="u2-label"></label>
          </div>
          <div id="mini-circuit-palette"></div>
          <div class="et-circuit" id="mini-circuit-grid"></div>
          <div class="modal-actions">
            <div class="modal-actions-left">
              <div class="u1-angle-section mini-circuit-label">Gate Name</div>
              <input type="text" id="u2-name" class="u2-name-input" placeholder="e.g. MyGate">
            </div>
            <div class="modal-actions-right">
              <button class="btn" id="mini-circuit-cancel">Cancel</button>
              <button class="btn btn-primary" id="mini-circuit-ok">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  // Render the component into the DOM
  function renderPalette() {
    const paletteEl = document.getElementById("mini-circuit-palette");
    let allGatesHtml = "";
    
    U2_PALETTE_GATES.forEach(id => {
      const g = QuantumGates.get(id);
      if (!g || !g.palette) {
        return;
      }
      allGatesHtml += `<button class="ql-gate-btn et-palette-btn ${g.type === "multi" ? "et-multi" : ""}" data-gate="${id}" title="${g.name}">
                  <span class="ql-gate-sym">${GateMath?.toHTML(g.palette.label) || id}</span>
                </button>`;
    });

    paletteEl.innerHTML = `
      <div class="gate-category u2-gate-category">
        <div class="ql-group-header u2-group-header">GATE PALETTE</div>
        <div class="mc-gate-grid">${allGatesHtml}</div>
      </div>
      <div class="gate-category">
        <div class="ql-group-header u2-group-header compact">MINI CIRCUIT</div>
      </div>
    `;
  }

  // Opens the custom gate editor.
  // options - Configuration options
  // options.initialName - The initial name of the custom gate
  // options.numQubits - Number of qubits for the grid
  // options.initialSteps - The existing steps data to load (or null for empty)
  // options.isNew - Whether this is a new gate placement
  // Returns - The updated data on OK, or null on Cancel
  function prompt(options) {
    return new Promise((resolve) => {
      createModalHTML();
      modalEl = document.getElementById("mini-circuit-modal");
      activeResolve = resolve;

      const { initialName, numQubits, initialSteps, isNew } = options;
      let stepsData = [];
      if (initialSteps) {
        if (typeof initialSteps === "string") {
          stepsData = CircuitSerializer.decodeMiniGrid(initialSteps, numQubits);
        } else {
          stepsData = JSON.parse(JSON.stringify(initialSteps));
        }
        while (stepsData.length < 7) {
          stepsData.push(new Array(numQubits).fill(null));
        }
      } else {
        stepsData = Array.from({ length: 7 }, () => new Array(numQubits).fill(null));
      }

      const gridEl = document.getElementById("mini-circuit-grid");
      const paletteEl = document.getElementById("mini-circuit-palette");
      const u2Label = document.getElementById("u2-label");
      const nameInput = document.getElementById("u2-name");
      const btnOk = document.getElementById("mini-circuit-ok");
      const btnCancel = document.getElementById("mini-circuit-cancel");

      // Setup UI
      nameInput.value = initialName || "";
      u2Label.innerHTML = GateMath.toHTML("\\mathbf{U}_2") + (isNew ? " Custom Gate Creation" : " Edit Custom Gate");
      renderPalette();
      modalEl.classList.add("open");

      // Render the component into the DOM
      const renderGrid = () => {
        MiniCircuitRenderer.render(gridEl, { numQubits, steps: stepsData, pendingMulti: miniEditor.getPending ? miniEditor.getPending() : null }, miniEditor);
        const addBtn = gridEl.querySelector(".add-step-btn");
        if (addBtn) {
          addBtn.addEventListener("click", () => {
            stepsData.push(new Array(numQubits).fill(null));
            renderGrid();
          });
        }
        
        // Bind edit param buttons
        gridEl.querySelectorAll(".edit-param-btn").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const cell = btn.closest(".et-cell");
            if (!cell) {
              return;
            }
            const step = parseInt(cell.getAttribute("data-step"), 10);
            const qubit = parseInt(cell.getAttribute("data-qubit"), 10);
            const slot = stepsData[step][qubit];
            if (slot) {
              showParamPopover(step, qubit, slot.gate, cell, false);
            }
          });
        });
      };

      const showParamPopover = (step, qubit, gate, referenceEl, isNew) => {
        const slot = stepsData[step][qubit];
        const currentParam = slot?.param || null;
        
        ParamPopover.show(
          gate,
          referenceEl,
          (newParam) => {
            stepsData[step][qubit].param = newParam;
            renderGrid();
          },
          currentParam,
          () => {
            if (isNew) {
              stepsData[step][qubit] = null;
              renderGrid();
            }
          }
        );
      };

      miniEditor = CircuitEditor.create({
        gridContainer: gridEl,
        paletteContainer: paletteEl,
        paletteSelector: ".et-palette-btn",
        getGateInfo: (g) => QuantumGates.get(g),
        onPlace: (s, g, q, _p) => {
          const info = QuantumGates.get(g);
          if (q.length === 1) {
            stepsData[s][q[0]] = { gate: g, role: "single", linkedQubits: [...q] };
          } else {
            const startQ = Math.min(...q);
            const endQ = Math.max(...q);
            for (let i = startQ; i <= endQ; i++) {
              stepsData[s][i] = { gate: g, role: "wire", linkedQubits: [...q] };
            }
            stepsData[s][q[q.length - 1]].role = "target";
            for (let i = 0; i < q.length - 1; i++) {
              stepsData[s][q[i]].role = "control";
            }
          }
          renderGrid();

          if (info && info.param && q.length === 1) {
            const slotEl = gridEl.querySelector(`.ql-placed-gate[data-step="${s}"][data-qubit="${q[0]}"]`);
            if (slotEl) {
              showParamPopover(s, q[0], g, slotEl, true);
            }
          }
        },
        onDelete: (s, q) => {
          const slot = stepsData[s][q];
          if (!slot) {
            return;
          }
          if (slot.linkedQubits && slot.linkedQubits.length > 1) {
            const minP = Math.min(...slot.linkedQubits);
            const maxP = Math.max(...slot.linkedQubits);
            for (let i = minP; i <= maxP; i++) stepsData[s][i] = null;
          } else {
            stepsData[s][q] = null;
          }
          renderGrid();
        },
        onMove: (oldStep, oldQubit, newStep, newQubit) => {
          const slot = stepsData[oldStep][oldQubit];
          if (!slot || !slot.gate) {
            return;
          }
          
          const deltaQ = newQubit - oldQubit;
          const qubits = slot.linkedQubits || [oldQubit];
          const newQubits = qubits.map(q => q + deltaQ);
          
          if (newQubits.some(q => q < 0 || q >= maxQubits)) {
            return;
          }
          
          // Clear old
          if (slot.linkedQubits && slot.linkedQubits.length > 1) {
            const minP = Math.min(...slot.linkedQubits);
            const maxP = Math.max(...slot.linkedQubits);
            for (let i = minP; i <= maxP; i++) stepsData[oldStep][i] = null;
          } else {
            stepsData[oldStep][oldQubit] = null;
          }
          
          // Place new
          const g = slot.gate;
          const q = newQubits;
          if (q.length === 1) {
            stepsData[newStep][q[0]] = { gate: g, role: "single", linkedQubits: [...q] };
            if (slot.param) {
              stepsData[newStep][q[0]].param = slot.param;
            }
          } else {
            const startQ = Math.min(...q);
            const endQ = Math.max(...q);
            for (let i = startQ; i <= endQ; i++) {
              stepsData[newStep][i] = { gate: g, role: "wire", linkedQubits: [...q] };
            }
            stepsData[newStep][q[q.length - 1]].role = "target";
            for (let i = 0; i < q.length - 1; i++) {
              stepsData[newStep][q[i]].role = "control";
            }
          }
          renderGrid();
        },
        onPendingChange: () => renderGrid()
      });

      renderGrid();

      // Handlers
      const cleanup = (result) => {
        modalEl.classList.remove("open");
        
        btnOk.replaceWith(btnOk.cloneNode(true));
        btnCancel.replaceWith(btnCancel.cloneNode(true));
        
        if (typeof miniEditor.destroy === "function") {
          miniEditor.destroy();
        }
        miniEditor = null;
        
        activeResolve(result);
        activeResolve = null;
      };

      document.getElementById("mini-circuit-ok").addEventListener("click", () => {
        const gateName = nameInput.value.trim() || "U₂";
        let lastFilled = -1;
        for (let i = stepsData.length - 1; i >= 0; i--) {
          if (stepsData[i].some(cell => cell !== null)) {
            lastFilled = i;
            break;
          }
        }
        const prunedSteps = lastFilled >= 0 ? stepsData.slice(0, lastFilled + 1) : [];
        const finalSteps = CircuitSerializer.encodeMiniGrid(prunedSteps);
        cleanup({ name: gateName, steps: finalSteps });
      });

      document.getElementById("mini-circuit-cancel").addEventListener("click", () => {
        cleanup(null);
      });
    });
  }

  return {
    prompt
  };
})();
