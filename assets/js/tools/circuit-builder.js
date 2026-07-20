// QUANTUM LABS — Circuit Builder
// Interactive drag-and-drop circuit editor template.

import { App } from "../app.js";
import { EventBus } from "../core/event-bus.js";
import { CircuitEditor } from "../circuit/circuit-editor.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { CircuitModel } from "../circuit/circuit-model.js";
import { CircuitRenderer } from "../circuit/circuit-renderer.js";
import { GateMath } from "../core/math-renderer.js";
import { ResultsPanel } from "../circuit/results-panel.js";
import { UI } from "../core/ui-helpers.js";
import { ParamPopover } from "../core/param-popover.js";
import { Icons } from "../core/ui-icons.js";
import { UIComponent } from "../core/ui-component.js";
import { MiniCircuitModal } from "../circuit/mini-circuit-modal.js";

// All available gates in the circuit builder
const CB_GATES = [
  "H", "X", "Y", "Z", "S", "T", "Sdg", "Tdg", "Rx", "Ry", "Rz",
  "CNOT", "CZ", "CY", "SWAP", "Toffoli", "MCX", "CSWAP", "CP", "c-X", "c-Z",
  "M",
  "U1", "U2",
];

class CircuitBuilder extends UIComponent {
  // Initialize component state and bindings
  constructor() {
    super();
    this.editor = null;

    // Pre-bind methods so addEventListener ignores duplicates
    this.handleGateClick = this.handleGateClick.bind(this);
    this.handleGateDoubleClick = this.handleGateDoubleClick.bind(this);
    this.handleGateContextMenu = this.handleGateContextMenu.bind(this);
    this.rebindCircuitEvents = this.rebindCircuitEvents.bind(this);
    this.clearPending = this.clearPending.bind(this);
  }

