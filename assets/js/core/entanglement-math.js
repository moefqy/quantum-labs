// QUANTUM LABS — Entanglement Math
// Computes Von Neumann entropy, reduced density matrices,
// quantum conditional entropy, and mutual information
// from a state vector produced by QuantumEngine.

export const EntanglementMath = (() => {
  "use strict";

  // Numerically safe log2: returns 0 for values <= 0 (avoids -Infinity)
  function safeLog2(x) {
    return x <= 1e-12 ? 0 : Math.log2(x);
  }

  // Compute the 2x2 reduced density matrix for a single qubit by
  // tracing out all other qubits from the full state vector.
  // Returns rho as [[rho00_r, rho00_i], [rho01_r, rho01_i],
  //                  [rho10_r, rho10_i], [rho11_r, rho11_i]]
  function reducedDensityMatrix(stateReal, stateImag, numQubits, targetQubit) {
    const size = 1 << numQubits;
    // Big-endian: qubit 0 is MSB
    const bit = numQubits - 1 - targetQubit;
    const mask = 1 << bit;

    // rho is 2x2 complex: indices [row][col] each as [re, im]
    const rho = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]; // [rho00, rho01, rho10, rho11]

    for (let i = 0; i < size; i++) {
      const iRow = i & mask ? 1 : 0;
      for (let j = 0; j < size; j++) {
        // Only same "environment" bits contribute (partial trace condition)
        if ((i ^ j) === mask || (i ^ j) === 0) {
          const jCol = j & mask ? 1 : 0;
          const idx = iRow * 2 + jCol;
          // rho[row][col] += psi[i] * conj(psi[j])
          rho[idx][0] +=
            stateReal[i] * stateReal[j] + stateImag[i] * stateImag[j];
          rho[idx][1] +=
            stateImag[i] * stateReal[j] - stateReal[i] * stateImag[j];
        }
      }
    }
    return rho;
  }

  // Eigenvalues of a 2x2 Hermitian matrix via the analytic formula.
  // For rho = [[a, b], [b*, d]] (a,d real; b complex), eigenvalues are
  // lambda = ((a+d) +/- sqrt((a-d)^2 + 4|b|^2)) / 2
  function eigenvalues2x2(rho) {
    const a = rho[0][0]; // rho00 real (imag ≈ 0 for density matrix)
    const d = rho[3][0]; // rho11 real
    const bRe = rho[1][0];
    const bIm = rho[1][1];
    const bMag2 = bRe * bRe + bIm * bIm;
    const disc = Math.sqrt(Math.max(0, (a - d) * (a - d) + 4 * bMag2));
    return [(a + d + disc) / 2, (a + d - disc) / 2];
  }

  // Highly optimized O(N) inline partial trace specifically for finding
  // Bloch sphere projection and purity of a single target qubit.
  function getBlochState(stateReal, stateImag, numQubits, targetQubit) {
    const size = 1 << numQubits;
    const mask = 1 << (numQubits - 1 - targetQubit);

    let rho00 = 0,
      rho11 = 0,
      rho01_real = 0,
      rho01_imag = 0;

    // First pass: Calculate reduced density matrix and purity
    for (let i = 0; i < size; i++) {
      if ((i & mask) === 0) {
        const j = i | mask;
        const r0 = stateReal[i],
          i0 = stateImag[i];
        const r1 = stateReal[j],
          i1 = stateImag[j];
        rho00 += r0 * r0 + i0 * i0;
        rho11 += r1 * r1 + i1 * i1;
        rho01_real += r0 * r1 + i0 * i1;
        rho01_imag += i0 * r1 - r0 * i1;
      }
    }

    const purity =
      rho00 * rho00 +
      rho11 * rho11 +
      2 * (rho01_real * rho01_real + rho01_imag * rho01_imag);

    let a_real = 0,
      a_imag = 0,
      b_real = 0,
      b_imag = 0;

    // Second pass: Find valid amplitudes for pure state projection
    if (purity >= 0.99) {
      for (let i = 0; i < size; i++) {
        if ((i & mask) === 0) {
          const r0 = stateReal[i],
            i0 = stateImag[i];
          const p0 = r0 * r0 + i0 * i0;
          const j = i | mask;
          const r1 = stateReal[j],
            i1 = stateImag[j];
          const p1 = r1 * r1 + i1 * i1;

          if (p0 > 0.0001 || p1 > 0.0001) {
            const norm = Math.sqrt(p0 + p1);
            a_real = r0 / norm;
            a_imag = i0 / norm;
            b_real = r1 / norm;
            b_imag = i1 / norm;
            break;
          }
        }
      }
    }

    return { purity, a_real, a_imag, b_real, b_imag };
  }

  // Von Neumann entropy: S(rho) = -Tr(rho log2 rho) = -sum(lambda_i * log2(lambda_i))
  function vonNeumannEntropy(stateReal, stateImag, numQubits, qubit) {
    const rho = reducedDensityMatrix(stateReal, stateImag, numQubits, qubit);
    const [l1, l2] = eigenvalues2x2(rho);
    return -(l1 * safeLog2(l1) + l2 * safeLog2(l2));
  }

  // Compute the 4x4 reduced density matrix for a qubit pair (qA, qB)
  // by tracing out all remaining qubits.
  function reducedDensityMatrix2(stateReal, stateImag, numQubits, qA, qB) {
    const size = 1 << numQubits;
    const bitA = numQubits - 1 - qA;
    const bitB = numQubits - 1 - qB;
    const maskA = 1 << bitA;
    const maskB = 1 << bitB;

    // 4x4 complex matrix stored as flat array rho[row*4 + col] = [re, im]
    const rho = Array.from({ length: 16 }, () => [0, 0]);

    for (let i = 0; i < size; i++) {
      const iRowA = i & maskA ? 1 : 0;
      const iRowB = i & maskB ? 1 : 0;
      const iRow = iRowA * 2 + iRowB;

      for (let j = 0; j < size; j++) {
        // Same environment bits (all bits except qA and qB must match)
        const envMask = ~(maskA | maskB) & (size - 1);
        if ((i & envMask) !== (j & envMask)) {
          continue;
        }

        const jColA = j & maskA ? 1 : 0;
        const jColB = j & maskB ? 1 : 0;
        const jCol = jColA * 2 + jColB;

        const idx = iRow * 4 + jCol;
        rho[idx][0] +=
          stateReal[i] * stateReal[j] + stateImag[i] * stateImag[j];
        rho[idx][1] +=
          stateImag[i] * stateReal[j] - stateReal[i] * stateImag[j];
      }
    }
    return rho;
  }

  // Eigenvalues of a 4x4 Hermitian matrix via power iteration + deflation.
  // For density matrices this is numerically stable enough for 2 qubits.
  function eigenvalues4x4(rho) {
    // Build complex 4x4 matrix
    const mat = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 4; c++) {
        row.push([rho[r * 4 + c][0], rho[r * 4 + c][1]]);
      }
      mat.push(row);
    }

    const eigs = [];

    for (let k = 0; k < 4; k++) {
      // Start with a random complex vector
      const v = [];
      for (let i = 0; i < 4; i++) {
        v.push([Math.random() || 0.1, Math.random() || 0.1]);
      }

      const initialNorm = Math.sqrt(
        v.reduce((s, x) => s + x[0] * x[0] + x[1] * x[1], 0),
      );
      for (let i = 0; i < 4; i++) {
        v[i][0] /= initialNorm;
        v[i][1] /= initialNorm;
      }

      let lambda = 0;

      for (let iter = 0; iter < 200; iter++) {
        const mv = [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            const a = mat[i][j][0],
              b = mat[i][j][1];
            const c = v[j][0],
              d = v[j][1];
            mv[i][0] += a * c - b * d;
            mv[i][1] += a * d + b * c;
          }
        }

        const norm = Math.sqrt(
          mv.reduce((s, x) => s + x[0] * x[0] + x[1] * x[1], 0),
        );
        if (norm < 1e-14) {
          break;
        }
        lambda = norm;

        for (let i = 0; i < 4; i++) {
          v[i][0] = mv[i][0] / norm;
          v[i][1] = mv[i][1] / norm;
        }
      }

      // Rayleigh quotient for final lambda (lambda = v^H * mat * v)
      const mv = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const a = mat[i][j][0],
            b = mat[i][j][1];
          const c = v[j][0],
            d = v[j][1];
          mv[i][0] += a * c - b * d;
          mv[i][1] += a * d + b * c;
        }
      }

      lambda = 0;
      for (let i = 0; i < 4; i++) {
        lambda += v[i][0] * mv[i][0] + v[i][1] * mv[i][1];
      }

      eigs.push(Math.max(0, lambda));

      // Deflate: mat = mat - lambda * v * v^H
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const a = v[i][0],
            b = v[i][1];
          const c = v[j][0],
            d = v[j][1];
          mat[i][j][0] -= lambda * (a * c + b * d);
          mat[i][j][1] -= lambda * (b * c - a * d);
        }
      }
    }

    return eigs;
  }

  // Von Neumann entropy for a 2-qubit subsystem
  function vonNeumannEntropy2(stateReal, stateImag, numQubits, qA, qB) {
    const rho = reducedDensityMatrix2(stateReal, stateImag, numQubits, qA, qB);
    const eigs = eigenvalues4x4(rho);
    return -eigs.reduce((s, l) => s + l * safeLog2(l), 0);
  }

  // Calculate determinant of a 4x4 complex matrix
  function det4x4(m) {
    const mul = (a, b) => [
      a[0] * b[0] - a[1] * b[1],
      a[0] * b[1] + a[1] * b[0],
    ];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

    const det3x3 = (m00, m01, m02, m10, m11, m12, m20, m21, m22) => {
      const term1 = mul(m00, sub(mul(m11, m22), mul(m12, m21)));
      const term2 = mul(m01, sub(mul(m10, m22), mul(m12, m20)));
      const term3 = mul(m02, sub(mul(m10, m21), mul(m11, m20)));
      return add(sub(term1, term2), term3);
    };

    const c00 = det3x3(
      m[5],
      m[6],
      m[7],
      m[9],
      m[10],
      m[11],
      m[13],
      m[14],
      m[15],
    );
    const c01 = det3x3(
      m[4],
      m[6],
      m[7],
      m[8],
      m[10],
      m[11],
      m[12],
      m[14],
      m[15],
    );
    const c02 = det3x3(
      m[4],
      m[5],
      m[7],
      m[8],
      m[9],
      m[11],
      m[12],
      m[13],
      m[15],
    );
    const c03 = det3x3(
      m[4],
      m[5],
      m[6],
      m[8],
      m[9],
      m[10],
      m[12],
      m[13],
      m[14],
    );

    const det = sub(
      add(mul(m[0], c00), mul(m[2], c02)),
      add(mul(m[1], c01), mul(m[3], c03)),
    );
    return det[0];
  }

  // Peres-Horodecki PPT Criterion for 2-qubit systems
  function isPPTEntangled(rho) {
    const pt = Array.from({ length: 16 }, () => [0, 0]);
    for (let iA = 0; iA < 2; iA++) {
      for (let iB = 0; iB < 2; iB++) {
        for (let jA = 0; jA < 2; jA++) {
          for (let jB = 0; jB < 2; jB++) {
            const oldIdx = (iA * 2 + jB) * 4 + (jA * 2 + iB);
            const newIdx = (iA * 2 + iB) * 4 + (jA * 2 + jB);
            pt[newIdx][0] = rho[oldIdx][0];
            pt[newIdx][1] = rho[oldIdx][1];
          }
        }
      }
    }
    // For 2x2 systems, the partial transpose has a negative determinant iff the state is entangled
    return det4x4(pt) < -1e-9;
  }

  // Compute all entanglement metrics for a given state and a qubit pair (qA, qB):
  //   S_A  — Von Neumann entropy of qubit A
  //   S_B  — Von Neumann entropy of qubit B
  //   S_AB — Von Neumann entropy of the joint system
  //   I    — Quantum Mutual Information: I(A:B) = S_A + S_B - S_AB   (always >= 0)
  //   S_A_given_B — Quantum Conditional Entropy: S(A|B) = S_AB - S_B (CAN be negative!)
  //   S_B_given_A — Quantum Conditional Entropy: S(B|A) = S_AB - S_A
  function computePairMetrics(stateReal, stateImag, numQubits, qA, qB) {
    const sA = vonNeumannEntropy(stateReal, stateImag, numQubits, qA);
    const sB = vonNeumannEntropy(stateReal, stateImag, numQubits, qB);

    const rhoAB = reducedDensityMatrix2(
      stateReal,
      stateImag,
      numQubits,
      qA,
      qB,
    );
    const eigsAB = eigenvalues4x4(rhoAB);
    const sAB = -eigsAB.reduce((s, l) => s + l * safeLog2(l), 0);

    const mutualInfo = sA + sB - sAB;
    const condA_givenB = sAB - sB;
    const condB_givenA = sAB - sA;

    // Entanglement is detected when mutual information is significant.
    // For a product state, I(A:B) ≈ 0; for a Bell pair, I(A:B) = 2.
    const isEntangled = mutualInfo > 0.01;

    // Entanglement degree from 0 (separable) to 1 (maximally entangled)
    // Based on mutual information: I(A:B) ranges from 0 to 2 for a qubit pair.
    const entanglementDegree = Math.min(1, Math.max(0, mutualInfo / 2));
    const pptEntangled = isPPTEntangled(rhoAB);

    return {
      sA: sA.toFixed(3),
      sB: sB.toFixed(3),
      sAB: sAB.toFixed(3),
      mutualInfo: mutualInfo.toFixed(3),
      condA_givenB: condA_givenB.toFixed(3),
      condB_givenA: condB_givenA.toFixed(3),
      isEntangled,
      entanglementDegree,
      pptEntangled,
    };
  }

  // Compute per-qubit entropy for all n qubits in the state
  function computeAllEntropies(stateReal, stateImag, numQubits) {
    const result = [];
    for (let q = 0; q < numQubits; q++) {
      result.push({
        qubit: q,
        entropy: +vonNeumannEntropy(stateReal, stateImag, numQubits, q).toFixed(
          3,
        ),
      });
    }
    return result;
  }

  // Get the 2x2 reduced density matrix as a display-friendly object
  function getReducedDensityMatrixDisplay(
    stateReal,
    stateImag,
    numQubits,
    qubit,
  ) {
    const rho = reducedDensityMatrix(stateReal, stateImag, numQubits, qubit);
    return {
      rho00: rho[0][0],
      rho01r: rho[1][0],
      rho01i: rho[1][1],
      rho10r: rho[2][0],
      rho10i: rho[2][1],
      rho11: rho[3][0],
    };
  }

  return {
    computePairMetrics,
    computeAllEntropies,
    vonNeumannEntropy,
    getReducedDensityMatrixDisplay,
    getBlochState,
  };
})();
