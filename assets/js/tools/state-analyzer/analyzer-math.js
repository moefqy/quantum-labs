// QUANTUM LABS — Analyzer Math
// Specific analytical calculations for the State & Matrix Analyzer tool.

export const AnalyzerMath = (() => {
  "use strict";

  // Calculates the probability of measuring each basis state.
  // state - The full state vector { real, imag, size }
  // Returns An array of probabilities for each basis state.
  function getProbabilities(state) {
    const probs = new Float64Array(state.size);
    for (let i = 0; i < state.size; i++) {
      probs[i] = state.real[i] * state.real[i] + state.imag[i] * state.imag[i];
    }
    return probs;
  }

  return { getProbabilities };
})();
