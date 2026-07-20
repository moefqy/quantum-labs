// QUANTUM LABS — Quantum Worker
// Offloads heavy math simulation to a background thread to prevent UI freezing.

import { QuantumEngine } from "./quantum-engine.js";

// Main Message Handler
self.addEventListener("message", (event) => {
  const { id, action, payload } = event.data;

  try {
    let result;
    // Simulate with measurements
    if (action === "simulate") {
      const { numQubits, numCbits, operations } = payload;
      result = QuantumEngine.simulate(numQubits, numCbits, operations);
    // Simulate with multiple shots for statistical result
    } else if (action === "simulateShots") {
      const { numQubits, numCbits, operations, shots } = payload;
      result = QuantumEngine.simulateShots(
        numQubits,
        numCbits,
        operations,
        shots,
      );
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // Send successful result back to Main Thread
    self.postMessage({ id, status: "success", result });
  } catch (error) {
    // Send error back to Main Thread
    self.postMessage({ id, status: "error", error: error.message });
  }
});
