// QUANTUM LABS — Entanglement Tracker
// Interactive tool to visualize Von Neumann entropy, quantum mutual
// information, and conditional entropy for a multi-qubit circuit.

import { CircuitEditor } from "../circuit/circuit-editor.js";
import { EntanglementMath } from "../core/entanglement-math.js";
import { GateMath } from "../core/math-renderer.js";
import { EngineProxy } from "../core/engine-proxy.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { UI } from "../core/ui-helpers.js";
import { MiniCircuitRenderer } from "../circuit/mini-circuit-renderer.js";
import { Icons } from "../core/ui-icons.js";
import { UIComponent } from "../core/ui-component.js";

// Available gates in the entanglement tracker
const ET_GATES = ["H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "SWAP"];

// Gate palette for the entanglement tracker
const ET_PALETTE_GATES = ET_GATES.map((key) => {
  const g = QuantumGates.get(key);
  return {
    gate: key,
    label: g.palette.label,
    name: g.name,
    multi: g.type === "multi",
  };
});

// Entanglement Tracker component
class EntanglementTracker extends UIComponent {
  // Initialize tracker state and bindings
  constructor() {
    super();
    this.state = {
      numQubits: 2,
      steps: this.initSteps(2, 6),
      selectedGate: null,
      entropies: [],
      pairs: [],
      stateReal: null,
      stateImag: null,
    };
    this.etPending = null; // pending multi-gate state from CircuitEditor
    this.editor = null; // CircuitEditor instance
    this.lastClick = { time: 0, cell: null };
    this.onWindowResize = this.onWindowResize.bind(this);
    this._resizeTimer = null;
  }

  // Initialize grid steps
  initSteps(n, s) {
    const grid = [];
    for (let i = 0; i < s; i++) {
      grid.push(new Array(n).fill(null));
    }
    return grid;
  }

  // Render the tracker UI
  template() {
    return `
      <div class="et-layout">
        <!-- LEFT: Controls -->
        <div class="et-controls ql-bottom-sheet">
          ${UI.groupHeader("SYSTEM CONFIGURATION")}

          ${UI.accordion(
            "et-acc-qubits",
            "Register Size",
            `
              <div class="ql-toggle-group" id="et-qubit-toggle">
                ${[2, 3, 4].map((n) => `<button class="ql-toggle-btn" data-n="${n}">${n} Qubits</button>`).join("")}
              </div>
          `,
          )}

          ${UI.groupHeader("APPLY OPERATIONS")}

          ${UI.accordion(
            "et-acc-palette",
            "Quantum Gates",
            `
              <div class="et-palette" id="et-palette">
                ${ET_PALETTE_GATES.map(
                  (g) => `
                  <button class="ql-gate-btn et-palette-btn ${g.multi ? "et-multi" : ""}" data-gate="${g.gate}" title="${g.name}">
                    <span class="ql-gate-sym">${GateMath.toHTML(g.label)}</span>
                    <span class="ql-gate-label">${g.name}</span>
                  </button>`,
                ).join("")}
              </div>
              <div class="et-palette-hint" id="et-palette-hint">Click a gate to select, then click a circuit slot.</div>
          `,
          )}

          ${UI.accordion(
            "et-acc-circuit",
            "Circuit Design",
            `
              <div class="et-circuit" id="et-circuit"></div>
              <div class="et-palette-hint mt-3">Double-click a gate to delete it.</div>
          `,
          )}
          
          <!-- REFERENCE -->
          ${UI.groupHeader("REFERENCE")}

          <!-- Glossary -->
          ${UI.accordion(
            "et-acc-glossary",
            "Classification Glossary",
            `
              <div class="et-glossary-container">
              <div class="et-glossary-mb">
                <strong>Entanglement State Classification</strong><br>
                The relationship between any two qubits is classified as follows:
              </div>
              <div class="et-glossary-formula">
                ${GateMath.toHTML("\\text{State} = \\begin{cases} \\textbf{Bell Pair}, & \\text{if } I = 2.0 \\text{ and PPT} < 0 \\\\\\\\ \\textbf{Entangled}, & \\text{if } S(q_i|q_j) < 0 \\text{ or PPT} < 0 \\\\\\\\ \\textbf{Correlated}, & \\text{if } I > 0 \\text{ and PPT} \\ge 0 \\\\\\\\ \\textbf{Separable}, & \\text{if } I = 0 \\end{cases}")}
              </div>
              
              <div class="et-glossary-footer">
                <strong>Peres-Horodecki Criterion (PPT)</strong><br>
                The Positive Partial Transpose (PPT) criterion asserts that a bipartite state ${GateMath.toHTML("\\rho")} is entangled if its partial transpose with respect to subsystem ${GateMath.toHTML("B")}, denoted ${GateMath.toHTML("\\rho^{T_B}")}, possesses negative eigenvalues. The necessary condition for separability is:
                <div class="et-glossary-formula-inner">
                  ${GateMath.toHTML("\\rho^{T_B} = (I \\otimes T)\\rho \\ge 0")}
                </div>
                Violation of this condition, characterized by ${GateMath.toHTML("\\lambda_{\\min}(\\rho^{T_B}) < 0")}, provides definitive proof of quantum entanglement.
              </div>
              </div>
          `,
            false,
          )}

        </div>

        <!-- Mobile Toggle Button -->
        <button class="ql-mobile-toggle" id="ql-mobile-toggle" aria-label="Toggle Controls">
          ${Icons.hamburger}
        </button>

        <!-- CENTER: Entanglement Web -->
        <div class="et-center">
          <div class="et-center-title">Entanglement Web</div>
          <div class="et-web-wrapper">
            <canvas class="et-web-canvas" id="et-canvas"></canvas>
            <div id="et-web-overlays" class="et-web-overlays"></div>
          </div>
          <div class="et-web-legend">
            <div class="et-legend-row">
              <span class="et-legend-item">
                <span class="et-line-separable"></span>
                Separable
              </span>
              <span class="et-legend-item">
                <span class="et-line-correlated"></span>
                Correlated
              </span>
              <span class="et-legend-item">
                <span class="et-line-entangled"></span>
                Entangled
              </span>
              <span class="et-legend-item">
                <span class="et-line-bell"></span>
                Bell Pair
              </span>
            </div>
            <div class="et-legend-info">
              ${GateMath.toHTML("I(q_i:q_j) = S(q_i) + S(q_j) - S(q_i, q_j)")}
            </div>
            <div class="et-legend-note">
              <strong>Note:</strong> The classifications in <strong>this tool</strong> evaluate bipartite (2-qubit) relationships. When genuine entanglement exists across three or more qubits (ex: GHZ State), the partial trace operation collapses any 2-qubit subsystem into a classical statistical mixture, causing those pairs to be evaluated as <strong>Correlated</strong>.
            </div>
          </div>
        </div>

        <!-- RIGHT: Analysis -->
        <div class="et-right">
          ${UI.groupHeader("RESULT")}
          ${UI.accordion(
            "et-acc-gauges",
            "Von Neumann Entropy",
            `
              <div id="et-gauges"></div>
              <div class="et-palette-hint mt-4">
                Von Neumann entropy measures how much an individual qubit is entangled with the rest of the system. A value of 1.0 indicates it is maximally entangled.
              </div>
          `,
          )}

          ${UI.groupHeader("PAIRWISE ANALYSIS")}
          <div id="et-pairs"></div>
        </div>
      </div>
    `;
  }

  // Bind elements
  bindElements() {
    this.elements = {
      qubitBtns: this.container.querySelectorAll(
        "#et-qubit-toggle .ql-toggle-btn",
      ),
      paletteBtns: this.container.querySelectorAll(".et-palette-btn"),
      paletteHint: this.container.querySelector("#et-palette-hint"),
      circuit: this.container.querySelector("#et-circuit"),
      canvas: this.container.querySelector("#et-canvas"),
      overlays: this.container.querySelector("#et-web-overlays"),
      gauges: this.container.querySelector("#et-gauges"),
      pairs: this.container.querySelector("#et-pairs"),
    };
  }

  // Bind events
  bindEvents() {
    UI.bindMobileToggle(".et-controls");
    UI.bindAccordions(this.container);

    this.elements.qubitBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const numQubits = parseInt(btn.dataset.n);
        this.etPending = null;
        this.editor?.clearPending();
        this.setState({
          numQubits,
          steps: this.initSteps(numQubits, 6),
          selectedGate: null,
        });
        this.runSimulation();
      });
    });

    // CircuitEditor handles palette click (gate select) and drag-and-drop.
    // We also keep a palette click listener to update ET state for hint rendering.
    this.elements.paletteBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setState({ selectedGate: btn.dataset.gate });
      });
    });

    window.addEventListener("resize", this.onWindowResize);

    const observer = new MutationObserver(() => {
      if (!document.body.contains(this.container)) {
        window.removeEventListener("resize", this.onWindowResize);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Handle gate selection and clearing
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        return;
      }

      const filledCell = e.target.closest(".et-cell-filled");
      if (filledCell && !this.state.selectedGate) {
        // Select the gate for deletion
        document
          .querySelectorAll(".et-cell-filled.selected")
          .forEach((g) => g.classList.remove("selected"));
        filledCell.classList.add("selected");
        return;
      }

      if (
        !e.target.closest(".et-palette-btn") &&
        !e.target.closest(".et-cell") &&
        !e.target.closest(".et-right") &&
        !e.target.closest(".ql-mobile-toggle")
      ) {
        // Clicked empty space — clear palette selection AND circuit selection
        this.editor?.clearSelectedGate();
        this.setState({ selectedGate: null });
        this.updatePaletteHint(
          "Click a gate to select, then click a circuit slot.",
        );
        document
          .querySelectorAll(".et-cell-filled.selected")
          .forEach((g) => g.classList.remove("selected"));
      }
    });

    // Create the shared CircuitEditor instance for the ET mini circuit
    const paletteContainer = this.container.querySelector("#et-palette");
    const gridContainer = this.elements.circuit;
    if (paletteContainer && gridContainer) {
      this.editor = CircuitEditor.create({
        gridContainer,
        paletteContainer,
        paletteSelector: ".et-palette-btn",
        getGateInfo: (gate) => {
          const g = ET_PALETTE_GATES.find((p) => p.gate === gate);
          if (!g) {
            return null;
          }
          return {
            type: g.multi ? "multi" : "single",
            targets: 2,
            name: g.name,
            param: false,
          };
        },
        onMove: (oldStep, oldQubit, newStep, newQubit) => {
          const { steps } = this.state;
          const gateData = steps[oldStep][oldQubit];
          if (!gateData || !gateData.gate) {
            return;
          }
          
          const deltaQ = newQubit - oldQubit;
          let qubits;
          
          if (gateData.role === "control" || gateData.role === "target") {
            const partnerQ = gateData.partnerQubit;
            qubits = oldQubit < partnerQ ? [oldQubit, partnerQ] : [partnerQ, oldQubit];
          } else {
            qubits = [oldQubit];
          }
          
          const newQubits = qubits.map(q => q + deltaQ);
          if (newQubits.some(q => q < 0 || q >= this.state.numQubits)) {
            this.updatePaletteHint("Cannot move gate out of bounds.");
            setTimeout(() => {
              this.updatePaletteHint(this.state.selectedGate ? (ET_PALETTE_GATES.find(g => g.gate === this.state.selectedGate)?.multi ? "Click the CONTROL qubit in the circuit." : "Click a circuit slot to place the gate.") : "Click a gate to select, then click a circuit slot.");
            }, 3000);
            return; // 8 is max qubits in ET
          }
          
          const newSteps = steps.map((s) => [...s]);
          
          // Clear old
          qubits.forEach(q => { newSteps[oldStep][q] = null; });
          
          // Place new
          if (newQubits.length === 1) {
            newSteps[newStep][newQubits[0]] = { gate: gateData.gate, role: "single" };
          } else {
            const [controlQ, targetQ] = newQubits;
            newSteps[newStep][controlQ] = { gate: gateData.gate, role: "control", partnerQubit: targetQ, linkedQubits: [...newQubits] };
            newSteps[newStep][targetQ] = { gate: gateData.gate, role: "target", partnerQubit: controlQ, linkedQubits: [...newQubits] };
          }
          
          this.setState({ steps: newSteps });
          this.runSimulation();
        },
        onPlace: (step, gate, qubits) => {
          const { steps } = this.state;
          const newSteps = steps.map((s) => [...s]);
          if (qubits.length === 1) {
            newSteps[step][qubits[0]] = { gate, role: "single" };
          } else {
            const [controlQ, targetQ] = qubits;
            newSteps[step][controlQ] = {
              gate,
              role: "control",
              partnerQubit: targetQ,
              linkedQubits: [...qubits],
            };
            newSteps[step][targetQ] = {
              gate,
              role: "target",
              partnerQubit: controlQ,
              linkedQubits: [...qubits],
            };
          }
          this.etPending = null;
          this.setState({ steps: newSteps });
          this.runSimulation();
        },
        onDelete: (step, qubit) => {
          this.clearCell(step, qubit);
        },
        onPendingChange: (pending) => {
          this.etPending = pending;
          this.buildCircuitGrid();
          if (pending) {
            const g = ET_PALETTE_GATES.find((p) => p.gate === pending.gate);
            this.updatePaletteHint(
              `Now click the TARGET qubit in column T${pending.step + 1}`,
            );
          } else {
            const { selectedGate } = this.state;
            if (selectedGate) {
              const g = ET_PALETTE_GATES.find((p) => p.gate === selectedGate);
              this.updatePaletteHint(
                g?.multi
                  ? "Click the CONTROL qubit in the circuit."
                  : "Click a circuit slot to place the gate.",
              );
            } else {
              this.updatePaletteHint(
                "Click a gate to select, then click a circuit slot.",
              );
            }
          }
        },
      });
    }

    // Initial simulation
    requestAnimationFrame(() => this.runSimulation());
  }

  // Update palette hint
  updatePaletteHint(msg) {
    if (this.elements.paletteHint) {
      this.elements.paletteHint.innerHTML = msg;
    }
  }

  // Clear cell
  clearCell(step, qubit) {
    let { steps } = this.state;
    const cell = steps[step][qubit];
    if (!cell) {
      return;
    }

    const newSteps = [...steps];
    newSteps[step] = [...newSteps[step]];

    if (cell.partnerQubit !== undefined) {
      newSteps[step][cell.partnerQubit] = null;
    }
    newSteps[step][qubit] = null;
    this.setState({ steps: newSteps });
    this.runSimulation();
  }

  // Build operations from steps
  buildOperations() {
    const { steps, numQubits } = this.state;
    const ops = [];
    for (let s = 0; s < steps.length; s++) {
      for (let q = 0; q < numQubits; q++) {
        const cell = steps[s][q];
        if (!cell) {
          continue;
        }
        if (cell.role === "target") {
          continue;
        }

        if (cell.role === "single") {
          ops.push({ gate: cell.gate, qubits: [q] });
        } else if (cell.role === "control") {
          ops.push({ gate: cell.gate, qubits: [q, cell.partnerQubit] });
        }
      }
    }
    return ops;
  }

  // Run simulation and update display
  async runSimulation() {
    const ops = this.buildOperations();
    const result = await EngineProxy.simulate(this.state.numQubits, 0, ops);
    const stateReal = Array.from(result.state.real);
    const stateImag = Array.from(result.state.imag);
    const entropies = EntanglementMath.computeAllEntropies(
      stateReal,
      stateImag,
      this.state.numQubits,
    );

    const pairs = [];
    for (let a = 0; a < this.state.numQubits; a++) {
      for (let b = a + 1; b < this.state.numQubits; b++) {
        const metrics = EntanglementMath.computePairMetrics(
          stateReal,
          stateImag,
          this.state.numQubits,
          a,
          b,
        );
        pairs.push({ qA: a, qB: b, ...metrics });
      }
    }

    this.setState({ stateReal, stateImag, entropies, pairs });
  }

  // Handle window resize
  onWindowResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.updateWebCanvas();
    }, 150);
  }

  // Overrides UIComponent.render to map state to DOM
  render() {
    const { numQubits, selectedGate } = this.state;

    // Update Qubit Toggles
    this.elements.qubitBtns.forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.n) === numQubits);
    });

    // Palette button active state is managed by CircuitEditor (active class)
    // but we sync it here on full re-renders too
    this.elements.paletteBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.gate === selectedGate);
    });

    if (!selectedGate) {
      this.updatePaletteHint(
        "Click a gate to select, then click a circuit slot.",
      );
    } else if (this.etPending) {
      this.updatePaletteHint(
        `Now click the TARGET qubit in column T${this.etPending.step + 1}`,
      );
    } else {
      const gDef = ET_PALETTE_GATES.find((g) => g.gate === selectedGate);
      this.updatePaletteHint(
        gDef?.multi
          ? "Click the CONTROL qubit in the circuit."
          : "Click a circuit slot to place the gate.",
      );
    }

    this.buildCircuitGrid();

    if (this.state.entropies.length > 0) {
      this.updateWebCanvas();
      this.updateGauges();
      this.updatePairsPanel();
    }
  }

  // Build circuit grid
  buildCircuitGrid() {
    const el = this.elements.circuit;
    if (!el) {
      return;
    }

    MiniCircuitRenderer.render(
      el,
      {
        numQubits: this.state.numQubits,
        steps: this.state.steps,
        pendingMulti: this.etPending,
      },
      this.editor,
    );
  }

  // Update web canvas
  updateWebCanvas() {
    const { entropies, pairs, numQubits } = this.state;
    const canvas = this.elements.canvas;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W === 0 || H === 0) {
      return;
    }

    const styles = getComputedStyle(document.body);
    const hexEmber = styles.getPropertyValue("--ember").trim();
    const hexAsh = styles.getPropertyValue("--ash").trim();

    const hexToRgba = (hex, alpha) => {
      if (!hex) {
        return `rgba(0,0,0,${alpha})`;
      }
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    let overlaysHtml = "";
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) * 0.32;

    const positions = [];
    for (let q = 0; q < numQubits; q++) {
      const angle = (q / numQubits) * 2 * Math.PI - Math.PI / 2;
      positions.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
      });
    }

    for (const pair of pairs) {
      const p1 = positions[pair.qA];
      const p2 = positions[pair.qB];
      const deg = pair.entanglementDegree;
      if (deg < 0.01) {
        continue;
      }

      const alpha = 0.15 + deg * 0.75;
      const lineWidth = 1 + deg * 3;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = hexToRgba(hexEmber, alpha);
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();

      if (deg > 0.05) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        let nx = -dy / len;
        let ny = dx / len;
        if (nx < 0) {
          nx = -nx;
          ny = -ny;
        }

        const shift = 36;
        const rx = mx + nx * shift;
        const ry = my + ny * shift;
        const color = hexToRgba(hexEmber, Math.min(1, alpha + 0.2));
        overlaysHtml += `<div class="et-web-label et-web-tether-lbl" style="left:${rx}px;top:${ry}px;color:${color};">I=${pair.mutualInfo}</div>`;
      }
    }

    for (let q = 0; q < numQubits; q++) {
      const { x, y, angle } = positions[q];
      const entropy = entropies[q]?.entropy ?? 0;
      const isEntangled = entropy > 0.01;
      const orbColor = isEntangled ? hexEmber : hexAsh;

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fillStyle = orbColor;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.strokeStyle = isEntangled
        ? hexToRgba(hexEmber, 0.5)
        : hexToRgba(hexAsh, 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      overlaysHtml += `<div class="et-web-label et-web-qubit-lbl" style="left:${x}px;top:${y}px;">${GateMath.toHTML(`|q_{${q}}\\rangle`)}</div>`;

      let dx = Math.cos(angle);
      let dy = Math.sin(angle);
      if (Math.abs(dx) > Math.abs(dy)) {
        dx = dx > 0 ? 1 : -1;
        dy = 0;
      } else {
        dx = 0;
        dy = dy > 0 ? 1 : -1;
      }

      const labelX = x + dx * 48;
      const labelY = y + dy * 48;
      const sColor = isEntangled ? hexEmber : hexAsh;
      overlaysHtml += `<div class="et-web-label et-web-entropy-lbl" style="left:${labelX}px;top:${labelY}px;color:${sColor};">S=${entropy.toFixed(3)}</div>`;
    }

    if (this.elements.overlays) {
      this.elements.overlays.innerHTML = overlaysHtml;
    }
  }

  // Update gauges
  updateGauges() {
    const { entropies } = this.state;
    const el = this.elements.gauges;
    if (!el) {
      return;
    }

    el.innerHTML = `
      <div class="et-gauges-grid">
        ${entropies
          .map((e) => {
            const pct = Math.round(e.entropy * 100);
            const isEntangled = e.entropy > 0.01;
            return `
            <div class="et-gauge-item">
              <div class="et-gauge-label">${GateMath.toHTML(`|q_{${e.qubit}}\\rangle`)}</div>
              <div class="et-gauge-bar-wrap">
                <div class="et-gauge-bar ${isEntangled ? "entangled" : ""}" style="width:${pct}%"></div>
              </div>
              <div class="et-gauge-value ${isEntangled ? "entangled" : ""}">${e.entropy.toFixed(3)}</div>
            </div>`;
          })
          .join("")}
      </div>
      <div class="et-gauge-axis">
        <span>0.0 (Pure)</span><span>0.5</span><span>1.0 (Max)</span>
      </div>
    `;
  }

  // Update pairs panel
  updatePairsPanel() {
    const { pairs, numQubits, stateReal, stateImag } = this.state;
    const el = this.elements.pairs;
    if (!el) {
      return;
    }

    if (pairs.length === 0) {
      el.innerHTML = "";
      return;
    }

    let html = "";
    for (const p of pairs) {
      const isNegCond = parseFloat(p.condA_givenB) < -0.005;
      let statusLabel = "SEPARABLE";
      let statusClass = "et-status-pure";

      if (p.isEntangled) {
        statusClass = "et-status-entangled";
        if (p.entanglementDegree > 0.99 && p.pptEntangled) {
          statusLabel = "BELL PAIR";
        } else if (p.pptEntangled || isNegCond) {
          statusLabel = "ENTANGLED";
        } else {
          statusLabel = "CORRELATED";
        }
      }

      const accId = `et-acc-pair-${p.qA}-${p.qB}`;
      const rdm = EntanglementMath.getReducedDensityMatrixDisplay(
        stateReal,
        stateImag,
        numQubits,
        p.qA,
      );
      const rdmHtml = `
        <div class="et-rdm">
          <div class="et-rdm-label">Reduced density matrix ${GateMath.toHTML(`\\rho_{q_${p.qA}}`)}</div>
          <div class="et-rdm-grid">
            <div class="et-rdm-cell">${rdm.rho00.toFixed(3)}</div>
            <div class="et-rdm-cell et-rdm-offdiag">${rdm.rho01r.toFixed(3)}${rdm.rho01i >= 0 ? "+" : ""}${rdm.rho01i.toFixed(3)}i</div>
            <div class="et-rdm-cell et-rdm-offdiag">${rdm.rho10r.toFixed(3)}${rdm.rho10i >= 0 ? "+" : ""}${rdm.rho10i.toFixed(3)}i</div>
            <div class="et-rdm-cell">${rdm.rho11.toFixed(3)}</div>
          </div>
        </div>`;

      html += UI.accordion(
        accId,
        `${GateMath.toHTML(`q_{${p.qA}}`)} \u2194 ${GateMath.toHTML(`q_{${p.qB}}`)} <span class="et-status-badge ${statusClass}">${statusLabel}</span>`,
        `
          <div class="et-metrics-grid">
            <div class="et-metric"><span class="et-metric-label">${GateMath.toHTML(`S(q_{${p.qA}})`)}</span><span class="et-metric-value">${p.sA}</span></div>
            <div class="et-metric"><span class="et-metric-label">${GateMath.toHTML(`S(q_{${p.qB}})`)}</span><span class="et-metric-value">${p.sB}</span></div>
            <div class="et-metric"><span class="et-metric-label">${GateMath.toHTML(`S(q_{${p.qA}},q_{${p.qB}})`)}</span><span class="et-metric-value">${p.sAB}</span></div>
            <div class="et-metric"><span class="et-metric-label">${GateMath.toHTML(`I(q_{${p.qA}}:q_{${p.qB}})`)}</span><span class="et-metric-value">${p.mutualInfo}</span></div>
            <div class="et-metric ${isNegCond ? "et-metric--negative" : ""}"><span class="et-metric-label">${GateMath.toHTML(`S(q_{${p.qA}}|q_{${p.qB}})`)}</span><span class="et-metric-value">${p.condA_givenB}</span></div>
            <div class="et-metric ${parseFloat(p.condB_givenA) < -0.005 ? "et-metric--negative" : ""}"><span class="et-metric-label">${GateMath.toHTML(`S(q_{${p.qB}}|q_{${p.qA}})`)}</span><span class="et-metric-value">${p.condB_givenA}</span></div>
          </div>
          ${isNegCond ? `<div class="et-quantum-alert">Negative conditional entropy detected: ${GateMath.toHTML(`S(q_{${p.qA}}|q_{${p.qB}}) = ${p.condA_givenB}`)}. This is a purely quantum signature (impossible classically) that proves these two qubits are <strong>strictly entangled</strong>, not just correlated.</div>` : ""}
          ${rdmHtml}
      `,
        false,
      );
    }
    el.innerHTML = html;
    UI.bindAccordions(el);
  }
}

// Preserve API for modal system
let trackerInstance = null;
export const renderEntanglementTracker = (container) => {
  if (!trackerInstance) {
    trackerInstance = new EntanglementTracker();
  }
  trackerInstance.mount(container);
};
