// QUANTUM LABS — Docs
// Controller logic for the Documentation page.

import { GateMath } from "../core/math-renderer.js";
import { QuantumGates } from "../core/quantum-gates.js";

export const DocumentationPage = (() => {
  "use strict";

  const SECTIONS = [
    { id: "getting-started", label: "Getting Started" },
    { id: "gate-reference", label: "Gate Reference" },
    { id: "multi-qubit", label: "Multi-Qubit Gates" },
    { id: "custom-gates", label: "Custom Gates" },
    { id: "simulation", label: "Simulation" },
    { id: "saving-sharing", label: "Saving & Sharing" },
    { id: "shortcuts", label: "Keyboard Shortcuts" },
  ];

  // Injects the Documentation page HTML and binds scrolling and KaTeX rendering.
  function render(container) {
    container.innerHTML = `
      <section class="section">
        <h2 class="section-title">User Guide</h2>
        <p class="section-desc">Learn how to use Quantum Labs tools and understand quantum gates.</p>

        <div class="docs-layout">
          <nav class="docs-sidebar">
            <div class="docs-nav">
              ${SECTIONS.map(
                (s, i) => `
                <button class="docs-nav-item ${i === 0 ? "active" : ""}" data-section="${s.id}">${s.label}</button>
              `,
              ).join("")}
            </div>
          </nav>

          <div class="docs-content">
            <!-- Getting Started -->
            <div class="docs-section" id="doc-getting-started">
              <h2>Getting Started</h2>
              <p>Quantum Labs is a browser-based quantum computing toolkit. Everything runs locally in your browser — no server, no account, no installation required.</p>

              <h3>Opening the Quantum Tools</h3>
              <ol>
                <li>Navigate to the <strong>Simulator</strong> page</li>
                <li>Choose from three interactive tools:
                  <ul>
                    <li><strong>Circuit Builder</strong>: Drag-and-drop circuit designer.</li>
                    <li><strong>Bloch Sphere Explorer</strong>: Interactive 3D visualization of single-qubit transformations.</li>
                    <li><strong>State & Matrix Analyzer</strong>: Step-by-step mathematical playground for tensor products and matrices.</li>
                    <li><strong>Entanglement Tracker</strong>: Visualize Von Neumann entropy, quantum mutual information, and conditional entropy.</li>
                  </ul>
                </li>
                <li>The selected tool opens in a full-screen modal</li>
              </ol>

              <h3>Using the Circuit Builder</h3>
              <ol>
                <li><strong>Drag</strong> a gate from the left sidebar (Gate Palette)</li>
                <li><strong>Drop</strong> it onto an empty slot on a qubit wire</li>
                <li>For multi-qubit gates (CNOT, etc.), drop on the first qubit, then click the second qubit</li>
                <li>Click <strong>Run</strong> to simulate the circuit</li>
                <li>View results in the right panel (State Vector, Probabilities, or Counts)</li>
              </ol>

              <h3>Managing Qubits</h3>
              <p>Use the <code>+</code> and <code>−</code> buttons in the toolbar of the Circuit Builder or the System Size toggle in the State Analyzer to change the number of qubits.</p>
            </div>

            <!-- Gate Reference -->
            <div class="docs-section" id="doc-gate-reference">
              <h2>Gate Reference</h2>
              <p>Single-qubit gates operate on individual qubits. Each gate corresponds to a unitary matrix operation.</p>

              <table class="gate-ref-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Matrix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{H}")}</span></td>
                    <td>Hadamard</td>
                    <td>Creates superposition. Maps ${GateMath.toHTML("|0\\rangle \\to |+\\rangle")}</td>
                    <td class="doc-math" data-gate="H"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{X}")}</span></td>
                    <td>Pauli-X</td>
                    <td>Bit flip (quantum NOT). Swaps ${GateMath.toHTML("|0\\rangle")} and ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="X"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{Y}")}</span></td>
                    <td>Pauli-Y</td>
                    <td>Combined bit and phase flip</td>
                    <td class="doc-math" data-gate="Y"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{Z}")}</span></td>
                    <td>Pauli-Z</td>
                    <td>Phase flip. Adds ${GateMath.toHTML("\\pi")} phase to ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="Z"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{S}")}</span></td>
                    <td>Phase (${GateMath.toHTML("\\sqrt{\\mathbf{Z}}")})</td>
                    <td>Adds ${GateMath.toHTML("\\pi/2")} phase to ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="S"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{T}")}</span></td>
                    <td>T Gate (${GateMath.toHTML("\\sqrt{\\mathbf{S}}")})</td>
                    <td>Adds ${GateMath.toHTML("\\pi/4")} phase to ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="T"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{S}^\\dagger")}</span></td>
                    <td>S-dagger</td>
                    <td>Inverse of Phase gate. Adds ${GateMath.toHTML("-\\pi/2")} phase to ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="Sdg"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{T}^\\dagger")}</span></td>
                    <td>T-dagger</td>
                    <td>Inverse of T gate. Adds ${GateMath.toHTML("-\\pi/4")} phase to ${GateMath.toHTML("|1\\rangle")}</td>
                    <td class="doc-math" data-gate="Tdg"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{R}_x(\\theta)")}</span></td>
                    <td>Rotation-X</td>
                    <td>Rotation around X axis by angle ${GateMath.toHTML("\\theta")}</td>
                    <td class="doc-math" data-gate="Rx"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{R}_y(\\theta)")}</span></td>
                    <td>Rotation-Y</td>
                    <td>Rotation around Y axis by angle ${GateMath.toHTML("\\theta")}</td>
                    <td class="doc-math" data-gate="Ry"></td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{R}_z(\\theta)")}</span></td>
                    <td>Rotation-Z</td>
                    <td>Rotation around Z axis by angle ${GateMath.toHTML("\\theta")}</td>
                    <td class="doc-math" data-gate="Rz"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Multi-Qubit Gates -->
            <div class="docs-section" id="doc-multi-qubit">
              <h2>Multi-Qubit Gates</h2>
              <p>Multi-qubit gates operate on two or more qubits simultaneously. They're essential for creating entanglement.</p>

              <table class="gate-ref-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Name</th>
                    <th>Qubits</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CX}")}</span></td>
                    <td>Controlled-NOT</td>
                    <td>2</td>
                    <td>Flips target qubit if control qubit is ${GateMath.toHTML("|1\\rangle")}. Essential for entanglement.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CY}")}</span></td>
                    <td>Controlled-Y</td>
                    <td>2</td>
                    <td>Applies Y to target if control is ${GateMath.toHTML("|1\\rangle")}.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CZ}")}</span></td>
                    <td>Controlled-Z</td>
                    <td>2</td>
                    <td>Applies Z to target if control is ${GateMath.toHTML("|1\\rangle")}. Symmetric — control and target are interchangeable.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CP}")}</span></td>
                    <td>Controlled-Phase</td>
                    <td>2</td>
                    <td>Applies a phase ${GateMath.toHTML("e^{i\\theta}")} to the target if control is ${GateMath.toHTML("|1\\rangle")}.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{SWAP}")}</span></td>
                    <td>SWAP</td>
                    <td>2</td>
                    <td>Exchanges the quantum states of two qubits.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CSWAP}")}</span></td>
                    <td>Controlled-SWAP</td>
                    <td>3</td>
                    <td>Fredkin gate. Swaps the two target qubits if control is ${GateMath.toHTML("|1\\rangle")}.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{CCX}")}</span></td>
                    <td>Toffoli</td>
                    <td>3</td>
                    <td>Double-controlled NOT. Flips target if both controls are ${GateMath.toHTML("|1\\rangle")}.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{MCX}")}</span></td>
                    <td>Multi-Controlled X</td>
                    <td>Variable</td>
                    <td>Flips target qubit if all control qubits are ${GateMath.toHTML("|1\\rangle")}.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathcal{M}")}</span></td>
                    <td>Measurement</td>
                    <td>2 (q→c)</td>
                    <td>Measures a qubit in the computational basis and stores the classical outcome.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">c-X</span></td>
                    <td>Classical-c-X</td>
                    <td>2 (c→q)</td>
                    <td>Applies X (NOT) to target qubit based on the classical bit value.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">c-Z</span></td>
                    <td>Classical-c-Z</td>
                    <td>2 (c→q)</td>
                    <td>Applies Z to target qubit based on the classical bit value.</td>
                  </tr>
                </tbody>
              </table>

              <h3>How to Place Multi-Qubit Gates</h3>
              <ol>
                <li>Drag the gate from the palette onto the <strong>control</strong> qubit</li>
                <li>Click on the <strong>target</strong> qubit in the same column</li>
                <li>For Toffoli: click a second control qubit before the target</li>
              </ol>
            </div>

            <!-- Custom Gates -->
            <div class="docs-section" id="doc-custom-gates">
              <h2>Custom Gates</h2>
              <p>Custom gates allow you to construct complex unitary operations or group sub-circuits together for reuse.</p>

              <table class="gate-ref-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Name</th>
                    <th>Qubits</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{U}_1(\\theta, \\phi, \\lambda)")}</span></td>
                    <td>Unitary Type 1</td>
                    <td>1</td>
                    <td>General single-qubit unitary rotation specified by 3 Euler angles.</td>
                  </tr>
                  <tr>
                    <td><span class="gate-ref-symbol">${GateMath.toHTML("\\mathbf{U}_2")}</span></td>
                    <td>Unitary Type 2</td>
                    <td>Variable</td>
                    <td>A user-defined sub-circuit grouped into a single reusable multi-qubit gate.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Simulation -->
            <div class="docs-section" id="doc-simulation">
              <h2>Simulation</h2>
              <p>Quantum Labs uses classical <strong>state-vector simulation</strong>. The full 2<sup>n</sup>-dimensional complex state vector is stored in memory and gate operations are applied as matrix multiplications.</p>

              <h3>Technical Details</h3>
              <ul>
                <li><strong>Multi-Threaded:</strong> Heavy tensor math and state-vector computations run off the main thread inside a dedicated Web Worker (<code>quantum-worker.js</code>).</li>
                <li><strong>Asynchronous UI:</strong> The simulation matrix is computed asynchronously, ensuring the browser UI never freezes during complex operations.</li>
                <li><strong>Data Serialization:</strong> The state vector is sent back to the main thread via efficient message passing using <code>Float64Array</code> buffers.</li>
              </ul>

              <h3>Limitations</h3>
              <ul>
                <li>Practical limit: <strong>8 qubits</strong> (256 complex amplitudes)</li>
                <li>Uses JavaScript 64-bit floating-point precision (IEEE 754)</li>
                <li>Deep circuits may accumulate numerical errors</li>
                <li>This is a pedagogical tool, not a production simulator</li>
              </ul>

              <div class="docs-tip">
                <strong>Note:</strong> While the Web Worker math engine can easily simulate more qubits, rendering more than 256 state vector amplitudes (2<sup>8</sup>) simultaneously as HTML table rows causes browser DOM rendering performance to degrade.
              </div>

              <h3>Results Tabs</h3>
              <ul>
                <li><strong>Probabilities</strong> — Bar chart of measurement probabilities for each basis state</li>
                <li><strong>State Vector</strong> — Shows all basis state amplitudes (real + imaginary) and probabilities</li>
              </ul>
            </div>

            <!-- Saving & Sharing -->
            <div class="docs-section" id="doc-saving-sharing">
              <h2>Saving & Sharing</h2>
              <p>Quantum Labs allows you to save circuits locally or share them with others without an account.</p>

              <h3>Shareable Links</h3>
              <p>The entire circuit state is compressed into a URL, making it easy to share.</p>
              <ol>
                <li>Click <strong>Copy Link</strong> in the Circuit Builder toolbar</li>
                <li>Share the copied URL with anyone</li>
                <li>Opening the link will instantly reconstruct the exact circuit</li>
              </ol>

              <h3>Local Storage</h3>
              <p>You can save circuits directly in your browser to work on them later.</p>
              <ol>
                <li>Click <strong>Save Circuit</strong> in the toolbar</li>
                <li>Enter a name for your circuit</li>
                <li>Navigate to the <strong>Examples</strong> page to view, rename, or delete your saved circuits</li>
              </ol>
            </div>

            <!-- Keyboard Shortcuts -->
            <div class="docs-section" id="doc-shortcuts">
              <h2>Keyboard Shortcuts</h2>
              <table class="gate-ref-table">
                <thead>
                  <tr>
                    <th>Shortcut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><code>Ctrl/Cmd + Enter</code></td><td>Run simulation</td></tr>
                  <tr><td><code>Ctrl/Cmd + Z</code></td><td>Undo</td></tr>
                  <tr><td><code>Ctrl/Cmd + Y</code></td><td>Redo</td></tr>
                  <tr><td><code>Delete / Backspace</code></td><td>Delete selected gate</td></tr>
                  <tr><td><code>Escape</code></td><td>Close modals, cancel selection</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <footer class="site-footer">
        <p>© 2026 Quantum Labs by <a href="https://moefqy.com" target="_blank">moefqy.com</a>. All rights reserved.</p>
      </footer>
    `;

    // Bind doc sidebar navigation
    const navItems = container.querySelectorAll(".docs-nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        navItems.forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        const section = document.getElementById(`doc-${item.dataset.section}`);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // ScrollSpy for sidebar
    const sections = container.querySelectorAll(".docs-section");

    // Tracks scroll position to automatically highlight the active section in the sidebar.
    function updateActiveSection() {
      // Self-cleanup if the user navigates away
      if (!document.getElementById("doc-getting-started")) {
        window.removeEventListener("scroll", updateActiveSection);
        return;
      }

      let activeId = null;
      // Find the last section whose top is above the middle of the viewport
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 + 100) {
          activeId = sections[i].id.replace("doc-", "");
        }
      }

      // If user scrolled to absolute bottom, force the last section
      if (
        Math.ceil(window.innerHeight + window.scrollY) >=
        document.body.offsetHeight - 20
      ) {
        activeId = sections[sections.length - 1].id.replace("doc-", "");
      }

      // Fallback to first section
      if (!activeId && sections.length > 0) {
        activeId = sections[0].id.replace("doc-", "");
      }

      navItems.forEach((item) => {
        if (item.dataset.section === activeId) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });
    }

    // Update active section on scroll
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    
    // Run once on init
    setTimeout(updateActiveSection, 100);

    // Render KaTeX math for gate reference table
    renderDocMath(container);
  }

  // Renders KaTeX math formulas within the Documentation table for gate matrices.
  function renderDocMath(container) {
    // Wait a tick for KaTeX to load if deferred
    const doRender = () => {
      container.querySelectorAll(".doc-math[data-gate]").forEach((cell) => {
        const gate = cell.dataset.gate;
        const mathInfo = QuantumGates.get(gate)?.latex;
        if (mathInfo?.matrix) {
          GateMath.renderLatex(mathInfo.matrix, cell, false);
        } else if (mathInfo?.ket) {
          GateMath.renderLatex(mathInfo.ket, cell, false);
        }
      });
    };

    if (typeof katex !== "undefined") {
      // Render KaTeX math for gate reference table
      doRender();
    } else {
      // KaTeX might still be loading (defer)
      setTimeout(doRender, 500);
    }
  }

  return { render };
})();
