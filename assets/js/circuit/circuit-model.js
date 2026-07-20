// QUANTUM LABS — Circuit Model
// Data structure representing the quantum circuit.
// Manages qubits, steps (columns), and gate placements.

import { QuantumGates } from "../core/quantum-gates.js";
import { CircuitSerializer } from "./circuit-serializer.js";

// Note: EntanglementTracker is accessed via global namespace to avoid circular dependencies

export const CircuitModel = (() => {
  "use strict";

  let numQubits = 2;
  let numCbits = 0;
  let numSteps = 8;

  // Grid: grid[step][wire] = { gate, param, linkedQubits } or null
  let grid = [];

  // Undo/redo stacks
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 50;

  // Initialize the module
  function init(qubits = 3, cbits = 0, steps = 8) {
    numQubits = qubits;
    numCbits = cbits;
    numSteps = steps;
    grid = [];
    for (let s = 0; s < numSteps; s++) {
      grid[s] = new Array(numQubits + numCbits).fill(null);
    }
    undoStack = [];
    redoStack = [];
  }

  // Save state for undo
  function saveState() {
    undoStack.push(JSON.stringify({ numQubits, numCbits, numSteps, grid }));
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = [];
  }

  // Restore state from JSON
  function restoreState(json) {
    const s = JSON.parse(json);
    numQubits = s.numQubits;
    numCbits = s.numCbits || 0;
    numSteps = s.numSteps;
    grid = s.grid;
  }

  // Undo circuit state
  function undo() {
    if (undoStack.length === 0) {
      return false;
    }
    redoStack.push(JSON.stringify({ numQubits, numCbits, numSteps, grid }));
    restoreState(undoStack.pop());
    return true;
  }

  // Redo circuit state
  function redo() {
    if (redoStack.length === 0) {
      return false;
    }
    undoStack.push(JSON.stringify({ numQubits, numCbits, numSteps, grid }));
    restoreState(redoStack.pop());
    return true;
  }

  // Place a gate
  function placeGate(step, qubit, gateName, param = null) {
    if (step < 0 || qubit < 0 || qubit >= numQubits + numCbits) {
      return false;
    }

    // Prevent single quantum gates on classical bits
    if (qubit >= numQubits) {
      return false;
    }

    const info = QuantumGates.get(gateName);
    if (!info) {
      return false;
    }

    saveState();

    // Ensure enough steps
    while (step >= numSteps) addStep();

    grid[step][qubit] = {
      gate: gateName,
      param: param,
      linkedQubits: [qubit], // will be expanded for multi-qubit gates
    };

    return true;
  }

  // Place a multi-qubit gate
  function placeMultiGate(step, qubits, gateName) {
    const info = QuantumGates.get(gateName);
    if (!info || info.type !== "multi") {
      return false;
    }
    if (info.targets !== "variable" && info.targets !== "span" && qubits.length !== info.targets) {
      return false;
    }

    // Validate classical bit usage
    const cbitsUsed = qubits.filter((q) => q >= numQubits).length;
    if (gateName === "M") {
      if (cbitsUsed !== 1 || qubits[qubits.length - 1] < numQubits) {
        return false;
      }
    } else if (gateName === "c-X" || gateName === "c-Z") {
      if (cbitsUsed !== 1) {
        return false;
      }
    } else {
      if (cbitsUsed > 0) {
        return false;
      }
    }

    saveState();

    while (step >= numSteps) addStep();

    // Place on all involved qubits
    for (let i = 0; i < qubits.length; i++) {
      grid[step][qubits[i]] = {
        gate: gateName,
        param: null,
        linkedQubits: [...qubits],
        role: i === qubits.length - 1 ? "target" : "control",
        roleIndex: i,
      };
    }

    return true;
  }

  // Remove a gate
  function removeGate(step, qubit) {
    if (step < 0 ||
    step >= numSteps ||
    qubit < 0 ||
    qubit >= numQubits + numCbits) {
      return false;
    }
    const cell = grid[step][qubit];
    if (!cell) {
      return false;
    }

    saveState();

    // Remove all linked qubits for multi-gate
    if (cell.linkedQubits && cell.linkedQubits.length > 1) {
      for (const q of cell.linkedQubits) {
        grid[step][q] = null;
      }
    } else {
      grid[step][qubit] = null;
    }

    return true;
  }

  // Update gate parameter
  function updateParam(step, qubit, param) {
    const cell = grid[step]?.[qubit];
    if (!cell) {
      return false;
    }
    saveState();
    if (cell.linkedQubits) {
      for (const lq of cell.linkedQubits) {
        if (grid[step][lq]) {
          grid[step][lq].param = param;
        }
      }
    } else {
      cell.param = param;
    }
    return true;
  }

  // Add/Remove Qubits
  function addQubit() {
    if (numQubits >= 8) {
      return false;
    }
    saveState();
    for (let s = 0; s < numSteps; s++) {
      grid[s].splice(numQubits, 0, null);
    }
    numQubits++;
    return true;
  }

  // Remove a quantum bit
  function removeQubit() {
    if (numQubits <= 1) {
      return false;
    }
    saveState();
    numQubits--;
    for (let s = 0; s < numSteps; s++) {
      for (let q = 0; q < grid[s].length; q++) {
        const cell = grid[s][q];
        if (cell && cell.linkedQubits) {
          if (cell.linkedQubits.some((lq) => lq === numQubits)) {
            for (const lq of cell.linkedQubits) {
              if (lq < grid[s].length) {
                grid[s][lq] = null;
              }
            }
          } else {
            // Shift down linked qubits that were above the removed qubit (e.g. classical bits)
            cell.linkedQubits = cell.linkedQubits.map((lq) =>
              lq > numQubits ? lq - 1 : lq,
            );
          }
        }
      }
      grid[s].splice(numQubits, 1);
    }
    return true;
  }

  // Add/Remove Cbits
  function addCbit() {
    if (numCbits >= 8) {
      return false;
    }
    saveState();
    numCbits++;
    for (let s = 0; s < numSteps; s++) {
      grid[s].push(null);
    }
    return true;
  }

  // Remove a classical bit
  function removeCbit() {
    if (numCbits <= 0) {
      return false;
    }
    saveState();
    numCbits--;
    for (let s = 0; s < numSteps; s++) {
      for (let q = 0; q < grid[s].length; q++) {
        const cell = grid[s][q];
        if (cell && cell.linkedQubits) {
          if (cell.linkedQubits.some((lq) => lq === numQubits + numCbits)) {
            for (const lq of cell.linkedQubits) {
              if (lq < grid[s].length) {
                grid[s][lq] = null;
              }
            }
          }
        }
      }
      grid[s].pop();
    }
    return true;
  }

  // Add step column
  function addStep() {
    numSteps++;
    grid.push(new Array(numQubits + numCbits).fill(null));
  }

  // Clear circuit
  function clear() {
    saveState();
    for (let s = 0; s < numSteps; s++) {
      grid[s] = new Array(numQubits + numCbits).fill(null);
    }
  }

  // Convert to operations list for simulator
  function toOperations() {
    const ops = [];
    for (let s = 0; s < numSteps; s++) {
      const processed = new Set();
      for (let q = 0; q < numQubits + numCbits; q++) {
        const cell = grid[s][q];
        if (!cell || processed.has(q)) {
          continue;
        }

        // Mark all linked qubits as processed
        if (cell.linkedQubits) {
          cell.linkedQubits.forEach((lq) => processed.add(lq));
        } else {
          processed.add(q);
        }

        let gateParam = cell.param;
        // If param is null here, check other linked qubits (e.g. target qubit of a multi-gate)
        if (cell.linkedQubits && gateParam == null) {
          for (const lq of cell.linkedQubits) {
            if (grid[s][lq] && grid[s][lq].param != null) {
              gateParam = grid[s][lq].param;
              break;
            }
          }
        }

        if (cell.gate === "U2" && gateParam) {
          try {
            const u2Data = JSON.parse(gateParam);
            let subSteps = u2Data.steps;
            const minQ = Math.min(...(cell.linkedQubits || [q]));
            const maxQ = Math.max(...(cell.linkedQubits || [q]));
            const numQubits = maxQ - minQ + 1;

            if (typeof subSteps === "string") {
              subSteps = CircuitSerializer.decodeMiniGrid(subSteps, numQubits);
            }
            
            for (let subS = 0; subS < subSteps.length; subS++) {
              const subProcessed = new Set();
              for (let subQ = 0; subQ < subSteps[subS].length; subQ++) {
                const slot = subSteps[subS][subQ];
                if (!slot || subProcessed.has(subQ)) {
                  continue;
                }
                
                if (slot.role === "single") {
                  let subParam = null;
                  if (slot.param != null) {
                    const info = QuantumGates.get(slot.gate);
                    if (info && info.paramType === "u1") {
                      subParam = slot.param;
                    } else {
                      subParam = QuantumGates.parseAngle(slot.param);
                    }
                  }
                  
                  ops.push({
                    gate: slot.gate,
                    qubits: [minQ + subQ],
                    param: subParam,
                    step: s + (subS / 100)
                  });
                  subProcessed.add(subQ);
                } else if (slot.role === "control" || slot.role === "target") {
                  const partner = slot.partnerQubit;
                  subProcessed.add(subQ);
                  subProcessed.add(partner);
                  
                  const controlQ = slot.role === "control" ? subQ : partner;
                  const targetQ = slot.role === "target" ? subQ : partner;
                  
                  ops.push({
                    gate: slot.gate,
                    qubits: [minQ + controlQ, minQ + targetQ],
                    param: null,
                    step: s + (subS / 100)
                  });
                }
              }
            }
          } catch (e) {
            console.error("Failed to unroll U2", e);
          }
          continue;
        }

        const info = QuantumGates.get(cell.gate);
        let finalParam = null;
        if (gateParam != null) {
          if (info && info.paramType === "u1") {
            finalParam = gateParam;
          } else {
            finalParam = QuantumGates.parseAngle(gateParam);
          }
        }

        ops.push({
          gate: cell.gate,
          qubits: cell.linkedQubits || [q],
          param: finalParam,
          step: s,
        });
      }
    }
    return ops;
  }

  // Serialize/Deserialize
  function serialize() {
    return JSON.stringify({ numQubits, numCbits, numSteps, grid, version: 1 });
  }

  // Deserialize state from JSON
  function deserialize(json) {
    try {
      const data = JSON.parse(json);
      saveState();
      numQubits = data.numQubits;
      numCbits = data.numCbits || 0;
      numSteps = data.numSteps;
      grid = data.grid;
      return true;
    } catch (e) {
      console.error("Failed to load circuit:", e);
      return false;
    }
  }

  // Presets
  const PRESETS = {
    bell: {
      qubits: 2,
      cbits: 0,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(2, 0, 8);
        model.placeGate(0, 0, "H");
        model.placeMultiGate(1, [0, 1], "CNOT");
      },
    },
    ghz: {
      qubits: 3,
      cbits: 0,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 0, 8);
        model.placeGate(0, 0, "H");
        model.placeMultiGate(1, [0, 1], "CNOT");
        model.placeMultiGate(2, [1, 2], "CNOT");
      },
    },
    w_state: {
      qubits: 3,
      cbits: 0,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 0, 8);
        model.placeGate(0, 0, "Ry", "1.9106");
        model.placeGate(1, 1, "Ry", "0.7854");
        model.placeMultiGate(2, [0, 1], "CNOT");
        model.placeGate(3, 1, "Ry", "-0.7854");
        model.placeMultiGate(4, [0, 1], "CNOT");
        model.placeMultiGate(5, [1, 2], "CNOT");
        model.placeMultiGate(6, [0, 1], "CNOT");
        model.placeGate(7, 0, "X");
      },
    },
    superposition: {
      qubits: 3,
      cbits: 0,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 0, 8);
        model.placeGate(0, 0, "H");
        model.placeGate(0, 1, "H");
        model.placeGate(0, 2, "H");
      },
    },
    superdense: {
      qubits: 2,
      cbits: 2,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(2, 2, 8);
        // 1. Create entangled pair between Alice (q0) and Bob (q1)
        model.placeGate(0, 0, "H");
        model.placeMultiGate(1, [0, 1], "CNOT");

        // 2. Alice encodes two classical bits ('11') by applying X and Z
        model.placeGate(2, 0, "X");
        model.placeGate(3, 0, "Z");

        // 3. Bob decodes the state
        model.placeMultiGate(4, [0, 1], "CNOT");
        model.placeGate(5, 0, "H");

        // 4. Bob measures to retrieve the two classical bits
        model.placeMultiGate(6, [0, 2], "M"); // q0 to c0 (index 2)
        model.placeMultiGate(6, [1, 3], "M"); // q1 to c1 (index 3)
      },
    },
    teleportation: {
      qubits: 3,
      cbits: 2,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 2, 8);
        // 1. State preparation for q0 (the state Alice wants to teleport)
        model.placeGate(0, 0, "Rx");
        model.updateParam(0, 0, "π/3");

        // 2. Create entangled pair between Alice (q1) and Bob (q2)
        model.placeGate(0, 1, "H");
        model.placeMultiGate(1, [1, 2], "CNOT");

        // 3. Alice entangles her qubit q0 with her half of the Bell pair q1
        model.placeMultiGate(2, [0, 1], "CNOT");
        model.placeGate(3, 0, "H");

        // 4. Alice measures both her qubits
        model.placeMultiGate(4, [0, 3], "M"); // q0 to c0 (index 3)
        model.placeMultiGate(4, [1, 4], "M"); // q1 to c1 (index 4)

        // 5. Bob applies conditional gates based on Alice's measurements
        model.placeMultiGate(5, [2, 4], "c-X"); // c-X from c1 to q2
        model.placeMultiGate(6, [2, 3], "c-Z"); // c-Z from c0 to q2
      },
    },
    grover: {
      qubits: 6,
      cbits: 5,
      steps: 12,
      // Construct the circuit grid
      setup(model) {
        model.init(6, 5, 12);

        // Step 0: Prep ancilla (Qubit 5)
        model.placeGate(0, 5, "X");

        // Step 1: Superposition for all qubits
        for (let i = 0; i <= 5; i++) model.placeGate(1, i, "H");

        // Step 2: Oracle (searching for state |11111>)
        model.placeMultiGate(2, [0, 1, 2, 3, 4, 5], "MCX");

        // Step 3-4: Diffusion (H and X on search qubits)
        for (let i = 0; i < 5; i++) {
          model.placeGate(3, i, "H");
          model.placeGate(4, i, "X");
        }

        // Step 5-7: Diffusion Multi-Controlled Z (using H, MCX, H on q4)
        model.placeGate(5, 4, "H");
        model.placeMultiGate(6, [0, 1, 2, 3, 4], "MCX");
        model.placeGate(7, 4, "H");

        // Step 8-9: Diffusion (X and H on search qubits)
        for (let i = 0; i < 5; i++) {
          model.placeGate(8, i, "X");
          model.placeGate(9, i, "H");
        }

        // Step 10: Measure the 5 search qubits
        for (let i = 0; i < 5; i++) {
          model.placeMultiGate(10, [i, i + 6], "M");
        }
      },
    },
    qft: {
      qubits: 3,
      cbits: 0,
      steps: 8,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 0, 8);
        // Qubit 0
        model.placeGate(0, 0, "H");
        model.placeMultiGate(1, [1, 0], "CP");
        model.updateParam(1, 0, "π/2");
        model.placeMultiGate(2, [2, 0], "CP");
        model.updateParam(2, 0, "π/4");

        // Qubit 1
        model.placeGate(3, 1, "H");
        model.placeMultiGate(4, [2, 1], "CP");
        model.updateParam(4, 1, "π/2");

        // Qubit 2
        model.placeGate(5, 2, "H");

        // Swap
        model.placeMultiGate(6, [0, 2], "SWAP");
      },
    },
    qpe: {
      qubits: 4,
      cbits: 3,
      steps: 13,
      // Construct the circuit grid
      setup(model) {
        model.init(4, 3, 13);
        // Target state prep
        model.placeGate(0, 3, "X");
        // Superposition
        for (let i = 0; i < 3; i++) model.placeGate(1, i, "H");

        // Controlled unitaries (U = T gate = CP(π/4))
        model.placeMultiGate(2, [2, 3], "CP");
        model.updateParam(2, 3, "π/4");
        model.placeMultiGate(3, [1, 3], "CP");
        model.updateParam(3, 3, "π/2");
        model.placeMultiGate(4, [0, 3], "CP");
        model.updateParam(4, 3, "π");

        // Inverse QFT
        model.placeMultiGate(5, [0, 2], "SWAP");

        model.placeGate(6, 2, "H");
        model.placeMultiGate(7, [2, 1], "CP");
        model.updateParam(7, 1, "-π/2");

        model.placeGate(8, 1, "H");
        model.placeMultiGate(9, [2, 0], "CP");
        model.updateParam(9, 0, "-π/4");
        model.placeMultiGate(10, [1, 0], "CP");
        model.updateParam(10, 0, "-π/2");

        model.placeGate(11, 0, "H");

        // Measure
        for (let i = 0; i < 3; i++) {
          model.placeMultiGate(12, [i, i + 4], "M");
        }
      },
    },
    vqe: {
      qubits: 2,
      cbits: 2,
      steps: 5,
      // Construct the circuit grid
      setup(model) {
        model.init(2, 2, 5);
        model.placeGate(0, 0, "Rx");
        model.updateParam(0, 0, "π/2");
        model.placeGate(0, 1, "Rx");
        model.updateParam(0, 1, "π/2");

        model.placeMultiGate(1, [0, 1], "CNOT");

        model.placeGate(2, 0, "Ry");
        model.updateParam(2, 0, "π/4");
        model.placeGate(2, 1, "Ry");
        model.updateParam(2, 1, "-π/4");

        // Measure
        model.placeMultiGate(4, [0, 2], "M");
        model.placeMultiGate(4, [1, 3], "M");
      },
    },
    random_walk: {
      qubits: 3,
      cbits: 2,
      steps: 7,
      // Construct the circuit grid
      setup(model) {
        model.init(3, 2, 7);
        // Coin toss
        model.placeGate(0, 0, "H");
        // Conditional shift
        model.placeMultiGate(1, [0, 2, 1], "Toffoli");
        model.placeMultiGate(2, [0, 2], "CNOT");

        // Coin toss
        model.placeGate(3, 0, "H");
        // Conditional shift
        model.placeMultiGate(4, [0, 2, 1], "Toffoli");
        model.placeMultiGate(5, [0, 2], "CNOT");

        // Measure position
        model.placeMultiGate(6, [1, 3], "M");
        model.placeMultiGate(6, [2, 4], "M");
      },
    },
  };

  // Load from URL Params
  // Decodes a URL query string (e.g. from window.location.search) and
  // rebuilds the circuit grid. Returns { mode, shots } on success, null on failure.
  function loadFromUrlParams(queryString) {
    const result = CircuitSerializer.decode(queryString, {
      init,
      placeGate,
      placeMultiGate,
      updateParam,
    });
    if (!result) {
      return null;
    }
    // Clear undo/redo history after a preset load
    undoStack = [];
    redoStack = [];
    return result;
  }

  // Getters
  function getNumQubits() {
    return numQubits;
  }
  function getNumCbits() {
    return numCbits;
  }
  function getNumSteps() {
    return numSteps;
  }
  function getGrid() {
    return grid;
  }
  function getCell(step, qubit) {
    return grid[step]?.[qubit] || null;
  }

  // Init with defaults
  init(3, 0, 8);

  return {
    init,
    clear,
    undo,
    redo,
    placeGate,
    placeMultiGate,
    removeGate,
    updateParam,
    addQubit,
    removeQubit,
    addCbit,
    removeCbit,
    addStep,
    toOperations,
    serialize,
    deserialize,
    loadFromUrlParams,
    getNumQubits,
    getNumCbits,
    getNumSteps,
    getGrid,
    getCell,
  };
})();
