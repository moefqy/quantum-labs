// QUANTUM LABS — Url Manager
// Handles silent URL syncing and circuit restoration from URL parameters on page load.

import { AppState } from "./app-state.js";
import { CircuitModel } from "../circuit/circuit-model.js";
import { CircuitRenderer } from "../circuit/circuit-renderer.js";
import { CircuitSerializer } from "../circuit/circuit-serializer.js";
import { Router } from "../router.js";
import { SimulatorPage } from "../pages/simulator.js";

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

  const result = CircuitModel.loadFromUrlParams(window.location.search);
  if (!result) {
    return;
  }

  // Navigate to simulator if not already there and wait for transition
  if (!window.location.pathname.includes("/simulator")) {
    await Router.navigate(`/simulator${window.location.search}`);
  }

  // Open circuit builder so the DOM exists for rendering
  SimulatorPage.openTool("circuit-builder");

  // Restore UI after DOM is mounted
  setTimeout(() => {
    AppState.restoreFromResult(result);
    CircuitRenderer.render();
  }, 60);
}
