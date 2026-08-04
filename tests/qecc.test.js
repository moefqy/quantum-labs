// QUANTUM LABS — QECC Algebra Tests
// Validates stabilizer codes, logical operators, syndrome LUTs, and code distance.
// Run with: node tests/qecc.test.js

import { QECCMath } from "../assets/js/tools/qecc-simulator/qecc-math.js";
import { createTestSuite, expect } from "./helpers.js";

export function runQECCTests() {
  const suite = createTestSuite("QECC Tests");
  const { test } = suite;

  console.log("\n§ QECC Preset Codes & Parameters");

  function buildPCM(pid) {
    const preset = QECCMath.PRESETS[pid];
    const params = new URLSearchParams(preset.query);
    const pcm = params.get("pcm"),
      type = params.get("type");
    if (pcm === "gf4") {
      const G = QECCMath.parseMatrix(
        decodeURIComponent(params.get("h").replace(/\+/g, " "))
      );
      return QECCMath.gf4ToSymplectic(G);
    }
    const hxR = QECCMath.parseMatrix(
      decodeURIComponent(params.get("hx").replace(/\+/g, " "))
    );
    if (type === "nondual-css") {
      const hzR = QECCMath.parseMatrix(
        decodeURIComponent(params.get("hz").replace(/\+/g, " "))
      );
      return QECCMath.CODE_TYPES["nondual-css"].buildPCM([hxR, hzR]);
    }
    if (type === "dual-css") {
      return QECCMath.CODE_TYPES["dual-css"].buildPCM([hxR]);
    }
    const hzR = QECCMath.parseMatrix(
      decodeURIComponent(params.get("hz").replace(/\+/g, " "))
    );
    return { Hx: hxR, Hz: hzR };
  }

  function fullPreset(pid) {
    const { Hx, Hz } = buildPCM(pid);
    const { N, K } = QECCMath.computeNKr(Hx, Hz);
    const sf = QECCMath.toStandardForm(Hx, Hz);
    const { X_bar, Z_bar } = QECCMath.deriveLogicals(
      sf.blocks,
      sf.r,
      sf.s,
      sf.K,
      sf.N,
      sf.colPerm
    );
    const H_sym = QECCMath.buildSymplectic(Hx, Hz);
    const d = QECCMath.computeDistance(H_sym, X_bar, Z_bar);
    return { N, K, d, Hx, Hz, X_bar, Z_bar, sf };
  }

  const expectedCodes = {
    "5-1-3-perfect": { N: 5, K: 1, d: 3 },
    "7-1-3-steane": { N: 7, K: 1, d: 3 },
    "9-1-3-shor": { N: 9, K: 1, d: 3 },
    "3-1-1-bitflip": { N: 3, K: 1, d: 1 },
  };

  for (const [pid, { N, K, d }] of Object.entries(expectedCodes)) {
    const r = fullPreset(pid);
    test("[[" + N + "," + K + "," + d + "]]: N=" + N, () =>
      expect(r.N).toBe(N)
    );
    test("[[" + N + "," + K + "," + d + "]]: K=" + K, () =>
      expect(r.K).toBe(K)
    );
    test("[[" + N + "," + K + "," + d + "]]: d=" + d + " (computeDistance)", () =>
      expect(r.d).toBe(d)
    );
  }

  console.log("\n§ QECC Logical Operators Commutativity");

  function checkCommute(L, Hx, Hz) {
    const N = Hx[0].length;
    const Lx = L.map((r) => r.slice(0, N));
    const Lz = L.map((r) => r.slice(N));
    return QECCMath.isZero(
      QECCMath.add(
        QECCMath.mul(Lx, QECCMath.transpose(Hz)),
        QECCMath.mul(Lz, QECCMath.transpose(Hx))
      )
    );
  }

  function checkAnticommute(X_bar, Z_bar, N) {
    return X_bar.every((xRow, i) => {
      const zRow = Z_bar[i];
      let sip = 0;
      for (let j = 0; j < N; j++) {
        sip ^= (xRow[j] & zRow[j + N]) ^ (xRow[j + N] & zRow[j]);
      }
      return sip === 1;
    });
  }

  for (const pid of ["5-1-3-perfect", "7-1-3-steane", "9-1-3-shor"]) {
    const { Hx, Hz, X_bar, Z_bar, sf } = fullPreset(pid);
    test(pid + ": X̄ commutes with all stabilizers", () => {
      if (!checkCommute(X_bar, Hx, Hz)) {
        throw new Error("SIP≠0");
      }
    });
    test(pid + ": Z̄ commutes with all stabilizers", () => {
      if (!checkCommute(Z_bar, Hx, Hz)) {
        throw new Error("SIP≠0");
      }
    });
    test(pid + ": X̄ and Z̄ anticommute (SIP=1)", () => {
      if (!checkAnticommute(X_bar, Z_bar, sf.N)) {
        throw new Error("Anticommutation failed");
      }
    });
  }

  console.log("\n§ QECC Syndrome LUT Correctness");

  test("Steane: no-error syndrome = 000000", () => {
    const { Hx, Hz } = buildPCM("7-1-3-steane");
    const { lut } = QECCMath.buildSyndromeLUT(Hx, Hz);
    const noErr = lut.find((e) => /^I+$/.test(e.label));
    if (!noErr || noErr.syndromeStr !== "000000") {
      throw new Error("Got " + noErr?.syndromeStr);
    }
  });

  test("Steane: all single-qubit errors have non-zero syndrome", () => {
    const { Hx, Hz } = buildPCM("7-1-3-steane");
    const { lut } = QECCMath.buildSyndromeLUT(Hx, Hz);
    for (const e of lut) {
      if (/^I+$/.test(e.label)) {
        continue;
      }
      if (e.syndromeStr === "000000") {
        throw new Error("Error " + e.label + " maps to zero syndrome");
      }
    }
  });

  test("Steane: no degenerate syndromes", () => {
    const { Hx, Hz } = buildPCM("7-1-3-steane");
    const { hasDegeneracy } = QECCMath.buildSyndromeLUT(Hx, Hz);
    if (hasDegeneracy) {
      throw new Error("Unexpectedly degenerate");
    }
  });

  test("[[5,1,3]]: no degenerate syndromes", () => {
    const { Hx, Hz } = buildPCM("5-1-3-perfect");
    const { hasDegeneracy } = QECCMath.buildSyndromeLUT(Hx, Hz);
    if (hasDegeneracy) {
      throw new Error("Unexpectedly degenerate");
    }
  });

  console.log("\n§ gf4ToSymplectic Edge Cases");

  test("All-I(0): Hx=zeros, Hz=zeros", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[0, 0, 0]]);
    expect(Hx[0]).toEqual([0, 0, 0]);
    expect(Hz[0]).toEqual([0, 0, 0]);
  });

  test("All-X(1): Hx=ones, Hz=zeros", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[1, 1, 1]]);
    expect(Hx[0]).toEqual([1, 1, 1]);
    expect(Hz[0]).toEqual([0, 0, 0]);
  });

  test("All-Z(2): Hx=zeros, Hz=ones", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[2, 2, 2]]);
    expect(Hx[0]).toEqual([0, 0, 0]);
    expect(Hz[0]).toEqual([1, 1, 1]);
  });

  test("All-Y(3): Hx=ones, Hz=ones", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[3, 3, 3]]);
    expect(Hx[0]).toEqual([1, 1, 1]);
    expect(Hz[0]).toEqual([1, 1, 1]);
  });

  test("Mixed [0,1,2,3]", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[0, 1, 2, 3]]);
    expect(Hx[0]).toEqual([0, 1, 0, 1]);
    expect(Hz[0]).toEqual([0, 0, 1, 1]);
  });

  test("Single-cell [[0]]", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([[0]]);
    expect(Hx[0]).toEqual([0]);
    expect(Hz[0]).toEqual([0]);
  });

  test("Multi-row: rows converted independently", () => {
    const { Hx, Hz } = QECCMath.gf4ToSymplectic([
      [1, 0],
      [0, 2],
    ]);
    expect(Hx[0]).toEqual([1, 0]);
    expect(Hz[0]).toEqual([0, 0]);
    expect(Hx[1]).toEqual([0, 0]);
    expect(Hz[1]).toEqual([0, 1]);
  });

  test("[[5,1,3]] GF(4) conversion passes SIP check", () => {
    const params = new URLSearchParams(QECCMath.PRESETS["5-1-3-perfect"].query);
    const G = QECCMath.parseMatrix(
      decodeURIComponent(params.get("h").replace(/\+/g, " "))
    );
    const { Hx, Hz } = QECCMath.gf4ToSymplectic(G);
    if (!QECCMath.checkSIP(Hx, Hz)) {
      throw new Error("SIP check failed");
    }
  });

  return suite.report();
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runQECCTests();
}
