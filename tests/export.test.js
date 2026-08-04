// QUANTUM LABS — Export Tests
// Validates Qiskit, Cirq, and LaTeX code generation from circuit data.
// Run with: node tests/export.test.js

import { createTestSuite, expect } from "./helpers.js";
import { exportQiskit, formatPythonAngle } from "../assets/js/core/exporters/qiskit-exporter.js";
import { exportCirq } from "../assets/js/core/exporters/cirq-exporter.js";
import { exportLatex } from "../assets/js/core/exporters/latex-exporter.js";

// Helper: build minimal circuit data
function makeCircuit(numQubits, numCbits, steps, mode = "exact", shots = 1024) {
  const numSteps = steps.length;
  const grid = [];
  for (let s = 0; s < numSteps; s++) {
    const col = new Array(numQubits + numCbits).fill(null);
    if (steps[s]) {
      for (const [q, cell] of Object.entries(steps[s])) {
        col[Number(q)] = cell;
      }
    }
    grid.push(col);
  }

  // Convert grid to flat operations list as CircuitModel.toOperations() would
  const operations = [];
  const processed = new Set();
  for (let s = 0; s < numSteps; s++) {
    for (let q = 0; q < numQubits + numCbits; q++) {
      const cell = grid[s][q];
      if (!cell || processed.has(`${s}:${q}`)) continue;
      const qubits = cell.linkedQubits || [q];
      qubits.forEach(lq => processed.add(`${s}:${lq}`));
      operations.push({ gate: cell.gate, qubits, param: cell.param, rawParam: cell.param, step: s });
    }
  }

  return { numQubits, numCbits, numSteps, grid, operations, mode, shots };
}