  // Render the UI HTML template
  template() {
    return `
      <div class="app-shell" id="app">
        <div class="cb-controls-wrapper" id="cb-controls-wrapper">
          <!-- Toolbar -->
          <header class="toolbar" id="toolbar">
          <div class="toolbar-left"></div>

          <div class="toolbar-center">
            <button class="btn btn-icon" id="btn-undo" title="Undo (Ctrl+Z)">
              ${Icons.undo}
            </button>
            <button class="btn btn-icon" id="btn-redo" title="Redo (Ctrl+Y)">
              ${Icons.redo}
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button class="btn btn-success" id="btn-run" title="Run Simulation (Ctrl+Enter)">
              ${Icons.play}
              <span>Run All</span>
            </button>
            <button class="btn" id="btn-step-forward" title="Step Forward">
              ${Icons.step}
              <span>Step</span>
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button class="btn" id="btn-reset-playback" title="Reset Step">
              ${Icons.reset}
              <span>Reset</span>
            </button>
            <button class="btn" id="btn-clear" title="Clear Circuit">
              ${Icons.trash}
              <span>Clear</span>
            </button>
          </div>

          <div class="toolbar-right">
            <div class="preset-dropdown">
              <button class="btn" id="btn-presets" title="Load Preset Circuit">
                ${Icons.preset}
              </button>
              <div class="preset-menu" id="preset-menu">
                <button class="preset-menu-item" data-url="qubits=2&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;1:0,1:CNOT:">
                  <div class="preset-name">Bell State</div>
                  <div class="preset-desc">2 qubits — H + CNOT</div>
                </button>
                <button class="preset-menu-item" data-url="qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;1:0,1:CNOT:;2:1,2:CNOT:">
                  <div class="preset-name">GHZ State</div>
                  <div class="preset-desc">3 qubits — Maximal entanglement</div>
                </button>
                <button class="preset-menu-item" data-url="qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:Ry:1.9106;1:1:Ry:0.7854;2:0,1:CNOT:;3:1:Ry:-0.7854;4:0,1:CNOT:;5:1,2:CNOT:;6:0,1:CNOT:;7:0:X:">
                  <div class="preset-name">W State</div>
                  <div class="preset-desc">3 qubits — Robust entanglement</div>
                </button>
                <button class="preset-menu-item" data-url="qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;0:1:H:;0:2:H:">
                  <div class="preset-name">Equal Superposition</div>
                  <div class="preset-desc">3 qubits — All Hadamard</div>
                </button>
              </div>
            </div>
            <div class="toolbar-divider"></div>
            <button class="btn btn-icon" id="btn-save-circuit" title="Save to My Circuits">
              ${Icons.save}
            </button>
            <button class="btn btn-icon" id="btn-copy-link" title="Copy Shareable Link">
              ${Icons.link}
            </button>
            <div class="preset-dropdown">
              <button class="btn btn-icon" id="btn-export" title="Export">
                ${Icons.download}
              </button>
              <div class="preset-menu" id="export-menu">
                <button class="preset-menu-item" id="btn-save-png">
                  <div class="preset-name">Export as PNG</div>
                </button>
                <button class="preset-menu-item" id="btn-save-latex">
                  <div class="preset-name">Export as LaTeX</div>
                </button>
                <button class="preset-menu-item" id="btn-export-qiskit">
                  <div class="preset-name">Export to Qiskit</div>
                </button>
                <button class="preset-menu-item" id="btn-export-cirq">
                  <div class="preset-name">Export to Cirq</div>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-setup">
            <div class="setup-group">
              ${UI.groupHeader("SETUP")}
              ${UI.accordion(
                "cb-acc-mode",
                "Mode",
                `
                <div class="segmented-control" id="sim-mode-segmented">
                  <button class="segmented-btn active" id="btn-mode-statevector" data-mode="exact">Statevector</button>
                  <button class="segmented-btn" id="btn-mode-shots" data-mode="shots">Shots</button>
                </div>
                <div class="setup-row setup-shots-container hidden" id="sim-shots-container">
                  <div class="setup-slider-row">
                    <span>Shots</span>
                    <input type="range" id="sim-shots-slider" class="cb-slider ql-slider" min="1" max="8192" value="1024" step="1">
                    <input type="number" id="sim-shots-input" class="toolbar-input setup-slider-input" min="1" max="8192" value="1024" step="1">
                  </div>
                </div>
              `,
              )}
            </div>
            
            <div class="setup-group">
              ${UI.accordion(
                "cb-acc-register",
                "Register",
                `
                <div class="setup-row">
                  <span>Qubits</span>
                  <div class="qubit-counter">
                    <button class="btn btn-icon" id="btn-remove-qubit" title="Remove Qubit">${Icons.minus}</button>
                    <span class="qubit-count-value" id="qubit-count">${CircuitModel.getNumQubits()}</span>
                    <button class="btn btn-icon" id="btn-add-qubit" title="Add Qubit">${Icons.plus}</button>
                  </div>
                </div>
                <div class="setup-row">
                  <span>C-Bits</span>
                  <div class="qubit-counter">
                    <button class="btn btn-icon" id="btn-remove-cbit" title="Remove Classical Bit">${Icons.minus}</button>
                    <span class="qubit-count-value" id="cbit-count">${CircuitModel.getNumCbits()}</span>
                    <button class="btn btn-icon" id="btn-add-cbit" title="Add Classical Bit">${Icons.plus}</button>
                  </div>
                </div>
              `,
              )}
            </div>
          </div>

          <div class="gate-category">
            ${UI.groupHeader("GATE PALETTE")}
            ${(() => {
              const groups = {};
              CB_GATES.forEach((id) => {
                const g = QuantumGates.get(id);
                if (!g || !g.palette) {
                  return;
                }
                const groupName = g.palette.group;
                if (!groups[groupName]) {
                  groups[groupName] = [];
                }
                groups[groupName].push({ key: id, ...g });
              });

              return Object.entries(groups)
                .map(([groupName, gates]) => {
                  const accId = `cb-acc-${groupName.toLowerCase().replace(/\s+/g, "-")}`;
                  const buttonsHtml = gates
                    .map((g) => {
                      const extraAttrs = [
                        g.param ? 'data-param="true"' : "",
                        g.paramType ? `data-param-type="${g.paramType}"` : "",
                        g.palette.desc ? `data-desc="${g.palette.desc}"` : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return UI.gateButton(
                        g.key,
                        GateMath.toHTML(g.palette.label),
                        g.name,
                        "ql-gate-btn--draggable",
                        extraAttrs,
                      );
                    })
                    .join("");
                  return `${UI.accordion(accId, groupName, `<div class="ql-gate-grid">${buttonsHtml}</div>`)}`;
                })
                .join('</div><div class="gate-category">');
            })()}
          </div>
        </aside>
        </div> <!-- Close .cb-controls-wrapper -->

        <!-- Mobile Toggle Button -->
        <button class="ql-mobile-toggle" id="ql-mobile-toggle" aria-label="Toggle Controls">
          ${Icons.hamburger}
        </button>

        <!-- Canvas -->
        <main class="canvas-area" id="canvas-area">
          <div class="circuit-board" id="circuit-board"></div>
        </main>

        <!-- Results -->
        <section class="results-panel" id="results-panel">
          <div class="results-header">
            <button class="results-tab active" id="tab-probabilities" data-tab="probabilities">Probabilities</button>
            <button class="results-tab hidden" id="tab-counts" data-tab="counts">Counts</button>
            <button class="results-tab" id="tab-state-vector" data-tab="state-vector">State Vector</button>
          </div>
          <div class="results-filter-container hidden" id="results-filter-container">
            <!-- Rendered by results-panel.js -->
          </div>
          <div class="results-body">
            <div class="tab-pane active" id="pane-probabilities">
              <div class="statevector-table" id="probabilities-display">
                <div class="empty-state">
                  ${Icons.play}
                  <p>Run the circuit to see probabilities</p>
                </div>
              </div>
            </div>
            <div class="tab-pane" id="pane-counts">
              <div class="statevector-table" id="counts-display">
                <div class="empty-state">
                  ${Icons.play}
                  <p>Run the circuit to see measurement counts</p>
                </div>
              </div>
            </div>
            <div class="tab-pane" id="pane-state-vector">
              <div class="statevector-table" id="statevector-display">
                <div class="empty-state">
                  ${Icons.play}
                  <p>Run the circuit to see the state vector</p>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    `;
  }

