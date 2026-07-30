// QUANTUM LABS — QECC Math Engine (v2)
// Abstract GF(2) stabilizer code algebra. No DOM or UI dependencies.
// All functions are pure computations over arbitrary M×N matrices.
// Follows the standard form derivation for symplectic Gram-Schmidt.

import { GateMath } from "./math-renderer.js";

export const QECCMath = (() => {
  "use strict";

  // GF(2) Matrix Primitives
  //
  // All arithmetic is mod 2:  1+1=0,  1·1=1,  0+x=x.
  // Matrices are plain JS arrays-of-arrays of 0/1 integers.

  // Create an m×n matrix filled with zeros.
  function zeros(m, n) {
    return Array.from({ length: m }, () => new Array(n).fill(0));
  }

  // Create an m×m identity matrix.
  function eye(m) {
    const I = zeros(m, m);
    for (let i = 0; i < m; i++) I[i][i] = 1;
    return I;
  }

  // Deep-clone a 2-D matrix.
  function clone(M) {
    return M.map(row => row.slice());
  }

  // GF(2) matrix addition: C = A + B mod 2.
  // A and B must have the same dimensions.
  function add(A, B) {
    const m = A.length, n = A[0].length;
    const C = zeros(m, n);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        C[i][j] = (A[i][j] + B[i][j]) & 1;
    return C;
  }

  // GF(2) matrix multiplication: C = A · B mod 2.
  // A is (m×k), B is (k×n), result C is (m×n).
  function mul(A, B) {
    // Short-circuit for empty matrices (handles s=0 / K=0 zero-dimension blocks)
    if (!A.length || !B.length || !B[0] || B[0].length === 0)
      return zeros(A.length, B[0] ? B[0].length : 0);
    const m = A.length, k = A[0].length, n = B[0].length;
    const C = zeros(m, n);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
        C[i][j] = s & 1;
      }
    return C;
  }

  // Transpose: returns the transpose of M (rows ↔ columns).
  function transpose(M) {
    if (!M.length || !M[0] || M[0].length === 0) return []; // empty matrix guard
    const rows = M.length, cols = M[0].length;
    const T = zeros(cols, rows);
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        T[j][i] = M[i][j];
    return T;
  }

  // Check if matrix is all zeros.
  function isZero(M) {
    return M.every(row => row.every(v => v === 0));
  }

  // RREF (Reduced Row Echelon Form)
  //
  // Gauss-Jordan elimination over GF(2).
  // Finds the unique RREF of M and records which columns became pivots.
  //
  // Returns:
  //   rref      — RREF of M (same dimensions as M)
  //   pivotCols — ordered list of pivot column indices
  function rrefGF2(M) {
    const mat = clone(M);
    const rows = mat.length, cols = mat[0].length;
    const pivotCols = [];
    let pivotRow = 0;

    for (let col = 0; col < cols && pivotRow < rows; col++) {
      // Search for a row with a 1 in this column (at or below pivotRow)
      let found = -1;
      for (let r = pivotRow; r < rows; r++) {
        if (mat[r][col] === 1) { found = r; break; }
      }
      if (found === -1) continue; // no pivot in this column

      // Swap found row into the pivot position
      [mat[pivotRow], mat[found]] = [mat[found], mat[pivotRow]];
      pivotCols.push(col);

      // Eliminate col = 1 in every other row (both above and below — full RREF)
      for (let r = 0; r < rows; r++) {
        if (r !== pivotRow && mat[r][col] === 1) {
          for (let c = 0; c < cols; c++)
            mat[r][c] = (mat[r][c] + mat[pivotRow][c]) & 1;
        }
      }
      pivotRow++;
    }

    return { rref: mat, pivotCols };
  }

  // Rank of M over GF(2): number of non-zero rows after RREF.
  function rank(M) {
    return rrefGF2(M).rref.filter(row => row.some(v => v !== 0)).length;
  }

  // Kernel (null space) of M over GF(2).
  //
  // Returns an array of basis vectors (each of length cols(M)) such that
  // M · v = 0 mod 2 for every vector v in the span of the returned basis.
  //
  // Algorithm: find free columns (non-pivot) from RREF, build one basis
  // vector per free variable by back-substituting the pivot variables.
  function kernel(M) {
    const cols = M[0].length;
    const { rref: R, pivotCols } = rrefGF2(M);

    // Free columns = all columns that are NOT pivot columns
    const freeCols = [];
    for (let c = 0; c < cols; c++)
      if (!pivotCols.includes(c)) freeCols.push(c);

    // For each free variable, construct one basis vector of the kernel
    const basis = [];
    for (const fc of freeCols) {
      const v = new Array(cols).fill(0);
      v[fc] = 1; // set free variable to 1
      // Back-substitute: pivot variable i is determined by the free column
      for (let i = 0; i < pivotCols.length; i++)
        v[pivotCols[i]] = R[i][fc];
      basis.push(v);
    }
    return basis;
  }


  // Matrix Assembly
  //
  // Utility functions to combine sub-matrices into composite matrices.
  // These are the building blocks for constructing H from Hx and Hz.

  // Horizontal stack: [A | B]
  // A is (m×a), B is (m×b) — must have same row count.
  // Result is (m × a+b).
  function hstack(A, B) {
    // If either side has zero columns, return the other side (handles s=0 empty blocks)
    if (!A.length || !A[0] || A[0].length === 0) return clone(B);
    if (!B.length || !B[0] || B[0].length === 0) return clone(A);
    if (A.length !== B.length)
      throw new Error(`hstack: row count mismatch (${A.length} vs ${B.length})`);
    return A.map((row, i) => [...row, ...B[i]]);
  }

  // Vertical stack: [A; B]
  // A is (a×n), B is (b×n) — must have same column count.
  // Result is (a+b × n).
  function vstack(A, B) {
    if (A[0].length !== B[0].length)
      throw new Error(`vstack: column count mismatch (${A[0].length} vs ${B[0].length})`);
    return [...clone(A), ...clone(B)];
  }

  // Block-diagonal concatenation: [A 0; 0 B]
  // A is (mA×nA), B is (mB×nB).
  // Result is (mA+mB × nA+nB).
  //
  // Usage: CSS codes — X and Z stabilizers are decoupled, so the full
  // symplectic PCM is assembled as:
  //
  //   H = [ Hx   0  ]   (top rows = pure X stabilizers)
  //       [  0   Hz ]   (bottom rows = pure Z stabilizers)
  function blockDiag(A, B) {
    const mA = A.length, nA = A[0].length;
    const mB = B.length, nB = B[0].length;
    const top = A.map(row => [...row, ...new Array(nB).fill(0)]);
    const bot = B.map(row => [...new Array(nA).fill(0), ...row]);
    return [...top, ...bot];
  }

  // Build H = [Hx | Hz]  (symplectic horizontal concatenation).
  //
  // Hx and Hz must be the same size (m×N).
  // Result is (m × 2N) — each row encodes one stabilizer generator where
  //   columns 0..N-1   are the X components of each qubit
  //   columns N..2N-1  are the Z components of each qubit
  //
  // Used for: Non-CSS codes, GF(4) codes, and as the input to the
  //           standard-form and code-parameter pipeline.
  function buildSymplectic(Hx, Hz) {
    return hstack(Hx, Hz);
  }

  // Build H = [Hx 0; 0 Hz]  (CSS block-diagonal assembly).
  //
  // Hx is (mx×N), Hz is (mz×N) — columns must match, rows may differ.
  // Result is ((mx+mz) × 2N).
  //
  // Used for: Dual-containing CSS codes (Hx = Hz) and Non-dual CSS codes.
  // This is the canonical symplectic form where X and Z stabilizers are
  // represented as separate block rows.
  function buildBlockDiag(Hx, Hz) {
    const mx = Hx.length, N = Hx[0].length;
    const mz = Hz.length;
    const zeroMx = zeros(mx, N);
    const zeroMz = zeros(mz, N);
    return vstack(hstack(Hx, zeroMz), hstack(zeroMx, Hz));
  }


  // GF(4) to Binary Symplectic Conversion
  //
  // A GF(4) stabilizer code is defined by a generator matrix G over GF(4),
  // where each entry encodes a single-qubit Pauli operator:
  //
  //   GF(4) value  | Pauli | Binary (x_bit, z_bit)
  //   ─────────────┼───────┼──────────────────────
  //       0        |   I   |  (0, 0)
  //       1        |   X   |  (1, 0)
  //       2 (w)    |   Z   |  (0, 1)
  //       3 (w2)   |   Y   |  (1, 1)  ← Y = iXZ carries both X and Z bits
  //
  // The binary symplectic representation separates G into two GF(2) matrices:
  //   Hx[i][j] = x_bit of G[i][j]
  //   Hz[i][j] = z_bit of G[i][j]
  //
  // The full symplectic PCM is then H = [Hx | Hz]  (via buildSymplectic).

  const GF4_MAP = [
    [0, 0], // 0 → I
    [1, 0], // 1 → X
    [0, 1], // 2 (w)  → Z
    [1, 1], // 3 (w2) → Y
  ];

  // Convert GF(4) generator matrix G (m×n) to binary symplectic Hx, Hz.
  // Returns { Hx, Hz } both (m×n) binary matrices.
  function gf4ToSymplectic(G) {
    const m = G.length, n = G[0].length;
    const Hx = zeros(m, n), Hz = zeros(m, n);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) {
        const [x, z] = GF4_MAP[G[i][j]];
        Hx[i][j] = x;
        Hz[i][j] = z;
      }
    return { Hx, Hz };
  }


  // Symplectic Inner Product (SIP) Validation
  //
  // Two Pauli strings a and b commute iff their symplectic inner product is 0:
  //   SIP(a, b) = (ax·bz + az·bx) mod 2 = 0
  //
  // For the full generator matrix, this extends to a matrix condition:
  //   Hx · Hz^T + Hz · Hx^T = 0  (mod 2)
  //
  // This must hold for any valid stabilizer code (all generators must commute).
  // For CSS codes it reduces to Hx · Hz^T = 0.

  // Check that all stabilizers in H = [Hx | Hz] mutually commute.
  // Hx and Hz must be the same dimensions (m×N) — use after assembly.
  // Returns true if SIP = 0 (valid stabilizer code).
  function checkSIP(Hx, Hz) {
    const SIP = add(mul(Hx, transpose(Hz)), mul(Hz, transpose(Hx)));
    return isZero(SIP);
  }


  // Code Parameters [[N, K, r]]
  //
  // For a stabilizer code with assembled PCM H = [Hx | Hz] of size (m × 2N):
  //
  //   N = number of physical qubits       = cols(Hx) = cols(Hz)
  //   r = rank(H) over GF(2)              = number of independent generators
  //   K = number of logical qubits        = N - r
  //
  // Note: m ≥ r always. If m > r there are redundant generators (rows that
  //       are linear combinations of others). The rank correctly handles this.

  // Compute [[N, K, r]] from assembled (m×N) Hx and Hz.
  // Returns { N, K, r }.
  function computeNKr(Hx, Hz) {
    const N = Hx[0].length;
    const H = buildSymplectic(Hx, Hz); // m × 2N
    const r = rank(H);
    const K = N - r;
    return { N, K, r };
  }


  // Standard Form
  //
  // The standard form H_st is obtained by symplectic Gaussian
  // elimination on H = [Hx | Hz], reordering rows and qubits (columns) to
  // expose the following block structure:
  //
  //          ←── r ──→ ←─ N-K-r ─→ ←── K ──→   ←── r ──→ ←─ N-K-r ─→ ←── K ──→
  // H_st = [     I         A1        A2     |       B          C1          C2     ]  ← r rows
  //        [     0          0         0     |       D1          I          E2     ]  ← N-K-r rows
  //
  // where:
  //   r     = rank of the Hx block   (number of X-type pivot qubits)
  //   s     = N-K-r                  (number of Z-type pivot qubits)
  //   K     = N - r - s              (number of logical / data qubits)
  //
  // Algorithm
  //
  // Phase 1 — RREF on Hx:
  //   Sweep columns 0..N-1 of Hx. For each pivot found, row-reduce BOTH
  //   hx and hz simultaneously (same row operations). Record r pivot columns.
  //   Permute columns so pivot cols 0..r-1 hold the identity I_r in Hx.
  //
  // Phase 2 — RREF on Hz for zero-Hx rows:
  //   Rows r..m-1 have hx = 0 after Phase 1. Sweep their hz block for
  //   new pivots in columns r..N-1. Row-reduce BOTH hx and hz (propagates
  //   to the top r rows' Hz block). Permute columns r..N-1 so Z-pivot
  //   cols occupy positions r..r+s-1, leaving K data-qubit cols at the end.
  //
  // Column permutation = qubit relabelling
  //   colPerm[i] = index of the original qubit now at position i after
  //   all column swaps. Apply colPerm^{-1} to translate logical operators
  //   back to physical qubit order.
  //
  // Returns:
  //   Hx_st   — standard form Hx block (m × N)
  //   Hz_st   — standard form Hz block (m × N)
  //   colPerm — qubit permutation array (length N)
  //   r, s, K, N — code dimension parameters
  //   blocks  — extracted sub-matrices: { A1, A2, B, C1, C2, D1, E2 }

  function toStandardForm(Hx, Hz) {
    const m = Hx.length;     // total rows (stabilizer generators)
    const N = Hx[0].length;  // physical qubits (columns)

    // Working copies — row operations always applied to BOTH hx and hz
    let hx = clone(Hx);
    let hz = clone(Hz);

    // colPerm[i] = original qubit index at position i
    // Initialised to identity permutation [0, 1, ..., N-1]
    let colPerm = Array.from({ length: N }, (_, i) => i);

    // Helper: reorder columns of hx, hz and update colPerm
    function applyColPerm(order) {
      hx      = hx.map(row => order.map(c => row[c]));
      hz      = hz.map(row => order.map(c => row[c]));
      colPerm = order.map(c => colPerm[c]);
    }

    // Phase 1: RREF on Hx block
    let pivotRow = 0;
    const xPivotCols = [];

    for (let col = 0; col < N && pivotRow < m; col++) {
      // Find a row with hx[row][col] = 1 (search at or below pivotRow)
      let found = -1;
      for (let row = pivotRow; row < m; row++) {
        if (hx[row][col] === 1) { found = row; break; }
      }
      if (found === -1) continue; // no pivot in this column

      // Swap found row to pivot position (both hx and hz)
      [hx[pivotRow], hx[found]] = [hx[found], hx[pivotRow]];
      [hz[pivotRow], hz[found]] = [hz[found], hz[pivotRow]];
      xPivotCols.push(col);

      // Eliminate this column in ALL other rows (GF(2) XOR)
      for (let row = 0; row < m; row++) {
        if (row !== pivotRow && hx[row][col] === 1) {
          for (let c = 0; c < N; c++) {
            hx[row][c] ^= hx[pivotRow][c];
            hz[row][c] ^= hz[pivotRow][c];
          }
        }
      }
      pivotRow++;
    }

    const r = xPivotCols.length; // rank of Hx block

    // Reorder columns: X-pivot cols first, then X-free cols
    // After this, cols 0..r-1 of hx form I_r
    const xFreeCols = Array.from({ length: N }, (_, i) => i)
                           .filter(c => !xPivotCols.includes(c));
    applyColPerm([...xPivotCols, ...xFreeCols]);

    // Phase 2: RREF on Hz for zero-Hx rows
    // Rows r..m-1 have hx = 0 (from Phase 1). Search their hz block for
    // new pivots in columns r..N-1 (skip cols 0..r-1 to preserve I_r in hx).
    // Row operations propagate to the top r rows' hz block.

    let pivotRow2 = r;
    const zPivotCols = []; // will be indices in range [r, N)

    for (let col = r; col < N && pivotRow2 < m; col++) {
      // Search only in the zero-Hx rows
      let found = -1;
      for (let row = pivotRow2; row < m; row++) {
        if (hz[row][col] === 1) { found = row; break; }
      }
      if (found === -1) continue;

      // Swap rows (hx is 0 for these rows, so swapping hx has no effect)
      [hx[pivotRow2], hx[found]] = [hx[found], hx[pivotRow2]];
      [hz[pivotRow2], hz[found]] = [hz[found], hz[pivotRow2]];
      zPivotCols.push(col);

      // Eliminate this column in ALL rows (including the top r rows' hz)
      for (let row = 0; row < m; row++) {
        if (row !== pivotRow2 && hz[row][col] === 1) {
          for (let c = 0; c < N; c++) {
            hx[row][c] ^= hx[pivotRow2][c];
            hz[row][c] ^= hz[pivotRow2][c];
          }
        }
      }
      pivotRow2++;
    }

    const s = zPivotCols.length; // s = N - K - r  (rank of residual Z block)
    const K = N - r - s;         // K = number of logical qubits

    // Reorder columns r..N-1: Z-pivot cols first, then data-qubit cols
    // Final column order: [0..r-1 (X-pivots)] [r..r+s-1 (Z-pivots)] [r+s..N-1 (data)]
    const zFreeCols = Array.from({ length: N - r }, (_, i) => r + i)
                           .filter(c => !zPivotCols.includes(c));
    applyColPerm([
      ...Array.from({ length: r }, (_, i) => i), // keep cols 0..r-1 fixed
      ...zPivotCols,                              // Z-pivot cols → r..r+s-1
      ...zFreeCols,                               // data-qubit cols → r+s..N-1
    ]);

    // Extract standard form blocks
    //
    // H_st column partition (same for X and Z halves):
    //   [0, r)      ← r  columns — X-pivot block  (identity I in Hx top, 0 in Hx bottom)
    //   [r, r+s)    ← s  columns — Z-pivot block  (0 in Hz top identity, I in Hz bottom)
    //   [r+s, N)    ← K  columns — data qubit block
    //
    // Named blocks:
    //   Top rows (0..r-1):    Hx = [I  A1  A2],  Hz = [B   C1  C2]
    //   Bottom rows (r..r+s-1): Hx = [0   0   0],  Hz = [D1   I  E2]

    const sliceCols = (rows, from, to) => rows.map(row => row.slice(from, to));
    const topHx = hx.slice(0, r);      // r × N
    const botHx = hx.slice(r, r + s);  // s × N  (should be all zeros in hx)
    const topHz = hz.slice(0, r);      // r × N
    const botHz = hz.slice(r, r + s);  // s × N

    const A1 = sliceCols(topHx, r, r + s);   // r × s
    const A2 = sliceCols(topHx, r + s, N);   // r × K
    const B  = sliceCols(topHz, 0, r);        // r × r
    const C1 = sliceCols(topHz, r, r + s);   // r × s
    const C2 = sliceCols(topHz, r + s, N);   // r × K
    const D1 = sliceCols(botHz, 0, r);        // s × r
    const E2 = sliceCols(botHz, r + s, N);   // s × K

    return {
      Hx_st: hx,
      Hz_st: hz,
      colPerm,        // colPerm[i] = original qubit index now at position i
      r, s, K, N,
      blocks: { A1, A2, B, C1, C2, D1, E2 },
    };
  }


  // Logical Operators X̄ and Z̄
  //
  // Given the standard form blocks, the K logical operators X̄ and Z̄ are
  // read off directly from equations (27) and (28):
  //
  //   X̄ = [ 0_{K×r}  E2^T_{K×s}  I_K  |  (E2^T·C1^T + C2^T)_{K×r}  0_{K×s}  0_{K×K} ]
  //   Z̄ = [ 0_{K×r}   0_{K×s}    0_K  |  A2^T_{K×r}                 0_{K×s}  I_K     ]
  //
  // Column layout (total 2N):
  //   X-part: [0..r-1 | r..r+s-1 | r+s..N-1]   (r | s | K columns)
  //   Z-part: [N..N+r-1 | N+r..N+r+s-1 | N+r+s..2N-1]  (same partition)
  //
  // Each row of X̄ / Z̄ is one logical operator in symplectic form.
  // K rows total, one per logical qubit.
  //
  // IMPORTANT: These operators are expressed in standard-form qubit order.
  //            To recover physical qubit order, apply the inverse of colPerm.

  // Derive logical operators from standard form blocks.
  //
  // Parameters:
  //   blocks — { A2, C1, C2, E2 } extracted from toStandardForm()
  //   r, s, K, N — code dimension parameters from toStandardForm()
  //
  // Returns:
  //   X_bar — K × 2N matrix; row i = i-th X̄ logical operator (symplectic)
  //   Z_bar — K × 2N matrix; row i = i-th Z̄ logical operator (symplectic)

  function deriveLogicals({ A2, C1, C2, E2 }, r, s, K, N, colPerm) {
    // Transposed sub-matrices required by the formulas.
    // When s=0, E2 and C1 are empty so transpose() returns []; use zeros() instead
    // to preserve the K dimension needed by the subsequent hstack/add calls.
    const A2T = transpose(A2);                           // K × r
    const C2T = transpose(C2);                           // K × r
    const E2T = s > 0 ? transpose(E2) : zeros(K, 0);    // K × s  (K×0 when s=0)
    const C1T = s > 0 ? transpose(C1) : zeros(0, r);    // s × r  (0×r when s=0)

    // Shared zero blocks and identity
    const zKr = zeros(K, r);
    const zKs = zeros(K, s);  // K×0 when s=0 — hstack handles gracefully
    const zKK = zeros(K, K);
    const IK  = eye(K);

    // X̄
    //
    // X-part: [ 0_{K×r} | E2^T_{K×s} | I_K ]
    // Z-part: [ (E2^T·C1^T + C2^T)_{K×r} | 0_{K×s} | 0_{K×K} ]
    //
    // When s=0 the product E2^T·C1^T is zeros(K,r) so ZcorrX = C2T directly.

    const ZcorrX = s > 0 ? add(mul(E2T, C1T), C2T) : clone(C2T); // K × r

    const X_bar = hstack(
      hstack(hstack(zKr, E2T), IK),           // X-part: K × N
      hstack(hstack(ZcorrX, zKs), zKK)         // Z-part: K × N
    ); // K × 2N

    // Z̄
    //
    // X-part: [ 0_{K×r} | 0_{K×s} | 0_{K×K} ]   (pure Z logical — no X component)
    // Z-part: [ A2^T_{K×r} | 0_{K×s} | I_K ]

    const Z_bar = hstack(
      hstack(hstack(zKr, zKs), zKK),           // X-part: K × N  (all zeros)
      hstack(hstack(A2T, zKs), IK)             // Z-part: K × N
    ); // K × 2N

    const unpermute = (M) => M.map(row => {
      const orig = new Array(2 * N).fill(0);
      for (let i = 0; i < N; i++) {
        orig[colPerm[i]] = row[i];
        orig[colPerm[i] + N] = row[i + N];
      }
      return orig;
    });

    return { X_bar: unpermute(X_bar), Z_bar: unpermute(Z_bar) };
  }

  // Input Parsing & Validation
  //
  // Parse raw textarea strings into 2-D integer arrays.
  // Accepts GF(2) entries (0, 1) and GF(4) entries (0, 1, w, w2).
  //
  // The engine processes all GF(4) matrices internally using integers 0-3.
  // This parser acts as a translator for user input:
  //   0  -> 0 (I)
  //   1  -> 1 (X)
  //   w  -> 2 (Z)
  //   w2 -> 3 (Y)

  // Parse a whitespace/comma-delimited matrix string into a 2-D integer array.
  // Returns null if the string is empty, has unrecognized tokens, or ragged rows.
  function parseMatrix(text) {
    const rows = text
      .trim()
      .split(/\n/)
      .filter(l => l.trim().length > 0)
      .map(line =>
        line.trim()
            .split(/[\s,]+/)
            .map(v => {
              const lv = v.toLowerCase();
              if (lv === "w" || lv === "ω") {
                return 2;
              } else if (lv === "w2" || lv === "w^2" || lv === "ω2" || lv === "ω²") {
                return 3;
              } else {
                const n = parseInt(v, 10);
                return isNaN(n) ? null : n;
              }
            })
      );

    for (const row of rows) {
      if (row.some(v => v === null))       return null; // unrecognized token
      if (row.length !== rows[0].length)   return null; // ragged rows
    }
    return rows.length > 0 ? rows : null;
  }

  // Validate that all entries are exactly 0 or 1 (GF(2)).
  function validateGF2(M) {
    return M.every(row => row.every(v => v === 0 || v === 1));
  }

  // Validate that all entries are in {0, 1, 2, 3} (GF(4)).
  function validateGF4(M) {
    return M.every(row => row.every(v => v >= 0 && v <= 3));
  }


  // Quantum State Simulation (Complex Hilbert Space)
  //
  // Implements the MATLAB reference pipeline:
  //   func_stabilizer_gen.m  → buildStabilizerOp
  //   func_dynamic_kron.m    → cKron (sequential Kronecker product)
  //
  // Workflow (mirrors quantum_hamming_codes_5_1_3.m):
  //   1. buildStabilizerOps(Hx, Hz)     → [w1, w2, …, wr]
  //   2. buildCodespaceProjector(ws, N) → w_all  = ∏(I + wᵢ)/2
  //   3. buildKet0N(N)                  → |00…0⟩ (length-2^N column vector)
  //   4. encodeKet0L(w_all, ket0N)      → normalize(w_all |00…0⟩)  = |0_L⟩
  //
  // COMPLEXITY: All matrices are 2^N × 2^N complex.  Practical for N ≤ 12.
  // For syndrome computation only, use Section 10 (GF(2) — O(r·N) per error).

  // Complex-number helpers
  // Represented as [re, im] pairs.

  function cAdd([ar, ai], [br, bi])  { return [ar + br,          ai + bi]; }
  function cMul([ar, ai], [br, bi])  { return [ar * br - ai * bi, ar * bi + ai * br]; }
  function cScale([r, i], s)         { return [r * s, i * s]; }
  function cAbs2([r, i])             { return r * r + i * i; }

  // Complex-matrix helpers

  function cZeros(m, n) {
    return Array.from({ length: m }, () => Array.from({ length: n }, () => [0, 0]));
  }

  function cEye(n) {
    const M = cZeros(n, n);
    for (let i = 0; i < n; i++) M[i][i] = [1, 0];
    return M;
  }

  // Matrix × Matrix  (A: m×k,  B: k×n  →  C: m×n)
  function cMatMul(A, B) {
    const m = A.length, k = A[0].length, n = B[0].length;
    const C = cZeros(m, n);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        for (let p = 0; p < k; p++)
          C[i][j] = cAdd(C[i][j], cMul(A[i][p], B[p][j]));
    return C;
  }

  // Kronecker product  A ⊗ B  (func_dynamic_kron equivalent)
  function cKron(A, B) {
    const m = A.length, n = A[0].length;
    const p = B.length, q = B[0].length;
    const C = cZeros(m * p, n * q);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        for (let r = 0; r < p; r++)
          for (let s = 0; s < q; s++)
            C[i * p + r][j * q + s] = cMul(A[i][j], B[r][s]);
    return C;
  }

  // Matrix × column-vector  (A: m×n,  v: length-n  →  length-m)
  function cMatVec(A, v) {
    const m = A.length, n = v.length;
    const res = Array.from({ length: m }, () => [0, 0]);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        res[i] = cAdd(res[i], cMul(A[i][j], v[j]));
    return res;
  }

  // 2×2 Pauli gate matrices
  //
  //   I = [[1, 0],[0, 1]]
  //   X = [[0, 1],[1, 0]]
  //   Y = i·[[0,-1],[1, 0]]   (note: imaginary unit i)
  //   Z = [[1, 0],[0,-1]]

  const PAULI_GATES = {
    I: [[[1, 0], [0, 0]], [[0, 0], [1, 0]]],
    X: [[[0, 0], [1, 0]], [[1, 0], [0, 0]]],
    Y: [[[0, 0], [0, -1]], [[0, 1], [0, 0]]],  // Y = i·[[0,-1],[1,0]]
    Z: [[[1, 0], [0, 0]], [[0, 0], [-1, 0]]],
  };

  // Stabilizer generator (func_stabilizer_gen.m equivalent)
  //
  // Given row i of Hx and Hz, build the 2^N × 2^N complex operator wᵢ:
  //
  //   Hx[i][j]=1 ∧ Hz[i][j]=1  →  Y on qubit j
  //   Hx[i][j]=1 ∧ Hz[i][j]=0  →  X on qubit j
  //   Hx[i][j]=0 ∧ Hz[i][j]=1  →  Z on qubit j
  //   otherwise                 →  I on qubit j
  //
  // Full operator = G₀ ⊗ G₁ ⊗ … ⊗ G_{N-1}   (Kronecker product left-to-right)

  function buildStabilizerOp(Hx_row, Hz_row) {
    const N = Hx_row.length;
    let op = null;
    for (let j = 0; j < N; j++) {
      const x = Hx_row[j], z = Hz_row[j];
      let gate;
      if      (x === 1 && z === 1) gate = PAULI_GATES.Y;
      else if (x === 1)            gate = PAULI_GATES.X;
      else if (z === 1)            gate = PAULI_GATES.Z;
      else                         gate = PAULI_GATES.I;
      op = (op === null) ? gate : cKron(op, gate);
    }
    return op; // 2^N × 2^N complex matrix
  }

  // Build all r stabilizer operators from Hx and Hz.
  // Returns [ w1, w2, …, wr ]  (each a 2^N × 2^N complex matrix).

  function buildStabilizerOps(Hx, Hz) {
    return Hx.map((row, i) => buildStabilizerOp(row, Hz[i]));
  }

  // Codespace projector (w_all, the "transmitter")
  //
  // The codespace is the +1 eigenspace of every stabilizer.
  // The projector onto the codespace is:
  //
  //   w_all = ∏ᵢ (I₂ₙ + wᵢ) / 2
  //
  // Applying w_all to any state vector extracts its codespace component.

  function buildCodespaceProjector(stabilizers, N) {
    const dim = 1 << N; // 2^N
    let proj = cEye(dim);
    for (const w of stabilizers) {
      // Pᵢ = (I + wᵢ) / 2
      const Pi = cZeros(dim, dim);
      for (let i = 0; i < dim; i++)
        for (let j = 0; j < dim; j++) {
          const identity = (i === j) ? [1, 0] : [0, 0];
          Pi[i][j] = cScale(cAdd(identity, w[i][j]), 0.5);
        }
      proj = cMatMul(proj, Pi);
    }
    return proj; // 2^N × 2^N complex matrix
  }

  // Initial state |00…0⟩
  //
  // Returns the computational-basis zero state for N qubits as a
  // column vector of length 2^N:  [1, 0, 0, …, 0]^T.

  function buildKet0N(N) {
    const dim = 1 << N;
    const ket = Array.from({ length: dim }, () => [0, 0]);
    ket[0] = [1, 0];
    return ket;
  }

  // Logical zero state |0_L⟩
  //
  // |0_L⟩ = normalize( w_all · |00…0⟩ )
  //
  // Projecting the computational zero onto the codespace yields the equal
  // superposition of all stabilizer code words — the logical |0⟩ state.

  function encodeKet0L(wAll, ket0N) {
    const ket = cMatVec(wAll, ket0N);
    const norm = Math.sqrt(ket.reduce((acc, c) => acc + cAbs2(c), 0));
    if (norm < 1e-10) return ket; // degenerate — should not happen for valid codes
    return ket.map(c => cScale(c, 1 / norm));
  }


  // Syndrome Look-Up Table (GF(2) - fast path)
  //
  // For Pauli errors, syndrome measurement is equivalent (by the stabilizer
  // formalism) to a pure GF(2) calculation — no complex matrices needed:
  //
  //   sᵢ = ( Hx_i · ez  +  Hz_i · ex ) mod 2
  //
  // where:
  //   ex[j] = 1  if the error on qubit j has an X component  (X or Y)
  //   ez[j] = 1  if the error on qubit j has a Z component  (Y or Z)
  //
  // This matches the quantum measurement result exactly and runs in O(r·N)
  // per error, making it suitable for any code size.

  // Enumerate all 3N + 1 single-qubit errors (including no-error I…I).
  // Returns an array of { label, ex[], ez[] }.

  function enumerateSingleErrors(N) {
    const errors = [{
      label: 'I'.repeat(N),
      ex: new Array(N).fill(0),
      ez: new Array(N).fill(0),
    }];
    for (const [p, ex, ez] of [['X', 1, 0], ['Y', 1, 1], ['Z', 0, 1]]) {
      for (let j = 0; j < N; j++) {
        const exV = new Array(N).fill(0); exV[j] = ex;
        const ezV = new Array(N).fill(0); ezV[j] = ez;
        errors.push({
          label: 'I'.repeat(j) + p + 'I'.repeat(N - j - 1),
          ex: exV, ez: ezV,
        });
      }
    }
    return errors;
  }

  // Compute the GF(2) syndrome for a given error vector (ex, ez).
  // Returns a binary array of length r (number of stabilizer rows).
  //   sᵢ = (Hx_i · ez + Hz_i · ex) mod 2

  function computeSyndrome(Hx, Hz, ex, ez) {
    const m = Hx.length, N = Hx[0].length;
    return Array.from({ length: m }, (_, i) => {
      let bit = 0;
      for (let j = 0; j < N; j++)
        bit ^= (Hx[i][j] & ez[j]) ^ (Hz[i][j] & ex[j]);
      return bit;
    });
  }

  // Build the raw syndrome table: array of { label, syndrome, syndromeStr }.
  // Used internally and exported as buildRawSyndromeLUT.

  function buildRawSyndromeLUT(Hx, Hz) {
    const N = Hx[0].length;
    return enumerateSingleErrors(N).map(e => {
      const s = computeSyndrome(Hx, Hz, e.ex, e.ez);
      return { label: e.label, syndrome: s, syndromeStr: s.join('') };
    });
  }


  // High-Level Simulator API
  //
  // Provides the CODE_TYPES registry, PRESETS catalogue, function aliases for
  // backwards-compatible naming, circuit descriptors, the enriched syndrome
  // LUT (with degeneracy detection and correction labels), and code distance.
  //
  // These functions are consumed directly by qecc-simulator.js.

  // Code-type configuration registry
  //
  // Each entry defines how to validate user-supplied matrices and how to
  // assemble the canonical Hx/Hz for that code family.

  const CODE_TYPES = {
    'dual-css': {
      label: 'Dual-containing CSS',
      isCSS: true,
      validate([Hx]) {
        if (!Hx || !Hx.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} is empty.` };
        if (Hx.some(r => r.length !== Hx[0].length))
          return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} has ragged rows.` };
        // Self-orthogonality: Hx · Hxᵀ = 0 mod 2
        if (!isZero(mul(Hx, transpose(Hx))))
          return { ok: false, error: `Stabilizers do not commute. Symplectic inner product ${GateMath.toHTML('SIP \\neq 0 \\pmod 2')}.` };
        return { ok: true };
      },
      buildPCM([Hx]) {
        const r = Hx.length, n = Hx[0].length;
        return {
          Hx: vstack(Hx, zeros(r, n)),
          Hz: vstack(zeros(r, n), Hx)
        };
      },
    },

    'nondual-css': {
      label: 'Non-dual CSS',
      isCSS: true,
      validate([Hx, Hz]) {
        if (!Hx || !Hx.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} is empty.` };
        if (!Hz || !Hz.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H_Z')} is empty.` };
        if (Hx[0].length !== Hz[0].length)
          return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} and ${GateMath.toHTML('H_Z')} must have the same number of columns.` };
        if (!isZero(mul(Hx, transpose(Hz))))
          return { ok: false, error: `Stabilizers do not commute. Symplectic inner product ${GateMath.toHTML('SIP \\neq 0 \\pmod 2')}.` };
        return { ok: true };
      },
      buildPCM([Hx, Hz]) {
        const rx = Hx.length, rz = Hz.length, n = Hx[0].length;
        return {
          Hx: vstack(Hx, zeros(rz, n)),
          Hz: vstack(zeros(rx, n), Hz)
        };
      },
    },

    'non-css': {
      label: 'Non-CSS',
      isCSS: false,
      validate([Hx, Hz]) {
        if (!Hx || !Hx.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} is empty.` };
        if (!Hz || !Hz.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H_Z')} is empty.` };
        if (Hx[0].length !== Hz[0].length)
          return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} and ${GateMath.toHTML('H_Z')} must have the same number of columns.` };
        if (Hx.length !== Hz.length)
          return { ok: false, error: `Matrix of ${GateMath.toHTML('H_X')} and ${GateMath.toHTML('H_Z')} must have the same number of rows for a non-CSS code.` };
        const sip = add(mul(Hx, transpose(Hz)), mul(Hz, transpose(Hx)));
        if (!isZero(sip))
          return { ok: false, error: `Stabilizers do not commute. Symplectic inner product ${GateMath.toHTML('SIP \\neq 0 \\pmod 2')}.` };
        return { ok: true };
      },
      buildPCM([Hx, Hz]) { return { Hx, Hz }; },
    },

    'custom': {
      label: 'Custom (GF(4))',
      isCSS: false,
      validate([Hx, Hz]) {
        if (!Hx || !Hx.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H')} produced empty ${GateMath.toHTML('H_X')}.` };
        if (!Hz || !Hz.length) return { ok: false, error: `Matrix of ${GateMath.toHTML('H')} produced empty ${GateMath.toHTML('H_Z')}.` };
        const sip = add(mul(Hx, transpose(Hz)), mul(Hz, transpose(Hx)));
        if (!isZero(sip))
          return { ok: false, error: `Stabilizers do not commute. Symplectic inner product ${GateMath.toHTML('SIP \\neq 0 \\pmod 2')}.` };
        return { ok: true };
      },
      buildPCM([Hx, Hz]) { return { Hx, Hz }; },
    },
  };

  // Preset code catalogue
  //
  // GF(4) values: 0=I, 1=X, 2(w)=Z, 3(w2)=Y

  const PRESETS = {
    '3-1-1-bitflip': {
      id: '3-1-1-bitflip',
      name: '[[3,1,1]] Bit-flip Codes',
      codeType: 'Non-CSS',
      query: 'pcm=gf2&type=non-css&hx=0+0+0%0A0+0+0&hz=1+1+0%0A0+1+1'
    },
    '5-1-3-perfect': {
      id: '5-1-3-perfect',
      name: '[[5,1,3]] Perfect Codes',
      codeType: 'Custom',
      query: 'pcm=gf4&type=custom&h=1+w+w+1+0%0A0+1+w+w+1%0A1+0+1+w+w%0Aw+1+0+1+w'
    },
    '7-1-3-steane': {
      id: '7-1-3-steane',
      name: '[[7,1,3]] Steane Codes',
      codeType: 'Dual-containing CSS',
      query: 'pcm=gf2&type=dual-css&hx=1+0+0+1+0+1+1%0A0+1+0+1+1+0+1%0A0+0+1+0+1+1+1'
    },
    '9-1-3-shor': {
      id: '9-1-3-shor',
      name: '[[9,1,3]] Shor Codes',
      codeType: 'Non-dual containing CSS',
      query: 'pcm=gf2&type=nondual-css&hx=1+1+1+1+1+1+0+0+0%0A0+0+0+1+1+1+1+1+1&hz=1+1+0+0+0+0+0+0+0%0A0+1+1+0+0+0+0+0+0%0A0+0+0+1+1+0+0+0+0%0A0+0+0+0+1+1+0+0+0%0A0+0+0+0+0+0+1+1+0%0A0+0+0+0+0+0+0+1+1'
    },
  };

  // Stabilizer circuit descriptor
  //
  // Describes each stabilizer generator as a Pauli string and a list of
  // per-qubit gate assignments. Mirrors func_stabilizer_gen.m logic.
  //
  // Returns: { n, k, r, generators[] }
  // Each generator: { index, label, pauliStr, gates[{qubit, pauli}] }

  function describeStabilizerCircuit(n, k, Hx, Hz) {
    const r = Hx.length;
    const generators = Hx.map((hxRow, i) => {
      const gates = [];
      const chars = [];
      for (let j = 0; j < n; j++) {
        const x = hxRow[j], z = Hz[i][j];
        if      (x === 1 && z === 1) { gates.push({ qubit: j, pauli: 'Y' }); chars.push('Y'); }
        else if (x === 1)            { gates.push({ qubit: j, pauli: 'X' }); chars.push('X'); }
        else if (z === 1)            { gates.push({ qubit: j, pauli: 'Z' }); chars.push('Z'); }
        else                         { chars.push('I'); }
      }
      return { index: i + 1, label: `g${i + 1}`, pauliStr: chars.join(''), gates };
    });
    return { n, k, r, generators };
  }

  // Encoder circuit descriptor
  //
  // Describes the encoding circuit as a sequence of gate steps.
  // Based on the RREF of [Hx | Hz]: Hadamard on ancilla qubits, then
  // controlled-Pauli gates determined by the RREF rows, then Hadamard again.
  //
  // Returns: { n, k, r, ancillaQubits[], steps[{type, qubit|control+target}] }

  function describeEncoderCircuit(n, k, r, xBar, HxRref, HzRref) {
    const steps = [];

    // Phase 1: X_bar mapping
    for (let i = 0; i < k; i++) {
      const targets = [];
      for (let j = r; j < n - k; j++) {
        if (xBar[i] && xBar[i][j]) {
          targets.push({ qubit: j, pauli: 'X' });
        }
      }
      if (targets.length > 0) {
        steps.push({ type: 'MULTI_CTRL', control: n - k + i, targets });
      }
    }

    // Phase 2: Stabilizer generation
    for (let i = 0; i < r; i++) {
      steps.push({ type: 'H', qubit: i });
      
      const targets = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const x = HxRref[i] ? HxRref[i][j] : 0;
        const z = HzRref[i] ? HzRref[i][j] : 0;
        
        if (x === 1 && z === 1) {
          targets.push({ qubit: j, pauli: 'Y' });
        } else if (x === 1) {
          targets.push({ qubit: j, pauli: 'X' });
        } else if (z === 1) {
          targets.push({ qubit: j, pauli: 'Z' });
        }
      }
      if (targets.length > 0) {
        steps.push({ type: 'MULTI_CTRL', control: i, targets });
      }
    }

    return { n, k, r, steps };
  }

  // Enriched syndrome LUT (simulator-ready)
  //
  // Extends the raw LUT from Section 10 with:
  //   correction  — Pauli string to apply to correct the detected error
  //                 (same as label for non-degenerate syndromes; first entry for degeneracies)
  //   degeneracy  — null if syndrome is non-degenerate; otherwise comma-joined labels
  //
  // Returns: { lut, hasDegeneracy }
  // lut entries: { label, syndromeStr, correction, degeneracy }

  function buildSyndromeLUT(Hx, Hz) {
    const N = Hx[0].length;
    const errors = enumerateSingleErrors(N);

    // Compute syndromes
    const entries = errors.map(e => ({
      label: e.label,
      syndromeStr: computeSyndrome(Hx, Hz, e.ex, e.ez).join(''),
    }));

    // Group by syndrome string to detect degeneracies
    const synMap = new Map();
    entries.forEach(e => {
      if (!synMap.has(e.syndromeStr)) synMap.set(e.syndromeStr, []);
      synMap.get(e.syndromeStr).push(e.label);
    });

    let hasDegeneracy = false;
    const lut = entries.map(e => {
      const group = synMap.get(e.syndromeStr);
      const degeneracy = group.length > 1
        ? group.filter(l => l !== e.label).join(', ')
        : null;
      if (degeneracy) hasDegeneracy = true;
      // correction = the first (lowest-index) error mapped to this syndrome
      const correction = group[0];
      return { label: e.label, syndromeStr: e.syndromeStr, correction, degeneracy };
    });

    return { lut, hasDegeneracy };
  }

  // Whether the code can correct all single-qubit errors (no syndrome degeneracies).
  function checkSingleErrorCorrection(_lut, hasDegeneracy) {
    return !hasDegeneracy;
  }

  // Generate all 2^m linear combinations of m vectors over GF(2).
  // Includes the all-zero vector.
  function generateCombinations(matrix) {
    const m = matrix.length;
    if (m === 0) return [];
    const len = matrix[0].length;
    const numCombs = 1 << m;
    const combs = new Array(numCombs);
    for (let i = 0; i < numCombs; i++) {
      const v = new Array(len).fill(0);
      for (let j = 0; j < m; j++) {
        if ((i >> j) & 1) {
          for (let k = 0; k < len; k++) {
            v[k] ^= matrix[j][k];
          }
        }
      }
      combs[i] = v;
    }
    return combs;
  }

  // Compute true code distance by finding the minimum weight of a non-trivial logical operator.
  //   d = min { weight(E) : E in N(S) \ S }
  //
  // Parameters:
  //   H_basis - Basis of the stabilizer group (r_total x 2n)
  //   X_bar   - Logical X operators (K x 2n)
  //   Z_bar   - Logical Z operators (K x 2n)
  function computeDistance(H_basis, X_bar, Z_bar) {
    const n = H_basis.length > 0 ? H_basis[0].length / 2 : X_bar[0].length / 2;
    const K = X_bar.length;
    
    if (K === 0) return n;

    const logicalGens = vstack(X_bar, Z_bar);
    
    // Generate all stabilizers (trivial logicals)
    const stabilizers = generateCombinations(H_basis);
    if (stabilizers.length === 0) {
      stabilizers.push(new Array(2 * n).fill(0));
    }
    
    // Iterate through all 2^(2K) - 1 non-trivial logical cosets
    const numLogicalCosets = 1 << logicalGens.length;
    let minDistance = n;
    
    for (let i = 1; i < numLogicalCosets; i++) {
      // Build the representative for this coset
      const rep = new Array(2 * n).fill(0);
      for (let j = 0; j < logicalGens.length; j++) {
        if ((i >> j) & 1) {
          for (let k = 0; k < 2 * n; k++) {
            rep[k] ^= logicalGens[j][k];
          }
        }
      }
      
      // Check weight of every operator in this coset (rep + S)
      for (const S of stabilizers) {
        let w = 0;
        for (let k = 0; k < n; k++) {
          if ((rep[k] ^ S[k]) !== 0 || (rep[k + n] ^ S[k + n]) !== 0) {
            w++;
          }
        }
        if (w < minDistance) {
          minDistance = w;
        }
      }
    }
    
    return minDistance;
  }


  return {
    zeros,
    eye,
    clone,
    add,
    mul,
    transpose,
    isZero,
    rrefGF2,
    rank,
    kernel,
    hstack,
    vstack,
    blockDiag,
    buildSymplectic,
    buildBlockDiag,
    gf4ToSymplectic,
    checkSIP,
    computeNKr,
    toStandardForm,
    deriveLogicals,
    parseMatrix,
    validateGF2,
    validateGF4,
    PAULI_GATES,
    buildStabilizerOp,
    buildStabilizerOps,
    buildCodespaceProjector,
    buildKet0N,
    encodeKet0L,
    enumerateSingleErrors,
    computeSyndrome,
    buildRawSyndromeLUT,
    CODE_TYPES,
    PRESETS,
    describeStabilizerCircuit,
    describeEncoderCircuit,
    buildSyndromeLUT,
    checkSingleErrorCorrection,
    computeDistance,
  };
})();

