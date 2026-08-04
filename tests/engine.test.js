// QUANTUM LABS — Engine & Circuit Tests
// Validates statevector simulation, tensor products, and analytical circuits.
// Run with: node tests/engine.test.js

import { QuantumGates } from "../assets/js/core/quantum-gates.js";
import { QuantumMath } from "../assets/js/core/quantum-math.js";
import {
  createTestSuite,
  expect,
  runCircuit,
  assertAmp,
  assertBasisState,
  SQRT2_INV,
} from "./helpers.js";

export function runEngineTests() {
  const suite = createTestSuite("Engine Tests");
  const { test } = suite;

  console.log("\n§ Matrix Operations & Tensor Products");

  test("tensorProduct2x2: H ⊗ H", () => {
    const H = QuantumGates.get("H").matrix;
    const HxH = QuantumMath.tensorProduct2x2(H, H);
    expect(HxH.length).toBe(4);
    expect(HxH[0].length).toBe(4);

    expect(HxH[0][0][0]).toBeCloseTo(0.5);
    expect(HxH[0][1][0]).toBeCloseTo(0.5);
    expect(HxH[0][2][0]).toBeCloseTo(0.5);
    expect(HxH[0][3][0]).toBeCloseTo(0.5);
    expect(HxH[1][1][0]).toBeCloseTo(-0.5);
    expect(HxH[3][3][0]).toBeCloseTo(0.5);
  });

  test("tensorProduct2x2: X ⊗ I", () => {
    const X = QuantumGates.get("X").matrix;
    const I = QuantumGates.get("I").matrix;
    const XI = QuantumMath.tensorProduct2x2(X, I);

    const v = [
      [1, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const out = QuantumMath.multiplyMatrixVector(XI, v);
    expect(out[0][0]).toBeCloseTo(0);
    expect(out[2][0]).toBeCloseTo(1);
  });

  console.log("\n§ Known Quantum Circuits");

  test("Bell Φ⁺: (|00⟩+|11⟩)/√2", () => {
    const r = runCircuit(2, [
      { gate: "H", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
    ]);
    assertAmp(r.state, 0, SQRT2_INV, 0);
    assertAmp(r.state, 1, 0, 0);
    assertAmp(r.state, 2, 0, 0);
    assertAmp(r.state, 3, SQRT2_INV, 0);
  });

  test("Bell Ψ⁺: (|01⟩+|10⟩)/√2", () => {
    const r = runCircuit(2, [
      { gate: "X", qubits: [1] },
      { gate: "H", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
    ]);
    assertAmp(r.state, 0, 0, 0);
    assertAmp(r.state, 1, SQRT2_INV, 0);
    assertAmp(r.state, 2, SQRT2_INV, 0);
    assertAmp(r.state, 3, 0, 0);
  });

  test("GHZ: (|000⟩+|111⟩)/√2", () => {
    const r = runCircuit(3, [
      { gate: "H", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "CNOT", qubits: [0, 2] },
    ]);
    assertAmp(r.state, 0, SQRT2_INV, 0);
    assertAmp(r.state, 7, SQRT2_INV, 0);
    for (const i of [1, 2, 3, 4, 5, 6]) {
      assertAmp(r.state, i, 0, 0);
    }
  });

  test("GHZ then inverse = |000⟩", () => {
    const r = runCircuit(3, [
      { gate: "H", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "CNOT", qubits: [0, 2] },
      { gate: "CNOT", qubits: [0, 2] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "H", qubits: [0] },
    ]);
    assertBasisState(r.state, 0);
  });

  test("Teleportation: pre-measurement state for |ψ⟩=|1⟩", () => {
    const r = runCircuit(3, [
      { gate: "X", qubits: [0] },
      { gate: "H", qubits: [1] },
      { gate: "CNOT", qubits: [1, 2] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "H", qubits: [0] },
    ]);
    assertAmp(r.state, 1, 0.5, 0);
    assertAmp(r.state, 2, 0.5, 0);
    assertAmp(r.state, 5, -0.5, 0);
    assertAmp(r.state, 6, -0.5, 0);
    for (const i of [0, 3, 4, 7]) {
      assertAmp(r.state, i, 0, 0);
    }
  });

  test("Superdense: encode 00 → |00⟩", () => {
    assertBasisState(
      runCircuit(2, [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "H", qubits: [0] },
      ]).state,
      0
    );
  });

  test("Superdense: encode 01 → |01⟩", () => {
    assertBasisState(
      runCircuit(2, [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "X", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "H", qubits: [0] },
      ]).state,
      1
    );
  });

  test("Superdense: encode 10 → |10⟩", () => {
    assertBasisState(
      runCircuit(2, [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "Z", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "H", qubits: [0] },
      ]).state,
      2
    );
  });

  test("Superdense: encode 11 → -|11⟩  (global phase from Z·X ordering)", () => {
    const r = runCircuit(2, [
      { gate: "H", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "Z", qubits: [0] },
      { gate: "X", qubits: [0] },
      { gate: "CNOT", qubits: [0, 1] },
      { gate: "H", qubits: [0] },
    ]);
    assertAmp(r.state, 3, -1, 0);
    for (const i of [0, 1, 2]) {
      assertAmp(r.state, i, 0, 0);
    }
  });

  return suite.report();
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runEngineTests();
}