  // INIT — called once when Circuit Builder DOM is ready
  initEditor() {
    const gridContainer = document.getElementById("canvas-area");
    const paletteContainer = document.getElementById("sidebar");
    if (!gridContainer || !paletteContainer) {
      return;
    }

    this.editor = CircuitEditor.create({
      gridContainer,
      paletteContainer,
      paletteSelector: ".ql-gate-btn",
      getGateInfo: (gate) => QuantumGates.get(gate),
      onMove: (oldStep, oldQubit, newStep, newQubit) => {
        const grid = CircuitModel.getGrid();
        const gateData = grid[oldStep][oldQubit];
        if (!gateData || !gateData.gate) {
          return;
        }
        
        const deltaQ = newQubit - oldQubit;
        const qubits = gateData.linkedQubits || [oldQubit];
        const newQubits = qubits.map(q => q + deltaQ);
        
        const maxQubits = CircuitModel.getNumQubits() + CircuitModel.getNumCbits();
        if (newQubits.some(q => q < 0 || q >= maxQubits)) {
          UI.showToast("Cannot move gate out of bounds", "error");
          return;
        }
        
        const info = QuantumGates.get(gateData.gate);
        
        CircuitModel.removeGate(oldStep, oldQubit); // handles removing all linked qubits
        if (info && info.type === "multi") {
          CircuitModel.placeMultiGate(newStep, newQubits, gateData.gate);
        } else {
          CircuitModel.placeGate(newStep, newQubits[0], gateData.gate);
        }
        
        if (gateData.param) {
          CircuitModel.updateParam(newStep, newQubits[0], gateData.param);
        }
        
        CircuitRenderer.render();
        EventBus.emit("simulation:update");
      },

      // Validation: block quantum gates from landing on classical bits
      onBeforePlace: (step, qubit, gate, currentQubits) => {
        const numQubits = CircuitModel.getNumQubits();
        const isCbit = qubit >= numQubits;
        if (gate === "M") {
          if (currentQubits.length === 0 && isCbit) {
            UI.showToast("Measure gate must start on a Qubit", "error");
            return false;
          }
          if (currentQubits.length >= 1 && !isCbit) {
            UI.showToast("Measurement target must be a Classical Bit", "error");
            return false;
          }
        } else if (gate === "c-X" || gate === "c-Z") {
          if (currentQubits.length === 0 && !isCbit) {
            UI.showToast("Control must be on a Classical Bit", "error");
            return false;
          }
          if (currentQubits.length >= 1) {
            const firstIsCbit = currentQubits[0] >= numQubits;
            if (firstIsCbit === isCbit) {
              UI.showToast(
                "Gate must connect a Qubit and a Classical Bit",
                "error",
              );
              return false;
            }
          }
        } else if (isCbit) {
          UI.showToast(
            "Quantum gates cannot be placed on Classical Bits",
            "error",
          );
          return false;
        }
        return true;
      },

      // Write to model, re-render, show param popover if needed
      onPlace: (step, gate, qubits, _param) => {
        const info = QuantumGates.get(gate);
        
        if (gate === "U2") {
          (async () => {
            const result = await MiniCircuitModal.prompt({
              initialName: "",
              numQubits: qubits.length,
              initialSteps: null,
              isNew: true
            });
            
            if (result) {
              CircuitModel.placeMultiGate(step, qubits, gate);
              CircuitModel.updateParam(step, qubits[0], JSON.stringify({ name: result.name, steps: result.steps }));
              CircuitRenderer.render();
            } else {
              // User canceled, do not place the gate.
              // Clear any editor ghost artifacts if necessary
              this.clearPending();
              CircuitRenderer.render();
            }
          })();
          return;
        }

        if (info && info.type === "multi") {
          CircuitModel.placeMultiGate(step, qubits, gate);
        } else {
          CircuitModel.placeGate(step, qubits[0], gate);
        }
        CircuitRenderer.render();

        if (info && info.param) {
          const slot = document.querySelector(
            `.gate-slot[data-step="${step}"][data-qubit="${qubits[0]}"]`,
          );
          if (slot) {
            this.showParamPopover(step, qubits[0], gate, slot, true);
          }
        }
      }
    });
  }

