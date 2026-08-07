// QUANTUM LABS — Qiskit Exporter
// Pure function that generates valid Python code for IBM Qiskit (v1.x / v2.x).

import { QuantumGates } from "../quantum-gates.js";

// Format an angle parameter into a valid Python expression using np.pi.
// Fixes the critical bug where naive string replacement produces
// invalid Python like "2np.pi" or "3np.pi/4".
export function formatPythonAngle(param) {
  if (param == null || param === "") return "0";
  let s = String(param).trim();
  if (s === "") return "0";

  // Raw numeric value — pass through
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;

  // Degree notation (e.g. "180°", "90deg")
  const degMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:°|deg)$/i);
  if (degMatch) {
    const deg = parseFloat(degMatch[1]);
    // Convert to radians as a float
    const rad = (deg * Math.PI) / 180;
    return rad.toFixed(10).replace(/\.?0+$/, "");
  }

  // Extract sign
  let sign = "";
  if (s.startsWith("-")) {
    sign = "-";
    s = s.substring(1).trim();
  }

  // Check for pi/π
  const hasPi = /pi|π/i.test(s);
  if (!hasPi) {
    // No pi, return as-is with sign
    return sign + s;
  }

  // Strip pi/π
  let cleaned = s.replace(/pi|π/gi, "").trim();

  // Handle forms: "π" → "np.pi", "2π" → "2 * np.pi"
  // Handle forms: "π/2" → "np.pi / 2", "3π/4" → "(3 / 4) * np.pi"

  if (cleaned === "" || cleaned === "*") {
    // Bare π
    return sign + "np.pi";
  }

  if (cleaned.startsWith("/")) {
    // π/N form (e.g. "π/2", "π/4")
    const denom = cleaned.substring(1).trim();
    return sign + "np.pi / " + (denom || "1");
  }

  if (cleaned.startsWith("*")) {
    cleaned = cleaned.substring(1).trim();
  }

  if (cleaned.includes("/")) {
    // Nπ/M form (e.g. "3π/4")
    const parts = cleaned.split("/");
    const num = parts[0].replace(/\*$/, "").trim() || "1";
    const den = parts[1].trim() || "1";
    return sign + `(${num} / ${den}) * np.pi`;
  }

  // Nπ form (e.g. "2π")
  const coeff = cleaned.replace(/\*$/, "").trim();
  if (coeff === "" || coeff === "1") {
    return sign + "np.pi";
  }
  return sign + coeff + " * np.pi";
}

// Safely convert a param value to a display string
function paramToStr(param) {
  if (param == null) return "";
  return String(param);
}

// Detect whether the circuit contains measurement gates or classical bits
function needsClassicalBits(circuitData) {
  if (circuitData.numCbits > 0) return true;
  return circuitData.operations.some(op => op.gate === "M" || op.gate === "c-X" || op.gate === "c-Z");
}

