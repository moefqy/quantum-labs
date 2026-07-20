// QUANTUM LABS — Bloch Explorer
// Interactive 3D Bloch sphere visualization template.

import { BlochSphere } from "./bloch-renderer.js";
import { GateMath } from "../core/math-renderer.js";
import { UI } from "../core/ui-helpers.js";
import { ParamPopover } from "../core/param-popover.js";
import { Icons } from "../core/ui-icons.js";
import { UIComponent } from "../core/ui-component.js";
import { QuantumGates } from "../core/quantum-gates.js";

const BEX_BASIC_GATES = ["H", "X", "Y", "Z", "S", "T", "Sdg", "Tdg"];
const BEX_PARAM_GATES = ["Rx", "Ry", "Rz"];

class BlochExplorer extends UIComponent {
  // Initialize component state and bindings
  constructor() {
    super();
    this.history = [];
    this._draggingTheta = false;
    this._draggingPhi = false;
  }

  // Render the UI HTML template
  template() {
    return `
      <div class="bex-layout">
        <!-- LEFT: 3D Bloch Sphere Canvas -->
        <div class="bex-sphere-panel">
          <div class="bex-sphere-wrap">
            <canvas id="bloch-canvas"></canvas>
          </div>
          <div class="bex-state-readout">
            <div class="bex-ket" id="bex-ket">${GateMath.toHTML("|0\\rangle")}</div>
            <div class="bex-coords">
              <span>x = <strong id="bex-x">0.000</strong></span>
              <span>y = <strong id="bex-y">0.000</strong></span>
              <span>z = <strong id="bex-z">1.000</strong></span>
            </div>
            <div class="bex-probs">
              <span>P(${GateMath.toHTML("|0\\rangle")}) = <strong id="bex-p0">100.0%</strong></span>
              <span>P(${GateMath.toHTML("|1\\rangle")}) = <strong id="bex-p1">0.0%</strong></span>
            </div>
          </div>
        </div>

        <!-- RIGHT: Controls -->
        <div class="bex-controls ql-bottom-sheet">
          ${UI.groupHeader("INITIAL STATE")}
          ${UI.accordion(
            "bex-acc-presets",
            "Presets",
            `
              <div class="bex-presets">
                <button class="bex-preset-btn active" data-preset="|0⟩">${GateMath.toHTML("|0\\rangle")}</button>
                <button class="bex-preset-btn" data-preset="|1⟩">${GateMath.toHTML("|1\\rangle")}</button>
                <button class="bex-preset-btn" data-preset="|+⟩">${GateMath.toHTML("|+\\rangle")}</button>
                <button class="bex-preset-btn" data-preset="|−⟩">${GateMath.toHTML("|-\\rangle")}</button>
                <button class="bex-preset-btn" data-preset="|i⟩">${GateMath.toHTML("|i\\rangle")}</button>
                <button class="bex-preset-btn" data-preset="|−i⟩">${GateMath.toHTML("|-i\\rangle")}</button>
              </div>
          `,
          )}

          ${UI.accordion(
            "bex-acc-angles",
            "Manual Angles",
            `
              <div class="bex-slider-group">
                <div class="bex-slider-row">
                  <label class="bex-slider-label">${GateMath.toHTML("\\theta")} (polar)</label>
                  <input type="range" id="bex-slider-theta" class="bex-slider ql-slider" min="0" max="180" value="0" step="1">
                  <input type="number" id="bex-input-theta" class="bex-angle-input" min="0" max="180" value="0" step="1">
                  <span class="bex-unit">°</span>
                </div>
                <div class="bex-slider-row">
                  <label class="bex-slider-label">${GateMath.toHTML("\\phi")} (azimuthal)</label>
                  <input type="range" id="bex-slider-phi" class="bex-slider ql-slider" min="0" max="360" value="0" step="1">
                  <input type="number" id="bex-input-phi" class="bex-angle-input" min="0" max="360" value="0" step="1">
                  <span class="bex-unit">°</span>
                </div>
              </div>
          `,
          )}

          ${UI.groupHeader("APPLY OPERATIONS")}
          ${UI.accordion(
            "bex-acc-gates",
            "Single Qubit Gates",
            `
              <div class="ql-gate-grid">
                ${BEX_BASIC_GATES.map((id) => {
                  const g = QuantumGates.get(id);
                  return UI.gateButton(
                    id,
                    GateMath.toHTML(g.palette.label),
                    g.name,
                  );
                }).join("")}
              </div>
              <div class="ql-gate-grid bex-param-grid">
                ${BEX_PARAM_GATES.map((id) => {
                  const g = QuantumGates.get(id);
                  return UI.gateButton(
                    id,
                    GateMath.toHTML(g.palette.label),
                    g.name,
                    "param-gate-btn",
                  );
                }).join("")}
              </div>
          `,
          )}

          ${UI.groupHeader("ACTIVITY LOG")}
          ${UI.accordion(
            "bex-acc-history",
            "Gate History",
            `
              <div class="bex-history" id="bex-history">
                <span class="bex-history-empty">No gates applied yet</span>
              </div>
              <button class="bex-reset-btn" id="bex-reset">Reset to |0⟩</button>
          `,
          )}
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
      presetBtns: this.container.querySelectorAll(".bex-preset-btn"),
      gateBtns: this.container.querySelectorAll(".ql-gate-btn"),
      thetaSlider: this.container.querySelector("#bex-slider-theta"),
      thetaInput: this.container.querySelector("#bex-input-theta"),
      phiSlider: this.container.querySelector("#bex-slider-phi"),
      phiInput: this.container.querySelector("#bex-input-phi"),
      historyEl: this.container.querySelector("#bex-history"),
      resetBtn: this.container.querySelector("#bex-reset"),
    };
  }

  // Get references to DOM elements
  bindEvents() {
    // We defer the 3D engine initialization so the canvas is fully in the DOM with proper dimensions
    setTimeout(() => {
      BlochSphere.init("bloch-canvas");
      BlochSphere.setPreset("|0⟩");

      this.elements.presetBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = btn.dataset.preset;
          BlochSphere.setPreset(preset);
          this.addHistory(preset);
          this.elements.presetBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });
      });

      this.bindSliders();

      this.elements.gateBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const gate = btn.dataset.gate;
          if (btn.classList.contains("param-gate-btn")) {
            this.showBexParamPopover(gate, btn);
          } else {
            BlochSphere.applyGate(gate);
            this.addHistory(gate);
            this.elements.presetBtns.forEach((b) =>
              b.classList.remove("active"),
            );
          }
        });
      });

      if (this.elements.resetBtn) {
        this.elements.resetBtn.addEventListener("click", () => {
          this.history.length = 0;
          if (this.elements.historyEl) {
            this.elements.historyEl.innerHTML =
              '<span class="bex-history-empty">No gates applied yet</span>';
          }
          BlochSphere.setPreset("|0⟩");
          this.elements.presetBtns.forEach((b) => b.classList.remove("active"));
          const zeroBtn = this.container.querySelector('[data-preset="|0⟩"]');
          if (zeroBtn) {
            zeroBtn.classList.add("active");
          }
        });
      }

      UI.bindMobileToggle(".bex-controls");
      UI.bindAccordions(this.container);
    }, 50);
  }

  // Bind slider events
  bindSliders() {
    const { thetaSlider, thetaInput, phiSlider, phiInput } = this.elements;

    const applyAngles = () => {
      const theta = (parseFloat(thetaSlider.value) * Math.PI) / 180;
      const phi = (parseFloat(phiSlider.value) * Math.PI) / 180;
      BlochSphere.setFromAngles(theta, phi);
      this.elements.presetBtns.forEach((b) => b.classList.remove("active"));
    };

    UI.bindSlider(thetaSlider, thetaInput, applyAngles);
    UI.bindSlider(phiSlider, phiInput, applyAngles);
  }

  // Show parameter popover for parameterized gates
  showBexParamPopover(gate, referenceEl) {
    ParamPopover.show(gate, referenceEl, (val) => {
      BlochSphere.applyGate(gate, val);
      this.addHistory(`${gate}(${val})`);
      this.elements.presetBtns.forEach((b) => b.classList.remove("active"));
    });
  }

  // Add gate to history
  addHistory(label) {
    this.history.push(label);
    if (!this.elements.historyEl) {
      return;
    }
    this.elements.historyEl.innerHTML = this.history
      .slice(-6)
      .map((h) => `<span class="bex-history-tag">${h}</span>`)
      .join("");
  }
}

// Initialize Bloch Explorer instance (singleton)
let explorerInstance = null;

// Expose render function for the router
export const renderBlochExplorer = (container) => {
  if (!explorerInstance) {
    explorerInstance = new BlochExplorer();
  }
  explorerInstance.mount(container);
};
