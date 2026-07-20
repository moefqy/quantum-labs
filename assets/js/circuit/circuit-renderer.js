// QUANTUM LABS — Circuit Renderer
// Renders the circuit board from the CircuitModel data.

import { CircuitModel } from "./circuit-model.js";
import { EventBus } from "../core/event-bus.js";
import { GateMath } from "../core/math-renderer.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { Icons } from "../core/ui-icons.js";

export const CircuitRenderer = (() => {
  "use strict";

  // Retrieves the DOM element for the circuit board.
  const board = () => document.getElementById("circuit-board");

  // Rebuilds the entire circuit HTML based on the current quantum state.
  function render() {
    const el = board();
    if (!el) {
      return;
    }

    const numQubits = CircuitModel.getNumQubits();
    const numCbits = CircuitModel.getNumCbits();
    const numSteps = CircuitModel.getNumSteps();
    const grid = CircuitModel.getGrid();

    el.innerHTML = "";

    for (let q = 0; q < numQubits + numCbits; q++) {
      const isCbit = q >= numQubits;
      const cbitIndex = q - numQubits;

      const row = document.createElement("div");
      row.className = isCbit ? "qubit-row cbit-row" : "qubit-row";
      row.dataset.qubit = q;

      // Label
      const label = document.createElement("div");
      label.className = "qubit-label";
      if (isCbit) {
        label.innerHTML = GateMath.toHTML(`c_{${cbitIndex}}`);
      } else {
        label.innerHTML = GateMath.toHTML(`|q_{${q}}\\rangle`);
      }
      row.appendChild(label);

      // Wire with gate slots
      const wire = document.createElement("div");
      wire.className = isCbit ? "qubit-wire cbit-wire" : "qubit-wire";

      const slots = document.createElement("div");
      slots.className = "gate-slots";

      for (let s = 0; s < numSteps; s++) {
        const slot = document.createElement("div");
        slot.className = "gate-slot ql-drop-zone";
        slot.dataset.step = s;
        slot.dataset.qubit = q;

        const cell = grid[s]?.[q];
        if (cell) {
          slot.classList.add("occupied");
          const gateEl = createGateElement(cell, s, q);
          slot.appendChild(gateEl);
        } else {
          slot.classList.add("empty");
        }

        slots.appendChild(slot);
      }

      // Add-step drop zone at the end
      const addStepCol = document.createElement("div");
      addStepCol.className = "add-step-zone ql-drop-zone";
      addStepCol.dataset.step = numSteps;
      addStepCol.dataset.qubit = q;
      addStepCol.innerHTML = "<span>+</span>";
      addStepCol.title = "Drop a gate here to add a new step";
      slots.appendChild(addStepCol);

      wire.appendChild(slots);
      row.appendChild(wire);

      el.appendChild(row);
    }

    // Render multi-qubit connectors
    renderConnectors();

    // Notify listeners that the circuit has been re-rendered (used for URL syncing)
    EventBus.emit("circuit:rendered");
  }

  // Generates the DOM element for a specific quantum gate on the grid.
  function createGateElement(cell, step, qubit) {
    const el = document.createElement("div");
    el.className = "placed-gate ql-placed-gate";
    el.dataset.step = step;
    el.dataset.qubit = qubit;
    el.dataset.gate = cell.gate;
    if (cell.param) {
      el.dataset.param = cell.param;
    }

    const info = QuantumGates.get(cell.gate);

    if (info?.type === "multi") {
      el.classList.add("multi-gate");

      if (info.targets === "span") {
        el.classList.add("span-gate-hidden");
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return el;
      }

      // Fully dynamic rendering via gateDef.render
      const renderDef = info.render;
      if (renderDef) {
        el.innerHTML = "";
        const symbolKey =
          cell.role === "control" ? renderDef.control : renderDef.target;

        if (symbolKey === "meter") {
          // Quantum side of M gate — measurement box
          el.classList.remove("multi-gate");
          el.classList.add("measure-gate");
          el.innerHTML = GateMath.toHTML("\\mathcal{M}");
        } else if (symbolKey === "cbit-dot") {
          // Classical bit slot (target of M, or control of c-X/c-Z)
          el.classList.add("cbit-result-slot");
          const dot = document.createElement("div");
          dot.className = "classical-control-dot";
          el.appendChild(dot);
        } else if (symbolKey === "dot") {
          const dot = document.createElement("div");
          dot.className = "control-dot";
          el.appendChild(dot);
        } else if (symbolKey === "cross") {
          const target = document.createElement("div");
          target.className = "target-symbol";
          el.appendChild(target);
        } else if (symbolKey === "swap") {
          const cross = document.createElement("div");
          cross.className = "swap-symbol";
          el.appendChild(cross);
        } else if (symbolKey) {
          // Generic box target — raw KaTeX string (e.g. '\mathbf{Y}')
          el.classList.remove("multi-gate");
          el.innerHTML = GateMath.toHTML(symbolKey);
        }
      }
    } else {
      // Single qubit gate — use palette.label from registry for correct TeX symbol
      const label = info?.palette?.label ?? `\\mathbf{${cell.gate}}`;
      el.innerHTML = GateMath.toHTML(label);
    }

    // Check if it is a multi-qubit gate control node
    const isControlNode = info?.type === "multi" && cell.role === "control";

    // Param badge — U1 shows custom name; others show formatted angle
    if (cell.param != null && cell.param !== "" && !isControlNode) {
      const badge = document.createElement("span");
      badge.className = "param-badge";
      if (cell.gate === "U1") {
        try {
          const p = JSON.parse(cell.param);
          // Show the user's custom name in the badge
          badge.textContent = p.name || "U₁";
        } catch {
          badge.textContent = "U₁";
        }
      } else {
        badge.innerHTML = GateMath.toHTML(formatParam(cell.param));
      }
      el.appendChild(badge);
    }

    // Edit button for gates with parameters
    if (info?.param && !isControlNode) {
      const editBtn = document.createElement("div");
      editBtn.className = "edit-param-btn";
      editBtn.innerHTML = Icons.edit;
      editBtn.title = "Edit Parameters";
      el.appendChild(editBtn);
    }

    return el;
  }

  // Formats gate parameter angles into readable LaTeX strings (e.g. pi/2 -> \pi/2).
  function formatParam(param) {
    if (typeof param === "number") {
      // Try to express as fraction of π
      const ratio = param / Math.PI;
      if (Math.abs(ratio - Math.round(ratio)) < 0.01) {
        const n = Math.round(ratio);
        return n === 1 ? "\\pi" : n === -1 ? "-\\pi" : `${n}\\pi`;
      }
      return param.toFixed(2);
    }
    // String — convert pi/π to \pi
    let s = String(param).trim();

    // Normalize unicode π to 'pi' so we have a standard starting point
    s = s.replace(/π/g, "pi");

    // Convert any 'pi' that isn't already escaped into '\pi'
    s = s.replace(/(^|[^\\])pi/gi, "$1\\pi");

    // Remove newlines
    s = s.replace(/[\r\n]+/g, "");

    if (s.length > 15 && !s.includes("\\pi")) {
      s = s.substring(0, 5);
    }
    return s;
  }

  // Draws vertical connecting lines between qubits for multi-qubit gates (like CNOT).
  function renderConnectors() {
    const el = board();
    if (!el) {
      return;
    }

    const numSteps = CircuitModel.getNumSteps();
    const grid = CircuitModel.getGrid();
    const rows = el.querySelectorAll(".qubit-row");

    for (let s = 0; s < numSteps; s++) {
      const processed = new Set();
      const totalWires =
        CircuitModel.getNumQubits() + CircuitModel.getNumCbits();
      for (let q = 0; q < totalWires; q++) {
        const cell = grid[s]?.[q];
        if (!cell ||
        !cell.linkedQubits ||
        cell.linkedQubits.length <= 1 ||
        processed.has(q)) {
          continue;
        }

        cell.linkedQubits.forEach((lq) => processed.add(lq));

        const minQ = Math.min(...cell.linkedQubits);
        const maxQ = Math.max(...cell.linkedQubits);

        // Get positions of the slots
        const topSlot = rows[minQ]?.querySelector(
          `.gate-slot[data-step="${s}"]`,
        );
        const bottomSlot = rows[maxQ]?.querySelector(
          `.gate-slot[data-step="${s}"]`,
        );

        if (topSlot && bottomSlot) {
          const boardRect = el.getBoundingClientRect();
          const topRect = topSlot.getBoundingClientRect();
          const bottomRect = bottomSlot.getBoundingClientRect();

          const info = QuantumGates.get(cell.gate);
          if (info?.targets === "span") {
            const overlay = document.createElement("div");
            overlay.className = "placed-gate ql-placed-gate span-gate-overlay";
            overlay.dataset.step = s;
            overlay.dataset.qubit = minQ;
            overlay.dataset.gate = cell.gate;
            
            overlay.style.position = "absolute";
            overlay.style.top = `${topRect.top - boardRect.top}px`;
            overlay.style.height = `${bottomRect.bottom - topRect.top}px`;
            overlay.style.left = `${topRect.left - boardRect.left}px`;
            overlay.style.width = `${topRect.width}px`;

            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.zIndex = "10";
            
            const label = document.createElement("div");
            label.className = "span-gate-label";
            label.innerHTML = GateMath.toHTML(info.palette.label);
            overlay.appendChild(label);
            
            if (cell.param) {
              const badge = document.createElement("span");
              badge.className = "param-badge";
              try {
                const p = JSON.parse(cell.param);
                badge.textContent = p.name || info.name;
              } catch {
                badge.textContent = info.name;
              }
              overlay.appendChild(badge);
            }
            
            if (info.param) {
              const editBtn = document.createElement("div");
              editBtn.className = "edit-param-btn";
              editBtn.innerHTML = Icons.edit;
              editBtn.title = "Edit Parameters";
              overlay.appendChild(editBtn);
            }

            el.appendChild(overlay);
            continue;
          }

          const connector = document.createElement("div");
          connector.className = "gate-connector";
          if (maxQ >= CircuitModel.getNumQubits()) {
            connector.classList.add("classical");
          }
          connector.dataset.step = s;
          connector.style.top =
            `${topRect.top + topRect.height / 2 - boardRect.top}px`;
          connector.style.height =
            `${bottomRect.top +
            bottomRect.height / 2 -
            topRect.top -
            topRect.height / 2 
            }px`;
          connector.style.left =
            `${topRect.left + topRect.width / 2 - boardRect.left}px`;

          el.appendChild(connector);
        }
      }
    }
  }

  // Triggers a visual flash animation on the circuit board after a simulation runs.
  function animateSimulation() {
    const el = board();
    if (el) {
      el.classList.add("simulating");
      setTimeout(() => el.classList.remove("simulating"), 600);
    }
  }

  return {
    render,
    animateSimulation,
    renderConnectors,
    formatParam,
  };
})();