// Generate valid Qiskit Python code from circuit data.
export function exportQiskit(circuitData) {
  const { numQubits, numCbits } = circuitData;
  const hasCbits = needsClassicalBits(circuitData);

  const lines = [];
  lines.push("# import qiskit and numpy");
  lines.push("from qiskit import QuantumCircuit");
  lines.push("import numpy as np");

  lines.push("");
  lines.push("# define registers");

  if (hasCbits) {
    const cbitCount = numCbits > 0 ? numCbits : numQubits;
    lines.push(`qc = QuantumCircuit(${numQubits}, ${cbitCount})`);
  } else {
    lines.push(`qc = QuantumCircuit(${numQubits})`);
  }

  lines.push("");
  lines.push("# apply gates");

  for (const op of circuitData.operations) {
    const gate = op.gate;
    const gateInfo = QuantumGates.get(gate);

    if (gate === "U_mat") {
      lines.push(formatUMatQiskit(op.qubits[0], op.rawParam || op.param));
      continue;
    }

    if (gate === "U") {
      lines.push(formatUQiskit(op.qubits[0], op.rawParam || op.param));
      continue;
    }

    // Measurement gate
    if (gate === "M") {
      // In circuit-model.js toOperations, standalone M on qubit q gives op.qubits = [q].
      // For M with linked classical bit, op.qubits = [q, cbit_absolute].
      // If no explicit cbit, measure to the same index.
      const qBit = op.qubits[0];
      const cBit = op.qubits.length > 1 ? op.qubits[1] : qBit + numQubits;
      if (qBit != null && cBit != null) {
        lines.push(`qc.measure(${qBit}, ${cBit - numQubits})`);
      }
      continue;
    }

    // Classically-controlled gates
    if (gate === "c-X" || gate === "c-Z") {
      const qBit = op.qubits.find(q => q < numQubits);
      const cBit = op.qubits.find(q => q >= numQubits);
      const baseGate = gate === "c-X" ? "x" : "z";
      if (qBit != null && cBit != null) {
        const clbitIndex = cBit - numQubits;
        lines.push(`with qc.if_test((qc.clbits[${clbitIndex}], 1)):`);
        lines.push(`    qc.${baseGate}(${qBit})`);
      }
      continue;
    }

    // MCX — special list-argument syntax
    if (gate === "MCX") {
      const controls = op.qubits.slice(0, -1);
      const target = op.qubits[op.qubits.length - 1];
      lines.push(`qc.mcx([${controls.join(", ")}], ${target})`);
      continue;
    }

    // Standard multi-qubit and single-qubit gates
    if (gateInfo && gateInfo.qiskit) {
      const activeParam = op.rawParam !== null ? op.rawParam : op.param;
      if (typeof gateInfo.qiskit === "function") {
        lines.push(`qc.${gateInfo.qiskit(op.qubits, paramToStr(activeParam))}`);
      } else if (gateInfo.param) {
        const angle = formatPythonAngle(activeParam);
        const qargs = op.qubits.join(", ");
        lines.push(`qc.${gateInfo.qiskit}(${angle}, ${qargs})`);
      } else {
        const qargs = op.qubits.join(", ");
        lines.push(`qc.${gateInfo.qiskit}(${qargs})`);
      }
    }
  }

  const mode = circuitData.mode || "exact";
  const shots = circuitData.shots || 1024;
  const hasMeasurements = circuitData.operations.some(op => op.gate === "M");
  const hasDynamicControlFlow = circuitData.operations.some(op => op.gate === "c-X" || op.gate === "c-Z");
  const breaksStatevector = hasMeasurements || hasDynamicControlFlow;

  // Simulation block — based on user's selected UI mode
  lines.push("");
  if (mode === "shots") {
    const prefix = !hasMeasurements ? "# " : "";

    lines.push("# import AerSimulator and simulate with shots");
    lines.push(`${prefix}from qiskit_aer import AerSimulator`);
    lines.push(`${prefix}backend = AerSimulator()`);
    lines.push(`${prefix}result = backend.run(qc, shots=${shots}).result()`);
    lines.push(`${prefix}counts = result.get_counts()`);
    lines.push(`${prefix}print("Counts:\\n", counts)`);
    lines.push("");
    if (!hasMeasurements) {
      lines.push("# Note: Shots simulation requires measurements to produce counts.");
    }
  } else {
    const prefix = breaksStatevector ? "# " : "";

    lines.push("# import Statevector and simulate with statevector");
    lines.push(`${prefix}from qiskit.quantum_info import Statevector`);
    lines.push(`${prefix}state = Statevector.from_instruction(qc)`);
    lines.push(`${prefix}print("Statevector:\\n", state)`);
    lines.push("");
    if (breaksStatevector) {
      if (hasMeasurements && hasDynamicControlFlow) {
        lines.push("# Note: Statevector cannot be computed due to the presence of measurement gates and dynamic control flow.");
      } else if (hasDynamicControlFlow) {
        lines.push("# Note: Statevector cannot be computed due to the presence of dynamic control flow (e.g., if_test).");
      } else {
        lines.push("# Note: Statevector cannot be computed due to the presence of measurement gates.");
      }
    }
  }

  return lines.join("\n");
}

// Format a U gate call: qc.u(theta, phi, lam, qubit)
function formatUQiskit(qubit, param) {
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
  return `qc.u(${theta}, ${phi}, ${lam}, ${qubit})`;
}

function formatComplexPython(c) {
  const r = Math.abs(c[0]) < 1e-7 ? 0 : c[0];
  const i = Math.abs(c[1]) < 1e-7 ? 0 : c[1];
  if (i === 0) return `${r}`;
  if (r === 0) return `${i}j`;
  return `(${r}${i >= 0 ? "+" : ""}${i}j)`;
}

// Format a U_mat gate call: qc.unitary(np.array(...), [qubit])
function formatUMatQiskit(qubit, param) {
  try {
    const raw = paramToStr(param);
    let p = {};
    if (raw.startsWith("{")) {
      p = JSON.parse(raw);
    }
    if (Array.isArray(p.matrix) && p.matrix.length === 4) {
      const row0 = `[${formatComplexPython(p.matrix[0])}, ${formatComplexPython(p.matrix[1])}]`;
      const row1 = `[${formatComplexPython(p.matrix[2])}, ${formatComplexPython(p.matrix[3])}]`;
      const label = p.name ? `, label="${p.name}"` : "";
      return `qc.unitary(np.array([${row0}, ${row1}]), [${qubit}]${label})`;
    }
  } catch {}
  return `qc.unitary(np.eye(2), [${qubit}])`;
}