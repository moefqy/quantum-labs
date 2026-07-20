// QUANTUM LABS — Quantum Engine
// Pure JavaScript state-vector simulator.
// Stores 2^n complex amplitudes and applies gate matrices.

import { QuantumGates } from "./quantum-gates.js";
import { QuantumMath } from "./quantum-math.js";
import { AnalyzerMath } from "./analyzer-math.js";

export const QuantumEngine = (() => {
  "use strict";

  // Dependencies from QuantumGates
  const { cmul, cadd, cabs2 } = QuantumGates;

  // State Vector Implementation
  // create state vector
  function createState(numQubits) {
    const size = 1 << numQubits;
    const real = new Float64Array(size);
    const imag = new Float64Array(size);
    real[0] = 1; // |00...0⟩
    return { real, imag, numQubits, size };
  }

  // clone state vector
  function cloneState(state) {
    return {
      real: new Float64Array(state.real),
      imag: new Float64Array(state.imag),
      numQubits: state.numQubits,
      size: state.size,
    };
  }

  // Apply a gate operation from circuit model
  function applyGateOp(state, op, cbits, numQubits) {
    const { gate, qubits, param } = op;
    const gateInfo = QuantumGates.get(gate);

    if (!gateInfo) {
      console.warn("Unknown gate:", gate);
      return null;
    }

    // Single-qubit gates: apply generic matrix multiplication
    if (gateInfo.type === "single") {
      const matrixObj = QuantumGates.getMatrix(gate, param);
      if (matrixObj) {
        QuantumMath.apply2x2Matrix(state, matrixObj.matrix, qubits[0]);
      }
      return null;
    }

    // All multi-qubit gates (including M, c-X, c-Z) dispatch dynamically through gateDef.execute()
    if (gateInfo.execute) {
      const result = gateInfo.execute(state, qubits, param, {
        QuantumMath,
        QuantumGates,
        numQubits,
        cbits,
      });
      return result ?? null;
    }

    console.warn("No execute handler for gate:", gate);
    return null;
  }

  // Simulate quantum circuit (mode = exact)
  function simulate(numQubits, numCbits, operations) {
    const state = createState(numQubits);
    const cbits = new Array(numCbits).fill(0);
    const measurements = {};

    for (const op of operations) {
      const result = applyGateOp(state, op, cbits, numQubits);
      if (result !== null && op.gate === "M") {
        const q = op.qubits[0] < numQubits ? op.qubits[0] : op.qubits[1];
        measurements[`q${q}`] = result;
      }
    }

    return {
      state,
      probabilities: AnalyzerMath.getProbabilities(state),
      measurements,
      cbits,
    };
  }

  // Simulate quantum circuit (mode = shots)
  function simulateShots(numQubits, numCbits, operations, shots) {
    const counts = {};
    let lastState = null;

    for (let i = 0; i < shots; i++) {
      const res = simulate(numQubits, numCbits, operations);
      const cbitStr = res.cbits.join("");
      counts[cbitStr] = (counts[cbitStr] || 0) + 1;
      if (i === shots - 1) {
        lastState = res.state;
      }
    }
    return { counts, lastState };
  }

  // Public API
  return {
    createState,
    cloneState,
    simulate,
    simulateShots,
  };
})();