  // Rebind circuit events
  rebindCircuitEvents() {
    if (this.editor && typeof this.editor.bindSlots === "function") {
      this.editor.bindSlots();
    }
    
    document.querySelectorAll(".placed-gate").forEach((el) => {
      el.addEventListener("click", this.handleGateClick);
      el.addEventListener("dblclick", this.handleGateDoubleClick);
      el.addEventListener("contextmenu", this.handleGateContextMenu);
    });
    
    // Also rebind gate connectors for click selection
    document.querySelectorAll(".gate-connector").forEach((el) => {
      el.addEventListener("click", this.handleGateClick);
    });
  }

  // Handle gate context menu
  handleGateContextMenu(e) {
    e.preventDefault();
    const el = e.target.closest(".placed-gate");
    if (!el) {
      return;
    }
    const step = parseInt(el.dataset.step);
    const qubit = parseInt(el.dataset.qubit);
    const cell = CircuitModel.getCell(step, qubit);
    const menu = document.getElementById("context-menu");
    menu.style.top = `${e.clientY}px`;
    menu.style.left = `${e.clientX}px`;
    menu.classList.add("show");
    const editParamItem = menu.querySelector('[data-action="edit-param"]');
    const info = QuantumGates.get(cell?.gate);
    editParamItem.style.display = info?.param ? "" : "none";
    const handleAction = (actionE) => {
      const action =
        actionE.target.closest(".context-menu-item")?.dataset.action;
      if (action === "delete") {
        CircuitModel.removeGate(step, qubit);
        CircuitRenderer.render();
        UI.showToast("Gate deleted");
      } else if (action === "edit-param") {
        const slot = document.querySelector(
          `.gate-slot[data-step="${step}"][data-qubit="${qubit}"]`,
        );
        
        if (cell.gate === "U2") {
          let initialSteps = null;
          let initialName = "";
          if (cell.param) {
            try {
               const p = JSON.parse(cell.param);
               initialSteps = p.steps;
               initialName = p.name;
            } catch(e) {}
          }
          (async () => {
            const result = await MiniCircuitModal.prompt({
               initialName,
               numQubits: cell.linkedQubits.length,
               initialSteps,
               isNew: false
            });
            if (result) {
               CircuitModel.updateParam(step, cell.linkedQubits[0], JSON.stringify(result));
               CircuitRenderer.render();
            }
          })();
        } else {
          this.showParamPopover(step, qubit, cell.gate, slot || el, false);
        }
      }
      menu.classList.remove("show");
      menu.removeEventListener("click", handleAction);
    };
    menu.addEventListener("click", handleAction);
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove("show");
        document.removeEventListener("click", closeMenu);
      }
    };
    document.addEventListener("click", closeMenu);
  }

  // Handle gate click (selection highlight)
  handleGateClick(e) {
    if (document.querySelector(".editor-pending")) {
      return;
    }
    const el = e.target.closest(".placed-gate");
    if (!el) {
      return;
    }
    const step = parseInt(el.dataset.step);
    const qubit = parseInt(el.dataset.qubit);
    const cell = CircuitModel.getGrid()[step]?.[qubit];
    
    // Check if the user clicked the edit pencil icon
    if (e.target.closest(".edit-param-btn")) {
      e.stopPropagation(); // prevent selection logic
      const slot = document.querySelector(`.gate-slot[data-step="${step}"][data-qubit="${qubit}"]`);
      if (cell.gate === "U2") {
        let initialSteps = null;
        let initialName = "";
        if (cell.param) {
          try {
             const p = JSON.parse(cell.param);
             initialSteps = p.steps;
             initialName = p.name;
          } catch(e) {}
        }
        (async () => {
          const result = await MiniCircuitModal.prompt({
             initialName,
             numQubits: cell.linkedQubits.length,
             initialSteps,
             isNew: false
          });
          if (result) {
             CircuitModel.updateParam(step, cell.linkedQubits[0], JSON.stringify(result));
             CircuitRenderer.render();
          }
        })();
      } else {
        this.showParamPopover(step, qubit, cell.gate, slot || el, false);
      }
      return;
    }

    const isSelected = el.classList.contains("selected");
    document
      .querySelectorAll(".placed-gate.selected")
      .forEach((g) => g.classList.remove("selected"));
    document
      .querySelectorAll(".gate-connector.selected")
      .forEach((c) => c.classList.remove("selected"));
    if (!isSelected) {
      if (cell?.linkedQubits?.length > 1) {
        cell.linkedQubits.forEach((q) => {
          document.querySelectorAll(
            `.placed-gate[data-step="${step}"][data-qubit="${q}"]`,
          ).forEach(linkedEl => linkedEl.classList.add("selected"));
        });
        const conn = document.querySelector(
          `.gate-connector[data-step="${step}"][data-qubits='${JSON.stringify(cell.linkedQubits)}']`,
        );
        if (conn) {
          conn.classList.add("selected");
        }
      } else {
        el.classList.add("selected");
      }
    }
  }

  // Handle gate double-click (delete)
  handleGateDoubleClick(e) {
    if (document.querySelector(".editor-pending")) {
      return;
    }
    const el = e.target.closest(".placed-gate");
    if (!el) {
      return;
    }
    CircuitModel.removeGate(
      parseInt(el.dataset.step),
      parseInt(el.dataset.qubit),
    );
    CircuitRenderer.render();
    UI.showToast("Gate deleted");
  }

  // Show parameter popover
  showParamPopover(step, qubit, gate, referenceEl, isNew) {
    const cell = CircuitModel.getCell(step, qubit);
    const currentParam = cell?.param || null;
    
    ParamPopover.show(
      gate,
      referenceEl,
      (newParam) => {
        CircuitModel.updateParam(step, qubit, newParam);
        CircuitRenderer.render();
      },
      currentParam,
      () => {
        if (isNew) {
          CircuitModel.removeGate(step, qubit);
          CircuitRenderer.render();
        }
      }
    );
  }

  // Clear pending gates
  clearPending() {
    this.editor?.clearPending();
  }

  // Bind events
  bindEvents() {
    // Listen for simulation/rendering events to decouple from UI controllers
    EventBus.off("circuit:rendered", this.rebindCircuitEvents);
    EventBus.on("circuit:rendered", this.rebindCircuitEvents);
    // Listen for cancel-pending events to clear pending gates
    EventBus.off("circuit:cancel-pending", this.clearPending);
    EventBus.on("circuit:cancel-pending", this.clearPending);

    // Re-initialize the circuit builder inside the modal after rendering
    setTimeout(() => {
      this.initEditor();
      CircuitRenderer.render();
      ResultsPanel.init();
      App.bindToolbar();
      App.bindTooltips();

      // Bind accordion headers (ql-accordion pattern)
      const sidebar = this.container.querySelector("#sidebar");
      if (sidebar) {
        UI.bindAccordions(sidebar);
      }

      // Mobile controls toggle
      UI.bindMobileToggle("#cb-controls-wrapper");
    }, 50);
  }
}

// Render the circuit builder
let builderInstance = null;

// Export the render function
export const renderCircuitBuilder = (container) => {
  if (!builderInstance) {
    builderInstance = new CircuitBuilder();
  }
  builderInstance.mount(container);
};