export function runExportTests() {
  const suite = createTestSuite("Export Tests");
  const { test } = suite;

  // Angle formatting
  console.log("\n§ formatPythonAngle");

  test("π → np.pi", () => {
    expect(formatPythonAngle("π")).toBe("np.pi");
  });

  test("pi → np.pi", () => {
    expect(formatPythonAngle("pi")).toBe("np.pi");
  });

  test("2π → 2 * np.pi", () => {
    expect(formatPythonAngle("2π")).toBe("2 * np.pi");
  });

  test("2pi → 2 * np.pi", () => {
    expect(formatPythonAngle("2pi")).toBe("2 * np.pi");
  });

  test("π/2 → np.pi / 2", () => {
    expect(formatPythonAngle("π/2")).toBe("np.pi / 2");
  });

  test("π/4 → np.pi / 4", () => {
    expect(formatPythonAngle("π/4")).toBe("np.pi / 4");
  });

  test("-π/4 → -np.pi / 4", () => {
    expect(formatPythonAngle("-π/4")).toBe("-np.pi / 4");
  });

  test("3π/4 → (3 / 4) * np.pi", () => {
    expect(formatPythonAngle("3π/4")).toBe("(3 / 4) * np.pi");
  });

  test("1.5 → 1.5 (raw number)", () => {
    expect(formatPythonAngle("1.5")).toBe("1.5");
  });

  test("null → 0", () => {
    expect(formatPythonAngle(null)).toBe("0");
  });

  test('"" → 0', () => {
    expect(formatPythonAngle("")).toBe("0");
  });

  test("180° → radians float", () => {
    const result = formatPythonAngle("180°");
    // Should be approximately π = 3.14159...
    const val = parseFloat(result);
    if (Math.abs(val - Math.PI) > 0.0001) {
      throw new Error(`Expected ~${Math.PI}, got ${result}`);
    }
  });

  test("90deg → radians float", () => {
    const result = formatPythonAngle("90deg");
    const val = parseFloat(result);
    if (Math.abs(val - Math.PI / 2) > 0.0001) {
      throw new Error(`Expected ~${Math.PI / 2}, got ${result}`);
    }
  });

  // Qiskit single-qubit gates
  console.log("\n§ Qiskit Single-Qubit Gates");

  test("H gate → qc.h(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "H" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.h(0)")).toBe(true);
  });

  test("X gate → qc.x(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "X" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.x(0)")).toBe(true);
  });

  test("Y gate → qc.y(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "Y" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.y(0)")).toBe(true);
  });

  test("Z gate → qc.z(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "Z" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.z(0)")).toBe(true);
  });

  test("S gate → qc.s(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "S" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.s(0)")).toBe(true);
  });

  test("T gate → qc.t(0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "T" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.t(0)")).toBe(true);
  });

  test("Rx with π/2 → qc.rx(np.pi / 2, 0)", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "Rx", param: "π/2" } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.rx(np.pi / 2, 0)")).toBe(true);
  });

  // Qiskit multi-qubit gates
  console.log("\n§ Qiskit Multi-Qubit Gates");

  test("CNOT → qc.cx(0, 1)", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CNOT", linkedQubits: [0, 1] },
      1: { gate: "CNOT", linkedQubits: [0, 1] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.cx(0, 1)")).toBe(true);
  });

  test("CZ → qc.cz(0, 1)", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CZ", linkedQubits: [0, 1] },
      1: { gate: "CZ", linkedQubits: [0, 1] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.cz(0, 1)")).toBe(true);
  });

  test("CY → qc.cy(0, 1)", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CY", linkedQubits: [0, 1] },
      1: { gate: "CY", linkedQubits: [0, 1] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.cy(0, 1)")).toBe(true);
  });

  test("SWAP → qc.swap(0, 1)", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "SWAP", linkedQubits: [0, 1] },
      1: { gate: "SWAP", linkedQubits: [0, 1] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.swap(0, 1)")).toBe(true);
  });

  test("Toffoli → qc.ccx(0, 1, 2)", () => {
    const data = makeCircuit(3, 0, [{
      0: { gate: "Toffoli", linkedQubits: [0, 1, 2] },
      1: { gate: "Toffoli", linkedQubits: [0, 1, 2] },
      2: { gate: "Toffoli", linkedQubits: [0, 1, 2] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.ccx(0, 1, 2)")).toBe(true);
  });

  test("CSWAP → qc.cswap(0, 1, 2)", () => {
    const data = makeCircuit(3, 0, [{
      0: { gate: "CSWAP", linkedQubits: [0, 1, 2] },
      1: { gate: "CSWAP", linkedQubits: [0, 1, 2] },
      2: { gate: "CSWAP", linkedQubits: [0, 1, 2] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.cswap(0, 1, 2)")).toBe(true);
  });

  test("CP with π/2 → qc.cp(np.pi / 2, 0, 1)", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CP", param: "π/2", linkedQubits: [0, 1] },
      1: { gate: "CP", param: "π/2", linkedQubits: [0, 1] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.cp(np.pi / 2, 0, 1)")).toBe(true);
  });

  // MCX list argument syntax
  console.log("\n§ Qiskit MCX List Syntax");

  test("MCX with 3 qubits → qc.mcx([0, 1], 2)", () => {
    const data = makeCircuit(3, 0, [{
      0: { gate: "MCX", linkedQubits: [0, 1, 2] },
      1: { gate: "MCX", linkedQubits: [0, 1, 2] },
      2: { gate: "MCX", linkedQubits: [0, 1, 2] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.mcx([0, 1], 2)")).toBe(true);
    // Must NOT contain the spread form
    expect(code.includes("qc.mcx(0, 1, 2)")).toBe(false);
  });

  test("MCX with 4 qubits → qc.mcx([0, 1, 2], 3)", () => {
    const data = makeCircuit(4, 0, [{
      0: { gate: "MCX", linkedQubits: [0, 1, 2, 3] },
      1: { gate: "MCX", linkedQubits: [0, 1, 2, 3] },
      2: { gate: "MCX", linkedQubits: [0, 1, 2, 3] },
      3: { gate: "MCX", linkedQubits: [0, 1, 2, 3] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.mcx([0, 1, 2], 3)")).toBe(true);
  });

  // U1 general unitary
  console.log("\n§ Qiskit U1 General Unitary");

  test("U1 → qc.u(theta, phi, lam, q)", () => {
    const param = JSON.stringify({ theta: "π/2", phi: "0", lambda: "π" });
    const data = makeCircuit(1, 0, [{ 0: { gate: "U1", param } }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.u(np.pi / 2, 0, np.pi, 0)")).toBe(true);
  });

  // Measurement and classical bits
  console.log("\n§ Qiskit Measurements & Classical Bits");

  test("Circuit with cbits → QuantumCircuit(n, c)", () => {
    const data = makeCircuit(2, 2, [{}]);
    const code = exportQiskit(data);
    expect(code.includes("QuantumCircuit(2, 2)")).toBe(true);
  });

  test("Measurement gate → qc.measure(q, c)", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "M", linkedQubits: [0, 2] },
      2: { gate: "M", linkedQubits: [0, 2] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("qc.measure(0, 0)")).toBe(true);
  });

  test("c-X gate → with qc.if_test(...): qc.x(q)", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "c-X", linkedQubits: [1, 2] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("with qc.if_test((qc.clbits[0], 1)):")).toBe(true);
    expect(code.includes("    qc.x(1)")).toBe(true);
  });

  test("c-Z gate → with qc.if_test(...): qc.z(q)", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "c-Z", linkedQubits: [1, 3] },
    }]);
    const code = exportQiskit(data);
    expect(code.includes("with qc.if_test((qc.clbits[1], 1)):")).toBe(true);
    expect(code.includes("    qc.z(1)")).toBe(true);
  });

  test("Statevector block with no measurements", () => {
    const data = makeCircuit(1, 0, [{}], "exact");
    const code = exportQiskit(data);
    expect(code.includes("Statevector.from_instruction(qc)")).toBe(true);
    expect(code.includes("cannot be computed")).toBe(false);
  });

  test("Statevector block with measurements adds warning", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "M", linkedQubits: [0, 2] },
    }], "exact");
    const code = exportQiskit(data);
    expect(code.includes("Statevector.from_instruction(qc)")).toBe(true);
    expect(code.includes("cannot be computed due to the presence of measurement gates")).toBe(true);
  });

  test("Shots simulation block with measurements", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "M", linkedQubits: [0, 2] },
    }], "shots");
    const code = exportQiskit(data);
    expect(code.includes("AerSimulator")).toBe(true);
    expect(code.includes("shots=1024")).toBe(true);
    expect(code.includes("Statevector.from_instruction")).toBe(false);
    expect(code.includes("requires measurements")).toBe(false);
  });

  test("Shots simulation block without measurements adds warning", () => {
    const data = makeCircuit(1, 0, [{}], "shots");
    const code = exportQiskit(data);
    expect(code.includes("AerSimulator")).toBe(true);
    expect(code.includes("requires measurements to produce counts")).toBe(true);
  });

  // Cirq tests
  console.log("\n§ Cirq Code Generation");

  test("Cirq H gate → cirq.H(qubits[0])", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "H" } }]);
    const code = exportCirq(data);
    expect(code.includes("cirq.H(qubits[0])")).toBe(true);
  });

  test("Cirq CNOT → cirq.CNOT(qubits[0], qubits[1])", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CNOT", linkedQubits: [0, 1] },
      1: { gate: "CNOT", linkedQubits: [0, 1] },
    }]);
    const code = exportCirq(data);
    expect(code.includes("cirq.CNOT(qubits[0], qubits[1])")).toBe(true);
  });

  test("Cirq SWAP → cirq.SWAP(qubits[0], qubits[1])", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "SWAP", linkedQubits: [0, 1] },
      1: { gate: "SWAP", linkedQubits: [0, 1] },
    }]);
    const code = exportCirq(data);
    expect(code.includes("cirq.SWAP(qubits[0], qubits[1])")).toBe(true);
  });

  test("Cirq measurement → cirq.measure(...)", () => {
    const data = makeCircuit(1, 1, [{
      0: { gate: "M", linkedQubits: [0, 1] },
      1: { gate: "M", linkedQubits: [0, 1] },
    }]);
    const code = exportCirq(data);
    expect(code.includes("cirq.measure(qubits[0], key='m0')")).toBe(true);
  });

  test("Cirq MCX → cirq.X.controlled(...)", () => {
    const data = makeCircuit(3, 0, [{
      0: { gate: "MCX", linkedQubits: [0, 1, 2] },
      1: { gate: "MCX", linkedQubits: [0, 1, 2] },
      2: { gate: "MCX", linkedQubits: [0, 1, 2] },
    }]);
    const code = exportCirq(data);
    expect(code.includes("cirq.X.controlled(num_controls=2)")).toBe(true);
  });

  test("Cirq Statevector block with no measurements", () => {
    const circuitData = makeCircuit(2, 0, [
      { 0: { gate: "H" } }
    ], "exact");
    const code = exportCirq(circuitData);
    expect(code.includes("result = cirq.Simulator().simulate(circuit, qubit_order=qubits)")).toBe(true);
    expect(code.includes("Note: Statevector will be collapsed")).toBe(false);
  });

  test("Cirq Statevector block with measurements adds warning", () => {
    const circuitData = makeCircuit(2, 0, [
      { 0: { gate: "M" } }
    ], "exact");
    const code = exportCirq(circuitData);
    expect(code.includes("result = cirq.Simulator().simulate(circuit, qubit_order=qubits)")).toBe(true);
    expect(code.includes("Note: Statevector will be collapsed due to the presence of measurement gates.")).toBe(true);
  });

  test("Cirq Shots simulation block with measurements", () => {
    const data = makeCircuit(2, 2, [{
      0: { gate: "M", linkedQubits: [0, 2] },
    }], "shots");
    const code = exportCirq(data);
    expect(code.includes(".run(")).toBe(true);
    expect(code.includes("repetitions=1024")).toBe(true);
    expect(code.includes(".simulate(")).toBe(false);
    expect(code.includes("requires measurements")).toBe(false);
  });

  test("Cirq Shots simulation block without measurements adds warning", () => {
    const data = makeCircuit(1, 0, [{}], "shots");
    const code = exportCirq(data);
    expect(code.includes(".run(")).toBe(true);
    expect(code.includes("requires measurements to produce counts")).toBe(true);
  });

  // LaTeX tests
  console.log("\n§ LaTeX Code Generation");

  test("LaTeX contains documentclass", () => {
    const data = makeCircuit(1, 0, [{}]);
    const code = exportLatex(data);
    expect(code.includes("\\documentclass{article}")).toBe(true);
  });

  test("LaTeX contains Qcircuit", () => {
    const data = makeCircuit(1, 0, [{}]);
    const code = exportLatex(data);
    expect(code.includes("\\Qcircuit")).toBe(true);
  });

  test("LaTeX contains usepackage qcircuit", () => {
    const data = makeCircuit(1, 0, [{}]);
    const code = exportLatex(data);
    expect(code.includes("\\usepackage{qcircuit}")).toBe(true);
  });

  test("LaTeX H gate → \\gate{H}", () => {
    const data = makeCircuit(1, 0, [{ 0: { gate: "H" } }]);
    const code = exportLatex(data);
    expect(code.includes("\\gate{H}")).toBe(true);
  });

  test("LaTeX CNOT → \\ctrl and \\targ", () => {
    const data = makeCircuit(2, 0, [{
      0: { gate: "CNOT", linkedQubits: [0, 1] },
      1: { gate: "CNOT", linkedQubits: [0, 1] },
    }]);
    const code = exportLatex(data);
    expect(code.includes("\\ctrl{1}")).toBe(true);
    expect(code.includes("\\targ")).toBe(true);
  });

  return suite.report();
}

// Run standalone
if (process.argv[1] && process.argv[1].includes("export.test")) {
  runExportTests();
}
