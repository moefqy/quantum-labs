// QUANTUM LABS — Results Panel
// Displays state vector, probability chart, and coordinates with the Bloch sphere.

import { EventBus } from "../core/event-bus.js";
import { EntanglementMath } from "../core/entanglement-math.js";
import { Icons } from "../core/ui-icons.js";

export const ResultsPanel = (() => {
  "use strict";

  let lastResult = null;
  let activeFilter = "all";

  // Binds click events to the result panel tabs (State Vector, Probabilities, Counts).
  function init() {
    // Tab switching
    document.querySelectorAll(".results-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    // Listen to Event Bus
    EventBus.on("simulation:start", () => setRunning(true));
    EventBus.on("simulation:complete", ({ result, mode }) => {
      setRunning(false);
      update(result, mode);
    });
    EventBus.on("simulation:clear", () => clear());
  }

  // Shows or hides the running indicator on the results panel.
  function setRunning(running) {
    const panel = document.getElementById("results-panel");
    if (!panel) {
      return;
    }
    panel.classList.toggle("results-panel--running", running);
  }

  // Switches the active results tab and re-renders the corresponding content view.
  function switchTab(tabName) {
    document
      .querySelectorAll(".results-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-pane")
      .forEach((p) => p.classList.remove("active"));

    document
      .querySelector(`.results-tab[data-tab="${tabName}"]`)
      ?.classList.add("active");
    document.getElementById(`pane-${tabName}`)?.classList.add("active");

    // Re-render content for the newly active tab.
    // Guard against stale cross-mode results (e.g. shots result has no .state).
    if (lastResult) {
      if (tabName === "probabilities" && lastResult.probabilities) {
        renderProbabilities(lastResult);
      }
      if (tabName === "counts") {
        renderCounts(lastResult);
      } // renderCounts handles missing counts gracefully
      if (tabName === "state-vector" && lastResult.state) {
        renderStateVector(lastResult);
      }
    }
  }

  // Ingests new simulation results and updates the UI based on the current mode (exact vs shots).
  function update(result, mode = "exact") {
    lastResult = result;

    if (mode === "shots") {
      document
        .getElementById("results-filter-container")
        .classList.add("hidden");
      switchTab("counts");
      renderCounts(result);
    } else {
      renderFilterUI(result.state.numQubits);
      // Only auto-switch away from counts tab; leave probabilities/state-vector as chosen
      const activeTab = document.querySelector(".results-tab.active")?.dataset
        .tab;
      if (!activeTab || activeTab === "counts") {
        switchTab("probabilities");
      }
      renderStateVector(result);

      // If probabilities tab is active, render it
      if (
        document.querySelector(".results-tab.active")?.dataset.tab ===
        "probabilities"
      ) {
        renderProbabilities(result);
      }
    }
  }

  // Renders the qubit filter pills (All, q0, q1) for viewing reduced state representations.
  function renderFilterUI(numQubits) {
    const container = document.getElementById("results-filter-container");
    if (!container) {
      return;
    }
    container.classList.remove("hidden");

    let html = `<button class="filter-chip ${activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>`;
    for (let q = 0; q < numQubits; q++) {
      html += `<button class="filter-chip ${activeFilter === q ? "active" : ""}" data-filter="${q}">q${q}</button>`;
    }
    container.innerHTML = html;

    container.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const f = chip.dataset.filter;
        activeFilter = f === "all" ? "all" : parseInt(f, 10);

        // Re-render the active tab
        const activeTab = document.querySelector(".results-tab.active")?.dataset
          .tab;
        if (activeTab === "probabilities") {
          renderProbabilities(lastResult);
        } else if (activeTab === "state-vector") {
          renderStateVector(lastResult);
        }

        // Update chip active states
        container
          .querySelectorAll(".filter-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
  }

  // Renders the raw state vector amplitudes (real and imaginary parts) into the DOM.
  function renderStateVector(result) {
    const container = document.getElementById("statevector-display");
    if (!container) {
      return;
    }

    const { state } = result;
    const n = state.numQubits;
    container.innerHTML = "";

    let displayStates = [];

    if (activeFilter === "all") {
      for (let i = 0; i < state.size; i++) {
        displayStates.push({
          real: state.real[i],
          imag: state.imag[i],
          basis: i.toString(2).padStart(n, "0"),
          index: i,
        });
      }
    } else {
      const q = activeFilter;
      const { purity, a_real, a_imag, b_real, b_imag } =
        EntanglementMath.getBlochState(state.real, state.imag, n, q);

      if (purity < 0.99) {
        container.innerHTML = `
          <div class="empty-state error">
            ${Icons.errorCircle}
            <p class="title">Entangled State</p>
            <p>Qubit q${q} is entangled with the system (mixed state) and cannot be represented as a single state vector.</p>
          </div>
        `;
        return;
      }

      displayStates.push({ real: a_real, imag: a_imag, basis: "0", index: 0 });
      displayStates.push({ real: b_real, imag: b_imag, basis: "1", index: 1 });
    }

    for (let s of displayStates) {
      const { real, imag, basis, index } = s;

      const row = document.createElement("div");
      row.className = "sv-row";
      row.style.animationDelay = `${index * 30}ms`;

      const indexEl = document.createElement("span");
      indexEl.className = "sv-index";
      indexEl.textContent = `${index + 1}.`;

      const basisEl = document.createElement("span");
      basisEl.className = "sv-basis";
      basisEl.textContent = `|${basis}⟩`;

      const ampEl = document.createElement("span");
      ampEl.className = "sv-amplitude";
      const realStr = real.toFixed(3);
      const imagStr =
        imag >= 0 ? `+${imag.toFixed(3)}i` : `${imag.toFixed(3)}i`;
      ampEl.textContent = `${realStr} ${imagStr}`;

      row.appendChild(indexEl);
      row.appendChild(basisEl);
      row.appendChild(ampEl);

      container.appendChild(row);
    }
  }

  // Renders a bar chart of the probability distribution for measuring each state.
  function renderProbabilities(result) {
    const container = document.getElementById("probabilities-display");
    if (!container) {
      return;
    }

    const { state, probabilities } = result;
    const n = state.numQubits;
    container.innerHTML = "";

    let displayProbs = [];

    if (activeFilter === "all") {
      for (let i = 0; i < state.size; i++) {
        displayProbs.push({
          prob: probabilities[i],
          basis: i.toString(2).padStart(n, "0"),
          index: i,
        });
      }
    } else {
      const q = activeFilter;
      const mask = 1 << (n - 1 - q);
      let prob0 = 0,
        prob1 = 0;
      for (let i = 0; i < state.size; i++) {
        if ((i & mask) === 0) {
          prob0 += probabilities[i];
        } else {
          prob1 += probabilities[i];
        }
      }
      displayProbs.push({ prob: prob0, basis: "0", index: 0 });
      displayProbs.push({ prob: prob1, basis: "1", index: 1 });
    }

    for (let p of displayProbs) {
      const { prob, basis, index } = p;

      const row = document.createElement("div");
      row.className = "sv-row";
      row.style.animationDelay = `${index * 30}ms`;

      const indexEl = document.createElement("span");
      indexEl.className = "sv-index";
      indexEl.textContent = `${index + 1}.`;

      const basisEl = document.createElement("span");
      basisEl.className = "sv-basis";
      basisEl.textContent = `|${basis}⟩`;

      const probEl = document.createElement("span");
      probEl.className = "sv-prob";
      probEl.textContent = `${(prob * 100).toFixed(1)}%`;

      row.appendChild(indexEl);
      row.appendChild(basisEl);
      row.appendChild(probEl);

      // Bar
      const barContainer = document.createElement("div");
      barContainer.className = "sv-bar-container";
      const bar = document.createElement("div");
      bar.className = "sv-bar";
      bar.style.width = "0%";
      // Animate to actual width
      setTimeout(
        () => {
          bar.style.width = `${prob * 100}%`;
        },
        index * 30 + 10,
      );
      barContainer.appendChild(bar);
      row.appendChild(barContainer);

      container.appendChild(row);
    }
  }

  // Renders the aggregated measurement counts from classical bits after a multi-shot run.
  function renderCounts(result) {
    const container = document.getElementById("counts-display");
    if (!container) {
      return;
    }

    const { counts } = result;
    container.innerHTML = "";

    if (!counts || Object.keys(counts).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No classical bits to measure.</p>
        </div>
      `;
      return;
    }

    // Sort by descending count
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;

    let i = 0;
    for (const [cbits, count] of sorted) {
      const row = document.createElement("div");
      row.className = "sv-row";
      row.style.animationDelay = `${i * 30}ms`;

      const indexEl = document.createElement("span");
      indexEl.className = "sv-index";
      indexEl.textContent = `${i + 1}.`;

      const basisEl = document.createElement("span");
      basisEl.className = "sv-basis";
      basisEl.textContent = `${cbits}`;

      const countEl = document.createElement("span");
      countEl.className = "sv-amplitude";
      countEl.textContent = `${count} shots`;

      row.appendChild(indexEl);
      row.appendChild(basisEl);
      row.appendChild(countEl);

      // Bar
      const barContainer = document.createElement("div");
      barContainer.className = "sv-bar-container";
      const bar = document.createElement("div");
      bar.className = "sv-bar";
      bar.style.width = "0%";
      // Animate to actual width
      setTimeout(
        () => {
          bar.style.width = `${(count / maxCount) * 100}%`;
        },
        i * 30 + 10,
      );
      barContainer.appendChild(bar);
      row.appendChild(barContainer);

      container.appendChild(row);
      i++;
    }
  }

  // Clears all result views and displays empty state placeholders.
  function clear() {
    lastResult = null;

    const emptyHTML = (msg) => `
      <div class="empty-state">
        ${Icons.play}
        <p>${msg}</p>
      </div>
    `;

    const svContainer = document.getElementById("statevector-display");
    if (svContainer) {
      svContainer.innerHTML = emptyHTML(
        "Run the circuit to see the state vector",
      );
    }

    const probContainer = document.getElementById("probabilities-display");
    if (probContainer) {
      probContainer.innerHTML = emptyHTML(
        "Run the circuit to see probabilities",
      );
    }

    const countsContainer = document.getElementById("counts-display");
    if (countsContainer) {
      countsContainer.innerHTML = emptyHTML(
        "Run the circuit to see measurement counts",
      );
    }
  }

  return {
    init,
    update,
    clear,
    setRunning,
    switchTab,
  };
})();
