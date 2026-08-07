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

  // Apply CZ (Controlled-Z)
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

  // Apply CY (Controlled-Y)
  function applyCY(state, controlQubit, targetQubit) {
    const n = state.numQubits;
    const controlBit = n - 1 - controlQubit;
    const targetBit = n - 1 - targetQubit;
    const controlMask = 1 << controlBit;
    const targetMask = 1 << targetBit;

    for (let i = 0; i < state.size; i++) {
      if (i & controlMask && !(i & targetMask)) {
        const j = i | targetMask;
        const irOld = state.real[i];
        const iiOld = state.imag[i];
        const jrOld = state.real[j];
        const jiOld = state.imag[j];
        state.real[j] = -iiOld;
        state.imag[j] = irOld;
        state.real[i] = jiOld;
        state.imag[i] = -jrOld;
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

// Checks if a 2x2 complex matrix is unitary: U†U = I
// matrix: [[r,i], [r,i], [r,i], [r,i]] (row-major: m00, m01, m10, m11)
// Returns true if all three unitary conditions hold within epsilon tolerance.
function isUnitary2x2(matrix, epsilon = 1e-6) {
  const m00r = matrix[0][0], m00i = matrix[0][1];
  const m01r = matrix[1][0], m01i = matrix[1][1];
  const m10r = matrix[2][0], m10i = matrix[2][1];
  const m11r = matrix[3][0], m11i = matrix[3][1];

  const col0Norm = m00r*m00r + m00i*m00i + m10r*m10r + m10i*m10i;
  if (Math.abs(col0Norm - 1.0) > epsilon) return false;

  const col1Norm = m01r*m01r + m01i*m01i + m11r*m11r + m11i*m11i;
  if (Math.abs(col1Norm - 1.0) > epsilon) return false;

  const dotReal = m00r*m01r + m00i*m01i + m10r*m11r + m10i*m11i;
  const dotImag = m00r*m01i - m00i*m01r + m10r*m11i - m10i*m11r;
  if (Math.abs(dotReal) > epsilon || Math.abs(dotImag) > epsilon) return false;

  return true;
}

// Completes/orthonormalizes a 2x2 complex matrix using Gram-Schmidt (QR).
// matrix: [[r,i], [r,i], [r,i], [r,i]] row-major (m00, m01, m10, m11)
// Returns a new matrix in the same format, guaranteed to be unitary.
function enforceUnitary2x2_qr(matrix) {
  let c0r = matrix[0][0], c0i = matrix[0][1];
  let c1r = matrix[2][0], c1i = matrix[2][1];
  let d0r = matrix[1][0], d0i = matrix[1][1];
  let d1r = matrix[3][0], d1i = matrix[3][1];

  const n0 = Math.sqrt(c0r*c0r + c0i*c0i + c1r*c1r + c1i*c1i);
  if (n0 < 1e-12) {
    return [[1,0],[0,0],[0,0],[1,0]];
  }
  const q0_0r = c0r/n0, q0_0i = c0i/n0;
  const q0_1r = c1r/n0, q0_1i = c1i/n0;

  const projR = q0_0r*d0r + q0_0i*d0i + q0_1r*d1r + q0_1i*d1i;
  const projI = q0_0r*d0i - q0_0i*d0r + q0_1r*d1i - q0_1i*d1r;

  let u1_0r = d0r - (projR*q0_0r - projI*q0_0i);
  let u1_0i = d0i - (projR*q0_0i + projI*q0_0r);
  let u1_1r = d1r - (projR*q0_1r - projI*q0_1i);
  let u1_1i = d1i - (projR*q0_1i + projI*q0_1r);

  const n1 = Math.sqrt(u1_0r*u1_0r + u1_0i*u1_0i + u1_1r*u1_1r + u1_1i*u1_1i);
  if (n1 < 1e-12) {
    u1_0r = q0_1r; u1_0i = -q0_1i;
    u1_1r = -q0_0r; u1_1i = q0_0i;
  } else {
    u1_0r /= n1; u1_0i /= n1;
    u1_1r /= n1; u1_1i /= n1;
  }

  const r11R = u1_0r*d0r + u1_0i*d0i + u1_1r*d1r + u1_1i*d1i;
  const r11I = u1_0r*d0i - u1_0i*d0r + u1_1r*d1i - u1_1i*d1r;
  const r11Abs = Math.sqrt(r11R*r11R + r11I*r11I);
  if (r11Abs > 1e-12) {
    const phR = r11R / r11Abs, phI = r11I / r11Abs;
    const new00r = u1_0r*phR - u1_0i*phI;
    const new00i = u1_0i*phR + u1_0r*phI;
    const new10r = u1_1r*phR - u1_1i*phI;
    const new10i = u1_1i*phR + u1_1r*phI;
    u1_0r = new00r; u1_0i = new00i;
    u1_1r = new10r; u1_1i = new10i;
  }

  return [
    [q0_0r, q0_0i],
    [u1_0r, u1_0i],
    [q0_1r, q0_1i],
    [u1_1r, u1_1i],
  ];
}

// Finds the nearest unitary matrix using SVD / Polar decomposition.
// matrix: [[r,i], [r,i], [r,i], [r,i]] row-major (m00, m01, m10, m11)
// Returns a new matrix in the same format, guaranteed to be unitary.
function enforceUnitary2x2_polar(matrix, epsilon = 1e-9) {
  const m00r = matrix[0][0], m00i = matrix[0][1];
  const m01r = matrix[1][0], m01i = matrix[1][1];
  const m10r = matrix[2][0], m10i = matrix[2][1];
  const m11r = matrix[3][0], m11i = matrix[3][1];

  // H = A†A (Hermitian): h00, h11 real; h01 complex, h10 = conj(h01)
  const h00 = m00r*m00r + m00i*m00i + m10r*m10r + m10i*m10i;
  const h11 = m01r*m01r + m01i*m01i + m11r*m11r + m11i*m11i;
  const h01r = m00r*m01r + m00i*m01i + m10r*m11r + m10i*m11i;
  const h01i = m00r*m01i - m00i*m01r + m10r*m11i - m10i*m11r;

  const trace = h00 + h11;
  const diffSq = (h00 - h11) * (h00 - h11);
  const offSq  = 4 * (h01r*h01r + h01i*h01i);
  const disc   = Math.sqrt(Math.max(0, diffSq + offSq));
  const lam1   = Math.max(0, (trace + disc) / 2);
  const lam2   = Math.max(0, (trace - disc) / 2);

  // A is (near-)singular: polar factor isn't uniquely defined. Fall back to
  // Gram-Schmidt, which at least returns a valid, sensible unitary.
  if (lam1 < epsilon) {
    return enforceUnitary2x2_qr(matrix);
  }

  const s1 = Math.sqrt(lam1);
  let Acoef, Bcoef;
  if (Math.abs(lam1 - lam2) < epsilon) {
    // Degenerate (equal singular values): H^{-1/2} = (1/s1)·I
    Acoef = 0;
    Bcoef = 1 / s1;
  } else {
    const s2 = Math.sqrt(Math.max(lam2, epsilon)); // guard divide-by-zero
    const c1 = 1 / (s1 * (lam1 - lam2));
    const c2 = 1 / (s2 * (lam2 - lam1));
    Acoef = c1 + c2;
    Bcoef = -(c1*lam2 + c2*lam1);
  }

  // H^{-1/2} = Acoef*H - Bcoef*I  (careful: Bcoef already carries the sign
  // for "- Bcoef*I" above being ADDED, since we folded the minus sign in)
  const p00 = Acoef*h00 + Bcoef;
  const p11 = Acoef*h11 + Bcoef;
  const p01r = Acoef*h01r, p01i = Acoef*h01i;
  const p10r = p01r, p10i = -p01i; // p10 = conj(p01)

  // U = A · H^{-1/2}
  // row0 = (m00, m01), row1 = (m10, m11); columns of P: col0=(p00,p10), col1=(p01,p11)
  const u00r = m00r*p00 + m01r*p10r - m01i*p10i;
  const u00i = m00i*p00 + m01r*p10i + m01i*p10r;
  const u01r = m00r*p01r - m00i*p01i + m01r*p11;
  const u01i = m00r*p01i + m00i*p01r + m01i*p11;
  const u10r = m10r*p00 + m11r*p10r - m11i*p10i;
  const u10i = m10i*p00 + m11r*p10i + m11i*p10r;
  const u11r = m10r*p01r - m10i*p01i + m11r*p11;
  const u11i = m10r*p01i + m10i*p01r + m11i*p11;

  return [
    [u00r, u00i],
    [u01r, u01i],
    [u10r, u10i],
    [u11r, u11i],
  ];
}

// Decomposes a 2x2 unitary matrix into 3 Euler angles.
// matrix: [[r,i], [r,i], [r,i], [r,i]] row-major (m00, m01, m10, m11)
// Returns { theta, phi, lambda, alpha } all in radians.
function decomposeUnitary2x2(matrix) {
  const m00r = matrix[0][0], m00i = matrix[0][1];
  const m01r = matrix[1][0], m01i = matrix[1][1];
  const m10r = matrix[2][0], m10i = matrix[2][1];
  const m11r = matrix[3][0], m11i = matrix[3][1];

  let alpha, theta, phi, lambda;

  const m00abs = Math.sqrt(m00r*m00r + m00i*m00i);
  const m10abs = Math.sqrt(m10r*m10r + m10i*m10i);

  theta = 2 * Math.atan2(m10abs, m00abs);

  if (m00abs > 1e-12) {
    alpha = Math.atan2(m00i, m00r);
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    if (m10abs > 1e-12) {
      const u10r = m10r*ca + m10i*sa, u10i = m10i*ca - m10r*sa;
      const u01r = m01r*ca + m01i*sa, u01i = m01i*ca - m01r*sa;
      phi = Math.atan2(u10i, u10r);
      lambda = Math.atan2(-u01i, -u01r);
    } else {
      // theta = 0
      lambda = 0;
      const u11r = m11r*ca + m11i*sa, u11i = m11i*ca - m11r*sa;
      phi = Math.atan2(u11i, u11r);
    }
  } else {
    // theta = pi
    phi = 0;
    alpha = Math.atan2(m10i, m10r);
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    const u01r = m01r*ca + m01i*sa, u01i = m01i*ca - m01r*sa;
    lambda = Math.atan2(-u01i, -u01r);
  }

  return { theta, phi, lambda, alpha };
}

  return {
    apply2x2Matrix,
    applyCNOT,
    applyCY,
    applyCZ,
    applySWAP,
    applyCSWAP,
    applyCP,
    applyToffoli,
    applyMCX,
    measure,
    tensorProduct2x2,
    multiplyMatrixVector,
    isUnitary2x2,
    enforceUnitary2x2_qr,
    enforceUnitary2x2_polar,
    decomposeUnitary2x2,
  };
})();
