// QUANTUM LABS — About
// Controller logic for the About page.

export const AboutPage = (() => {
  "use strict";

  // Injects the static About page HTML content into the designated container.
  function render(container) {
    container.innerHTML = `
      <div class="about-hero">
        <h1>Quantum Labs</h1>
        <p>
          An open-source, browser-based quantum computing toolkit built to make quantum circuit design
          accessible to everyone. No installation, no account — just open and start building.
        </p>
      </div>

      <div class="about-grid">
        <div class="ui-card">
          <h3>Mission</h3>
          <p>
            Quantum computing shouldn't require expensive hardware or complex setups to learn.
            Quantum Labs provides a free, visual environment for building and simulating quantum circuits
            directly in your browser.
          </p>
        </div>

        <div class="ui-card">
          <h3>Technology</h3>
          <ul>
            <li>Pure HTML, CSS, and JavaScript (No UI frameworks)</li>
            <li>Custom Vanilla ES6 UI Component Architecture</li>
            <li>Multi-threaded state-vector simulation via Web Workers</li>
            <li>Zero-block data serialization via <code>Float64Array</code></li>
            <li>Canvas 2D for visualizations (Bloch sphere)</li>
            <li>Client-side hash routing for GitHub Pages</li>
            <li>Zero dependencies — fully self-contained</li>
          </ul>
        </div>

        <div class="ui-card">
          <h3>Built By & Open Source</h3>
          <p>
            Quantum Labs is created by <a href="https://moefqy.com" target="_blank">moefqy.com</a>.
            Feel free to contribute, report issues, or suggest new features!
          </p>
          <p>
            <a href="https://github.com/moefqy/quantum-labs" target="_blank">View on GitHub →</a>
          </p>
        </div>

        <div class="ui-card">
          <h3>Scope & Limitations</h3>
          <ul>
            <li>Educational tool — not a production quantum backend</li>
            <li>Supports up to 8 qubits (optimized for UI performance)</li>
            <li>Uses 64-bit floating-point precision (JavaScript native)</li>
            <li>Simulated locally — no real quantum hardware connection</li>
          </ul>
        </div>
      </div>

      <footer class="site-footer">
        <p>© 2026 Quantum Labs by <a href="https://moefqy.com" target="_blank">moefqy.com</a>. All rights reserved.</p>
      </footer>
    `;
  }

  return { render };
})();
