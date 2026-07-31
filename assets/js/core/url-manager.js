// QUANTUM LABS — Url Manager
// Handles silent URL syncing and circuit restoration from URL parameters on page load.

import { AppState } from "./app-state.js";
import { CircuitModel } from "../tools/circuit-builder/circuit-model.js";
import { CircuitRenderer } from "../tools/circuit-builder/circuit-renderer.js";
import { CircuitSerializer } from "../tools/circuit-builder/circuit-serializer.js";
import { Router } from "../router.js";
import { SimulatorPage } from "../pages/simulator.js";
import { QECCSerializer } from "../tools/qecc-simulator/qecc-serializer.js";
import { QECCMath } from "../tools/qecc-simulator/qecc-math.js";
import { qeccSimulatorInstance } from "../tools/qecc-simulator/qecc-simulator.js";

// Silently updates the browser URL to reflect the current circuit state.
export function syncUrl() {
  const mode = AppState.getMode();
  const shots = AppState.getShots();
  const params = CircuitSerializer.encode(CircuitModel, mode, shots);
  const newUrl = `${window.location.pathname}?${params}`;
  window.history.replaceState(null, "", newUrl);
}

// On page load: if URL has circuit params, restore the circuit and open the simulator.
export async function restoreFromUrl() {
  if (!window.location.search) {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Determine the target tool based on URL signatures
  let targetTool = null;
  if (searchParams.has('pcm') || searchParams.has('hx') || searchParams.has('hz')) {
    targetTool = "qecc-simulator";
  } else if (searchParams.has('qubits') || searchParams.has('gates')) {
    targetTool = "circuit-builder";
  }

  if (!targetTool) {
    return;
  }

  // Navigate to simulator if not already there and wait for transition
  if (!window.location.pathname.includes("/simulator")) {
    await Router.navigate(`/simulator${window.location.search}`);
  }

  // Open the target tool modal so the DOM exists for rendering
  SimulatorPage.openTool(targetTool);

  // Handle tool-specific restoration logic
  switch (targetTool) {
    case "qecc-simulator":
      // Restore UI after DOM is mounted
      setTimeout(() => {
        if (qeccSimulatorInstance) {
          QECCSerializer.initFromURL(qeccSimulatorInstance, QECCMath);
        }
      }, 60);
      break;

    case "circuit-builder": {
      const result = CircuitModel.loadFromUrlParams(window.location.search);
      if (result) {
        // Restore UI after DOM is mounted
        setTimeout(() => {
          AppState.restoreFromResult(result);
          CircuitRenderer.render();
        }, 60);
      }
      break;
    }
  }
}
