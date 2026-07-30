// QUANTUM LABS — Examples
// Controller logic for the Examples page.

import { AppState } from "../core/app-state.js";
import { GateMath } from "../core/math-renderer.js";
import { Icons } from "../core/ui-icons.js";
import { UI } from "../core/ui-helpers.js";
import { restoreFromUrl } from "../core/url-manager.js";

export const ExamplesPage = (() => {
  "use strict";

  let activeTab = "circuit";

  const CIRCUIT_EXAMPLES = [
    {
      name: "Bell State",
      url: "?qubits=2&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;1:0,1:CNOT:",
      desc: () =>
        `The simplest entangled state. Apply Hadamard to ${GateMath.toHTML("|q_0\\rangle")}, then CNOT to entangle ${GateMath.toHTML("|q_0\\rangle")} and ${GateMath.toHTML("|q_1\\rangle")}. Measurement outcomes are always correlated.`,
      qubits: 2,
      preview: [
        ["H", "●"],
        ["", "CX"],
      ],
      tags: ["Entanglement", "2 Qubits"],
    },
    {
      name: "GHZ State",
      url: "?qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;1:0,1:CNOT:;2:1,2:CNOT:",
      desc: () =>
        "Greenberger–Horne–Zeilinger (GHZ) state. Maximally entangled 3-qubit state — a generalization of the Bell state.",
      qubits: 3,
      preview: [
        ["H", "●", ""],
        ["", "CX", "●"],
        ["", "", "CX"],
      ],
      tags: ["Entanglement", "3 Qubits"],
    },
    {
      name: "Equal Superposition",
      url: "?qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;0:1:H:;0:2:H:",
      desc: () =>
        "Apply Hadamard to all qubits to create an equal superposition of all computational basis states.",
      qubits: 3,
      preview: [["H"], ["H"], ["H"]],
      tags: ["Superposition", "3 Qubits"],
    },
    {
      name: "Superdense Coding",
      url: "?qubits=2&cbits=2&steps=8&mode=exact&shots=0&gates=0:0:H:;1:0,1:CNOT:;2:0:X:;3:0:Z:;4:0,1:CNOT:;5:0:H:;6:0,2:M:;6:1,3:M:",
      desc: () =>
        "Alice transmits two classical bits of information (\"11\") to Bob using only one quantum bit, leveraging their shared entangled Bell state.",
      tip: () =>
        `The ${GateMath.toHTML("\\mathbf{Z}")} and ${GateMath.toHTML("\\mathbf{X}")} gates encodes the first and second bit (flips 0 to 1). Applying both encodes the message "11"!`,
      qubits: 2,
      preview: [
        ["H", "●", "X", "Z", "●", "H"],
        ["", "CX", "", "", "CX", ""],
      ],
      tags: ["Communication", "2 Qubits"],
    },
    {
      name: "Quantum Teleportation",
      url: "?qubits=3&cbits=2&steps=8&mode=exact&shots=0&gates=0:0:Rx:π/3;0:1:H:;1:1,2:CNOT:;2:0,1:CNOT:;3:0:H:;4:0,3:M:;4:1,4:M:;5:2,4:c-X:;6:2,3:c-Z:",
      desc: () =>
        `Alice teleports an unknown quantum state (${GateMath.toHTML("\\mathbf{R}_x")}) to Bob by measuring her qubits and sending the classical results to Bob, who applies conditional corrections.`,
      tip: () =>
        `Use the <strong>Step</strong> playback to observe the initial state of ${GateMath.toHTML("q_0")} and compare it to the final state of ${GateMath.toHTML("q_2")} after the classical ${GateMath.toHTML("c\\text{-}\\mathbf{X}")} and ${GateMath.toHTML("c\\text{-}\\mathbf{Z}")} corrections!`,
      qubits: 3,
      preview: [
        ["Rx", "", "", "●", "H", "M"],
        ["", "H", "●", "CX", "", "M"],
        ["", "", "CX", "", "", ""],
      ],
      tags: ["Teleportation", "3 Qubits"],
    },
    {
      name: "Grover Search",
      url: "?qubits=6&cbits=5&steps=12&mode=shots&shots=1024&gates=0:5:X:;1:0:H:;1:1:H:;1:2:H:;1:3:H:;1:4:H:;1:5:H:;2:0,1,2,3,4,5:MCX:;3:0:H:;3:1:H:;3:2:H:;3:3:H:;3:4:H:;4:0:X:;4:1:X:;4:2:X:;4:3:X:;4:4:X:;5:4:H:;6:0,1,2,3,4:MCX:;7:4:H:;8:0:X:;8:1:X:;8:2:X:;8:3:X:;8:4:X:;9:0:H:;9:1:H:;9:2:H:;9:3:H:;9:4:H:;10:0,6:M:;10:1,7:M:;10:2,8:M:;10:3,9:M:;10:4,10:M:",
      desc: () =>
        `A 5-qubit Grover's Search algorithm with 1 ancilla. The Oracle is tuned to find the state ${GateMath.toHTML("|11111\\rangle")} out of 32 possible combinations.`,
      tip: () =>
        "Run this in <strong>Shots</strong> mode to observe the probability spike for the target state!",
      qubits: 6,
      preview: [
        ["", "H", "●", "H", "X", "", "●", "", "X", "H", "M"],
        ["", "H", "●", "H", "X", "H", "CX", "H", "X", "H", "M"],
        ["X", "H", "CX", "", "", "", "", "", "", "", ""],
      ],
      tags: ["Search Algorithm", "6 Qubits"],
    },
    {
      name: "Quantum Fourier Transform",
      url: "?qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:H:;1:1,0:CP:π/2;2:2,0:CP:π/4;3:1:H:;4:2,1:CP:π/2;5:2:H:;6:0,2:SWAP:",
      desc: () =>
        "The Quantum Fourier Transform (QFT) is a critical sub-routine in many advanced quantum algorithms. It changes the computational basis into the Fourier basis using Hadamards and Controlled-Phase rotations.",
      tip: () =>
        `Try changing the input state by adding an ${GateMath.toHTML("\\mathbf{X}")} gate before the QFT. Watch how the basis state is transformed into a specific frequency (phase gradient) across the qubits!`,
      qubits: 3,
      preview: [
        ["H", "CP", "CP", "", "", "", "SWAP"],
        ["", "●", "", "H", "CP", "", ""],
        ["", "", "●", "", "●", "H", "SWAP"],
      ],
      tags: ["Algorithm", "3 Qubits"],
    },
    {
      name: "Quantum Phase Estimation",
      url: "?qubits=4&cbits=3&steps=13&mode=exact&shots=0&gates=0:3:X:;1:0:H:;1:1:H:;1:2:H:;2:2,3:CP:π/4;3:1,3:CP:π/2;4:0,3:CP:π;5:0,2:SWAP:;6:2:H:;7:2,1:CP:-π/2;8:1:H:;9:2,0:CP:-π/4;10:1,0:CP:-π/2;11:0:H:;12:0,4:M:;12:1,5:M:;12:2,6:M:",
      desc: () =>
        "Estimates the phase of a Unitary operator. The bottom qubit is prepared as the target eigenstate, while the top qubits apply controlled powers of a Phase gate to measure its eigenvalue, finishing with an inverse QFT.",
      tip: () =>
        `Hover over the ${GateMath.toHTML("\\mathbf{P}")} gates in the simulator to see how their angles scale geometrically (${GateMath.toHTML("\\pi/4")}, ${GateMath.toHTML("\\pi/2")}, ${GateMath.toHTML("\\pi")}) to measure the phase bit by bit!`,
      qubits: 4,
      preview: [
        ["H", "", "●", "SWAP", "", "●", "H", "M"],
        ["H", "●", "", "SWAP", "H", "CP", "", "M"],
        ["X", "CP", "CP", "", "", "", "", ""],
      ],
      tags: ["Algorithm", "4 Qubits"],
    },
    {
      name: "Variational Ansatz (VQE)",
      url: "?qubits=2&cbits=2&steps=5&mode=exact&shots=0&gates=0:0:Rx:π/2;0:1:Rx:π/2;1:0,1:CNOT:;2:0:Ry:π/4;2:1:Ry:-π/4;4:0,2:M:;4:1,3:M:",
      desc: () =>
        "A simple hardware-efficient parameterized quantum circuit. The Variational Quantum Eigensolver uses classical optimizers to tune these parameters to find molecular ground states.",
      tip: () =>
        `Try tweaking the parameters of the ${GateMath.toHTML("\\mathbf{R}_x")} and ${GateMath.toHTML("\\mathbf{R}_y")} gates to see how the final expectation value changes. In a real VQE, a classical computer does this tuning automatically!`,
      qubits: 2,
      preview: [
        ["Rx", "●", "Ry", "M"],
        ["Rx", "CX", "Ry", "M"],
      ],
      tags: ["Variational", "2 Qubits"],
    },
    {
      name: "Quantum Random Walk",
      url: "?qubits=3&cbits=2&steps=7&mode=shots&shots=1024&gates=0:0:H:;1:0,2,1:Toffoli:;2:0,2:CNOT:;3:0:H:;4:0,2,1:Toffoli:;5:0,2:CNOT:;6:1,3:M:;6:2,4:M:",
      desc: () =>
        `A quantum analog to the classical random walk. A coin qubit (${GateMath.toHTML("q_0")}) is tossed into superposition, and conditionally controls a shift operator moving the walker's position left or right.`,
      tip: () =>
        "Run this circuit using <strong>Shots</strong> mode. You'll notice the probability distribution of the walker's position is highly asymmetrical, unlike a classical random walk!",
      qubits: 3,
      preview: [
        ["H", "●", "●", "H", "●", "●", ""],
        ["", "●", "", "", "●", "", "M"],
        ["", "CX", "CX", "", "CX", "CX", "M"],
      ],
      tags: ["Simulation", "3 Qubits"],
    },
    {
      name: "W State",
      url: "?qubits=3&cbits=0&steps=8&mode=exact&shots=0&gates=0:0:Ry:1.9106;1:1:Ry:0.7854;2:0,1:CNOT:;3:1:Ry:-0.7854;4:0,1:CNOT:;5:1,2:CNOT:;6:0,1:CNOT:;7:0:X:",
      desc: () =>
        `A 3-qubit entangled state where exactly one qubit is in the ${GateMath.toHTML("|1\\rangle")} state. Unlike GHZ, it is robust against particle loss.`,
      tip: () =>
        `We use a combination of ${GateMath.toHTML("\\mathbf{R}_y")} rotations and ${GateMath.toHTML("\\mathbf{CNOT}")} gates to meticulously distribute the amplitude evenly across the three qubits!`,
      qubits: 3,
      preview: [
        ["Rx", "", "●", "", "●", "", "●", "X"],
        ["", "Rx", "CX", "Rx", "CX", "●", "CX", ""],
        ["", "", "", "", "", "CX", "", ""],
      ],
      tags: ["Entanglement", "3 Qubits"],
    },
  ];

  const QECC_EXAMPLES = [
    {
      name: "[[3,1,1]] Bit-flip Codes",
      url: "?pcm=gf2&type=non-css&hx=0+0+0%0A0+0+0&hz=1+1+0%0A0+1+1",
      desc: () => "A foundational quantum error-correcting code that protects quantum information from bit-flip errors. It functions as a repetition code to independently correct these errors, helping to simulate a noiseless qubit channel from a noisy one.",
      preview: "0 0 0\n0 0 0\n\n1 1 0\n0 1 1",
      tags: ["Non-CSS", "3 Qubits", "Distance 1"],
    },
    {
      name: "[[7,1,3]] Steane Codes",
      url: "?pcm=gf2&type=dual-css&hx=1+0+0+1+0+1+1%0A0+1+0+1+1+0+1%0A0+0+1+0+1+1+1",
      desc: () => "Introduced by Andrew Steane in 1996, this CSS (Calderbank-Shor-Steane) code uses the classical binary [7,4,3] Hamming code to correct for both qubit flip errors and phase flip errors. It encodes one logical qubit into seven physical qubits to correct arbitrary single-qubit errors.",
      preview: "1 0 0 1 0 1 1\n0 1 0 1 1 0 1\n0 0 1 0 1 1 1",
      tags: ["Dual CSS", "7 Qubits", "Distance 3"],
    },
    {
      name: "[[9,1,3]] Shor Codes",
      url: "?pcm=gf2&type=nondual-css&hx=1+1+1+1+1+1+0+0+0%0A0+0+0+1+1+1+1+1+1&hz=1+1+0+0+0+0+0+0+0%0A0+1+1+0+0+0+0+0+0%0A0+0+0+1+1+0+0+0+0%0A0+0+0+0+1+1+0+0+0%0A0+0+0+0+0+0+1+1+0%0A0+0+0+0+0+0+0+1+1",
      desc: () => "Introduced by Peter Shor in 1995, this was the first quantum error-correcting code. It encodes a single logical qubit into a system of nine physical qubits, allowing for the simultaneous correction of bit-flip, phase-flip, or joint errors on any single physical qubit.",
      preview: "1 1 1 1 1 1 0 0 0\n0 0 0 1 1 1 1 1 1\n\n1 1 0 0 0 0 0 0 0\n0 1 1 0 0 0 0 0 0\n    \\vdots    \n0 0 0 0 0 0 1 1 0\n0 0 0 0 0 0 0 1 1",
      tags: ["Non-Dual CSS", "9 Qubits", "Distance 3"],
    },
    {
      name: "[[5,1,3]] Perfect Codes",
      url: "?pcm=gf4&type=custom&h=1+w+w+1+0%0A0+1+w+w+1%0A1+0+1+w+w%0Aw+1+0+1+w",
      desc: () => "Also known as the Laflamme–Miquel–Paz–Zurek code, this is the smallest quantum error-correcting code capable of protecting a logical qubit from any arbitrary single-qubit error. It uses exactly five physical qubits to encode one logical qubit.",
      preview: "1 w w 1 0\n0 1 w w 1\n1 0 1 w w\nw 1 0 1 w",
      tags: ["Custom", "5 Qubits", "Distance 3"],
    },
    {
      name: "[[8,3,3]] Gottesman Codes",
      url: "?pcm=gf4&type=custom&h=1+w2+w2+1+w+0+0+w%0Aw+1+0+w+1+0+w+w%0A1+w+w+0+0+1+w+w%0Aw2+0+w2+w+0+w+1+w%0Aw2+w+1+0+w+w+0+w2",
      desc: () => "A non-degenerate quantum stabilizer code that efficiently encodes three logical qubits into eight physical qubits. It is uniquely built using a modified CSS construction derived from the classical [8,4,4] extended Hamming code.",
      preview: "1 w2 w2 1 w 0 0 w\nw 1 0 w 1 0 w w\n1 w w 0 0 1 w w\nw2 0 w2 w 0 w 1 w\nw2 w 1 0 w w 0 w2",
      tags: ["Custom", "8 Qubits", "Distance 3"],
    },
    {
      name: "[[4,2,2]] Quantum Codes",
      url: "?pcm=gf2&type=dual-css&hx=1+1+1+1",
      desc: () => "The smallest quantum error-detecting code. While it cannot correct arbitrary single-qubit errors, it can reliably detect them, making it a foundational building block in fault-tolerant state preparation protocols.",
      preview: "1 1 1 1",
      tags: ["Dual CSS", "4 Qubits", "Distance 2"],
    },
    {
      name: "[[15,7,3]] Quantum BCH Codes",
      url: "?pcm=gf2&type=dual-css&hx=0+0+0+0+0+0+0+1+1+1+1+1+1+1+1%0A0+0+0+1+1+1+1+0+0+0+0+1+1+1+1%0A0+1+1+0+0+1+1+0+0+1+1+0+0+1+1%0A1+0+1+0+1+0+1+0+1+0+1+0+1+0+1",
      desc: () => "The smallest example of the Quantum BCH family, constructed by applying the CSS framework to classical BCH codes. Its stabilizer generators can be systematically constructed to guarantee a predetermined minimum distance.",
      preview: "0 0 0 0 0 0 0 1 1 1 1 1 1 1 1\n0 0 0 1 1 1 1 0 0 0 0 1 1 1 1\n0 1 1 0 0 1 1 0 0 1 1 0 0 1 1\n1 0 1 0 1 0 1 0 1 0 1 0 1 0 1",
      tags: ["Dual CSS", "15 Qubits", "Distance 3"],
    },
    {
      name: "[[15,1,3]] Quantum Reed-Muller Codes",
      url: "?pcm=gf2&type=nondual-css&hx=0+0+0+0+0+0+0+1+1+1+1+1+1+1+1%0A0+0+0+1+1+1+1+0+0+0+0+1+1+1+1%0A0+1+1+0+0+1+1+0+0+1+1+0+0+1+1%0A1+0+1+0+1+0+1+0+1+0+1+0+1+0+1&hz=1+1+0+1+0+0+1+0+0+0+0+0+0+0+0%0A1+1+0+0+0+0+0+1+0+0+1+0+0+0+0%0A1+0+0+1+0+0+0+1+0+0+0+0+1+0+0%0A0+1+0+1+0+0+0+1+0+0+0+0+0+1+0%0A0+1+1+1+1+0+0+0+0+0+0+0+0+0+0%0A1+0+1+1+0+1+0+0+0+0+0+0+0+0+0%0A0+1+1+0+0+0+0+1+1+0+0+0+0+0+0%0A1+0+1+0+0+0+0+1+0+1+0+0+0+0+0%0A1+1+1+1+0+0+0+1+0+0+0+1+0+0+0%0A0+0+1+1+0+0+0+1+0+0+0+0+0+0+1",
      desc: () => "A famous CSS code heavily studied in fault-tolerant quantum computing because its algebraic structure natively supports a transversal T gate, a crucial requirement for universal quantum computation.",
      preview: "0 0 0 0 0 0 0 1 1 1 1 1 1 1 1\n       \\vdots       \n1 0 1 0 1 0 1 0 1 0 1 0 1 0 1\n\n1 1 0 1 0 0 1 0 0 0 0 0 0 0 0\n       \\vdots       \n0 0 1 1 0 0 0 1 0 0 0 0 0 0 1",
      tags: ["Non-Dual CSS", "15 Qubits", "Distance 3"],
    },
    {
      name: "[[16,6,4]] Tesseract Color Codes",
      url: "?pcm=gf4&type=custom&h=1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1%0A0+1+0+1+0+1+0+1+0+1+0+1+0+1+0+1%0A0+0+1+1+0+0+1+1+0+0+1+1+0+0+1+1%0A0+0+0+0+1+1+1+1+0+0+0+0+1+1+1+1%0A0+0+0+0+0+0+0+0+1+1+1+1+1+1+1+1%0Aw+w+w+w+w+w+w+w+w+w+w+w+w+w+w+w%0A0+w+0+w+0+w+0+w+0+w+0+w+0+w+0+w%0A0+0+w+w+0+0+w+w+0+0+w+w+0+0+w+w%0A0+0+0+0+w+w+w+w+0+0+0+0+w+w+w+w%0A0+0+0+0+0+0+0+0+w+w+w+w+w+w+w+w",
      desc: () => "A self-dual 4D color code defined on a tesseract, featuring both types of stabilizer generators on each cube. Two of its logical qubits can also be utilized as gauge qubits to adapt it into a tesseract subsystem code.",
      preview: "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1\n0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1\n       \\vdots       \n0 0 0 0 w w w w 0 0 0 0 w w w w\n0 0 0 0 0 0 0 0 w w w w w w w w",
      tags: ["Custom", "16 Qubits", "Distance 4"],
    },
    {
      name: "[[5,1,3]] Quaternary Hamming Codes",
      url: "?pcm=gf4&type=custom&h=1+w2+w2+1+0%0Aw2+w2+1+0+1%0Aw+1+1+w+0%0A1+1+w+0+w",
      desc: () => `A quantum error-correcting code derived from a classical quaternary [5,3] Hamming code. Its stabilizer matrix is constructed by stacking the classical parity-check matrix ${GateMath.toHTML("\\mathbf{H}_C")} with its scalar multiple ${GateMath.toHTML("\\omega \\mathbf{H}_C")}.`,
      preview: "1 w2 w2 1 0\nw2 w2 1 0 1\n\nw 1 1 w 0\n1 1 w 0 w",
      tags: ["Custom", "5 Qubits", "Distance 3"],
    },
    {
      name: "[[10,2,3]] Expanded Quantum Codes",
      url: "?pcm=gf4&type=custom&h=1+w2+w2+1+0+0+0+0+0+0%0Aw2+w2+1+0+0+0+0+0+1+0%0Aw+1+1+w+0+0+0+0+0+0%0A1+1+w+0+0+0+0+0+w+0%0A0+0+0+0+1+1+w2+w2+0+0%0A0+0+0+0+0+w2+w2+1+0+1%0A0+0+0+0+w+w+1+1+0+0%0A0+0+0+0+0+1+1+w+0+w",
      desc: () => `An expanded code built upon the [[5,1,3]] quaternary Hamming code. It uses a block-diagonal expansion structurally formulated as ${GateMath.toHTML("[\\mathbf{H}_Q\\ \\mathbf{0};\\ \\mathbf{0}\\ \\mathbf{H}_Q]")}, which increases logical capacity while guaranteeing orthogonality.`,
      preview: "\\mathbf{H}_Q\\ \\mathbf{0}\n\\mathbf{0} \\mathbf{H}_Q",
      tags: ["Custom", "10 Qubits", "Distance 3"],
    }
  ];

  function render(container) {
    const listToRender = activeTab === "circuit" ? CIRCUIT_EXAMPLES : QECC_EXAMPLES;

    container.innerHTML = `
      <section class="section">
        <h2 class="section-title">Examples</h2>
        <p class="section-desc">Pre-built quantum circuits and QECC matrices you can load into the simulators and experiment with.</p>
        
        <div class="examples-tabs">
          <button class="examples-tab-btn ${activeTab === "circuit" ? "active" : ""}" data-tab="circuit">Circuit Example</button>
          <button class="examples-tab-btn ${activeTab === "qecc" ? "active" : ""}" data-tab="qecc">QECC Example</button>
        </div>

        <div class="ui-grid">
          ${listToRender.map(
            (ex) => `
            <div class="ui-card interactive example-card-container">
              <div class="example-card-visual">
                ${activeTab === "circuit" ? `
                <div class="example-circuit-preview">
                    ${Array.from(
                      { length: Math.min(ex.qubits, 3) },
                      (_, q) => `
                      <div class="example-wire">
                        <span class="example-qubit-label">${GateMath.toHTML(`|q_${q}\\rangle`)}</span>
                        <div class="example-wire-line">
                          ${(ex.preview[q] || [])
                            .map((g, col) => {
                              if (g === "") {
                                return "<div class=\"example-gate example-empty\"></div>";
                              }

                              // Vertical line logic for multi-qubit gates
                              let lineHtml = "";
                              const multiGates = ["●", "CX", "CP", "SWAP"];
                              if (multiGates.includes(g)) {
                                let minRow = q,
                                  maxRow = q;
                                for (let r = 0; r < ex.qubits; r++) {
                                  const cell = ex.preview[r]
                                    ? ex.preview[r][col]
                                    : null;
                                  if (multiGates.includes(cell)) {
                                    if (r < minRow) {
                                      minRow = r;
                                    }
                                    if (r > maxRow) {
                                      maxRow = r;
                                    }
                                  }
                                }
                                // Only draw the line from the top-most involved qubit in this column
                                if (q === minRow && maxRow > minRow) {
                                  const steps = maxRow - minRow;
                                  lineHtml = `<div class="example-connector-line" style="--steps: ${steps};"></div>`;
                                }
                              }

                              if (g === "●") {
                                return `<div class="example-control-dot">${lineHtml}</div>`;
                              }

                              let gateTex = g;
                              if (g === "Rx") {
                                gateTex = "R_x";
                              } else if (g === "Ry") {
                                gateTex = "R_y";
                              } else if (g === "Rz") {
                                gateTex = "R_z";
                              } else if (g === "CP") {
                                gateTex = "P";
                              }

                              if (g === "CX") {
                                return `<div class="example-gate example-empty example-gate-relative"><div class="example-target-symbol"></div>${lineHtml}</div>`;
                              }
                              if (g === "SWAP") {
                                return `<div class="example-gate example-empty example-gate-relative"><div class="example-swap-symbol">${Icons.swap}</div>${lineHtml}</div>`;
                              }
                              if (g === "M") {
                                return `<div class="example-gate">${GateMath.toHTML("\\mathcal{M}")}${lineHtml}</div>`;
                              }

                              return `<div class="example-gate">${GateMath.toHTML(`\\mathbf{${gateTex}}`)}${lineHtml}</div>`;
                            })
                            .join("")}
                      </div>
                    </div>
                  `,
                    ).join("")}
                </div>` : `
                <div class="example-matrix-preview">
                    ${(() => {
                      let tex = ex.preview.replace(/w2/g, "\\omega^2").replace(/w/g, "\\omega");
                      tex = tex.replace(/ /g, " & ");
                      tex = tex.replace(/\n\n/g, " \\\\[0.8em] ");
                      tex = tex.replace(/\n/g, " \\\\ ");
                      return GateMath.toHTML(`\\begin{matrix} ${tex} \\end{matrix}`);
                    })()}
                </div>
                `}
              </div>
              <div class="example-card-body">
                <h3>${ex.name}</h3>
                <p>${typeof ex.desc === "function" ? ex.desc() : ex.desc}</p>
                ${ex.tip ? `<div class="example-tip"><strong>Tip:</strong> ${typeof ex.tip === "function" ? ex.tip() : ex.tip}</div>` : ""}
                <div class="example-card-meta">
                  ${ex.tags.map((t) => `<span class="example-meta-tag">${t}</span>`).join("")}
                </div>
                <div class="example-card-actions">
                  <button class="btn btn-primary btn-sm example-card-btn" data-url="${ex.url}">
                    Load in Simulator
                    ${Icons.arrowRight}
                  </button>
                </div>
              </div>
            </div>
          `,
          ).join("")}
          ${activeTab === "circuit" ? `
          <div class="ui-card interactive example-card-container saved-circuits-card">
              <div class="example-card-visual">
                <!-- Blank preview area -->
              </div>
              <div class="example-card-body">
                <h3>My Saved Circuits</h3>
                <p>Access your personally built quantum algorithms saved from the Circuit Builder.</p>
                <div class="example-card-meta">
                  <span class="example-meta-tag">Personal</span>
                </div>
                <div class="example-card-actions">
                  <button class="btn btn-primary btn-sm saved-circuits-btn" id="btn-open-saved-modal">
                    View Saved Circuits
                    ${Icons.arrowRight}
                  </button>
                </div>
              </div>
            </div>
          ` : ""}
        </div>
      </section>

      <footer class="site-footer">
        <p>© 2026 Quantum Labs by <a href="https://moefqy.com" target="_blank">moefqy.com</a>. All rights reserved.</p>
      </footer>

      <!-- Saved Circuits Modal -->
      <div class="modal-overlay" id="saved-circuits-modal">
        <div class="modal-container saved-circuits-modal-container">
          <div class="modal-header">
            <div class="modal-title">
              <div class="modal-icon">
                ${Icons.save}
              </div>
              <h2>My Saved Circuits</h2>
            </div>
            <button class="modal-close" id="btn-close-saved-modal" title="Close (Escape)">
              ${Icons.close}
            </button>
          </div>
          <div class="modal-body saved-circuits-modal-body" id="saved-circuits-list">
          </div>
        </div>
      </div>
    `;

    // Update saved count badge
    const updateSavedCount = () => {
      const saved = JSON.parse(
        localStorage.getItem("ql_saved_circuits") || "[]",
      );
      const badge = container.querySelector("#saved-circuits-count");
      if (badge) {
        badge.textContent = saved.length > 0 ? saved.length : "";
      }
    };
    updateSavedCount();

    // Modal open/close
    const modal = container.querySelector("#saved-circuits-modal");
    const openBtn = container.querySelector("#btn-open-saved-modal");
    const closeBtn = container.querySelector("#btn-close-saved-modal");

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    const openModal = () => {
      renderSavedList();
      modal.classList.add("open");
      document.addEventListener("keydown", handleKeydown);
      requestAnimationFrame(() => modal.classList.remove("entering"));
    };

    const closeModal = () => {
      modal.classList.remove("open");
      document.removeEventListener("keydown", handleKeydown);
    };

    openBtn?.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Render saved circuits list inside modal
    const renderSavedList = () => {
      const list = container.querySelector("#saved-circuits-list");
      const saved = JSON.parse(
        localStorage.getItem("ql_saved_circuits") || "[]",
      );

      if (saved.length === 0) {
        list.innerHTML = `
          <div class="saved-circuits-empty">
            <p>No saved circuits yet.</p>
            <p class="saved-circuits-empty-subtitle">Build a circuit and click the Save button in the Circuit Builder!</p>
          </div>
        `;
        return;
      }

      list.innerHTML = saved
        .map(
          (circuit, index) => `
        <div class="saved-circuit-row" data-index="${index}">
          <span class="saved-circuit-name">${circuit.name}</span>
          <div class="saved-circuit-actions">
            <button class="saved-circuit-action-link load btn-load-saved" data-index="${index}" title="Load into Simulator">${Icons.arrowRight}</button>
            <button class="saved-circuit-action-link copy btn-rename-saved" data-index="${index}" title="Rename this circuit">${Icons.edit}</button>
            <button class="saved-circuit-action-link copy btn-copy-saved" data-url="${circuit.url}" title="Copy shareable link">${Icons.link}</button>
            <button class="saved-circuit-action-link delete btn-delete-saved" data-index="${index}" title="Delete this circuit">${Icons.trash}</button>
          </div>
        </div>
      `,
        )
        .join("");

      // Load button
      list.querySelectorAll(".btn-load-saved").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.index, 10);
          const saved = JSON.parse(
            localStorage.getItem("ql_saved_circuits") || "[]",
          );
          const circuit = saved[idx];
          if (!circuit) {
            return;
          }
          const result = CircuitModel.loadFromUrlParams(circuit.url);
          closeModal();
          Router.navigate("/simulator");
          setTimeout(() => {
            SimulatorPage.openTool("circuit-builder");
            AppState.restoreFromResult(result);
          }, 400);
        });
      });

      // Copy Link button
      list.querySelectorAll(".btn-copy-saved").forEach((btn) => {
        btn.addEventListener("click", () => {
          const url = `${window.location.origin}/simulator?${btn.dataset.url}`;
          UI.copyToClipboard(url)
            .then(() => {
              const orig = btn.innerHTML;
              btn.innerHTML = "<span>Copied</span>";
              setTimeout(() => {
                btn.innerHTML = orig;
              }, 2000);
            })
            .catch(() => {});
        });
      });

      // Rename button
      list.querySelectorAll(".btn-rename-saved").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.index, 10);
          const saved = JSON.parse(
            localStorage.getItem("ql_saved_circuits") || "[]",
          );
          const circuit = saved[idx];
          if (!circuit) {
            return;
          }
          const newName = prompt("Rename circuit:", circuit.name);
          if (newName && newName.trim() !== "") {
            saved[idx].name = newName.trim();
            localStorage.setItem("ql_saved_circuits", JSON.stringify(saved));
            renderSavedList();
          }
        });
      });

      // Delete button
      list.querySelectorAll(".btn-delete-saved").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.index, 10);
          const saved = JSON.parse(
            localStorage.getItem("ql_saved_circuits") || "[]",
          );
          saved.splice(idx, 1);
          localStorage.setItem("ql_saved_circuits", JSON.stringify(saved));
          updateSavedCount();
          renderSavedList();
        });
      });
    };

    // Bind built-in example load buttons
    container.querySelectorAll(".example-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.dataset.url;
        
        // Temporarily set the URL search params so the URL manager can read them
        window.history.replaceState({}, "", "/simulator" + url);
        
        // Let the URL manager handle navigation, tool opening, and state restoration
        restoreFromUrl();
      });
    });

    // Bind tab switchers
    container.querySelectorAll(".examples-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const newTab = e.currentTarget.dataset.tab;
        if (newTab !== activeTab) {
          activeTab = newTab;
          render(container);
        }
      });
    });
  }

  return { render };
})();
