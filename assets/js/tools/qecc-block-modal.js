// QUANTUM LABS — QECC Block Modal
// Controls the sub-modal overlay for inspecting QECC pipeline blocks.
// Each pipeline block click calls QECCBlockModal.open(blockId, data).
// Pattern follows mini-circuit-modal.js (separate dedicated modal file).

import { GateMath } from "../core/math-renderer.js";

export const QECCBlockModal = (() => {
  "use strict";

  let modalEl = null;
  let currentOnClose = null;

  // Creates and appends the modal DOM element idempotently.
  function createModalHTML() {
    if (document.getElementById("qecc-block-modal")) return;

    const div = document.createElement("div");
    div.className = "modal-overlay";
    div.id = "qecc-block-modal";
    div.setAttribute("role", "dialog");
    div.setAttribute("aria-modal", "true");
    div.innerHTML = `
      <div class="modal-container" style="max-width: 820px; margin: auto;">
        <div class="modal-body" id="qecc-block-modal-body">
          <div class="param-header">
            <label id="qecc-block-modal-title"></label>
          </div>
          <div id="qecc-block-modal-content"></div>
          <div class="modal-actions">
            <div class="modal-actions-right">
              <button class="btn" id="qecc-block-modal-close">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    modalEl = div;

    // Close via Close button
    div.querySelector("#qecc-block-modal-close").addEventListener("click", close);

    // Close via backdrop click
    div.addEventListener("click", (e) => {
      if (e.target === div) close();
    });

    // Close via Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalEl?.classList.contains("open")) close();
    });
  }

  // Opens the modal for a specific pipeline block.
  function open(blockId, data, onClose) {
    createModalHTML();
    if (!modalEl) return;

    currentOnClose = onClose || null;

    const titleEl = modalEl.querySelector("#qecc-block-modal-title");
    const contentEl = modalEl.querySelector("#qecc-block-modal-content");

    const { title, html } = renderBlockContent(blockId, data);
    titleEl.textContent = title;
    contentEl.innerHTML = html;

    modalEl.classList.add("open");
  }

  // Closes the modal and triggers the optional onClose callback.
  function close() {
    if (!modalEl) return;
    modalEl.classList.remove("open");
    if (typeof currentOnClose === "function") currentOnClose();
    currentOnClose = null;
  }

  // Block Content Renderers

  // Renders the specific content for a given pipeline block.
  function renderBlockContent(blockId, data) {
    switch (blockId) {
      case "encoder":    return renderEncoder(data);
      case "quantum-channel": return renderQuantumChannel(data);
      case "stabilizer": return renderStabilizer(data);
      case "syndrome":   return renderSyndromeProcessing(data);
      case "correction": return renderCorrection(data);
      default:           return { title: "Unknown Block", html: "<p>No content available.</p>" };
    }
  }

  // Encoder

  // Renders the Encoder block details, showing the logical mapping and circuit.
  function renderEncoder(data) {
    const { encoderCircuit, n, k, r, d } = data;
    if (!encoderCircuit) {
      return { title: "Encoder Circuit", html: renderEmptyState("Analyze a code to see the encoder circuit.") };
    }

    const { steps } = encoderCircuit;
    
    const qToV = (q) => (q >= r ? q - r : q + k);
    const columns = steps.map(step => [step]);
    
    const numCols = columns.length;

    let html = `
      <div class="qecc-modal-section qecc-modal-section--center-scroll">
        <div class="sc-grid" style="grid-template-columns: auto 20px repeat(${numCols}, 40px) 20px 10px auto; grid-template-rows: 36px repeat(${n}, 28px) 20px auto;">
    `;
    
    // Left Labels (0..r-1 are |0>, r..n-1 are |\psi>)
    for (let i = 0; i < n; i++) {
      const label = i < r ? "|0\\rangle" : "|\\psi\\rangle";
      html += `<div class="sc-label" style="grid-column: 1; grid-row: ${i + 2}; justify-self: end; padding-right: 12px;">${GateMath.toHTML(label)}</div>`;
    }

    // Right Brace & Label
    html += `
          <div class="sc-brace" style="grid-column: ${numCols + 4}; grid-row: 2 / ${n + 2};">
            <svg preserveAspectRatio="none" viewBox="0 0 10 100">
              <path d="M 0,0 C 2,0 5,2 5,15 L 5,35 C 5,48 8,50 10,50 C 8,50 5,52 5,65 L 5,85 C 5,98 2,100 0,100" fill="none" stroke="currentColor"/>
            </svg>
          </div>
          <div class="sc-label" style="grid-column: ${numCols + 5}; grid-row: 2 / ${n + 2};">${GateMath.toHTML("|\\psi_L\\rangle")}</div>
    `;

    // Horizontal Wires
    for (let i = 0; i < n; i++) {
      html += `<div class="sc-h-wire" style="grid-column: 2 / ${numCols + 4}; grid-row: ${i + 2};"></div>`;
    }

    // Gates
    for (let col = 0; col < numCols; col++) {
      const colSteps = columns[col] || [];
      const gridCol = col + 3;
      
      for (const step of colSteps) {
        if (step.type === 'H') {
          html += `<div class="sc-node" style="grid-column: ${gridCol}; grid-row: ${step.qubit + 2};"><span>H</span></div>`;
        } else if (step.type === 'MULTI_CTRL') {
          const qs = [step.control, ...step.targets.map(t => t.qubit)];
          const top = Math.min(...qs);
          const bottom = Math.max(...qs);
          
          html += `<div class="sc-v-wire" style="grid-column: ${gridCol}; grid-row: ${top + 2} / ${bottom + 3};"></div>`;
          html += `<div class="sc-control" style="grid-column: ${gridCol}; grid-row: ${step.control + 2};"></div>`;
          
          for (const target of step.targets) {
            html += `<div class="sc-node" style="grid-column: ${gridCol}; grid-row: ${target.qubit + 2};"><span>${target.pauli}</span></div>`;
          }
        }
      }
    }

    html += `
        </div>
      </div>
    `;

    return { title: "Encoder Circuit of [[" + n + ", " + k + ", " + d + "]] Quantum Codes", html };
  }

  // Quantum Channel

  // Renders the Quantum Channels block, simulating noise.
  function renderQuantumChannel(data) {
    const { n, k, d } = data;
    if (!n) {
      return { title: "Quantum Channel", html: renderEmptyState("Analyze a code to see the error model.") };
    }

    const html = `
      <div class="qecc-modal-section">
        <div class="qecc-modal-subsection-label">Single-Qubit Error Space Evaluation</div>
        <div class="qecc-modal-math-block">
          ${GateMath.toHTML("\\mathcal{E}_1 = \\{ I^{\\otimes n} \\} \\cup \\{ E_i^\\alpha \\mid i \\in \\{1, \\dots, n\\}, \\alpha \\in \\{X, Y, Z\\} \\}", true)}
        </div>
        
        <div class="qecc-modal-subsection-label mt-sp6">Definitions</div>
        <ul class="qecc-modal-math-list">
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("\\mathcal{E}_1")}</span>: Set of all physical Pauli errors with weight ${GateMath.toHTML("w(E) \\le 1")}.</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("I^{\\otimes n}")}</span>: The ${GateMath.toHTML("n")}-qubit Identity operator (${GateMath.toHTML("I^{\\otimes n} = \\bigotimes_{j=1}^n I_j")}), representing no channel error.</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("E_i^\\alpha")}</span>: Single Pauli operator of type ${GateMath.toHTML("\\alpha \\in \\{X, Y, Z\\}")} acting on physical qubit index ${GateMath.toHTML("i")}.</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("n")}</span>: Total number of physical qubits in the code block.</li>
        </ul>

        <div class="qecc-modal-subsection-label">Cardinality & Evaluation</div>
        <div class="qecc-modal-math-block">
          ${GateMath.toHTML("|\\mathcal{E}_1| = 3n + 1", true)}
        </div>
        <p class="qecc-modal-desc qecc-modal-desc--center">
          For an [[n, k, d]] code with ${GateMath.toHTML("n = " + n)}, the evaluator tests ${GateMath.toHTML(`|\\mathcal{E}_1| = 3(${n}) + 1 = ${3 * n + 1}`)} distinct error patterns.
        </p>

        <div class="qecc-modal-subsection-label">Symplectic Vector Mapping (${GateMath.toHTML("\\mathbb{F}_2^{2n}")})</div>
        <p class="qecc-modal-desc qecc-modal-desc--center-4">
          Single-qubit Pauli operators translate into binary symplectic vectors ${GateMath.toHTML("e = (v_x \\mid v_z)")}:
        </p>
        <ul class="qecc-modal-math-mapping">
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("I^{\\otimes n}")}</span> ${GateMath.toHTML("\\longrightarrow (00\\dots0 \\mid 00\\dots0)")}</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("X_i")}</span> ${GateMath.toHTML("\\longrightarrow (0\\dots1_i\\dots0 \\mid 0\\dots0_i\\dots0)")}</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("Z_i")}</span> ${GateMath.toHTML("\\longrightarrow (0\\dots0_i\\dots0 \\mid 0\\dots1_i\\dots0)")}</li>
          <li><span class="qecc-modal-math-term">${GateMath.toHTML("Y_i")}</span> ${GateMath.toHTML("\\longrightarrow (0\\dots1_i\\dots0 \\mid 0\\dots1_i\\dots0)")}</li>
        </ul>
      </div>
    `;

    return { title: "Quantum Channel of [[" + n + ", " + k + ", " + d + "]] Quantum Codes", html };
  }

  // Stabilizer

  // Renders the Stabilizer Measurement block, detailing parity checks.
  function renderStabilizer(data) {
    const { Hx, Hz, n, k, d } = data;
    if (!Hx || !Hz) {
      return { title: "Stabilizer Generators", html: renderEmptyState("Analyze a code to see the stabilizers.") };
    }

    const r = Hx.length;
    let html = `
      <div class="qecc-modal-section qecc-modal-section--center-scroll">
        <div class="sc-grid" style="grid-template-columns: auto 10px 20px repeat(${r}, 40px) 20px 10px auto; grid-template-rows: 36px repeat(${n}, 28px) 20px 20px auto;">
          
          <!-- Left Label & Brace -->
          <div class="sc-label" style="grid-column: 1; grid-row: 2 / ${n + 2};">${GateMath.toHTML("|\\psi_R\\rangle")}</div>
          <div class="sc-brace" style="grid-column: 2; grid-row: 2 / ${n + 2};">
            <svg preserveAspectRatio="none" viewBox="0 0 10 100">
              <path d="M 10,0 C 8,0 5,2 5,15 L 5,35 C 5,48 2,50 0,50 C 2,50 5,52 5,65 L 5,85 C 5,98 8,100 10,100" fill="none" stroke="currentColor"/>
            </svg>
          </div>
          
          <!-- Right Label & Brace -->
          <div class="sc-brace" style="grid-column: ${r + 5}; grid-row: 2 / ${n + 2};">
            <svg preserveAspectRatio="none" viewBox="0 0 10 100">
              <path d="M 0,0 C 2,0 5,2 5,15 L 5,35 C 5,48 8,50 10,50 C 8,50 5,52 5,65 L 5,85 C 5,98 2,100 0,100" fill="none" stroke="currentColor"/>
            </svg>
          </div>
          <div class="sc-label" style="grid-column: ${r + 6}; grid-row: 2 / ${n + 2};">${GateMath.toHTML("|\\psi_R\\rangle")}</div>
          
          <!-- Bottom Brace & Label -->
          <div class="sc-bottom-brace" style="grid-column: 4 / ${r + 4}; grid-row: ${n + 3}; margin: 0 20px;">
            <svg preserveAspectRatio="none" viewBox="0 0 100 10" style="width: 100%; height: 100%; display: block; overflow: visible;">
              <path d="M 0,0 C 0,2 2,5 15,5 L 35,5 C 48,5 50,8 50,10 C 50,8 52,5 65,5 L 85,5 C 98,5 100,2 100,0" fill="none" stroke="currentColor"/>
            </svg>
          </div>
          <div class="sc-label" style="grid-column: 4 / ${r + 4}; grid-row: ${n + 4}; padding-top: 4px;">${GateMath.toHTML("\\LARGE \\cdot")}</div>
    `;

    // Headers
    for (let j = 0; j < r; j++) {
      html += `<div class="sc-header" style="grid-column: ${j + 4}; grid-row: 1; align-self: flex-end; margin-bottom: 8px;">${GateMath.toHTML("g_{" + (j + 1) + "}")}</div>`;
    }

    // Horizontal Wires
    for (let i = 0; i < n; i++) {
      html += `<div class="sc-h-wire" style="grid-column: 3 / ${r + 5}; grid-row: ${i + 2};"></div>`;
    }

    // Vertical Wires and Pauli Nodes
    let nodesHtml = "";
    for (let j = 0; j < r; j++) {
      let firstQubit = -1;
      let nodesForGen = "";
      
      for (let i = 0; i < n; i++) {
        const x = Hx[j][i];
        const z = Hz[j][i];
        let pauli = "";
        if (x === 1 && z === 0) pauli = "X";
        else if (x === 1 && z === 1) pauli = "Y";
        else if (x === 0 && z === 1) pauli = "Z";
        
        if (pauli !== "") {
          if (firstQubit === -1) firstQubit = i;
          nodesForGen += `<div class="sc-node" style="grid-column: ${j + 4}; grid-row: ${i + 2};"><span>${pauli}</span></div>`;
        }
      }

      if (nodesForGen !== "") {
        // Vertical wire (first qubit → bottom gap row)
        html += `<div class="sc-v-wire" style="grid-column: ${j + 4}; grid-row: ${firstQubit + 2} / ${n + 3};"></div>`;
      }
      
      nodesHtml += nodesForGen;
    }
    
    html += nodesHtml; // Nodes on top of wires

    html += `
        </div>
      </div>
    `;

    return { title: "Stabilizer Generators of [[" + n + ", " + k + ", " + d + "]] Quantum Codes", html };
  }

  // Syndrome Processing

  // Renders the Syndrome Processing block, looking up error corrections.
  function renderSyndromeProcessing(data) {
    const { stabCircuit, n, k, d } = data;
    if (!stabCircuit || !stabCircuit.generators) {
      return { title: "Syndrome Extraction", html: renderEmptyState("Analyze a code to see syndrome extraction circuit.") };
    }

    const { generators, r } = stabCircuit;

    // Grid row indices (1-indexed)
    const ROW_LABEL = 1; // g_1, g_2, ..., g_r label
    const ROW_BRACE = 2; // Top curly brace
    const ROW_TOP_GAP = 3; // gap for vertical wires to go up into
    const ROW_ANC_BASE = 4; // ancilla qubits (generators)

    // Grid column indices (1-indexed)
    const COL_QLABEL = 1; // |0> labels
    const COL_L_SP   = 2; // gap between |0> and H1
    const COL_H1     = 3; // H gate for ancillas
    const COL_G_BASE = 4; // Column for generator 1
    const COL_H2     = 4 + r; // H gate 2 for ancillas
    const COL_M      = 5 + r; // Measurement for ancillas
    const COL_CW     = 6 + r; // Classical double wire
    const COL_SJ     = 7 + r; // S_j labels

    let html = `
      <div class="qecc-modal-section qecc-modal-section--center-scroll">
        <div class="sc-grid" style="
          grid-template-columns: 24px 16px 36px repeat(${r}, 28px) 36px 36px 24px auto;
          grid-template-rows: 36px 10px 10px repeat(${r}, 28px);
          align-items: center; justify-items: center;
        ">
    `;

    // Top Label & Brace
    let labelText = `g_1, g_2, \\cdots, g_{${r}}`;
    if (r === 1) labelText = `g_1`;
    else if (r === 2) labelText = `g_1, g_2`;
    else if (r === 3) labelText = `g_1, g_2, g_3`;
    
    html += `
      <div class="sc-label" style="grid-column: ${COL_G_BASE} / ${COL_G_BASE + r}; grid-row: ${ROW_LABEL}; justify-content: center; align-self: flex-end; font-size: 16px; margin-bottom: 8px;">
        ${GateMath.toHTML(labelText)}
      </div>
      <div class="sc-top-brace" style="grid-column: ${COL_G_BASE} / ${COL_G_BASE + r}; grid-row: ${ROW_BRACE}; align-self: flex-end; justify-self: center; width: calc(100% - 28px);">
        <svg preserveAspectRatio="none" viewBox="0 0 100 10" width="100%" height="10px">
          <path d="M 0,10 C 0,8 2,5 15,5 L 35,5 C 48,5 50,2 50,0 C 50,2 52,5 65,5 L 85,5 C 98,5 100,8 100,10" fill="none" stroke="currentColor"/>
        </svg>
      </div>
    `;

    for (let j = 0; j < r; j++) {
      const row = ROW_ANC_BASE + j;
      const col = COL_G_BASE + j;

      // |0> label
      html += `<div class="sc-label" style="grid-column: ${COL_QLABEL}; grid-row: ${row}; justify-content: center; font-size: 11px; color: var(--ash);">${GateMath.toHTML("|0\\rangle")}</div>`;

      // Horizontal wire for ancilla - starts after |0> label
      html += `<div class="sc-h-wire" style="grid-column: ${COL_L_SP} / ${COL_M + 1}; grid-row: ${row}; margin: 0; z-index: 1;"></div>`;

      // H1 gate
      html += `<div class="sc-node" style="grid-column: ${COL_H1}; grid-row: ${row};"><span>H</span></div>`;

      // Vertical wire (top gap → above this row)
      html += `<div class="sc-v-wire" style="grid-column: ${col}; grid-row: ${ROW_TOP_GAP} / ${row}; margin: 0; z-index: 1; align-self: stretch; height: 100%;"></div>`;
      // Half-height wire to center of control dot
      html += `<div class="sc-v-wire" style="grid-column: ${col}; grid-row: ${row}; margin: 0; z-index: 1; height: 50%; align-self: flex-start;"></div>`;

      // Control dot on the ancilla wire
      html += `<div class="sc-control" style="grid-column: ${col}; grid-row: ${row};"></div>`;

      // H2 gate
      html += `<div class="sc-node" style="grid-column: ${COL_H2}; grid-row: ${row};"><span>H</span></div>`;

      // Measurement gate
      html += `<div class="sc-node" style="grid-column: ${COL_M}; grid-row: ${row};"><span>M</span></div>`;

      // Classical double wire
      html += `<div class="sc-classical-wire" style="grid-column: ${COL_CW}; grid-row: ${row};"></div>`;

      // s_j output label
      html += `<div class="sc-label" style="grid-column: ${COL_SJ}; grid-row: ${row}; justify-content: flex-start; padding-left: var(--sp-2); font-size: 16px;">${GateMath.toHTML(`s_{${j + 1}}`)}</div>`;
    }

    html += `        </div>
      </div>`;

    return { title: "Syndrome Extraction of [[" + n + ", " + k + ", " + d + "]] Quantum Codes", html };
  }

  // Error Correction

  // Renders the Error Correction block, applying the final fix.
  function renderCorrection(data) {
    const { lut, hasDegeneracy, canCorrect, n, k, d } = data;
    if (!lut) {
      return { title: "Error Correction", html: renderEmptyState("Analyze a code to see error correction details.") };
    }

    const verdict = canCorrect
      ? `<div class="qecc-verdict qecc-verdict--pass">✓ All single-qubit errors produce non-degenerate syndromes. Code can correct any single-qubit error.</div>`
      : `<div class="qecc-verdict qecc-verdict--fail">✗ Syndrome degeneracies detected. Code cannot unambiguously correct all single-qubit errors without degenerate mapping.</div>`;

    let html = `
      <div class="qecc-modal-section qecc-modal-section--table-scroll">
        <table class="qecc-syndrome-table qecc-syndrome-table--modal">
          <thead>
            <tr><th>Error</th><th>Syndrome</th><th>Correction</th><th>Status</th></tr>
          </thead>
          <tbody>
    `;

    for (const entry of lut) {
      const errorHTML = `<span class="qecc-pauli">${entry.label}</span>`;
      const syndromeHTML = `<code class="qecc-syndrome-bits">${entry.syndromeStr}</code>`;
      const correctionHTML = `<span class="qecc-pauli">${entry.correction}</span>`;
      const isDegenerate = entry.degeneracy !== null;
      const statusHtml = isDegenerate
        ? `<span class="qecc-status qecc-status--error">Degenerate</span>`
        : `<span class="qecc-status qecc-status--ok">Non-degenerate</span>`;
      html += `<tr>${[errorHTML, syndromeHTML, correctionHTML, statusHtml].map((c) => `<td>${c}</td>`).join("")}</tr>`;
    }

    html += `</tbody></table></div>`;
    html += `<div class="qecc-modal-section">${verdict}</div>`;

    return { title: "Error Correction of [[" + n + ", " + k + ", " + d + "]] Quantum Codes", html };
  }

  // Renders an empty state placeholder for blocks with no data.
  function renderEmptyState(msg) {
    return `<div class="qecc-modal-empty"><p>${msg}</p></div>`;
  }

  return { open, close };
})();
