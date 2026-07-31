// QUANTUM LABS — Bloch Math
// Specific analytical calculations for the Bloch Sphere Explorer tool.

export const BlochMath = (() => {
  "use strict";

  // Calculates the spherical coordinates (x, y, z, theta, phi) and purity
  // of a specific qubit by calculating its 2x2 reduced density matrix (partial trace).
  // state - The full state vector { real, imag, size, numQubits }
  // qubit - The 0-indexed qubit to analyze
  // Returns 
  function getBlochCoords(state, qubit) {
    const n = state.numQubits;
    const bit = n - 1 - qubit;
    const mask = 1 << bit;

    // Partial trace: get reduced density matrix for this qubit
    let rho00r = 0;
    let rho01r = 0,
      rho01i = 0;
    let rho11r = 0;

    for (let i = 0; i < state.size; i++) {
      if (!(i & mask)) {
        const j = i | mask;
        const air = state.real[i],
          aii = state.imag[i];
        const ajr = state.real[j],
          aji = state.imag[j];

        // |0⟩⟨0|
        rho00r += air * air + aii * aii;
        // |1⟩⟨1|
        rho11r += ajr * ajr + aji * aji;
        // |0⟩⟨1| = a_i * conj(a_j)
        rho01r += air * ajr + aii * aji;
        rho01i += aii * ajr - air * aji;
      }
    }

    // Bloch vector: x = 2*Re(rho01), y = 2*Im(rho01), z = rho00 - rho11
    const x = 2 * rho01r;
    const y = 2 * rho01i;
    const z = rho00r - rho11r;

    // Convert to spherical
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = r > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
    const phi = Math.atan2(y, x);

    return { x, y, z, theta, phi, purity: r };
  }

  return { getBlochCoords };
})();
