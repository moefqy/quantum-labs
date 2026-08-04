// QUANTUM LABS — Test Helpers
// Shared assertions and execution utilities for unit tests.

import { QuantumMath } from "../assets/js/core/quantum-math.js";
import { QuantumGates } from "../assets/js/core/quantum-gates.js";
import { QuantumEngine } from "../assets/js/core/quantum-engine.js";

export const SQRT2_INV = 1 / Math.sqrt(2);
export const PI = Math.PI;

// Creates an isolated test suite runner
export function createTestSuite(suiteName) {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log("  ✓  " + name);
    } catch (error) {
      failed++;
      console.error("  ✗  " + name + "\n       " + error.message);
    }
  }

  function report() {
    console.log("\n" + "═".repeat(60));
    console.log(`  ${suiteName}: ${passed} passed, ${failed} failed`);
    console.log("═".repeat(60));
    if (failed > 0 && process.env.NODE_ENV !== "test-runner") {
      process.exit(1);
    }
    return { passed, failed };
  }

  return { test, report };
}

// Fluent assertion helper
export function expect(actual) {
  return {
    toBeCloseTo(expected, tol = 1e-9, msg = "") {
      if (Math.abs(actual - expected) > tol) {
        throw new Error(
          `${msg}Expected ${expected}, got ${actual} (tol=${tol})`
        );
      }
    },
    toBe(expected, msg = "") {
      if (actual !== expected) {
        throw new Error(`${msg}Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected, msg = "") {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`${msg}Expected ${b}, got ${a}`);
      }
    },
  };
}

// Create initial |0...0⟩ state
export function ket0(numQubits) {
  return QuantumEngine.createState(numQubits);
}

// Apply single-qubit gate
export function applyGate(state, gateName, param = null) {
  const cloned = QuantumEngine.cloneState(state);
  const gateInfo = QuantumGates.get(gateName);
  if (!gateInfo) {
    throw new Error(`Unknown gate: ${gateName}`);
  }
  if (gateInfo.type !== "single") {
    throw new Error(`Use applyMultiGate for multi-qubit gate: ${gateName}`);
  }
  const matrixObj = QuantumGates.getMatrix(gateName, param);
  QuantumMath.apply2x2Matrix(cloned, matrixObj.matrix, 0);
  return cloned;
}

// Apply multi-qubit gate
export function applyMultiGate(state, gateName, qubits, param = null) {
  const cloned = QuantumEngine.cloneState(state);
  const gateInfo = QuantumGates.get(gateName);
  if (!gateInfo || !gateInfo.execute) {
    throw new Error(`No execute handler for gate: ${gateName}`);
  }
  gateInfo.execute(cloned, qubits, param, {
    QuantumMath,
    QuantumGates,
    numQubits: state.numQubits,
    cbits: [],
  });
  return cloned;
}

// Run a full circuit
export function runCircuit(numQubits, operations) {
  return QuantumEngine.simulate(numQubits, 0, operations);
}

// Verify complex amplitude at specific basis index
export function assertAmp(state, index, expectedReal, expectedImag, tol = 1e-9) {
  const actualReal = state.real[index];
  const actualImag = state.imag[index];
  if (
    Math.abs(actualReal - expectedReal) > tol ||
    Math.abs(actualImag - expectedImag) > tol
  ) {
    const bitString = index.toString(2);
    throw new Error(
      `|${bitString}⟩: expected [${expectedReal}, ${expectedImag}], got [${actualReal.toFixed(
        14
      )}, ${actualImag.toFixed(14)}]`
    );
  }
}

// Verify state is pure computational basis state |k⟩
export function assertBasisState(state, basisIndex, tol = 1e-9) {
  for (let i = 0; i < state.size; i++) {
    assertAmp(state, i, i === basisIndex ? 1 : 0, 0, tol);
  }
}
