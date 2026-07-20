// QUANTUM LABS — State Analyzer
// Interactive step-by-step playground for computing tensor products,
// visualizing unitary matrices, and analyzing state vectors.

import { GateMath } from "../core/math-renderer.js";
import { QuantumMath } from "../core/quantum-math.js";
import { QuantumGates } from "../core/quantum-gates.js";
import { UI } from "../core/ui-helpers.js";
import { Icons } from "../core/ui-icons.js";
import { UIComponent } from "../core/ui-component.js";

// Available gates in the state analyzer
const SA_SINGLE_GATES = ["I", "H", "X", "Y", "Z", "S", "Sdg", "T", "Tdg"];

// State Analyzer component
class StateAnalyzer extends UIComponent {
  // Initialize component state and bindings
  constructor() {
    super();
    this.state = {
      numQubits: 1,
      q0Gate: "H",
      q1Gate: "I",
    };
  }

  // Render the UI HTML template
  template() {
    return `
      <div class="sa">
        <!-- Left: Controls -->
        <div class="sa-controls ql-bottom-sheet">
          ${UI.groupHeader("SYSTEM CONFIGURATION")}
          <!-- Qubit Toggle -->
          ${UI.accordion(
            "sa-acc-qubits",
            "Register Size",
            `
              <div class="ql-toggle-group">
                <button class="ql-toggle-btn" data-q="1">1 Qubit</button>
                <button class="ql-toggle-btn" data-q="2">2 Qubits</button>
              </div>
          `,
          )}

          ${UI.groupHeader("APPLY OPERATIONS")}
          <!-- Gate palette for q0 -->
          ${UI.accordion(
            "sa-acc-q0",
            "Qubit 0",
            `
              <div class="ql-gate-grid" id="sa-grid-q0">
                ${SA_SINGLE_GATES.map((id) => {
                  const g = QuantumGates.get(id);
                  return `
                    <div class="ql-gate-btn sa-gate-btn-q0" data-gate="${id}" data-qubit="0">
                      <span class="ql-gate-sym">${GateMath.toHTML(g.palette ? g.palette.label : `\\mathbf{${id}}`)}</span>
                      <span class="ql-gate-label">${g.name}</span>
                    </div>
                  `;
                }).join("")}
                <div class="ql-gate-btn sa-gate-multi sa-gate-btn-q0" data-gate="CX01" data-qubit="0">
                  <span class="ql-gate-sym">${GateMath.toHTML("\\mathbf{CX}")}</span>
                  <span class="ql-gate-label">q₀→q₁</span>
                </div>
              </div>
          `,
          )}

          <!-- Gate palette for q1 -->
          <div id="sa-q1-wrapper">
            ${UI.accordion(
              "sa-acc-q1",
              "Qubit 1",
              `
                <div class="ql-gate-grid" id="sa-grid-q1">
                  ${SA_SINGLE_GATES.map((id) => {
                    const g = QuantumGates.get(id);
                    return `
                      <div class="ql-gate-btn sa-gate-btn-q1" data-gate="${id}" data-qubit="1">
                        <span class="ql-gate-sym">${GateMath.toHTML(g.palette ? g.palette.label : `\\mathbf{${id}}`)}</span>
                        <span class="ql-gate-label">${g.name}</span>
                      </div>
                    `;
                  }).join("")}
                  <div class="ql-gate-btn sa-gate-multi sa-gate-btn-q1" data-gate="CX10" data-qubit="1">
                    <span class="ql-gate-sym">${GateMath.toHTML("\\mathbf{CX}")}</span>
                    <span class="ql-gate-label">q₁→q₀</span>
                  </div>
                </div>
                <div id="sa-q1-hint"></div>
            `,
            )}
          </div>
        </div>

        <!-- Right: Output -->
        <div class="sa-output">
          <!-- Circuit Preview -->
          <div class="sa-card sa-open">
            <div class="sa-card-head">
              <span class="sa-step-num">Preview</span>
              <span class="sa-step-title">Circuit Diagram</span>
            </div>
            <div class="sa-card-body sa-circuit-body" id="sa-circuit"></div>
          </div>

          <!-- Step 1: Initial State -->
          <div class="sa-card sa-open">
            <div class="sa-card-head sa-toggle" data-target="sa-step1">
              <span class="sa-step-num">Step 1</span>
              <span class="sa-step-title">Initial State |ψ<sub>in</sub>⟩</span>
              ${Icons.chevronDown}
            </div>
            <div class="sa-card-body sa-collapsible" id="sa-step1"></div>
          </div>

          <!-- Step 2: Unitary + Multiplication -->
          <div class="sa-card sa-open">
            <div class="sa-card-head sa-toggle" data-target="sa-step2">
              <span class="sa-step-num">Step 2</span>
              <span class="sa-step-title">Apply Unitary</span>
              ${Icons.chevronDown}
            </div>
            <div class="sa-card-body sa-collapsible" id="sa-step2"></div>
          </div>

          <!-- Result -->
          <div class="sa-card sa-card-result sa-open">
            <div class="sa-card-head sa-toggle" data-target="sa-step3">
              <span class="sa-step-num">Result</span>
              <span class="sa-step-title">Final State |ψ<sub>out</sub>⟩</span>
              ${Icons.chevronDown}
            </div>
            <div class="sa-card-body sa-collapsible" id="sa-step3"></div>
          </div>
        </div>

        <!-- Mobile Toggle Button -->
        <button class="ql-mobile-toggle" id="ql-mobile-toggle" aria-label="Toggle Controls">
          ${Icons.hamburger}
        </button>
      </div>
    `;
  }

