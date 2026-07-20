// QUANTUM LABS — Circuit Display
// Synchronizes the sidebar UI wire count displays and selectively
// disables gate palette buttons that require more qubits than available.

import { CircuitModel } from "./circuit-model.js";
import { QuantumGates } from "../core/quantum-gates.js";

// Synchronizes the UI wire count displays and selectively disables unsupported gates.
export function updateQubitDisplay() {
  const numQubits = CircuitModel.getNumQubits();
  const numCbits = CircuitModel.getNumCbits();

  const elQubits = document.getElementById("qubit-count");
  if (elQubits) {
    elQubits.textContent = numQubits;
  }

  const elCbits = document.getElementById("cbit-count");
  if (elCbits) {
    elCbits.textContent = numCbits;
  }

  // Disable multi-qubit gates if not enough qubits, or missing cbits
  document.querySelectorAll("#sidebar .ql-gate-btn").forEach((item) => {
    const gateName = item.dataset.gate;
    const gateInfo = QuantumGates.get(gateName);

    let disabled = false;
    if (gateInfo) {
      // quantumTargets = quantum-wire count only (M, c-X, c-Z need 1 qubit + 1 cbit).
      // For pure qubit gates (CNOT, Toffoli, etc.) fall back to targets.
      const qNeeded =
        gateInfo.quantumTargets !== undefined
          ? gateInfo.quantumTargets
          : gateInfo.targets;
      if (qNeeded && qNeeded > numQubits) {
        disabled = true;
      }
      // Gates that also require at least one classical bit
      if (gateName === "M" || gateName === "c-X" || gateName === "c-Z") {
        if (numCbits === 0) {
          disabled = true;
        }
      }
    }

    if (disabled) {
      item.classList.add("disabled");
    } else {
      item.classList.remove("disabled");
    }
  });
}
