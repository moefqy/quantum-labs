// QUANTUM LABS — Test Suite Runner
// Executes all domain unit tests and reports aggregated results.
// Run with: node tests/run-all.js

import { runGatesTests } from "./gates.test.js";
import { runEngineTests } from "./engine.test.js";
import { runQECCTests } from "./qecc.test.js";

process.env.NODE_ENV = "test-runner";

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║         QUANTUM LABS — FULL TEST SUITE RUNNER            ║");
console.log("╚══════════════════════════════════════════════════════════╝");

const startTime = performance.now();

const gatesResult = runGatesTests();
const engineResult = runEngineTests();
const qeccResult = runQECCTests();

const totalPassed =
  gatesResult.passed + engineResult.passed + qeccResult.passed;
const totalFailed =
  gatesResult.failed + engineResult.failed + qeccResult.failed;
const elapsedMs = (performance.now() - startTime).toFixed(2);

console.log("\n" + "█".repeat(60));
console.log(`  ALL SUITES FINISHED in ${elapsedMs}ms`);
console.log(`  Summary: ${totalPassed} passed, ${totalFailed} failed across 3 test suites`);
console.log("█".repeat(60) + "\n");

if (totalFailed > 0) {
  process.exit(1);
}
