// QUANTUM LABS — Circuit Serializer
// Converts a CircuitModel grid into a readable URL query string and back.
// Format: ?qubits=2&cbits=0&steps=3&mode=exact&shots=1024&gates=0:0:H;1:0,1:CX

export const CircuitSerializer = (() => {
  "use strict";

  // Encode
  // Reads the live model and UI state, returns a URLSearchParams string.
  // @param model  — the CircuitModel object
  // @param mode   — "exact" or "shots"
  // @param shots  — integer, the current shots count
  // @returns {string} — e.g. "qubits=2&cbits=0&steps=3&mode=exact&shots=1024&gates=0:0:H"
  function encode(model, mode, shots) {
    const q = model.getNumQubits();
    const c = model.getNumCbits();
    const s = model.getNumSteps();
    const grid = model.getGrid();

    const ops = [];

    for (let step = 0; step < grid.length; step++) {
      const col = grid[step];
      for (let wire = 0; wire < col.length; wire++) {
        const cell = col[wire];
        if (!cell) {
          continue;
        }

        // For multi-qubit gates, only serialize once: when we are on the
        // first qubit in linkedQubits to avoid duplicates.
        if (cell.linkedQubits && cell.linkedQubits[0] !== wire) {
          continue;
        }

        const type = cell.gate;
        const targets = cell.linkedQubits
          ? cell.linkedQubits.join(",")
          : `${wire}`;
        const param = cell.param ? encodeURIComponent(cell.param) : "";

        ops.push(`${step}:${targets}:${type}:${param}`);
      }
    }

    const params = new URLSearchParams();
    const finalMode = mode || "exact";
    const finalShots = finalMode === "exact" ? 0 : shots || 1024;

    params.set("qubits", q);
    params.set("cbits", c);
    params.set("steps", s);
    params.set("mode", finalMode);
    params.set("shots", finalShots);
    params.set("gates", ops.join(";"));

    return params.toString();
  }

  // Decode
  // Parses a query string and populates the model.
  // @param queryString — e.g. "qubits=2&cbits=0&..." (with or without leading "?")
  // @param model       — the CircuitModel object to populate
  // @returns {object|null} — { mode, shots } on success, null on failure
  function decode(queryString, model) {
    if (!queryString) {
      return null;
    }

    // Strip the leading "?" if present
    const clean = queryString.startsWith("?")
      ? queryString.slice(1)
      : queryString;
    const params = new URLSearchParams(clean);

    const qubits = parseInt(params.get("qubits"), 10);
    const cbits = parseInt(params.get("cbits"), 10);
    const steps = parseInt(params.get("steps"), 10);
    const mode = params.get("mode") || "exact";
    const shots = parseInt(params.get("shots"), 10) || 1024;
    const gatesStr = params.get("gates");

    // Validate header fields
    if (isNaN(qubits) || isNaN(cbits) || isNaN(steps)) {
      return null;
    }

    // Reinitialize the grid with the new dimensions
    model.init(qubits, cbits, steps);

    // Populate gates
    if (gatesStr) {
      const ops = gatesStr.split(";");
      for (const op of ops) {
        if (!op) {
          continue;
        }

        // Format: "step:q0,q1,...:type:param"
        const parts = op.split(":");
        if (parts.length < 3) {
          continue;
        }

        const step = parseInt(parts[0], 10);
        const targets = parts[1].split(",").map((n) => parseInt(n, 10));
        const type = parts[2];
        const rawParam = parts.slice(3).join(":"); // Rejoin in case param wasn't properly encoded in older URLs
        const param = rawParam ? decodeURIComponent(rawParam) : null;

        if (targets.length === 1) {
          model.placeGate(step, targets[0], type, param);
        } else {
          model.placeMultiGate(step, targets, type);
          // If a param was serialized for this gate, apply it to the first qubit
          if (param) {
            model.updateParam(step, targets[0], param);
          }
        }
      }
    }

    return { mode, shots };
  }

  // Mini-Grid (U2 Custom Gates)
  function encodeMiniGrid(stepsData) {
    const ops = [];
    for (let s = 0; s < stepsData.length; s++) {
      if (!stepsData[s]) {
        continue;
      }
      for (let q = 0; q < stepsData[s].length; q++) {
        const cell = stepsData[s][q];
        if (!cell) {
          continue;
        }

        if (cell.role === "single") {
          const p = cell.param ? encodeURIComponent(cell.param) : "";
          ops.push(`${s}:${q}:${cell.gate}:${p}`);
        } else if (cell.role === "control") {
          // Serialize only at the control to prevent duplicates
          // The targets are the control and partner qubits
          const p = cell.param ? encodeURIComponent(cell.param) : "";
          // Determine ordered targets so it works natively like "q1,q2"
          const targetStr = `${Math.min(q, cell.partnerQubit)},${Math.max(q, cell.partnerQubit)}`;
          ops.push(`${s}:${targetStr}:${cell.gate}:${p}`);
        }
      }
    }
    return ops.join(";");
  }

  // Decode mini-grid data
  function decodeMiniGrid(str, numQubits) {
    const ops = str.split(";").filter(Boolean);
    let maxStep = -1;
    const parsedOps = ops.map(op => {
      const parts = op.split(":");
      const s = parseInt(parts[0], 10);
      if (s > maxStep) {
        maxStep = s;
      }
      const paramStr = parts.slice(3).join(":");
      return {
        step: s,
        qubits: parts[1].split(",").map(n => parseInt(n, 10)),
        gate: parts[2],
        param: paramStr ? decodeURIComponent(paramStr) : undefined
      };
    });

    const stepsData = Array.from({ length: Math.max(maxStep + 1, 7) }, () => new Array(numQubits).fill(null));

    for (const op of parsedOps) {
      if (op.qubits.length === 1) {
        stepsData[op.step][op.qubits[0]] = { gate: op.gate, role: "single", param: op.param };
      } else {
        const minQ = Math.min(...op.qubits);
        const maxQ = Math.max(...op.qubits);
        stepsData[op.step][minQ] = { gate: op.gate, role: "control", partnerQubit: maxQ, param: op.param };
        stepsData[op.step][maxQ] = { gate: op.gate, role: "target", partnerQubit: minQ, param: op.param };
        for (let i = minQ + 1; i < maxQ; i++) {
          stepsData[op.step][i] = { gate: op.gate, role: "wire", partnerQubit: maxQ, param: op.param };
        }
      }
    }
    return stepsData;
  }

  return { encode, decode, encodeMiniGrid, decodeMiniGrid };
})();
