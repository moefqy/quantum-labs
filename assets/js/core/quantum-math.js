// QUANTUM LABS — Quantum Math
// High-performance, zero-allocation math operations for quantum simulation.
// This library replaces complex arithmetic closures with unrolled math
// to drastically reduce garbage collection overhead during deep simulation.

export const QuantumMath = (() => {
  "use strict";

  // Applies a 2x2 unitary matrix to the full state vector at a specific target qubit.
  // state - The state vector object { real: Float64Array, imag: Float64Array, size: number, numQubits: number }
  // matrix - A 2x2 complex matrix in the form [[r,i], [r,i], [r,i], [r,i]] (flattened 2D array representation of 2x2)
  // targetQubit - The 0-indexed qubit to apply the gate to.
  function apply2x2Matrix(state, matrix, targetQubit) {
    const n = state.numQubits;
    const size = state.size;
    const targetBit = n - 1 - targetQubit;
    const mask = 1 << targetBit;

    // Pre-extract matrix values to avoid array lookups in the loop
    const m00r = matrix[0][0],
      m00i = matrix[0][1];
    const m01r = matrix[1][0],
      m01i = matrix[1][1];
    const m10r = matrix[2][0],
      m10i = matrix[2][1];
    const m11r = matrix[3][0],
      m11i = matrix[3][1];

    // Apply Matrix to State
    for (let i = 0; i < size; i++) {
      if (i & mask) {
        continue;
      } // skip |1⟩ states, handle in pairs

      const j = i | mask; // partner state with target bit flipped

      const ar = state.real[i];
      const ai = state.imag[i];
      const br = state.real[j];
      const bi = state.imag[j];

      // EDUCATIONAL EQUIVALENT:
      // Mathematically, the block below is doing exactly this readable logic:
      //
      //   const [n0r, n0i] = cadd(
      //     ...cmul(m[0][0], m[0][1], ar, ai),
      //     ...cmul(m[1][0], m[1][1], br, bi),
      //   );
      //
      //   const [n1r, n1i] = cadd(
      //     ...cmul(m[2][0], m[2][1], ar, ai),
      //     ...cmul(m[3][0], m[3][1], br, bi),
      //   );
      //
      // We manually unroll (inline) the math here to prevent the browser from 
      // allocating hundreds of thousands of temporary arrays per second!

      // Calculate new |0> state (a)
      const n0r = m00r * ar - m00i * ai + (m01r * br - m01i * bi);
      const n0i = m00r * ai + m00i * ar + (m01r * bi + m01i * br);

      // Calculate new |1> state (b)
      const n1r = m10r * ar - m10i * ai + (m11r * br - m11i * bi);
      const n1i = m10r * ai + m10i * ar + (m11r * bi + m11i * br);

      state.real[i] = n0r;
      state.imag[i] = n0i;
      state.real[j] = n1r;
      state.imag[j] = n1i;
    }
  }

  // Apply CNOT (controlled-X)
  function applyCNOT(state, controlQubit, targetQubit) {
    const n = state.numQubits;
    const controlBit = n - 1 - controlQubit;
    const targetBit = n - 1 - targetQubit;
    const controlMask = 1 << controlBit;
    const targetMask = 1 << targetBit;

    for (let i = 0; i < state.size; i++) {
      if (i & controlMask && !(i & targetMask)) {
        const j = i | targetMask;
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = state.real[j];
        state.imag[i] = state.imag[j];
        state.real[j] = tr;
        state.imag[j] = ti;
      }
    }
  }

  // Apply CZ
  function applyCZ(state, controlQubit, targetQubit) {
    const n = state.numQubits;
    const controlBit = n - 1 - controlQubit;
    const targetBit = n - 1 - targetQubit;
    const controlMask = 1 << controlBit;
    const targetMask = 1 << targetBit;

    for (let i = 0; i < state.size; i++) {
      if (i & controlMask && i & targetMask) {
        state.real[i] = -state.real[i];
        state.imag[i] = -state.imag[i];
      }
    }
  }

  // Apply SWAP
  function applySWAP(state, qubit1, qubit2) {
    const n = state.numQubits;
    const bit1 = n - 1 - qubit1;
    const bit2 = n - 1 - qubit2;
    const mask1 = 1 << bit1;
    const mask2 = 1 << bit2;

    for (let i = 0; i < state.size; i++) {
      const b1 = i & mask1 ? 1 : 0;
      const b2 = i & mask2 ? 1 : 0;
      if (b1 !== b2 && b1 === 0) {
        const j = (i | mask1) & ~mask2;
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = state.real[j];
        state.imag[i] = state.imag[j];
        state.real[j] = tr;
        state.imag[j] = ti;
      }
    }
  }

  // Apply CSWAP (Fredkin)
  function applyCSWAP(state, control, target1, target2) {
    const n = state.numQubits;
    const cBit = n - 1 - control;
    const t1Bit = n - 1 - target1;
    const t2Bit = n - 1 - target2;
    const cMask = 1 << cBit;
    const t1Mask = 1 << t1Bit;
    const t2Mask = 1 << t2Bit;

    for (let i = 0; i < state.size; i++) {
      if (i & cMask && !(i & t1Mask) && i & t2Mask) {
        const j = (i | t1Mask) & ~t2Mask;
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = state.real[j];
        state.imag[i] = state.imag[j];
        state.real[j] = tr;
        state.imag[j] = ti;
      }
    }
  }

  // Apply CPhase (CP)
  function applyCP(state, controlQubit, targetQubit, theta) {
    const n = state.numQubits;
    const controlBit = n - 1 - controlQubit;
    const targetBit = n - 1 - targetQubit;
    const controlMask = 1 << controlBit;
    const targetMask = 1 << targetBit;

    const c = Math.cos(theta);
    const s = Math.sin(theta);

    for (let i = 0; i < state.size; i++) {
      if (i & controlMask && i & targetMask) {
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = tr * c - ti * s;
        state.imag[i] = tr * s + ti * c;
      }
    }
  }

  // Apply Toffoli (CCX)
  function applyToffoli(state, control1, control2, target) {
    const n = state.numQubits;
    const c1Bit = n - 1 - control1;
    const c2Bit = n - 1 - control2;
    const tBit = n - 1 - target;
    const c1Mask = 1 << c1Bit;
    const c2Mask = 1 << c2Bit;
    const tMask = 1 << tBit;

    for (let i = 0; i < state.size; i++) {
      if (i & c1Mask && i & c2Mask && !(i & tMask)) {
        const j = i | tMask;
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = state.real[j];
        state.imag[i] = state.imag[j];
        state.real[j] = tr;
        state.imag[j] = ti;
      }
    }
  }

  // Apply Multi-Controlled X (MCX)
  function applyMCX(state, qubits) {
    const n = state.numQubits;
    const target = qubits[qubits.length - 1];
    const controls = qubits.slice(0, -1);

    let controlMask = 0;
    for (const c of controls) {
      controlMask |= 1 << (n - 1 - c);
    }

    const tBit = n - 1 - target;
    const tMask = 1 << tBit;

    for (let i = 0; i < state.size; i++) {
      if ((i & controlMask) === controlMask && !(i & tMask)) {
        const j = i | tMask;
        const tr = state.real[i];
        const ti = state.imag[i];
        state.real[i] = state.real[j];
        state.imag[i] = state.imag[j];
        state.real[j] = tr;
        state.imag[j] = ti;
      }
    }
  }

  // Measure a qubit (collapses state)
  function measure(state, qubit) {
    const n = state.numQubits;
    const bit = n - 1 - qubit;
    const mask = 1 << bit;

    let prob1 = 0;
    for (let i = 0; i < state.size; i++) {
      if (i & mask) {
        prob1 += state.real[i] * state.real[i] + state.imag[i] * state.imag[i];
      }
    }

    const outcome = Math.random() < prob1 ? 1 : 0;
    const normFactor = 1 / Math.sqrt(outcome ? prob1 : 1 - prob1);

    for (let i = 0; i < state.size; i++) {
      const bitVal = i & mask ? 1 : 0;
      if (bitVal === outcome) {
        state.real[i] *= normFactor;
        state.imag[i] *= normFactor;
      } else {
        state.real[i] = 0;
        state.imag[i] = 0;
      }
    }

    return outcome;
  }

  // Matrix Operations
  function cmul(r1, i1, r2, i2) {
    return [r1 * r2 - i1 * i2, r1 * i2 + i1 * r2];
  }

  // Compute the tensor product of two 2x2 matrices
  function tensorProduct2x2(A, B) {
    const res = [];
    for (let rA = 0; rA < 2; rA++) {
      for (let rB = 0; rB < 2; rB++) {
        const row = [];
        for (let cA = 0; cA < 2; cA++) {
          for (let cB = 0; cB < 2; cB++) {
            row.push(
              cmul(
                A[rA * 2 + cA][0],
                A[rA * 2 + cA][1],
                B[rB * 2 + cB][0],
                B[rB * 2 + cB][1],
              ),
            );
          }
        }
        res.push(row);
      }
    }
    return res;
  }

  // Matrix-Vector Multiplication
  function multiplyMatrixVector(matrix, vector) {
    const size = matrix.length;
    const outVec = [];
    for (let r = 0; r < size; r++) {
      let sr = 0,
        si = 0;
      for (let c = 0; c < size; c++) {
        const [pr, pi] = cmul(
          matrix[r][c][0],
          matrix[r][c][1],
          vector[c][0],
          vector[c][1],
        );
        sr += pr;
        si += pi;
      }
      outVec.push([sr, si]);
    }
    return outVec;
  }

  return {
    apply2x2Matrix,
    applyCNOT,
    applyCZ,
    applySWAP,
    applyCSWAP,
    applyCP,
    applyToffoli,
    applyMCX,
    measure,
    tensorProduct2x2,
    multiplyMatrixVector,
  };
})();
