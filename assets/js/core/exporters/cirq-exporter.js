// QUANTUM LABS — Cirq Exporter
// Pure function that generates valid Python code for Google Cirq.

import { QuantumGates } from "../quantum-gates.js";
import { formatPythonAngle } from "./qiskit-exporter.js";

// Safely convert a param value to a display string
function paramToStr(param) {
  if (param == null) return "";
  return String(param);
}

// Generate valid Cirq Python code from circuit data.
export function exportCirq(circuitData) {
  const { numQubits } = circuitData;

  const lines = [];
  lines.push("# import cirq and numpy");
  lines.push("import cirq");
  lines.push("import numpy as np");
  lines.push("");

  const hasU = circuitData.operations.some(op => op.gate === "U");
  if (hasU) {
    lines.push("# Helper for general U(theta, phi, lambda) gate");
    lines.push("def u_gate(theta, phi, lam, q):");
    lines.push("    yield cirq.global_phase_operation(np.exp(1j * (phi + lam) / 2))");
    lines.push("    yield cirq.rz(lam)(q)");
    lines.push("    yield cirq.ry(theta)(q)");
    lines.push("    yield cirq.rz(phi)(q)");
    lines.push("");
  }

  lines.push("# define registers");
  lines.push(`qubits = cirq.LineQubit.range(${numQubits})`);
  lines.push("circuit = cirq.Circuit()");
  lines.push("");

  lines.push("# apply gates");

  for (const op of circuitData.operations) {
    const gate = op.gate;
    const gateInfo = QuantumGates.get(gate);

    // Measurement gate
    if (gate === "M") {
      const qBit = op.qubits[0];
      if (qBit != null) {
        lines.push(`circuit.append(cirq.measure(qubits[${qBit}], key='m${qBit}'))`);
      }
      continue;
    }

    // Classically-controlled gates — Cirq uses classical controls differently
    if (gate === "c-X" || gate === "c-Z") {
      const qBit = op.qubits.find((q) => q < numQubits);
      const cBit = op.qubits.find((q) => q >= numQubits);
      const baseGate = gate === "c-X" ? "X" : "Z";
      if (qBit != null && cBit != null) {
        lines.push(`circuit.append(cirq.${baseGate}(qubits[${qBit}]).with_classical_controls('m${cBit - numQubits}'))`);
      }
      continue;
    }

    // MCX — multi-controlled X
    if (gate === "MCX") {
      const controls = op.qubits.slice(0, -1);
      const numControls = controls.length;
      const qargs = op.qubits.map((q) => `qubits[${q}]`).join(", ");
      lines.push(`circuit.append(cirq.X.controlled(num_controls=${numControls})(${qargs}))`);
      continue;
    }

    // U_mat — custom unitary matrix
    if (gate === "U_mat") {
      const activeParam = op.rawParam !== null ? op.rawParam : op.param;
      lines.push(`circuit.append(${formatUMatCirq(op.qubits[0], activeParam)})`);
      continue;
    }

    // U — general unitary via MatrixGate
    if (gate === "U") {
      const activeParam = op.rawParam !== null ? op.rawParam : op.param;
      lines.push(`circuit.append(${formatUCirq(op.qubits[0], activeParam)})`);
      continue;
    }

    // Filter to quantum-only qubits for Cirq args
    const quantumQubits = op.qubits.filter((q) => q < numQubits);
    const qargs = quantumQubits.map((q) => `qubits[${q}]`).join(", ");

    if (gateInfo && gateInfo.cirq) {
      if (gateInfo.param) {
        const activeParam = op.rawParam !== null ? op.rawParam : op.param;
        const angle = formatPythonAngle(activeParam);
        const cirqGateName = gateInfo.cirq === "CZPowGate" ? "cphase" : gateInfo.cirq;
        lines.push(`circuit.append(cirq.${cirqGateName}(${angle})(${qargs}))`);
      } else {
        lines.push(`circuit.append(cirq.${gateInfo.cirq}(${qargs}))`);
      }
    }
  }

  const mode = circuitData.mode || "exact";
  const shots = circuitData.shots || 1024;
  const hasMeasurements = circuitData.operations.some(op => op.gate === "M");

  lines.push("");
  if (mode === "shots") {
    lines.push("# simulate with shots");
    const prefix = !hasMeasurements ? "# " : "";
    lines.push(`${prefix}result = cirq.Simulator().run(circuit, repetitions=${shots})`);
    
    if (hasMeasurements) {
      const mOps = circuitData.operations.filter(op => op.gate === "M");
      const measuredQubits = Array.from(new Set(mOps.map(op => op.qubits[0]))).sort((a,b) => a-b);
      const keys = measuredQubits.map(q => `"m${q}"`).join(", ");
      
      lines.push("");
      lines.push("# Get measurement counts");
      lines.push(`hist = result.multi_measurement_histogram(keys=[${keys}])`);
      lines.push("");
      lines.push("# Convert to bitstring counts");
      lines.push("counts = {");
      lines.push("    \"\".join(map(str, bits)): count");
      lines.push("    for bits, count in hist.items()");
      lines.push("}");
      lines.push("");
      lines.push("# Print counts only (sorted)");
      lines.push("for bitstring in sorted(counts):");
      lines.push("    print(f\"{bitstring}: {counts[bitstring]}\")");
    } else {
      lines.push("");
      lines.push("# Note: Shots simulation requires measurements to produce counts.");
    }
  } else {
    const prefix = hasMeasurements ? "# " : "";
    lines.push("# simulate with statevector");
    lines.push(`${prefix}result = cirq.Simulator().simulate(circuit, qubit_order=qubits)`);
    lines.push(`${prefix}print(np.around(result.final_state_vector, 3))`);
    if (hasMeasurements) {
      lines.push("");
      lines.push("# Note: Statevector will be collapsed due to the presence of measurement gates.");
    }
  }

  return lines.join("\n");
}

