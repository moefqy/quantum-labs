// QUANTUM LABS — QECC Simulator
// Interactive tool for designing and analyzing quantum error-correcting codes.
// Supports Dual-CSS, Non-dual CSS, and Non-CSS stabilizer codes (k=1).

import { QECCMath } from "./qecc-math.js";
import { QECCBlockModal } from "./qecc-block-modal.js";
import { QECCSerializer } from "./qecc-serializer.js";
import { UI } from "../../ui/ui-helpers.js";
import { Icons } from "../../ui/ui-icons.js";
import { UIComponent } from "../../ui/ui-component.js";
import { GateMath } from "../../core/math-renderer.js";

// Handles the main QECC simulator view, managing input formatting, matrix parsing, and delegating computation to the math engine.
class QECCSimulator extends UIComponent {
  // Initialize component state and bindings.
  constructor() {
    super();
    this.state = {
      codeType: "",             // active code type ID (none selected by default)
      inputFormat: "gf2",       // "gf2" | "gf4"
      analysisResult: null,     // last successful analysis output
      activeBlock: null,        // pipeline block currently highlighted
    };
    this.handleAnalyze        = this.handleAnalyze.bind(this);
    this.handleBlockClick     = this.handleBlockClick.bind(this);
    this.handleFormatToggle   = this.handleFormatToggle.bind(this);
    this.handlePresetLoad     = this.handlePresetLoad.bind(this);
    this.handleHxInput        = this.handleHxInput.bind(this);
    this.handleClear          = this.handleClear.bind(this);
  }

