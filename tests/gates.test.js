// QUANTUM LABS — Gate Tests
// Validates single-qubit matrices, multi-qubit truth tables, and angle parsing.
// Run with: node tests/gates.test.js

import { QuantumGates } from "../assets/js/core/quantum-gates.js";
import {
  createTestSuite,
  expect,
  ket0,
  applyGate,
  applyMultiGate,
  assertAmp,
  assertBasisState,
  SQRT2_INV,
  PI,
} from "./helpers.js";

export function runGatesTests() {
  const suite = createTestSuite("Gate Tests");
  const { test } = suite;

  console.log("\n§ Single-Qubit Gate Matrices");

  // Hadamard gate
  test("H|0⟩ = (|0⟩+|1⟩)/√2", () => {
    const s = applyGate(ket0(1), "H");
    assertAmp(s, 0, SQRT2_INV, 0);
    assertAmp(s, 1, SQRT2_INV, 0);
  });

  test("H|1⟩ = (|0⟩-|1⟩)/√2", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "H");
    assertAmp(s, 0, SQRT2_INV, 0);
    assertAmp(s, 1, -SQRT2_INV, 0);
  });

  test("H²=I", () => {
    assertBasisState(applyGate(applyGate(ket0(1), "H"), "H"), 0);
  });

  // Pauli gates
  test("X|0⟩=|1⟩", () => {
    assertBasisState(applyGate(ket0(1), "X"), 1);
  });

  test("X|1⟩=|0⟩", () => {
    assertBasisState(applyGate(applyGate(ket0(1), "X"), "X"), 0);
  });

  test("Y|0⟩=i|1⟩", () => {
    const s = applyGate(ket0(1), "Y");
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 0, 1);
  });

  test("Y|1⟩=-i|0⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Y");
    assertAmp(s, 0, 0, -1);
    assertAmp(s, 1, 0, 0);
  });

  test("Y²=I", () => {
    assertBasisState(applyGate(applyGate(ket0(1), "Y"), "Y"), 0);
  });

  test("Z|0⟩=|0⟩", () => {
    assertBasisState(applyGate(ket0(1), "Z"), 0);
  });

  test("Z|1⟩=-|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Z");
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, -1, 0);
  });

  // Phase and Clifford gates
  test("S|0⟩=|0⟩", () => {
    assertBasisState(applyGate(ket0(1), "S"), 0);
  });

  test("S|1⟩=i|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "S");
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 0, 1);
  });

  test("Sdg|1⟩=-i|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Sdg");
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 0, -1);
  });

  test("S·Sdg=I on |1⟩", () => {
    assertBasisState(
      applyGate(applyGate(applyGate(ket0(1), "X"), "S"), "Sdg"),
      1
    );
  });

  test("T|1⟩=e^{iπ/4}|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "T");
    assertAmp(s, 1, Math.cos(PI / 4), Math.sin(PI / 4));
  });

  test("Tdg|1⟩=e^{-iπ/4}|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Tdg");
    assertAmp(s, 1, Math.cos(-PI / 4), Math.sin(-PI / 4));
  });

  test("T·Tdg=I on |1⟩", () => {
    assertBasisState(
      applyGate(applyGate(applyGate(ket0(1), "X"), "T"), "Tdg"),
      1
    );
  });

  test("S²=Z on |+⟩", () => {
    const ref = applyGate(applyGate(ket0(1), "H"), "Z");
    const got = applyGate(applyGate(applyGate(ket0(1), "H"), "S"), "S");
    assertAmp(got, 0, ref.real[0], ref.imag[0]);
    assertAmp(got, 1, ref.real[1], ref.imag[1]);
  });

  // Parametric rotation gates
  test("Rx(π)|0⟩=-i|1⟩", () => {
    const s = applyGate(ket0(1), "Rx", String(PI));
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 0, -1);
  });

  test("Rx(2π)|0⟩=-|0⟩", () => {
    const s = applyGate(ket0(1), "Rx", String(2 * PI));
    assertAmp(s, 0, -1, 0);
    assertAmp(s, 1, 0, 0);
  });

  test("Ry(π)|0⟩=|1⟩", () => {
    const s = applyGate(ket0(1), "Ry", String(PI));
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 1, 0);
  });

  test("Ry(π)|1⟩=-|0⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Ry", String(PI));
    assertAmp(s, 0, -1, 0);
    assertAmp(s, 1, 0, 0);
  });

  test("Rz(π)|0⟩=-i|0⟩", () => {
    const s = applyGate(ket0(1), "Rz", String(PI));
    assertAmp(s, 0, 0, -1);
    assertAmp(s, 1, 0, 0);
  });

  test("Rz(π)|1⟩=i|1⟩", () => {
    const s = applyGate(applyGate(ket0(1), "X"), "Rz", String(PI));
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 0, 1);
  });

  test("I|0⟩=|0⟩", () => {
    assertBasisState(applyGate(ket0(1), "I"), 0);
  });

  // General unitary U1 gate
  test("U1 identity at (0,0,0)", () => {
    const s = applyGate(
      ket0(1),
      "U1",
      JSON.stringify({ theta: 0, phi: 0, lambda: 0 })
    );
    assertBasisState(s, 0);
  });

  test("U1 bit-flip at (π,0,0)", () => {
    const s = applyGate(
      ket0(1),
      "U1",
      JSON.stringify({ theta: "pi", phi: 0, lambda: 0 })
    );
    assertAmp(s, 0, 0, 0);
    assertAmp(s, 1, 1, 0);
  });

  console.log("\n§ Multi-Qubit Gate Truth Tables");

  function basis2Q(index) {
    const s = ket0(2);
    if (index) {
      s.real[0] = 0;
      s.real[index] = 1;
    }
    return s;
  }

  function basis3Q(index) {
    const s = ket0(3);
    s.real[0] = 0;
    s.real[index] = 1;
    return s;
  }

  function findBasisOut(state) {
    let found = -1;
    for (let i = 0; i < state.size; i++) {
      if (Math.abs(state.real[i] - 1) < 1e-9 && Math.abs(state.imag[i]) < 1e-9) {
        if (found !== -1) {
          return -2;
        }
        found = i;
      }
    }
    return found;
  }

  // CNOT truth table
  for (const [inp, exp] of [
    [0, 0],
    [1, 1],
    [2, 3],
    [3, 2],
  ]) {
    test(
      "CNOT: |" +
        inp.toString(2).padStart(2, "0") +
        "⟩→|" +
        exp.toString(2).padStart(2, "0") +
        "⟩",
      () => {
        expect(findBasisOut(applyMultiGate(basis2Q(inp), "CNOT", [0, 1]))).toBe(
          exp
        );
      }
    );
  }

  // CZ gate truth table
  test("CZ: |00⟩ unchanged", () => {
    assertAmp(applyMultiGate(basis2Q(0), "CZ", [0, 1]), 0, 1, 0);
  });
  test("CZ: |01⟩ unchanged", () => {
    assertAmp(applyMultiGate(basis2Q(1), "CZ", [0, 1]), 1, 1, 0);
  });
  test("CZ: |10⟩ unchanged", () => {
    assertAmp(applyMultiGate(basis2Q(2), "CZ", [0, 1]), 2, 1, 0);
  });
  test("CZ: |11⟩→-|11⟩", () => {
    assertAmp(applyMultiGate(basis2Q(3), "CZ", [0, 1]), 3, -1, 0);
  });

  // CY gate truth table
  test("CY: |00⟩ unchanged", () => {
    const o = applyMultiGate(basis2Q(0), "CY", [0, 1]);
    assertAmp(o, 0, 1, 0);
    assertAmp(o, 1, 0, 0);
    assertAmp(o, 2, 0, 0);
    assertAmp(o, 3, 0, 0);
  });
  test("CY: |01⟩ unchanged", () => {
    const o = applyMultiGate(basis2Q(1), "CY", [0, 1]);
    assertAmp(o, 0, 0, 0);
    assertAmp(o, 1, 1, 0);
    assertAmp(o, 2, 0, 0);
    assertAmp(o, 3, 0, 0);
  });
  test("CY: |10⟩→i|11⟩  (Y|0⟩=i|1⟩)", () => {
    const o = applyMultiGate(basis2Q(2), "CY", [0, 1]);
    assertAmp(o, 0, 0, 0);
    assertAmp(o, 1, 0, 0);
    assertAmp(o, 2, 0, 0);
    assertAmp(o, 3, 0, 1);
  });
  test("CY: |11⟩→-i|10⟩  (Y|1⟩=-i|0⟩)", () => {
    const o = applyMultiGate(basis2Q(3), "CY", [0, 1]);
    assertAmp(o, 0, 0, 0);
    assertAmp(o, 1, 0, 0);
    assertAmp(o, 2, 0, -1);
    assertAmp(o, 3, 0, 0);
  });
  test("CY²=I on |10⟩", () => {
    let o = applyMultiGate(basis2Q(2), "CY", [0, 1]);
    o = applyMultiGate(o, "CY", [0, 1]);
    assertAmp(o, 2, 1, 0);
    assertAmp(o, 3, 0, 0);
  });
  test("CY superposition: (|10⟩+|11⟩)/√2 → (i|11⟩-i|10⟩)/√2", () => {
    const s = ket0(2);
    s.real[0] = 0;
    s.real[2] = SQRT2_INV;
    s.real[3] = SQRT2_INV;
    const o = applyMultiGate(s, "CY", [0, 1]);
    assertAmp(o, 2, 0, -SQRT2_INV);
    assertAmp(o, 3, 0, SQRT2_INV);
  });

  // SWAP gate truth table
  for (const [inp, exp] of [
    [0, 0],
    [1, 2],
    [2, 1],
    [3, 3],
  ]) {
    test(
      "SWAP: |" +
        inp.toString(2).padStart(2, "0") +
        "⟩→|" +
        exp.toString(2).padStart(2, "0") +
        "⟩",
      () => {
        expect(findBasisOut(applyMultiGate(basis2Q(inp), "SWAP", [0, 1]))).toBe(
          exp
        );
      }
    );
  }
  test("SWAP²=I on |01⟩", () => {
    assertBasisState(
      applyMultiGate(
        applyMultiGate(basis2Q(1), "SWAP", [0, 1]),
        "SWAP",
        [0, 1]
      ),
      1
    );
  });

  // Toffoli (CCX) gate truth table
  const tofTable = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [6, 7],
    [7, 6],
  ];
  for (const [inp, exp] of tofTable) {
    test(
      "Toffoli: |" +
        inp.toString(2).padStart(3, "0") +
        "⟩→|" +
        exp.toString(2).padStart(3, "0") +
        "⟩",
      () => {
        expect(
          findBasisOut(applyMultiGate(basis3Q(inp), "Toffoli", [0, 1, 2]))
        ).toBe(exp);
      }
    );
  }

  // CSWAP (Fredkin) gate truth table
  const cswapTable = [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 6],
    [6, 5],
    [7, 7],
  ];
  for (const [inp, exp] of cswapTable) {
    test(
      "CSWAP: |" +
        inp.toString(2).padStart(3, "0") +
        "⟩→|" +
        exp.toString(2).padStart(3, "0") +
        "⟩",
      () => {
        expect(
          findBasisOut(applyMultiGate(basis3Q(inp), "CSWAP", [0, 1, 2]))
        ).toBe(exp);
      }
    );
  }

  // Multi-Controlled X gate
  test("MCX [0,1,2] on |110⟩→|111⟩", () => {
    assertAmp(applyMultiGate(basis3Q(6), "MCX", [0, 1, 2]), 7, 1, 0);
  });

  // Controlled Phase gate
  test("CP(π/2): |11⟩→i|11⟩", () => {
    assertAmp(
      applyMultiGate(basis2Q(3), "CP", [0, 1], String(PI / 2)),
      3,
      0,
      1
    );
  });
  test("CP(π): |11⟩→-|11⟩", () => {
    assertAmp(applyMultiGate(basis2Q(3), "CP", [0, 1], String(PI)), 3, -1, 0);
  });
  test("CP: |00⟩,|01⟩,|10⟩ unchanged", () => {
    for (const idx of [0, 1, 2]) {
      assertAmp(
        applyMultiGate(basis2Q(idx), "CP", [0, 1], String(PI / 3)),
        idx,
        1,
        0
      );
    }
  });

  console.log("\n§ parseAngle Edge Cases");

  const pa = QuantumGates.parseAngle;

  test("pa(0)=0", () => expect(pa(0)).toBeCloseTo(0));
  test("pa('')=0", () => expect(pa("")).toBeCloseTo(0));
  test("pa(null)=0", () => expect(pa(null)).toBeCloseTo(0));
  test("pa('π')=π", () => expect(pa("π")).toBeCloseTo(PI));
  test("pa('pi')=π", () => expect(pa("pi")).toBeCloseTo(PI));
  test("pa('PI')=π (case-insensitive)", () => expect(pa("PI")).toBeCloseTo(PI));
  test("pa('-π')=-π", () => expect(pa("-π")).toBeCloseTo(-PI));
  test("pa('π/2')=π/2", () => expect(pa("π/2")).toBeCloseTo(PI / 2));
  test("pa('-π/2')=-π/2", () => expect(pa("-π/2")).toBeCloseTo(-PI / 2));
  test("pa('-pi/4')=-π/4", () => expect(pa("-pi/4")).toBeCloseTo(-PI / 4));
  test("pa('2π')=2π", () => expect(pa("2π")).toBeCloseTo(2 * PI));
  test("pa('2*π')=2π (trailing * stripped)", () =>
    expect(pa("2*π")).toBeCloseTo(2 * PI));
  test("pa('3π/4')=3π/4", () => expect(pa("3π/4")).toBeCloseTo((3 * PI) / 4));
  test("pa('180°')=π", () => expect(pa("180°")).toBeCloseTo(PI));
  test("pa('90°')=π/2", () => expect(pa("90°")).toBeCloseTo(PI / 2));
  test("pa('-90°')=-π/2", () => expect(pa("-90°")).toBeCloseTo(-PI / 2));
  test("pa('90deg')=π/2", () => expect(pa("90deg")).toBeCloseTo(PI / 2));
  test("pa('1.5')=1.5", () => expect(pa("1.5")).toBeCloseTo(1.5));
  test("pa('-1.5')=-1.5", () => expect(pa("-1.5")).toBeCloseTo(-1.5));
  test("pa('1.5π')=1.5π", () => expect(pa("1.5π")).toBeCloseTo(1.5 * PI));
  test("pa('1.5pi/2')=0.75π", () =>
    expect(pa("1.5pi/2")).toBeCloseTo(0.75 * PI));
  test("pa(3.14)=3.14 (number passthrough)", () =>
    expect(pa(3.14)).toBeCloseTo(3.14));
  test("pa('/4')=0.25 (implicit leading 1, no pi)", () =>
    expect(pa("/4")).toBeCloseTo(0.25));

  return suite.report();
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runGatesTests();
}
