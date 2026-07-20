// QUANTUM LABS — Quantum Gates
// Unified registry of all quantum gates.
//
// *** SINGLE SOURCE OF TRUTH ***
// To add a new gate, add ONE entry to GATES below.
// The palette, renderer, simulator, and exporter all read from here automatically.
//
// Each gate entry supports:
//   name         — Display name
//   type         — 'single' | 'multi' | 'measure'
//   param        — Whether gate takes a parameter (boolean)
//   targets      — Number of qubits for multi-qubit gates
//   matrix       — 2x2 complex matrix as flat array [[re,im], ...] (single-qubit fixed gates)
//   generator    — Function(theta) => { matrix, qubits } (parametric gates)
//   latex        — { matrix, symbol, ket } for KaTeX tooltip rendering
//   qiskit       — Qiskit method name or function(qubits, param) => string
//   cirq         — Cirq expression or function(qubits, param) => string
//
// Palette & UI (auto-generates sidebars)
//   palette      — { group, label, desc } — group: which accordion section, label: KaTeX symbol, desc: tooltip text
//                  Omit 'palette' to hide from palette (e.g. Identity gate)
//
// Renderer (auto-draws gate symbols on the grid)
//   render       — { control: 'dot'|'cross'|'swap', target: 'cross'|'dot'|'swap'|'box', connector: bool }
//                  For single-qubit gates, render is inferred from the gate name.
//                  For multi-qubit gates without a render entry, a plain label box is drawn.
//
// Engine (auto-dispatches simulation)
//   execute      — Function(state, qubits, param, ctx) => result
//                  ctx = { QuantumMath, QuantumGates, numQubits, cbits }
//                  Single-qubit gates with a matrix/generator do NOT need this (handled generically).