  // Get references to DOM elements
  bindElements() {
    this.elements = {
      toggleBtns: this.container.querySelectorAll(".ql-toggle-btn"),
      q0Btns: this.container.querySelectorAll(".sa-gate-btn-q0"),
      q1Btns: this.container.querySelectorAll(".sa-gate-btn-q1"),
      q1Wrapper: this.container.querySelector("#sa-q1-wrapper"),
      q1Hint: this.container.querySelector("#sa-q1-hint"),
      gridQ0: this.container.querySelector("#sa-grid-q0"),
      gridQ1: this.container.querySelector("#sa-grid-q1"),
      circuit: this.container.querySelector("#sa-circuit"),
      step1: this.container.querySelector("#sa-step1"),
      step2: this.container.querySelector("#sa-step2"),
      step3: this.container.querySelector("#sa-step3"),
    };
  }

  // Bind DOM events
  bindEvents() {
    this.elements.toggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const numQubits = parseInt(btn.dataset.q, 10);
        let q0Gate = this.state.q0Gate;
        let q1Gate = this.state.q1Gate;
        if (numQubits === 1 && q0Gate.startsWith("CX")) {
          q0Gate = "H";
        }
        if (numQubits === 1) {
          q1Gate = "I";
        }
        this.setState({ numQubits, q0Gate, q1Gate });
      });
    });

    this.elements.q0Btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("disabled")) {
          return;
        }
        let q0Gate = btn.dataset.gate;
        let q1Gate = this.state.q1Gate;
        if (q0Gate.startsWith("CX")) {
          q1Gate = "I";
        }
        this.setState({ q0Gate, q1Gate });
      });
    });

    this.elements.q1Btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("disabled")) {
          return;
        }
        this.setState({ q1Gate: btn.dataset.gate });
      });
    });

    // Accordions
    this.container.querySelectorAll(".sa-toggle").forEach((head) => {
      head.addEventListener("click", () => {
        const card = head.closest(".sa-card");
        const body = card.querySelector(".sa-collapsible");
        if (card.classList.contains("sa-open")) {
          card.classList.remove("sa-open");
          body.classList.add("sa-collapsed");
        } else {
          card.classList.add("sa-open");
          body.classList.remove("sa-collapsed");
        }
      });
    });
    UI.bindAccordions(this.container);
    UI.bindMobileToggle(".sa-controls");
  }

  // Render the component into the DOM
  render() {
    const { numQubits, q0Gate, q1Gate } = this.state;
    const is2 = numQubits === 2;
    const isCNOT = q0Gate === "CX01" || q1Gate === "CX10";

    // Update Control State
    this.elements.toggleBtns.forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.q, 10) === numQubits);
    });

    // Hide/Show Q1 wrapper based on qubit count
    this.elements.q1Wrapper.style.display = is2 ? "block" : "none";

    // Update Q0 Buttons
    this.elements.q0Btns.forEach((b) => {
      const g = b.dataset.gate;
      b.classList.toggle("selected", q0Gate === g);
      b.classList.toggle("disabled", is2 && q1Gate === "CX10" && g !== "CX01");
      if (g === "CX01") {
        b.style.display = is2 ? "flex" : "none";
      }
    });
    this.elements.gridQ0.classList.toggle(
      "sa-disabled",
      is2 && q1Gate === "CX10",
    );

    // Update Q1 Buttons
    if (is2) {
      this.elements.q1Btns.forEach((b) => {
        const g = b.dataset.gate;
        b.classList.toggle("selected", q1Gate === g);
        b.classList.toggle("disabled", q0Gate === "CX01");
      });
      this.elements.gridQ1.classList.toggle("sa-disabled", q0Gate === "CX01");
      this.elements.q1Hint.innerHTML =
        q0Gate === "CX01" || q1Gate === "CX10"
          ? '<small class="sa-hint">CNOT spans both qubits.</small>'
          : "";
    }

    // Math Calculations
    let initVec = is2
      ? [
          [1, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ]
      : [
          [1, 0],
          [0, 0],
        ];
    let U, gateAFlat, gateBFlat;

    if (!is2) {
      gateAFlat = this.getMat(q0Gate);
      U = this.to2D(gateAFlat);
    } else if (isCNOT) {
      U = q0Gate === "CX01" ? this.CX01 : this.CX10;
    } else {
      gateAFlat = this.getMat(q0Gate);
      gateBFlat = this.getMat(q1Gate);
      U = QuantumMath.tensorProduct2x2(gateAFlat, gateBFlat);
    }

    const outVec = QuantumMath.multiplyMatrixVector(U, initVec);

    this.renderCircuit(is2, isCNOT, q0Gate, q1Gate);
    this.renderStep1(is2);
    this.renderStep2(
      is2,
      isCNOT,
      q0Gate,
      q1Gate,
      gateAFlat,
      gateBFlat,
      U,
      initVec,
      outVec,
    );
    this.renderStep3(outVec, is2);
  }

  // Render circuit visualization
  renderCircuit(is2, isCNOT, q0Gate, q1Gate) {
    const el = this.elements.circuit;
    let html = "";
    if (!is2) {
      html += `
        <div class="sa-wire-row">
          <span class="sa-wire-label">${GateMath.toHTML("|q_0\\rangle")}</span>
          <div class="sa-wire-line"><div class="sa-wire-gate">${GateMath.toHTML(`\\mathbf{${q0Gate}}`)}</div></div>
        </div>`;
    } else if (isCNOT) {
      const ctrlOnTop = q0Gate === "CX01";
      html += `
        <div class="sa-wire-row">
          <span class="sa-wire-label">${GateMath.toHTML("|q_0\\rangle")}</span>
          <div class="sa-wire-line">
            ${ctrlOnTop ? '<div class="sa-wire-ctrl" id="sa-ctrl-dot"></div>' : `<div class="sa-wire-gate" id="sa-targ-gate">${GateMath.toHTML("\\mathbf{CX}")}</div>`}
          </div>
        </div>
        <div class="sa-wire-row">
          <span class="sa-wire-label">${GateMath.toHTML("|q_1\\rangle")}</span>
          <div class="sa-wire-line">
            ${ctrlOnTop ? `<div class="sa-wire-gate" id="sa-targ-gate">${GateMath.toHTML("\\mathbf{CX}")}</div>` : '<div class="sa-wire-ctrl" id="sa-ctrl-dot"></div>'}
          </div>
        </div>`;
    } else {
      html += `
        <div class="sa-wire-row">
          <span class="sa-wire-label">${GateMath.toHTML("|q_0\\rangle")}</span>
          <div class="sa-wire-line"><div class="sa-wire-gate">${GateMath.toHTML(`\\mathbf{${q0Gate}}`)}</div></div>
        </div>
        <div class="sa-wire-row">
          <span class="sa-wire-label">${GateMath.toHTML("|q_1\\rangle")}</span>
          <div class="sa-wire-line"><div class="sa-wire-gate">${GateMath.toHTML(`\\mathbf{${q1Gate}}`)}</div></div>
        </div>`;
    }
    el.innerHTML = html;

    if (is2 && isCNOT) {
      requestAnimationFrame(() => {
        const dot = el.querySelector("#sa-ctrl-dot");
        const gate = el.querySelector("#sa-targ-gate");
        if (!dot || !gate) {
          return;
        }
        const elRect = el.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();
        const gateRect = gate.getBoundingClientRect();
        const top =
          Math.min(dotRect.top, gateRect.top) + dotRect.height / 2 - elRect.top;
        const bottom =
          Math.max(dotRect.bottom, gateRect.bottom) -
          gateRect.height / 2 -
          elRect.top;
        const left = dotRect.left + dotRect.width / 2 - elRect.left;
        const conn = document.createElement("div");
        conn.className = "sa-wire-conn";
        conn.style.cssText = `top:${top}px;left:${left}px;height:${bottom - top}px;`;
        el.style.position = "relative";
        el.appendChild(conn);
      });
    }
  }

  // Render initial state
  renderStep1(is2) {
    const el = this.elements.step1;
    let html = '<div class="sa-math-row">';
    if (!is2) {
      html +=
        `<div class="sa-math-block sa-full"><span class="sa-math-caption">State of Qubit ${ 
        GateMath.toHTML("q_0") 
        } (Ground State)</span><div class="sa-math-content" id="sa-s1a"></div></div>`;
    } else {
      html +=
        `<div class="sa-math-block sa-full"><span class="sa-math-caption">State of Qubit ${ 
        GateMath.toHTML("q_0") 
        } (Ground State)</span><div class="sa-math-content" id="sa-s1a"></div></div>`;
      html +=
        `<div class="sa-math-block sa-full"><span class="sa-math-caption">State of Qubit ${ 
        GateMath.toHTML("q_1") 
        } (Ground State)</span><div class="sa-math-content" id="sa-s1a2"></div></div>`;
      html +=
        `<div class="sa-math-block sa-full"><span class="sa-math-caption">Tensor Product ${ 
        GateMath.toHTML("|q_0\\rangle \\otimes |q_1\\rangle") 
        }</span><div class="sa-math-content" id="sa-s1b"></div></div>`;
    }
    html += "</div>";
    el.innerHTML = html;

    if (!is2) {
      GateMath.renderLatex(
        "|\\psi_{in}\\rangle = |q_0\\rangle = |0\\rangle = \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix}",
        el.querySelector("#sa-s1a"),
        true,
      );
    } else {
      GateMath.renderLatex(
        "|q_0\\rangle = |0\\rangle = \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix}",
        el.querySelector("#sa-s1a"),
        true,
      );
      GateMath.renderLatex(
        "|q_1\\rangle = |0\\rangle = \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix}",
        el.querySelector("#sa-s1a2"),
        true,
      );
      GateMath.renderLatex(
        "|\\psi_{in}\\rangle = |q_0\\rangle \\otimes |q_1\\rangle = \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix} \\otimes \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix} = \\begin{bmatrix} 1 \\\\ 0 \\\\ 0 \\\\ 0 \\end{bmatrix}",
        el.querySelector("#sa-s1b"),
        true,
      );
    }
  }

  renderStep2(
    is2,
    isCNOT,
    q0Gate,
    q1Gate,
    gateAFlat,
    gateBFlat,
    U,
    initVec,
    outVec,
  ) {
    const el = this.elements.step2;
    let html = '<div class="sa-math-row">';
    if (!is2) {
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML(`\\mathbf{${q0Gate}}`)} Gate</span><div class="sa-math-content" id="sa-s2a"></div></div>`;
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML("|\\psi_{out}\\rangle = \\mathbf{U} \\cdot |\\psi_{in}\\rangle")}</span><div class="sa-math-content" id="sa-s2b"></div></div>`;
    } else if (isCNOT) {
      const label = q0Gate === "CX01" ? "CNOT (q₀ → q₁)" : "CNOT (q₁ → q₀)";
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${label}</span><div class="sa-math-content" id="sa-s2a"></div></div>`;
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML("|\\psi_{out}\\rangle = \\mathbf{U} \\cdot |\\psi_{in}\\rangle")}</span><div class="sa-math-content" id="sa-s2b"></div></div>`;
    } else {
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML(`\\mathbf{${q0Gate}}`)} Gate</span><div class="sa-math-content" id="sa-s2a"></div></div>`;
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML(`\\mathbf{${q1Gate}}`)} Gate</span><div class="sa-math-content" id="sa-s2a2"></div></div>`;
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML(`\\mathbf{${q0Gate}}`)} ⊗ ${GateMath.toHTML(`\\mathbf{${q1Gate}}`)} Tensor Product</span><div class="sa-math-content" id="sa-s2t"></div></div>`;
      html += `<div class="sa-math-block sa-full"><span class="sa-math-caption">${GateMath.toHTML("|\\psi_{out}\\rangle = \\mathbf{U} \\cdot |\\psi_{in}\\rangle")}</span><div class="sa-math-content" id="sa-s2b"></div></div>`;
    }
    html += "</div>";
    el.innerHTML = html;

    if (!is2) {
      const M = this.to2D(gateAFlat);
      GateMath.renderLatex(
        `\\mathbf{U} = \\mathbf{${q0Gate}} = ${GateMath.matrixToLatex(M)}`,
        el.querySelector("#sa-s2a"),
        true,
      );
    } else if (isCNOT) {
      GateMath.renderLatex(
        `\\mathbf{U} = \\mathbf{CX} = ${GateMath.matrixToLatex(U)}`,
        el.querySelector("#sa-s2a"),
        true,
      );
    } else {
      const Ma = this.to2D(gateAFlat);
      const Mb = this.to2D(gateBFlat);
      GateMath.renderLatex(
        `\\mathbf{${q0Gate}} = ${GateMath.matrixToLatex(Ma)}`,
        el.querySelector("#sa-s2a"),
        true,
      );
      GateMath.renderLatex(
        `\\mathbf{${q1Gate}} = ${GateMath.matrixToLatex(Mb)}`,
        el.querySelector("#sa-s2a2"),
        true,
      );
      GateMath.renderLatex(
        `\\mathbf{U} = \\mathbf{${q0Gate}} \\otimes \\mathbf{${q1Gate}} = ${GateMath.matrixToLatex(U)}`,
        el.querySelector("#sa-s2t"),
        true,
      );
    }
    const mulLatex = `|\\psi_{out}\\rangle = ${GateMath.matrixToLatex(U)} ${GateMath.vectorToLatex(initVec)} = ${GateMath.vectorToLatex(outVec)}`;
    GateMath.renderLatex(mulLatex, el.querySelector("#sa-s2b"), true);
  }

  // Render final state
  renderStep3(outVec, is2) {
    const el = this.elements.step3;
    let dirac = "";
    for (let i = 0; i < outVec.length; i++) {
      const [r, im] = outVec[i];
      if (Math.abs(r) < 1e-10 && Math.abs(im) < 1e-10) {
        continue;
      }
      let c = GateMath.formatCoef(r, im);
      const bin = is2 ? i.toString(2).padStart(2, "0") : i.toString();
      if (dirac.length > 0 && !c.startsWith("-")) {
        dirac += " + ";
      }
      dirac += `${c}|${bin}\\rangle`;
    }
    if (!dirac) {
      dirac = "0";
    }

    el.innerHTML = `
      <div class="sa-math-row">
        <div class="sa-math-block sa-math-block--result sa-full">
          <span class="sa-math-caption">Dirac Notation</span>
          <div class="sa-math-content" id="sa-s3b"></div>
        </div>
        <div class="sa-math-block sa-math-block--result sa-full">
          <span class="sa-math-caption">Column Vector</span>
          <div class="sa-math-content" id="sa-s3a"></div>
        </div>
      </div>
    `;

    GateMath.renderLatex(
      `|\\psi_{out}\\rangle = ${dirac}`,
      el.querySelector("#sa-s3b"),
      true,
    );
    GateMath.renderLatex(
      `|\\psi_{out}\\rangle = ${GateMath.vectorToLatex(outVec)}`,
      el.querySelector("#sa-s3a"),
      true,
    );
  }

  // Math Helpers
  get CX01() {
    return [
      [
        [1, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [1, 0],
        [0, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [0, 0],
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 0],
        [1, 0],
        [0, 0],
      ],
    ];
  }
  get CX10() {
    return [
      [
        [1, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [0, 0],
        [0, 0],
        [1, 0],
      ],
      [
        [0, 0],
        [0, 0],
        [1, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [1, 0],
        [0, 0],
        [0, 0],
      ],
    ];
  }

  // Get gate matrix
  getMat(id) {
    if (id === "I") {
      return [
        [1, 0],
        [0, 0],
        [0, 0],
        [1, 0],
      ];
    }
    const g = QuantumGates.GATES[id];
    return g
      ? g.matrix
      : [
          [1, 0],
          [0, 0],
          [0, 0],
          [1, 0],
        ];
  }

  // Convert flat array to 2D matrix
  to2D(flat) {
    return [
      [flat[0], flat[1]],
      [flat[2], flat[3]],
    ];
  }
}

// Instance for preserving state between mounts
let analyzerInstance = null;

// Render state analyzer
export const renderStateAnalyzer = (container) => {
  if (!analyzerInstance) {
    analyzerInstance = new StateAnalyzer();
  }
  analyzerInstance.mount(container);
};
