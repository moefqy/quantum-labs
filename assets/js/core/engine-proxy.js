// QUANTUM LABS — Engine Proxy
// Async wrapper for the Web Worker to provide a clean Promise-based API to the UI.

export const EngineProxy = (() => {
  "use strict";

  // Initialize Worker as an ES Module
  const worker = new Worker(new URL("./quantum-worker.js", import.meta.url), {
    type: "module",
  });

  // Track pending promises
  let messageId = 0;
  const pendingPromises = new Map();

  worker.addEventListener("message", (event) => {
    const { id, status, result, error } = event.data;
    if (pendingPromises.has(id)) {
      const { resolve, reject } = pendingPromises.get(id);
      pendingPromises.delete(id);

      if (status === "success") {
        resolve(result);
      } else {
        reject(new Error(error));
      }
    }
  });

  // Catch unrecoverable Worker crashes (syntax errors, out-of-memory, etc.)
  // and reject all pending promises so callers always get a response.
  worker.addEventListener("error", (event) => {
    const err = new Error(
      event.message || "Quantum engine crashed unexpectedly",
    );
    pendingPromises.forEach(({ reject }) => reject(err));
    pendingPromises.clear();
  });

  // Helper to send a message and wait for a response.
  function _post(action, payload) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pendingPromises.set(id, { resolve, reject });
      worker.postMessage({ id, action, payload });
    });
  }

  // Public Async API
  // Simulate quantum circuit (mode = exact)
  async function simulate(numQubits, numCbits, operations) {
    return _post("simulate", { numQubits, numCbits, operations });
  }

  // Simulate multiple shots (mode = shots)
  async function simulateShots(numQubits, numCbits, operations, shots) {
    return _post("simulateShots", { numQubits, numCbits, operations, shots });
  }

  return {
    simulate,
    simulateShots,
  };
})();