export const QuantumGates = (() => {
  "use strict";

  const SQRT2_INV = 1 / Math.sqrt(2);

  // Complex number helpers (shared with engine)
  const cmul = (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br];
  const cadd = (ar, ai, br, bi) => [ar + br, ai + bi];
  const cabs2 = (r, i) => r * r + i * i;

  // Parametric gate generators
  // X rotation gates
  function _Rx(theta) {
    const c = Math.cos(theta / 2),
      s = Math.sin(theta / 2);
    return {
      matrix: [
        [c, 0],
        [0, -s],
        [0, -s],
        [c, 0],
      ],
      qubits: 1,
    };
  }

  // Y rotation gates
  function _Ry(theta) {
    const c = Math.cos(theta / 2),
      s = Math.sin(theta / 2);
    return {
      matrix: [
        [c, 0],
        [-s, 0],
        [s, 0],
        [c, 0],
      ],
      qubits: 1,
    };
  }

  // Z rotation gates
  function _Rz(theta) {
    const c = Math.cos(theta / 2),
      s = Math.sin(theta / 2);
    return {
      matrix: [
        [c, -s],
        [0, 0],
        [0, 0],
        [c, s],
      ],
      qubits: 1,
    };
  }

  // U1 (Unitary Type 1): U(θ, φ, λ) — IBM-style general single-qubit gate
  // Matrix: [[cos(θ/2),  -e^(iλ)·sin(θ/2)],
  //          [e^(iφ)·sin(θ/2), e^(i(φ+λ))·cos(θ/2)]]
  function _U1(param) {
    // param is a JSON string: '{"theta":...,"phi":...,"lambda":...}'
    let theta = 0,
      phi = 0,
      lambda = 0;
    try {
      let p = {};
      if (typeof param === "string") {
        if (param.startsWith("{")) {
          p = JSON.parse(param);
        } else {
          const parts = param.split("|");
          p = { name: parts[0], theta: parts[1], phi: parts[2], lambda: parts[3] };
        }
      } else {
        p = param || {};
      }
      theta = parseAngle(p.theta ?? 0);
      phi = parseAngle(p.phi ?? 0);
      lambda = parseAngle(p.lambda ?? 0);
    } catch (e) {
      // default to identity
    }

    const cosH = Math.cos(theta / 2);
    const sinH = Math.sin(theta / 2);

    return {
      matrix: [
        [cosH, 0], // [0,0] real, imag
        [-Math.cos(lambda) * sinH, -Math.sin(lambda) * sinH], // [0,1]
        [Math.cos(phi) * sinH, Math.sin(phi) * sinH], // [1,0]
        [Math.cos(phi + lambda) * cosH, Math.sin(phi + lambda) * cosH], // [1,1]
      ],
      qubits: 1,
    };
  }

  // Angle parser
  function parseAngle(param) {
    if (typeof param === "number") {
      return param;
    }
    if (!param) {
      return 0;
    }
    let s = String(param).trim().toLowerCase().replace(/\s+/g, "");

    let sign = 1;
    if (s.startsWith("-")) {
      sign = -1;
      s = s.substring(1);
    }

    let hasPi = false;
    let isDeg = false;

    s = s.replace(/°|deg/g, () => {
      isDeg = true;
      return "";
    });
    s = s.replace(/pi|π/g, () => {
      hasPi = true;
      return "";
    });
    if (s === "" || s.startsWith("/")) {
      s = `1${s}`;
    }
    s = s.replace(/\*$/, "");

    let val = 0;
    if (s.includes("/")) {
      const parts = s.split("/");
      val = (parseFloat(parts[0]) || 1) / (parseFloat(parts[1]) || 1);
    } else {
      val = parseFloat(s);
      if (isNaN(val)) {
        val = 1;
      }
    }

    if (hasPi) {
      val *= Math.PI;
    }
    if (isDeg) {
      val *= Math.PI / 180;
    }

    return sign * val;
  }

  //  GATE REGISTRY
  //  To add a new gate, add one object here — that's it.
  const GATES = {
    // Single-qubit fixed gates
    // Hadamard gate
    H: {
      name: "Hadamard",
      type: "single",
      param: false,
      matrix: [
        [SQRT2_INV, 0],
        [SQRT2_INV, 0],
        [SQRT2_INV, 0],
        [-SQRT2_INV, 0],
      ],
      latex: {
        matrix:
          "\\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}",
        symbol: "\\mathbf{H}",
        ket: "|0\\rangle \\to |+\\rangle,\\; |1\\rangle \\to |-\\rangle",
      },
      qiskit: "h",
      cirq: "H",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{H}",
        desc: "Creates superposition",
      },
    },
    // Pauli-X gate
    X: {
      name: "Pauli-X",
      type: "single",
      param: false,
      matrix: [
        [0, 0],
        [1, 0],
        [1, 0],
        [0, 0],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}",
        symbol: "\\mathbf{X}",
        ket: "|0\\rangle \\leftrightarrow |1\\rangle",
      },
      qiskit: "x",
      cirq: "X",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{X}",
        desc: "Bit flip (NOT gate)",
      },
    },
    // Pauli-Y gate
    Y: {
      name: "Pauli-Y",
      type: "single",
      param: false,
      matrix: [
        [0, 0],
        [0, -1],
        [0, 1],
        [0, 0],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 0 & -i \\\\ i & 0 \\end{pmatrix}",
        symbol: "\\mathbf{Y}",
        ket: "|0\\rangle \\to i|1\\rangle,\\; |1\\rangle \\to -i|0\\rangle",
      },
      qiskit: "y",
      cirq: "Y",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{Y}",
        desc: "Y rotation, combines bit and phase flip",
      },
    },
    // Pauli-Z gate
    Z: {
      name: "Pauli-Z",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [-1, 0],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}",
        symbol: "\\mathbf{Z}",
        ket: "|1\\rangle \\to -|1\\rangle",
      },
      qiskit: "z",
      cirq: "Z",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{Z}",
        desc: "Phase flip",
      },
    },
    // Phase gate
    S: {
      name: "Phase",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [0, 1],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 1 & 0 \\\\ 0 & i \\end{pmatrix}",
        symbol: "\\mathbf{S}",
        ket: "|1\\rangle \\to i|1\\rangle",
      },
      qiskit: "s",
      cirq: "S",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{S}",
        desc: "Phase gate",
      },
    },
    // T gate
    T: {
      name: "T Gate",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 1 & 0 \\\\ 0 & e^{i\\pi/4} \\end{pmatrix}",
        symbol: "\\mathbf{T}",
        ket: "|1\\rangle \\to e^{i\\pi/4}|1\\rangle",
      },
      qiskit: "t",
      cirq: "T",
      palette: { group: "Single Qubit", label: "\\mathbf{T}", desc: "T gate" },
    },
    // S-dagger gate
    Sdg: {
      name: "S-dagger",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [0, -1],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 1 & 0 \\\\ 0 & -i \\end{pmatrix}",
        symbol: "\\mathbf{S}^\\dagger",
        ket: "|1\\rangle \\to -i|1\\rangle",
      },
      qiskit: "sdg",
      cirq: "S**-1",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{S}^\\dagger",
        desc: "S-dagger gate (inverse of S)",
      },
    },
    // T-dagger gate
    Tdg: {
      name: "T-dagger",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4)],
      ],
      latex: {
        matrix: "\\begin{pmatrix} 1 & 0 \\\\ 0 & e^{-i\\pi/4} \\end{pmatrix}",
        symbol: "\\mathbf{T}^\\dagger",
        ket: "|1\\rangle \\to e^{-i\\pi/4}|1\\rangle",
      },
      qiskit: "tdg",
      cirq: "T**-1",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{T}^\\dagger",
        desc: "T-dagger gate (inverse of T)",
      },
    },

    // Single-qubit parametric gates
    // X rotation gates
    Rx: {
      name: "Rotation-X",
      type: "single",
      param: true,
      generator: _Rx,
      latex: {
        matrix:
          "\\begin{pmatrix} \\cos\\frac{\\theta}{2} & -i\\sin\\frac{\\theta}{2} \\\\ -i\\sin\\frac{\\theta}{2} & \\cos\\frac{\\theta}{2} \\end{pmatrix}",
        symbol: "\\mathbf{R}_x(\\theta)",
        ket: "e^{-i\\theta\\mathbf{X}/2}",
      },
      qiskit: "rx",
      cirq: "rx",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{R}_x",
        desc: "Rotation around X axis",
      },
    },
    // Y rotation gates
    Ry: {
      name: "Rotation-Y",
      type: "single",
      param: true,
      generator: _Ry,
      latex: {
        matrix:
          "\\begin{pmatrix} \\cos\\frac{\\theta}{2} & -\\sin\\frac{\\theta}{2} \\\\ \\sin\\frac{\\theta}{2} & \\cos\\frac{\\theta}{2} \\end{pmatrix}",
        symbol: "\\mathbf{R}_y(\\theta)",
        ket: "e^{-i\\theta\\mathbf{Y}/2}",
      },
      qiskit: "ry",
      cirq: "ry",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{R}_y",
        desc: "Rotation around Y axis",
      },
    },
    // Z rotation gates
    Rz: {
      name: "Rotation-Z",
      type: "single",
      param: true,
      generator: _Rz,
      latex: {
        matrix:
          "\\begin{pmatrix} e^{-i\\theta/2} & 0 \\\\ 0 & e^{i\\theta/2} \\end{pmatrix}",
        symbol: "R_z(\\theta)",
        ket: "e^{-i\\theta\\sigma_z/2}",
      },
      qiskit: "rz",
      cirq: "rz",
      palette: {
        group: "Single Qubit",
        label: "\\mathbf{R}_z",
        desc: "Rotation around Z axis",
      },
    },
    // Multi-qubit gates
    // CNOT gate
    CNOT: {
      name: "CNOT",
      type: "multi",
      targets: 2,
      param: false,
      latex: {
        matrix:
          "\\begin{pmatrix} 1&0&0&0 \\\\ 0&1&0&0 \\\\ 0&0&0&1 \\\\ 0&0&1&0 \\end{pmatrix}",
        symbol: "\\mathbf{CX}",
        ket: "|c,t\\rangle \\to |c, c \\oplus t\\rangle",
      },
      qiskit: "cx",
      cirq: "CNOT",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CX}",
        desc: "Controlled-NOT",
      },
      render: { control: "dot", target: "cross", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyCNOT(state, qubits[0], qubits[1]),
    },
    // CZ gate
    CZ: {
      name: "Control-Z",
      type: "multi",
      targets: 2,
      param: false,
      latex: {
        matrix:
          "\\begin{pmatrix} 1&0&0&0 \\\\ 0&1&0&0 \\\\ 0&0&1&0 \\\\ 0&0&0&-1 \\end{pmatrix}",
        symbol: "\\mathbf{CZ}",
        ket: "|11\\rangle \\to -|11\\rangle",
      },
      qiskit: "cz",
      cirq: "CZ",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CZ}",
        desc: "Controlled-Z",
      },
      render: { control: "dot", target: "dot", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyCZ(state, qubits[0], qubits[1]),
    },
    // CY gate
    CY: {
      name: "Ctrl-Y",
      type: "multi",
      targets: 2,
      param: false,
      latex: {
        matrix: null,
        symbol: "\\mathbf{CY}",
        ket: "|c,t\\rangle \\to |c, Y_t\\rangle",
      },
      qiskit: "cy",
      cirq: "CY",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CY}",
        desc: "Controlled-Y",
      },
      render: { control: "dot", target: "\\mathbf{Y}", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyCNOT(state, qubits[0], qubits[1]), // replace with applyCY once implemented
    },
    // SWAP gate
    SWAP: {
      name: "SWAP",
      type: "multi",
      targets: 2,
      param: false,
      latex: {
        matrix:
          "\\begin{pmatrix} 1&0&0&0 \\\\ 0&0&1&0 \\\\ 0&1&0&0 \\\\ 0&0&0&1 \\end{pmatrix}",
        symbol: "\\mathbf{SWAP}",
        ket: "|a,b\\rangle \\to |b,a\\rangle",
      },
      qiskit: "swap",
      cirq: "SWAP",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{SWAP}",
        desc: "Swaps two qubits",
      },
      render: { control: "swap", target: "swap", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applySWAP(state, qubits[0], qubits[1]),
    },
    // Toffoli gate
    Toffoli: {
      name: "Toffoli",
      type: "multi",
      targets: 3,
      param: false,
      latex: {
        matrix: "\\text{8x8 Toffoli Matrix}",
        symbol: "\\mathbf{CCX}",
        ket: "|c_1,c_2,t\\rangle \\to |c_1,c_2, c_1 c_2 \\oplus t\\rangle",
      },
      qiskit: "ccx",
      cirq: "CCNOT",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CCX}",
        desc: "CCX — double-controlled NOT",
      },
      render: { control: "dot", target: "cross", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyToffoli(state, qubits[0], qubits[1], qubits[2]),
    },
    // Multi-controlled X gate
    MCX: {
      name: "Multi-Controlled X",
      type: "multi",
      targets: "variable",
      param: false,
      latex: {
        matrix: "\\text{Variable size MCX Matrix}",
        symbol: "\\mathbf{MCX}",
        ket: "|c_1...c_n, t\\rangle \\to |c_1...c_n, (c_1...c_n) \\oplus t\\rangle",
      },
      qiskit: "mcx",
      cirq: "ControlledGate",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{MCX}",
        desc: "Multi-controlled NOT gate. Click multiple controls, then click the final target twice to finish.",
      },
      render: { control: "dot", target: "cross", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyMCX(state, qubits),
    },
    // CSWAP gate
    CSWAP: {
      name: "CSWAP (Fredkin)",
      type: "multi",
      targets: 3,
      param: false,
      latex: {
        matrix: "\\text{8x8 Fredkin Matrix}",
        symbol: "\\mathbf{CSWAP}",
        ket: "|1,t_1,t_2\\rangle \\to |1,t_2,t_1\\rangle",
      },
      qiskit: "cswap",
      cirq: "CSWAP",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CSWAP}",
        desc: "Controlled-SWAP (Fredkin)",
      },
      render: { control: "dot", target: "swap", connector: true },
      execute: (state, qubits, _p, { QuantumMath }) =>
        QuantumMath.applyCSWAP(state, qubits[0], qubits[1], qubits[2]),
    },
    // CPhase gate
    CP: {
      name: "CPhase",
      type: "multi",
      targets: 2,
      param: true,
      latex: {
        matrix:
          "\\begin{pmatrix} 1&0&0&0 \\\\ 0&1&0&0 \\\\ 0&0&1&0 \\\\ 0&0&0&e^{i\\theta} \\end{pmatrix}",
        symbol: "\\mathbf{CP}(\\theta)",
        ket: "|11\\rangle \\to e^{i\\theta}|11\\rangle",
      },
      qiskit: "cp",
      cirq: "CZPowGate",
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{CP}",
        desc: "Controlled-Phase",
      },
      render: { control: "dot", target: "\\mathbf{P}", connector: true },
      execute: (state, qubits, param, { QuantumMath, QuantumGates }) =>
        QuantumMath.applyCP(
          state,
          qubits[0],
          qubits[1],
          QuantumGates.parseAngle(param),
        ),
    },

    // Measurement
    M: {
      name: "Measure",
      // type='multi' so the drag-drop multi-gate flow handles qubit→cbit selection.
      // quantumTargets=1 tells updateQubitDisplay only 1 quantum wire is needed
      // (vs targets=2 which includes the classical bit).
      type: "multi",
      targets: 2,
      quantumTargets: 1,
      param: false,
      latex: {
        matrix: null,
        symbol: "\\mathcal{M}",
        ket: "P(|k\\rangle) = |\\langle k|\\psi\\rangle|^2",
      },
      qiskit: null,
      cirq: null,
      palette: {
        group: "Measurement",
        label: "\\mathcal{M}",
        desc: "Measure in computational basis",
      },
      render: { control: "meter", target: "cbit-dot", connector: true },
      execute: (state, qubits, _p, { QuantumMath, cbits, numQubits }) => {
        const q = qubits[0] < numQubits ? qubits[0] : qubits[1];
        const c = qubits[0] >= numQubits ? qubits[0] : qubits[1];
        const res = QuantumMath.measure(state, q);
        cbits[c - numQubits] = res;
        return res; // engine records this as a measurement result
      },
    },

    // Classically-controlled gates
    // C-X gate (classical control of quantum target)
    "c-X": {
      name: "c-X",
      type: "multi",
      targets: 2,
      quantumTargets: 1,
      param: false,
      latex: {
        matrix: null,
        symbol: "c\\text{-}X",
        ket: "\\text{if } c{=}1:\\; X|q\\rangle",
      },
      qiskit: null,
      cirq: null,
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{c\\text{-}X}",
        desc: "Classical-Controlled X",
      },
      render: { control: "cbit-dot", target: "\\mathbf{X}", connector: true },
      execute: (
        state,
        qubits,
        _p,
        { QuantumMath, QuantumGates, cbits, numQubits },
      ) => {
        const c = qubits[0] >= numQubits ? qubits[0] : qubits[1];
        const q = qubits[0] < numQubits ? qubits[0] : qubits[1];
        if (cbits[c - numQubits] === 1) {
          QuantumMath.apply2x2Matrix(
            state,
            QuantumGates.getMatrix("X", null).matrix,
            q,
          );
        }
      },
    },
    // C-Z gate (classical control of quantum target)
    "c-Z": {
      name: "c-Z",
      type: "multi",
      targets: 2,
      quantumTargets: 1,
      param: false,
      latex: {
        matrix: null,
        symbol: "c\\text{-}Z",
        ket: "\\text{if } c{=}1:\\; Z|q\\rangle",
      },
      qiskit: null,
      cirq: null,
      palette: {
        group: "Multi Qubit",
        label: "\\mathbf{c\\text{-}Z}",
        desc: "Classical-Controlled Z",
      },
      render: { control: "cbit-dot", target: "\\mathbf{Z}", connector: true },
      execute: (
        state,
        qubits,
        _p,
        { QuantumMath, QuantumGates, cbits, numQubits },
      ) => {
        const c = qubits[0] >= numQubits ? qubits[0] : qubits[1];
        const q = qubits[0] < numQubits ? qubits[0] : qubits[1];
        if (cbits[c - numQubits] === 1) {
          QuantumMath.apply2x2Matrix(
            state,
            QuantumGates.getMatrix("Z", null).matrix,
            q,
          );
        }
      },
    },
    // Identity (internal use)
    I: {
      name: "Identity",
      type: "single",
      param: false,
      matrix: [
        [1, 0],
        [0, 0],
        [0, 0],
        [1, 0],
      ],
      latex: null,
      qiskit: "id",
      cirq: "I",
    },

    // Custom Gates
    // u1 gate (single-qubit general unitary)
    U1: {
      name: "Unitary Type 1",
      type: "single",
      param: true,
      paramType: "u1", // signals the UI to show the 3-angle popover
      generator: _U1,
      latex: {
        matrix: "U(\\theta,\\phi,\\lambda)",
        symbol: "\\mathbf{U}_1(\\theta,\\phi,\\lambda)",
        ket: "\\text{General single-qubit unitary}",
      },
      qiskit: (qubits, param) => {
        try {
          const p = JSON.parse(param);
          return `u(${p.theta ?? 0}, ${p.phi ?? 0}, ${p.lambda ?? 0}, q[${qubits[0]}])`;
        } catch {
          return `u(0, 0, 0, q[${qubits[0]}])`;
        }
      },
      cirq: "MatrixGate",
      palette: {
        group: "Custom",
        label: "\\mathbf{U}_1",
        desc: "General single-qubit unitary gate (θ, φ, λ)",
      },
    },
    // u2 gate (multi-qubit general unitary)
    U2: {
      name: "Unitary Type 2",
      type: "multi",
      targets: "span",
      param: true,
      paramType: "u2", // Signals the UI to show the mini-circuit modal
      generator: null, // Custom math logic will be handled later
      latex: {
        matrix: "U",
        symbol: "\\mathbf{U}_2",
        ket: "\\text{Compressed Sub-Circuit}",
      },
      qiskit: null, // To be handled later by unroller
      cirq: null, // To be handled later by unroller
      palette: {
        group: "Custom",
        label: "\\mathbf{U}_2",
        desc: "Compressed multi-qubit sub-circuit",
      },
    },
  };

  // Convenience getters

  // Get gate entry by name
  function get(gateName) {
    return GATES[gateName] || null;
  }

  // Get the simulation matrix for a gate (handles parametric)
  function getMatrix(gateName, param) {
    const g = GATES[gateName];
    if (!g) {
      return null;
    }
    if (g.generator) {
      if (g.paramType === "u1") {
        return g.generator(param);
      }
      return g.generator(parseAngle(param));
    }
    if (g.matrix) {
      return { matrix: g.matrix, qubits: 1 };
    }
    return null;
  }

  // Check if a gate is known
  function has(gateName) {
    return gateName in GATES;
  }

  // Get all gate names
  function names() {
    return Object.keys(GATES);
  }

  return {
    GATES,
    get,
    getMatrix,
    has,
    names,
    parseAngle,
    // Expose generators for direct use
    Rx: _Rx,
    Ry: _Ry,
    Rz: _Rz,
    // Expose math helpers for engine
    cmul,
    cadd,
    cabs2,
    SQRT2_INV,
  };
})();
