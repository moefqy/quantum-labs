// QUANTUM LABS — Gate Symbol Renderer
// Translates gate registry entries into symbol descriptors and connector geometry.
// Pure logic — no DOM creation, no CSS class names.

export const GateSymbolRenderer = (() => {
  "use strict";

  // Mini-circuit grid layout constants (must match mini-circuit.css)
  const MINI_ROW_PITCH        = 34;  // 32px row + 2px gap
  const CONNECTOR_BASE_OFFSET = 15;  // center of 30px cell height
  const BOX_TARGET_SHRINK     = 15;  // half cell height — stop connector at box edge

  // Symbol keys recognised from the gate registry's `render` field
  const KNOWN_SYMBOLS = new Set(["dot", "cross", "swap", "meter", "cbit-dot"]);

  // Resolves what symbol to draw for a given gate + role.
  // Returns { kind, label? } — e.g. { kind: "dot" } or { kind: "box-label", label }
  function resolveGateSymbol(gateDef, role) {
    if (!gateDef) {
      return { kind: "none" };
    }

    // Single-qubit gate: always a labeled box
    if (role === "single" || gateDef.type !== "multi") {
      const label = gateDef.palette?.label ?? `\\mathbf{${gateDef.name || "?"}}`;
      return { kind: "box-label", label };
    }

    // Multi-qubit gate: pick symbol from render definition
    const renderDef = gateDef.render;
    if (!renderDef) {
      const label = gateDef.palette?.label ?? `\\mathbf{${gateDef.name || "?"}}`;
      return { kind: "box-label", label };
    }

    const symbolKey = role === "control" ? renderDef.control : renderDef.target;
    if (!symbolKey) {
      return { kind: "none" };
    }

    if (KNOWN_SYMBOLS.has(symbolKey)) {
      return { kind: symbolKey };
    }

    // Raw KaTeX string (e.g. '\\mathbf{Y}')
    return { kind: "box-label", label: symbolKey };
  }

  // Computes connector line { top, height } between topmost and bottommost qubits.
  // mode "measured" — pixel-accurate via getBoundingClientRect()
  // mode "fixed"    — grid-based using rowHeight/baseOffset/boxShrink
  function computeConnectorSpan(opts) {
    if (opts.mode === "measured") {
      const { topRect, bottomRect, boardRect } = opts;
      const top = topRect.top + topRect.height / 2 - boardRect.top;
      const height =
        bottomRect.top + bottomRect.height / 2 - topRect.top - topRect.height / 2;
      return { top, height };
    }

    if (opts.mode === "fixed") {
      const {
        minQubit,
        maxQubit,
        rowHeight,
        baseOffset,
        boxShrink,
        topIsBoxTarget = false,
        bottomIsBoxTarget = false,
      } = opts;

      let top = baseOffset;
      let height = (maxQubit - minQubit) * rowHeight;

      if (topIsBoxTarget) {
        top += boxShrink;
        height -= boxShrink;
      }
      if (bottomIsBoxTarget) {
        height -= boxShrink;
      }

      return { top, height };
    }

    throw new Error(`computeConnectorSpan: unknown mode "${opts.mode}"`);
  }

  // Returns true if the cell renders as a box-label target (connector should stop short)
  function isBoxTargetCell(cell, getGate) {
    if (!cell || cell.role !== "target") {
      return false;
    }
    const gateDef = getGate(cell.gate);
    const symbol = resolveGateSymbol(gateDef, "target");
    return symbol.kind === "box-label";
  }

  return {
    MINI_ROW_PITCH,
    CONNECTOR_BASE_OFFSET,
    BOX_TARGET_SHRINK,
    resolveGateSymbol,
    computeConnectorSpan,
    isBoxTargetCell,
  };
})();