  // Render the UI HTML template.
  template() {
    const types = Object.values(QECCMath.CODE_TYPES);
    const isDualCSS = this.state.codeType === "dual-css";

    return `
      <div class="app-shell" id="qecc-shell">
        <div class="cb-controls-wrapper" id="cb-controls-wrapper">
          <!-- Toolbar -->
          <header class="toolbar" id="toolbar">
          <div class="toolbar-left"></div>
          
          <div class="toolbar-center">
            <button class="btn btn-success" id="qecc-analyze" title="Analyze (Ctrl+Enter)">
              ${Icons.play}
              <span>Analyze</span>
            </button>
            <button class="btn" id="qecc-clear" title="Clear All">
              ${Icons.trash}
              <span>Clear</span>
            </button>
          </div>

          <div class="toolbar-right">
            <div class="preset-dropdown">
              <button class="btn" id="qecc-preset-btn" title="Load preset code">
                ${Icons.preset}
              </button>
              <div class="preset-menu" id="qecc-preset-menu">
                ${Object.values(QECCMath.PRESETS).map((p) => `
                  <button class="preset-menu-item" data-preset="${p.id}">
                    <div class="preset-name">${p.name}</div>
                    <div class="preset-desc">${p.codeType}</div>
                  </button>
                `).join("")}
              </div>
            </div>
            <div class="toolbar-divider"></div>
            <button class="btn btn-icon" id="qecc-copy-link" title="Copy Shareable Link">
              ${Icons.link}
            </button>
          </div>
        </header>

          <!-- LEFT: Controls -->
          <div class="sidebar" id="qecc-controls">

          ${UI.groupHeader("SETUP")}

          ${UI.accordion(
            "qecc-acc-format",
            "PCM Format",
            `<div class="segmented-control" id="qecc-format-toggle">
              <button class="segmented-btn active" data-fmt="gf2">GF(2)</button>
              <button class="segmented-btn" data-fmt="gf4">GF(4)</button>
            </div>`,
          )}

          ${UI.accordion(
            "qecc-acc-type",
            "Code Type",
            `<div class="ql-gate-grid" id="qecc-type-grid">
              ${UI.gateButton("dual-css", "", "Dual-containing CSS", `qecc-type-btn ${this.state.codeType === "dual-css" ? "active" : ""}`)}
              ${UI.gateButton("nondual-css", "", "Non-dual containing CSS", `qecc-type-btn ${this.state.codeType === "nondual-css" ? "active" : ""}`)}
              ${UI.gateButton("non-css", "", "Non-CSS", `qecc-type-btn ${this.state.codeType === "non-css" ? "active" : ""}`)}
              ${UI.gateButton("custom", "", "Custom", `qecc-type-btn qecc-type-btn--custom ${this.state.codeType === "custom" ? "active" : ""}`)}
            </div>`,
          )}

          ${UI.accordion(
            "qecc-acc-pcm",
            "Parity-check Matrix",
            `
            <!-- H Wrapper (GF4 only) -->
            <div id="qecc-h-wrapper" class="hidden">
              <label class="qecc-matrix-label" for="qecc-h">Matrix of ${GateMath.toHTML("H")}</label>
              <div class="qecc-matrix-field">
                <div id="qecc-h-text-wrapper">
                  <textarea
                    class="qecc-matrix-input"
                    id="qecc-h"
                    placeholder="Example:\n1 w2 w2 1 0\nw2 w2 1 0 1\nw 1 1 w 0\n1 1 w 0 w"
                    spellcheck="false"
                    autocomplete="off"
                    rows="6"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Hx Wrapper (GF2 only) -->
            <div id="qecc-hx-wrapper">
              <label class="qecc-matrix-label" for="qecc-hx">Matrix of ${GateMath.toHTML("H_X")}</label>
              <div class="qecc-matrix-field">
                <div id="qecc-hx-text-wrapper">
                  <textarea
                    class="qecc-matrix-input"
                    id="qecc-hx"
                    placeholder="Example:&#10;0 1 1 0 0&#10;1 1 0 0 0&#10;1 0 0 1 0&#10;0 0 1 0 1"
                    spellcheck="false"
                    autocomplete="off"
                    rows="6"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Hz Wrapper (GF2 only) -->
            <div id="qecc-hz-wrapper">
              <label class="qecc-matrix-label" for="qecc-hz">Matrix of ${GateMath.toHTML("H_Z")}</label>
              <div class="qecc-matrix-field">
                <div id="qecc-hz-text-wrapper">
                  <textarea
                    class="qecc-matrix-input${isDualCSS ? " qecc-matrix-input--locked" : ""}"
                    id="qecc-hz"
                    placeholder="${isDualCSS ? "This matrix is automatically set to match the matrix above." : "Example:\u000A1 1 1 1 0\u000A1 1 1 0 1\u000A0 1 1 0 0\u000A1 1 0 0 0"}"
                    spellcheck="false"
                    autocomplete="off"
                    rows="6"
                    ${isDualCSS ? "readonly" : ""}
                  ></textarea>
                </div>
              </div>
            </div>
            <div class="qecc-matrix-hint" id="qecc-matrix-hint">
              Rows must be separated by newlines, columns by spaces.
            </div>
            `,
          )}

          </div> <!-- End sidebar -->
        </div> <!-- End cb-controls-wrapper -->

        <!-- Mobile toggle FAB -->
        <button class="ql-mobile-toggle" id="ql-mobile-toggle" aria-label="Toggle Controls">
          ${Icons.hamburger}
        </button>

        <!-- CENTER: Pipeline + Params -->
        <div class="canvas-area qecc-center" id="qecc-center">

          <div class="qecc-center-title">QECC Pipeline</div>

          <!-- Pipeline diagram (permanent, always visible) -->
          <div class="qecc-pipeline" id="qecc-pipeline" aria-label="QECC pipeline diagram">
            ${this._renderPipeline()}
          </div>

          <!-- N / K / d / r params and Note container -->
          <div class="qecc-center-bottom">
            <div class="qecc-params-block hidden" id="qecc-params-block">
              <!-- Rendered dynamically -->
            </div>

            <div class="qecc-note">
              <b>Note:</b> This tool evaluates syndrome lookup tables and stabilizer generators exclusively for single-qubit errors (${GateMath.toHTML("t = 1")}).
            </div>
          </div>

        </div>

        <!-- RIGHT: Tabbed Results Panel (Syndrome / Generator) -->
        <div class="results-panel" id="qecc-results">

          <!-- Tab strip -->
          <div class="qecc-results-tabs" id="qecc-results-tabs">
            <button class="qecc-tab active" data-tab="syndrome">Syndrome</button>
            <button class="qecc-tab" data-tab="generator">Generator</button>
          </div>

          <!-- Syndrome tab content -->
          <div class="qecc-tab-body" id="qecc-syndrome-body">
            <div class="qecc-empty-state">
              ${Icons.play}
              <p>Analyze a code to see the syndrome lookup table.</p>
            </div>
          </div>

          <!-- Generator tab content (hidden by default) -->
          <div class="qecc-tab-body hidden" id="qecc-generator-body">
            <div class="qecc-empty-state">
              ${Icons.play}
              <p>Analyze a code to see the stabilizer generators.</p>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Renders the permanent pipeline diagram HTML representing the error correction flow.
  _renderPipeline() {
    return `
      <div class="paper-pipeline">
        <!-- ROW 1: Main pipeline flow -->
        <div class="paper-row">

          <div class="paper-inputs">
            <div class="paper-wire"><span>${GateMath.toHTML("|0\\rangle")}</span><div class="paper-arrow"></div></div>
            <div class="paper-dots">${GateMath.toHTML("\\vdots")}</div>
            <div class="paper-wire"><span>${GateMath.toHTML("|0\\rangle")}</span><div class="paper-arrow"></div></div>
            <div class="paper-wire"><span>${GateMath.toHTML("|\\psi\\rangle")}</span><div class="paper-arrow"></div></div>
          </div>

          <button class="qecc-pipe-block" data-block="encoder" id="qecc-block-encoder" disabled aria-label="Encoder">
            Encoder
          </button>

          <div class="paper-wire-inline">
            <div class="paper-label">${GateMath.toHTML("|\\psi_L\\rangle")}</div>
            <div class="paper-line"><div class="paper-arrow"></div></div>
          </div>

          <button class="qecc-pipe-block qecc-pipe-block--noise" data-block="quantum-channel" id="qecc-block-quantum-channel" disabled aria-label="Quantum Channels">
            Quantum<br>Channels
          </button>

          <div class="paper-wire-inline">
            <div class="paper-label">${GateMath.toHTML("|\\psi_R\\rangle")}</div>
            <div class="paper-line"><div class="paper-arrow"></div></div>
          </div>

          <div class="paper-stabilizer-col">
            <button class="qecc-pipe-block" data-block="stabilizer" id="qecc-block-stabilizer" disabled aria-label="Stabilizer">
              Stabilizer
            </button>
            <div class="paper-vertical-bus">
              <div class="v-wire"><div class="v-arrow"></div></div>
              <div class="v-dots">${GateMath.toHTML("\\cdots")}</div>
              <div class="v-wire"><div class="v-arrow"></div></div>
            </div>
          </div>

          <div class="paper-wire-inline">
            <div class="paper-label">${GateMath.toHTML("|\\psi_R\\rangle")}</div>
            <div class="paper-line"><div class="paper-arrow"></div></div>
          </div>

          <div class="paper-correction-col">
            <button class="qecc-pipe-block" data-block="correction" id="qecc-block-correction" disabled aria-label="Error Correction">
              Error<br>Correction
            </button>
          </div>

          <div class="paper-wire-inline paper-wire-out">
            <div class="paper-line"><div class="paper-arrow"></div></div>
            <div class="paper-label">${GateMath.toHTML("|\\hat{\\psi}_L\\rangle")}</div>
          </div>

        </div>

        <!-- ROW 2: Syndrome branch -->
        <div class="paper-row paper-row-syndrome">
          
          <!-- This spacer pushes the inputs under the Stabilizer block -->
          <div class="paper-spacer"></div>

          <div class="paper-inputs">
            <div class="paper-wire"><span>${GateMath.toHTML("|0\\rangle")}</span><div class="paper-arrow"></div></div>
            <div class="paper-dots">${GateMath.toHTML("\\vdots")}</div>
            <div class="paper-wire"><span>${GateMath.toHTML("|0\\rangle")}</span><div class="paper-arrow"></div></div>
          </div>

          <button class="qecc-pipe-block" data-block="syndrome" id="qecc-block-syndrome" disabled aria-label="Syndrome Processing">
            Syndrome<br>Processing
          </button>

          <div class="paper-feedback-route">
            <div class="route-label">${GateMath.toHTML("S \\rightarrow LUT")}</div>
            <div class="route-line-h"></div>
            <div class="route-corner">
              <div class="route-line-v"></div>
              <div class="route-arrow-up"></div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Get references to DOM elements.
  bindElements() {
    this.elements = {
      analyzeBtn:    this.container.querySelector("#qecc-analyze"),
      clearBtn:      this.container.querySelector("#qecc-clear"),
      paramsBlock:   this.container.querySelector("#qecc-params-block"),
      syndromeBody:  this.container.querySelector("#qecc-syndrome-body"),
      generatorBody: this.container.querySelector("#qecc-generator-body"),
      hInput:        this.container.querySelector("#qecc-h"),
      hxInput:       document.getElementById("qecc-hx"),
      hzInput:       document.getElementById("qecc-hz"),
      hintEl:        document.getElementById("qecc-matrix-hint"),
      hWrapper:      this.container.querySelector("#qecc-h-wrapper"),
      hxWrapper:     this.container.querySelector("#qecc-hx-wrapper"),
      hzWrapper:     this.container.querySelector("#qecc-hz-wrapper"),
      presetMenu:    this.container.querySelector("#qecc-preset-menu"),
    };
  }

  // Bind component event listeners.
  bindEvents() {
    UI.bindAccordions(this.container);
    UI.bindMobileToggle("#cb-controls-wrapper");

    // Actions
    this.elements.analyzeBtn?.addEventListener("click", () => this.handleAnalyze(true));
    this.elements.clearBtn?.addEventListener("click", this.handleClear);

    // GF format toggle
    this.container.querySelectorAll("[data-fmt]").forEach((btn) => {
      btn.addEventListener("click", this.handleFormatToggle.bind(this));
    });

    // Code type grid
    this.container.querySelectorAll(".qecc-type-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const newType = e.currentTarget.dataset.gate;
        this._setCodeType(newType);
      });
    });

    // Hx input — sync to Hz when dual-css
    this.elements.hxInput?.addEventListener("input", this.handleHxInput);

    // Ctrl+Enter on matrix inputs to trigger analyze
    [this.elements.hInput, this.elements.hxInput, this.elements.hzInput].forEach((input) => {
      input?.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          this.handleAnalyze();
        }
      });
    });

    // Pipeline block clicks
    this.container.querySelectorAll(".qecc-pipe-block").forEach((btn) => {
      btn.addEventListener("click", this.handleBlockClick);
    });

    // Tab switching
    this.container.querySelectorAll(".qecc-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this._switchTab(e.currentTarget.dataset.tab);
      });
    });

    // Preset dropdown
    const presetBtn = this.container.querySelector("#qecc-preset-btn");
    if (presetBtn && this.elements.presetMenu) {
      presetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.elements.presetMenu.classList.toggle("show");
      });
      document.addEventListener("click", () => {
        this.elements.presetMenu?.classList.remove("show");
      });
    }

    // Preset menu items
    this.container.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", this.handlePresetLoad);
    });

    // Copy Link
    const copyLinkBtn = this.container.querySelector("#qecc-copy-link");
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", () => {
        this._updateURL(); // Ensure URL is fully up-to-date
        UI.copyToClipboard(window.location.href)
          .then(() => {
            UI.showToast("Link copied to clipboard!");
          })
          .catch(() => {
            UI.showToast("Failed to copy link", "error");
          });
      });
    }
  }

  // URL Serialization

  // Serializes the current configuration and pushes it to the URL hash.
  _updateURL() {
    QECCSerializer.updateURL(this);
  }

  // Render the component into the DOM.
  render() {
    this._updateFormatUI();
    this._updateHzLock();
  }

  // Event Handlers

  // Sets the current code type, updates the UI format, and clears existing results.
  _setCodeType(newType) {
    if (newType === this.state.codeType) return;
    this.state.codeType = newType;
    
    // Update active button
    this.container.querySelectorAll(".qecc-type-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.gate === newType);
    });
    this._updateHzLock();
    this.state.analysisResult = null;
    this._clearResults();
  }

  // Toggles the input format between binary GF(2) and Pauli string representations.
  handleFormatToggle(e) {
    const fmt = e.currentTarget.dataset.fmt;
    if (fmt === this.state.inputFormat) return;
    this.state.inputFormat = fmt;

    this.container.querySelectorAll("[data-fmt]").forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");

    // Unselect code type when format changes
    this._setCodeType("");

    this._updateFormatUI();
  }

  // Updates the visibility of input fields based on the selected input format.
  _updateFormatUI() {
    const isGF4 = this.state.inputFormat === "gf4";

    // Toggle wrapper visibility
    if (this.elements.hWrapper) this.elements.hWrapper.classList.toggle("hidden", !isGF4);
    if (this.elements.hxWrapper) this.elements.hxWrapper.classList.toggle("hidden", isGF4);
    if (this.elements.hzWrapper) this.elements.hzWrapper.classList.toggle("hidden", isGF4);

    // Disable/Enable code type buttons based on format
    this.container.querySelectorAll(".qecc-type-btn").forEach((btn) => {
      const isCustomBtn = btn.classList.contains("qecc-type-btn--custom");
      if (isGF4) {
        btn.classList.toggle("disabled", !isCustomBtn);
      } else {
        btn.classList.toggle("disabled", isCustomBtn);
      }
    });

    this._updatePlaceholders();
  }

  // Replaces the placeholder text in the matrix input areas based on the active format and code type.
  _updatePlaceholders() {
    let hxExample = "";
    let hzExample = "";
    let hExample = "";

    switch (this.state.codeType) {
      case "non-css":
        hxExample = "Example:\n0 1 1 0 0\n1 1 0 0 0\n1 0 0 1 0\n0 0 1 0 1";
        hzExample = "Example:\n1 1 1 1 0\n1 1 1 0 1\n0 1 1 0 0\n1 1 0 0 0";
        break;
      case "dual-css":
        hxExample = "Example:\n1 0 0 1 0 1 1\n0 1 0 1 1 0 1\n0 0 1 0 1 1 1";
        hzExample = "This matrix is automatically set to match the matrix above.";
        break;
      case "nondual-css":
        hxExample = "Example:\n1 0 0 1 0 1 1\n0 1 0 1 1 0 1\n0 0 1 0 1 1 1";
        hzExample = "Example:\n1 0 0 1 0 1 1\n0 1 0 1 1 0 1\n0 0 1 0 1 1 1";
        break;
      case "custom":
        hExample = "Example:\n1 w2 w2 1 0\nw2 w2 1 0 1\nw 1 1 w 0\n1 1 w 0 w";
        hxExample = "";
        hzExample = "";
        break;
      default:
        hExample = "Enter Parity Check Matrix here";
        hxExample = "Enter Parity Check Matrix here";
        hzExample = "Enter Parity Check Matrix here";
        break;
    }

    if (this.elements.hInput) {
      this.elements.hInput.placeholder = hExample;
    }
    if (this.elements.hxInput) {
      this.elements.hxInput.placeholder = hxExample;
    }
    if (this.elements.hzInput) {
      this.elements.hzInput.placeholder = hzExample;
    }
  }

  // Synchronizes the Hz textarea value from Hx when in dual-CSS mode.
  handleHxInput() {
    if (this.state.codeType === "dual-css" && this.elements.hzInput) {
      this.elements.hzInput.value = this.elements.hxInput.value;
    }
  }

  // Loads a predefined quantum error correction code from the preset dropdown menu.
  handlePresetLoad(e) {
    const presetId = e.currentTarget.dataset.preset;
    const preset   = QECCMath.PRESETS[presetId];
    if (!preset) return;

    // Close the dropdown
    this.elements.presetMenu?.classList.remove("show");

    // Push the URL state and re-initialize
    window.history.replaceState({}, '', `${window.location.pathname}?${preset.query}`);
    QECCSerializer.initFromURL(this, QECCMath);
    UI.showToast(`Loaded preset: ${preset.name}`);
  }

  // Clears the input fields, results, and URL state.
  handleClear() {
    if (this.elements.hInput)  this.elements.hInput.value  = "";
    if (this.elements.hxInput) this.elements.hxInput.value = "";
    if (this.elements.hzInput) this.elements.hzInput.value = "";
    this.state.analysisResult = null;
    this._clearResults();
    this._clearError();
    window.history.replaceState({}, '', window.location.pathname);
    UI.showToast("Inputs cleared");
  }

  // Parses the input matrices and triggers the quantum error correction analysis pipeline.
  handleAnalyze(showToast = true) {
    this._clearError();

    if (!this.state.codeType) {
      this._showError("Please select a Code Type before analyzing.");
      return;
    }

    const codeTypeDef = QECCMath.CODE_TYPES[this.state.codeType];
    if (!codeTypeDef) return;

    let hxMat, hzMat;
    const codeType = this.state.codeType;
    const isDualCSS = codeType === "dual-css";
    const isGF4 = this.state.inputFormat === "gf4";
    const hText = this.elements.hInput?.value.trim() ?? "";
    const hxText = this.elements.hxInput?.value.trim() ?? "";
    const hzText = this.elements.hzInput?.value.trim() ?? "";

    if (isGF4) {
      if (!hText) {
        this._showError(`PCM of ${GateMath.toHTML("H")} is empty. Please enter the parity check matrix.`);
        return;
      }
      let parsedH;
      try {
        parsedH = QECCMath.parseMatrix(hText);
      } catch (e) {
        this._showError(`${GateMath.toHTML("H")}: invalid format. Use elements 0, 1, w, w2 separated by spaces, one row per line.`);
        return;
      }
      if (!parsedH || !QECCMath.validateGF4(parsedH)) {
        this._showError(`${GateMath.toHTML("H")}: GF(4) entries must be 0, 1, w, or w2.`);
        return;
      }
      const mapped = QECCMath.gf4ToSymplectic(parsedH);
      hxMat = mapped.Hx;
      hzMat = mapped.Hz;
    } else {
      if (!hxText) {
        this._showError(`PCM of ${GateMath.toHTML("H_X")} is empty. Please enter the parity check matrix.`);
        return;
      }
      if (!hzText && codeType !== "dual-css") {
        this._showError(`PCM of ${GateMath.toHTML("H_Z")} is empty. Please enter the parity check matrix.`);
        return;
      }
      const hzTextToUse = (codeType === "dual-css" && !hzText) ? hxText : hzText;
      const hxParsed = QECCMath.parseMatrix(hxText);
      const hzParsed = QECCMath.parseMatrix(hzTextToUse);

      if (!hxParsed) {
        this._showError(`${GateMath.toHTML("H_X")}: invalid format. Use integers separated by spaces, one row per line.`);
        return;
      }
      if (!hzParsed) {
        this._showError(`${GateMath.toHTML("H_Z")}: invalid format. Use integers separated by spaces, one row per line.`);
        return;
      }
      if (!QECCMath.validateGF2(hxParsed)) {
        this._showError(`${GateMath.toHTML("H_X")}: GF(2) entries must be 0 or 1.`);
        return;
      }
      if (!isDualCSS && !QECCMath.validateGF2(hzParsed)) {
        this._showError(`${GateMath.toHTML("H_Z")}: GF(2) entries must be 0 or 1.`);
        return;
      }

      hxMat = hxParsed;
      hzMat = hzParsed;
    }

    // Validate against code-type constraints
    const matrices = isDualCSS ? [hxMat] : [hxMat, hzMat];
    const validation = codeTypeDef.validate(matrices);
    if (!validation.ok) {
      this._showError(validation.error);
      return;
    }

    // Build PCM
    const { Hx, Hz } = codeTypeDef.buildPCM(matrices);
    const n = Hx[0].length;

    if (n > 16) {
      this._showError(`n = ${n} exceeds the maximum supported value of n ≤ 16.`);
      return;
    }

    // Compute code parameters
    const { K, r } = QECCMath.computeNKr(Hx, Hz);
    const k = K;

    // RREF for encoder
    const fullH = Hx.map((row, i) => [...row, ...Hz[i]]);
    const { rref } = QECCMath.rrefGF2(fullH);
    const HxRref = rref.map((row) => row.slice(0, n));
    const HzRref = rref.map((row) => row.slice(n));

    // Logical operators and circuit descriptors
    const sf = QECCMath.toStandardForm(Hx, Hz);
    const { X_bar: xBar, Z_bar: zBar } = QECCMath.deriveLogicals(sf.blocks, sf.r, sf.s, sf.K, sf.N, sf.colPerm);
    const encoderCircuit = QECCMath.describeEncoderCircuit(n, k, r, xBar, HxRref, HzRref);
    const stabCircuit    = QECCMath.describeStabilizerCircuit(n, k, Hx, Hz);

    // Syndrome LUT and distance
    const { lut, hasDegeneracy } = QECCMath.buildSyndromeLUT(Hx, Hz);
    const canCorrect = QECCMath.checkSingleErrorCorrection(lut, hasDegeneracy);
    const d          = QECCMath.computeDistance(rref, xBar, zBar);

    // Store result and update UI
    this.state.analysisResult = { Hx, Hz, n, k, r, d, encoderCircuit, stabCircuit, lut, hasDegeneracy, canCorrect, xBar, zBar };
    this._renderResults();
    this._updateURL();
    if (showToast !== false) {
      UI.showToast(`Analyzed [[${n}, ${k}, ${d}]] code`);
    }
  }

  // Opens the sub-modal for a specific pipeline block.
  handleBlockClick(e) {
    const blockId = e.currentTarget.dataset.block;
    const result  = this.state.analysisResult;

    // Highlight the clicked block
    this.container.querySelectorAll(".qecc-pipe-block").forEach((b) => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    this.state.activeBlock = blockId;

    // Build data payload for the modal
    const data = result ? {
      Hx:            result.Hx,
      Hz:            result.Hz,
      n:             result.n,
      k:             result.k,
      d:             result.d,
      r:             result.r,
      encoderCircuit: result.encoderCircuit,
      stabCircuit:   result.stabCircuit,
      lut:           result.lut,
      hasDegeneracy: result.hasDegeneracy,
      canCorrect:    result.canCorrect,
    } : {};

    QECCBlockModal.open(blockId, data, () => {
      this.container.querySelectorAll(".qecc-pipe-block").forEach((b) => b.classList.remove("active"));
      this.state.activeBlock = null;
    });
  }

  // Internal Helpers

  // Locks or unlocks the Hz textarea based on the dual-CSS code type.
  _updateHzLock() {
    const { hzInput, hintEl, hxInput, hInput, analyzeBtn } = this.elements;
    const codeType = this.state.codeType;
    const hasType  = !!codeType;
    const isDualCSS = codeType === "dual-css";

    if (hInput) {
      hInput.disabled = !hasType;
      hInput.classList.toggle("qecc-matrix-input--locked", !hasType);
    }

    if (hxInput) {
      hxInput.disabled = !hasType;
      hxInput.classList.toggle("qecc-matrix-input--locked", !hasType);
    }

    if (hzInput) {
      hzInput.disabled = !hasType;
      if (!hasType) {
        hzInput.classList.add("qecc-matrix-input--locked");
      }
    }

    if (analyzeBtn) {
      analyzeBtn.disabled = !hasType;
    }

    if (hzInput && hasType) {
      if (isDualCSS) {
        hzInput.readOnly = true;
        hzInput.classList.add("qecc-matrix-input--locked");
        hzInput.placeholder = "This matrix is automatically set to match the matrix above.";
        hzInput.value = hxInput?.value ?? "";
      } else {
        hzInput.readOnly = false;
        hzInput.classList.remove("qecc-matrix-input--locked");
      }
    }

    if (hintEl) {
      hintEl.classList.remove("error");
      if (hasType) {
        hintEl.textContent = "Stabilizers must commute. Ensure sympletic inner product is zero.";
      } else {
        hintEl.textContent = "Select a code type to enter your matrix.";
      }
    }

    this._updatePlaceholders();
  }

  // Render Helpers

  // Switches the active results tab and updates the UI state.
  _switchTab(tabName) {
    this.container.querySelectorAll(".qecc-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    const { syndromeBody, generatorBody } = this.elements;
    if (syndromeBody)  syndromeBody.classList.toggle("hidden",  tabName !== "syndrome");
    if (generatorBody) generatorBody.classList.toggle("hidden", tabName !== "generator");
  }

  // Renders the quantum error correction analysis results into the DOM.
  _renderResults() {
    const result = this.state.analysisResult;
    if (!result) return;

    // Unlock pipe blocks
    this.container.querySelectorAll(".qecc-pipe-block").forEach((b) => b.removeAttribute("disabled"));

    // Params block (N / K / d / r)
    const pb = this.elements.paramsBlock;
    if (pb) {
      const codeTitle = `[[${result.n}, ${result.k}, ${result.d}]] Quantum Codes`;
      pb.innerHTML = `
        <div class="qecc-params-title">${codeTitle}</div>
        <div class="qecc-params-row">
          <div class="qecc-param-item">
            <span class="qecc-param-label">${GateMath.toHTML("N")} =</span>
            <span class="qecc-param-val">${result.n}</span>
          </div>
          <div class="qecc-param-item">
            <span class="qecc-param-label">${GateMath.toHTML("K")} =</span>
            <span class="qecc-param-val">${result.k}</span>
          </div>
          <div class="qecc-param-item">
            <span class="qecc-param-label">${GateMath.toHTML("d")} =</span>
            <span class="qecc-param-val">${result.d}</span>
          </div>
          <div class="qecc-param-item">
            <span class="qecc-param-label">${GateMath.toHTML("r")} =</span>
            <span class="qecc-param-val">${result.r}</span>
          </div>
        </div>
      `;
      pb.classList.remove("hidden");
    }

    // Syndrome list
    if (this.elements.syndromeBody) {
      let html = "<div class=\"qecc-list\">";
      result.lut.forEach((entry, idx) => {
        const isDegeneracy = entry.degeneracy !== null;
        const statusCls    = isDegeneracy ? "qecc-status--degenerate" : "qecc-status--non-degenerate";
        const statusText   = isDegeneracy ? "Degenerate" : "Non-degenerate";
        html += `
          <div class="qecc-list-row">
            <span class="qecc-list-idx">${idx + 1}.</span>
            <span class="qecc-list-syndrome">${entry.syndromeStr}</span>
            <span class="qecc-list-error">${entry.label}</span>
            <span class="qecc-list-status ${statusCls}">${statusText}</span>
          </div>
        `;
      });
      html += "</div>";
      this.elements.syndromeBody.innerHTML = html;
    }

    // Generator list
    if (this.elements.generatorBody) {
      const { generators } = QECCMath.describeStabilizerCircuit(
        result.n, result.k, result.Hx, result.Hz
      );
      
      const renderLogical = (sympMat, symbol) => {
        if (!sympMat) return [];
        return sympMat.map((row, i) => {
          let chars = "";
          for (let j = 0; j < result.n; j++) {
            const x = row[j], z = row[result.n + j];
            if (x === 1 && z === 1) chars += "Y";
            else if (x === 1)       chars += "X";
            else if (z === 1)       chars += "Z";
            else                    chars += "I";
          }
          return { label: `\\bar{${symbol}}_{${i + 1}}`, pauliStr: chars };
        });
      };

      const xLogicals = renderLogical(result.xBar, "X");
      const zLogicals = renderLogical(result.zBar, "Z");
      
      // Generators have label g1, g2, etc. We want KaTeX for them too: `g_{1}`
      const allOps = [
        ...generators.map(g => ({ label: `g_{${g.index}}`, pauliStr: g.pauliStr })),
        ...xLogicals,
        ...zLogicals
      ];

      let html = "<div class=\"qecc-list\">";
      allOps.forEach((op, idx) => {
        html += `
          <div class="qecc-list-row">
            <span class="qecc-list-idx">${idx + 1}.</span>
            <span class="qecc-list-gen-label">${GateMath.toHTML(op.label)}</span>
            <span class="qecc-list-error">${op.pauliStr}</span>
          </div>
        `;
      });
      html += "</div>";
      this.elements.generatorBody.innerHTML = html;
    }

    // Default to syndrome tab
    this._switchTab("syndrome");
  }

  // Clears the rendered analysis results and resets the pipeline UI.
  _clearResults() {
    if (!this.container) return;

    this.container.querySelectorAll(".qecc-pipe-block").forEach((b) => b.setAttribute("disabled", ""));
    this.elements.paramsBlock?.classList.add("hidden");

    const emptyHtml = (msg) => `
      <div class="qecc-empty-state">
        ${Icons.play}
        <p>${msg}</p>
      </div>
    `;
    if (this.elements.syndromeBody)
      this.elements.syndromeBody.innerHTML = emptyHtml("Analyze a code to see<br>the syndrome lookup table.");
    if (this.elements.generatorBody)
      this.elements.generatorBody.innerHTML = emptyHtml("Analyze a code to see<br>the stabilizer generators.");

    this._switchTab("syndrome");
  }

  // Displays an error message within the tool's error panel.
  _showError(msg) {
    if (this.elements.hintEl) {
      this.elements.hintEl.innerHTML = msg;
      this.elements.hintEl.classList.add("error");
    }
    const plain = this.elements.hintEl?.textContent?.trim() || "Analysis failed";
    UI.showToast(plain, "error");
  }

  // Hides and clears the tool's error panel.
  _clearError() {
    this._updateHzLock(); // restores default hint state
  }
}

export let qeccSimulatorInstance = null;

// Entry point — follows the same export pattern as renderEntanglementTracker
export function renderQeccSimulator(container) {
  qeccSimulatorInstance = new QECCSimulator();
  qeccSimulatorInstance.mount(container);
}
