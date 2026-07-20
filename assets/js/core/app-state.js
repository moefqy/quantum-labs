// QUANTUM LABS — App State
// Single source of truth for simulation execution parameters (mode, shots).
// All UI mode-switching must go through AppState.setMode() to keep the DOM in sync.

export const AppState = (() => {
  "use strict";

  // Simulation parameters
  let _mode = "exact";
  let _shots = 1024;

  // ResultsPanel is injected to avoid a circular import chain
  let _resultsPanel = null;

  // Called once from app.js after ResultsPanel is initialized
  function init(resultsPanel) {
    _resultsPanel = resultsPanel;
  }

  // Return simulation mode
  function getMode() {
    return _mode;
  }

  // Return number of shots
  function getShots() {
    return _shots;
  }

  // Set number of shots
  function setShots(shots) {
    _shots = shots;
    const shotsSlider = document.getElementById("sim-shots-slider");
    const shotsInput = document.getElementById("sim-shots-input");
    if (shotsSlider) {
      shotsSlider.value = _shots;
    }
    if (shotsInput) {
      shotsInput.value = _shots;
    }
  }

  // Unified mode switcher — handles ALL side effects of changing the simulation mode:
  //   1. Segmented button active state
  //   2. Shots container visibility
  //   3. Results tab visibility
  //   4. Active results tab (switches to Counts for shots, Probabilities for exact)
  function setMode(mode) {
    _mode = mode;

    // 1. Segmented buttons
    document
      .querySelectorAll(".segmented-btn")
      .forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(
      `.segmented-btn[data-mode="${mode}"]`,
    );
    if (activeBtn) {
      activeBtn.classList.add("active");
    }

    // 2. Shots container
    const shotsContainer = document.getElementById("sim-shots-container");
    if (shotsContainer) {
      if (mode === "shots") {
        shotsContainer.classList.remove("hidden");
      } else {
        shotsContainer.classList.add("hidden");
      }
    }

    // 3. Tab visibility
    const tabCounts = document.getElementById("tab-counts");
    const tabProb = document.getElementById("tab-probabilities");
    const tabState = document.getElementById("tab-state-vector");
    if (tabCounts && tabProb && tabState) {
      if (mode === "shots") {
        tabCounts.classList.remove("hidden");
        tabProb.classList.add("hidden");
        tabState.classList.add("hidden");
      } else {
        tabCounts.classList.add("hidden");
        tabProb.classList.remove("hidden");
        tabState.classList.remove("hidden");
      }
    }

    // 4. Switch active results tab
    if (_resultsPanel) {
      if (mode === "shots") {
        _resultsPanel.switchTab("counts");
      } else {
        const activeTab = document.querySelector(".results-tab.active")?.dataset
          .tab;
        if (activeTab === "counts") {
          _resultsPanel.switchTab("probabilities");
        }
      }
    }
  }

  // Restores mode + shots from a circuit load result object.
  // Used by both the Examples page and the Preset loader to eliminate duplication.
  function restoreFromResult(result) {
    if (!result) {
      return;
    }
    setMode(result.mode);
    setShots(result.shots);
  }

  return {
    init,
    getMode,
    getShots,
    setMode,
    setShots,
    restoreFromResult,
  };
})();