// Format U gate as a Cirq MatrixGate using numpy
function formatUCirq(qubit, param) {
  let theta = "0", phi = "0", lam = "0";
  try {
    let p = {};
    const raw = paramToStr(param);
    if (raw.startsWith("{")) {
      p = JSON.parse(raw);
    } else if (raw.includes("|")) {
      const parts = raw.split("|");
      p = { name: parts[0], theta: parts[1], phi: parts[2], lambda: parts[3] };
    }
    theta = formatPythonAngle(p.theta);
    phi = formatPythonAngle(p.phi);
    lam = formatPythonAngle(p.lambda);
  } catch {
    // Default to identity
  }
  // Build unitary from U(theta, phi, lambda) via decomposed helper
  return `u_gate(${theta}, ${phi}, ${lam}, qubits[${qubit}])`;
}

function formatComplexPython(c) {
  const r = Math.abs(c[0]) < 1e-7 ? 0 : c[0];
  const i = Math.abs(c[1]) < 1e-7 ? 0 : c[1];
  if (i === 0) return `${r}`;
  if (r === 0) return `${i}j`;
  return `(${r}${i >= 0 ? "+" : ""}${i}j)`;
}

// Format a U_mat gate call for Cirq: cirq.MatrixGate(np.array(...))(qubits[q])
function formatUMatCirq(qubit, param) {
  try {
    const raw = paramToStr(param);
    let p = {};
    if (raw.startsWith("{")) {
      p = JSON.parse(raw);
    }
    if (Array.isArray(p.matrix) && p.matrix.length === 4) {
      const row0 = `[${formatComplexPython(p.matrix[0])}, ${formatComplexPython(p.matrix[1])}]`;
      const row1 = `[${formatComplexPython(p.matrix[2])}, ${formatComplexPython(p.matrix[3])}]`;
      return `cirq.MatrixGate(np.array([${row0}, ${row1}]))(qubits[${qubit}])`;
    }
  } catch {}
  return `cirq.MatrixGate(np.eye(2))(qubits[${qubit}])`;
}
