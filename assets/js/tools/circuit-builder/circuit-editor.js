// QUANTUM LABS — Circuit Editor
// Shared interaction engine for all circuit grids in the project.
// Powers Circuit Builder and Entanglement Tracker with identical mechanics:
//   - Drag gate from palette → drop on slot
//   - Click gate in palette → click slot to place
//   - Multi-qubit gate state machine (click/drop first → click/drop second)
//   - Double-click or right-click placed gate → delete

export const CircuitEditor = (() => {
  "use strict";

  // Creates a new circuit editor instance bound to a specific grid + palette.
  // config
  // config.gridContainer      - The circuit grid DOM element.
  // config.paletteContainer   - The gate palette DOM element.
  // config.onPendingChange    - (pending | null) => void
  // pending = { gate, step, qubits, needed }
  function create({
    gridContainer,
    paletteContainer,
    paletteSelector,
    getGateInfo,
    onPlace,
    onDelete,
    onMove, // NEW: (oldStep, oldQubit, newStep, newQubit) => void
    onPendingChange,
    onBeforePlace, // optional: (step, qubit, gate, currentQubits) => boolean
  }) {
    // Internal state
    let selectedGate = null; // gate name currently active in palette
    let dragGate = null; // gate name being dragged (palette drag)
    let pending = null; // { gate, step, qubits: [], needed } for multi-gate

    // Bound event handlers kept for cleanup
    const _handlers = [];

    // PALETTE BINDINGS
    // Click-to-place: click palette button → click slot.
    // Drag-to-place: pointer-based drag (no HTML5 DnD — unreliable in modals).
    // Both modes converge on resolveGatePlacement().
    function bindPalette() {
      const btns = paletteContainer.querySelectorAll(paletteSelector);
      btns.forEach((btn) => {
        if (btn.dataset.disabled === "true" ||
        btn.classList.contains("disabled")) {
          return;
        }

        // Pointer-based interaction (handles both click and drag)
        // NOTE: We do NOT use a separate "click" listener because e.preventDefault()
        // on pointerdown (needed to prevent scroll-cancellation of pointer capture)
        // suppresses the native click event. Gate selection is handled in finishDrag.
        let ptrState = null;

        const onPointerDown = (e) => {
          if (btn.classList.contains("disabled")) {
            return;
          }
          if (e.button !== 0) {
            return;
          } // left click only
          // CRITICAL: prevent default so Chrome does not interpret this as a potential
          // scroll gesture inside the scrollable sidebar → prevents pointercancel
          e.preventDefault();
          ptrState = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            gate: btn.dataset.gate,
            dragging: false,
            ghost: null,
            activeSlot: null,
          };
          // Capture immediately so pointermove keeps firing on btn even outside it
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (err) {
            // Ignore capture errors on unsupported devices
          }
        };
        btn.addEventListener("pointerdown", onPointerDown);
        _handlers.push({ el: btn, type: "pointerdown", fn: onPointerDown });

        const onPointerMove = (e) => {
          if (!ptrState || e.pointerId !== ptrState.id) {
            return;
          }
          const dx = e.clientX - ptrState.startX;
          const dy = e.clientY - ptrState.startY;

          // Begin drag once cursor moves > 6px
          if (!ptrState.dragging && Math.sqrt(dx * dx + dy * dy) > 6) {
            ptrState.dragging = true;
            dragGate = ptrState.gate;

            // Ghost that follows cursor
            const ghost = document.createElement("div");
            ghost.className = "drag-ghost";
            const inner = document.createElement("div");
            inner.className = "placed-gate";
            inner.textContent = ptrState.gate;
            ghost.appendChild(inner);
            ghost.style.position = "fixed";
            ghost.style.pointerEvents = "none"; // must be none so elementFromPoint sees through it
            ghost.style.left = `${e.clientX - 22}px`;
            ghost.style.top = `${e.clientY - 22}px`;
            document.body.appendChild(ghost);
            ptrState.ghost = ghost;

            // Highlight valid drop zones
            gridContainer.querySelectorAll(".ql-drop-zone").forEach((s) => {
              if (!s.querySelector(".ql-placed-gate")) {
                s.classList.add("drop-ready");
              }
            });
          }

          if (!ptrState.dragging || !ptrState.ghost) {
            return;
          }

          // Move ghost with cursor
          ptrState.ghost.style.left = `${e.clientX - 22}px`;
          ptrState.ghost.style.top = `${e.clientY - 22}px`;

          // Find slot under cursor (hide ghost so it doesn't block elementFromPoint)
          ptrState.ghost.style.visibility = "hidden";
          const underEl = document.elementFromPoint(e.clientX, e.clientY);
          ptrState.ghost.style.visibility = "";
          const slot = underEl?.closest(".ql-drop-zone") || null;
          if (slot !== ptrState.activeSlot) {
            if (ptrState.activeSlot) {
              ptrState.activeSlot.classList.remove("drop-hover");
            }
            ptrState.activeSlot = slot;
            if (slot) {
              slot.classList.add("drop-hover");
            }
          }
        };
        btn.addEventListener("pointermove", onPointerMove);
        _handlers.push({ el: btn, type: "pointermove", fn: onPointerMove });

        const finishDrag = () => {
          if (!ptrState) {
            return;
          }
          const state = ptrState;
          ptrState = null;

          if (!state.dragging) {
            // Was a plain click — handle gate selection here
            // (click event is suppressed by e.preventDefault() in pointerdown)
            if (btn.classList.contains("disabled")) {
              return;
            }
            if (selectedGate === btn.dataset.gate) {
              clearSelectedGate();
              return;
            }
            selectedGate = btn.dataset.gate;
            paletteContainer
              .querySelectorAll(paletteSelector)
              .forEach((b) => b.classList.toggle("active", b === btn));
            gridContainer.classList.add("editor-placing");
            pending = null;
            if (onPendingChange) {
              onPendingChange(null);
            }
            return;
          }

          if (state.ghost) {
            state.ghost.remove();
          }
          clearDropHighlights();
          dragGate = null;

          if (state.activeSlot) {
            state.activeSlot.classList.remove("drop-hover");
            const step = parseInt(state.activeSlot.dataset.step);
            const qubit = parseInt(state.activeSlot.dataset.qubit);
            resolveGatePlacement(step, qubit, state.gate);
          }
        };
        btn.addEventListener("pointerup", finishDrag);
        _handlers.push({ el: btn, type: "pointerup", fn: finishDrag });

        const cancelDrag = () => {
          if (!ptrState) {
            return;
          }
          if (ptrState.ghost) {
            ptrState.ghost.remove();
          }
          clearDropHighlights();
          dragGate = null;
          ptrState = null;
        };
        btn.addEventListener("pointercancel", cancelDrag);
        _handlers.push({ el: btn, type: "pointercancel", fn: cancelDrag });
      });
    }

    let ignoreNextDelete = false;

    // SLOT BINDINGS (must be called after every re-render)
    // Click → place gate. Double-click / right-click → delete.
    // Also re-applies pending highlights to fresh DOM after a re-render.
    let lastSlotClickTime = 0;
    
    // Bind DOM events
    function bindSlots() {
      gridContainer.querySelectorAll(".ql-drop-zone").forEach((slot) => {
        // Click — place gate or complete multi-gate
        const onClick = (e) => {
          if (Date.now() - lastSlotClickTime < 250) {
            return;
          }
          
          // If clicking on a placed gate, don't intercept (let gate handlers work)
          if (e.target.closest(".ql-placed-gate") && !pending) {
            return;
          }

          const gateToPlace = pending ? pending.gate : selectedGate;
          if (!gateToPlace) {
            return;
          }

          lastSlotClickTime = Date.now();
          const step = parseInt(slot.dataset.step);
          const qubit = parseInt(slot.dataset.qubit);
          resolveGatePlacement(step, qubit, gateToPlace);
        };
        slot.addEventListener("click", onClick);

        // Double-click - Gate Deletion
        const onDblClick = (e) => {
          e.stopPropagation();
          if (ignoreNextDelete) {
            return;
          }
          const step = parseInt(slot.dataset.step);
          const qubit = parseInt(slot.dataset.qubit);
          onDelete(step, qubit);
        };
        slot.addEventListener("dblclick", onDblClick);
      });

      // Placed Gate Dragging
      gridContainer.querySelectorAll(".ql-placed-gate").forEach((gateEl) => {
        let ptrState = null;

        const onPointerDown = (e) => {
          if (e.button !== 0) {
            return;
          } // left click only
          
          // Don't drag if clicking the edit button icon
          if (e.target.closest(".edit-param-btn")) {
            return;
          }
          
          e.preventDefault(); // prevent scroll/click
          e.stopPropagation(); // prevent slot click
          const slot = gateEl.closest(".ql-drop-zone");
          let oldStep, oldQubit;
          if (slot) {
            oldStep = parseInt(slot.dataset.step);
            oldQubit = parseInt(slot.dataset.qubit);
          } else if (gateEl.classList.contains("span-gate-overlay")) {
            oldStep = parseInt(gateEl.dataset.step);
            oldQubit = parseInt(gateEl.dataset.qubit);
          } else {
            return;
          }
          
          ptrState = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            oldStep: oldStep,
            oldQubit: oldQubit,
            dragging: false,
            ghost: null,
            activeSlot: null,
          };
          try {
            gateEl.setPointerCapture(e.pointerId);
          } catch (err) {}
        };
        gateEl.addEventListener("pointerdown", onPointerDown);

        const onPointerMove = (e) => {
          if (!ptrState || e.pointerId !== ptrState.id) {
            return;
          }
          const dx = e.clientX - ptrState.startX;
          const dy = e.clientY - ptrState.startY;

          if (!ptrState.dragging && Math.sqrt(dx * dx + dy * dy) > 6) {
            ptrState.dragging = true;
            
            // Create ghost by cloning the actual gate element
            const ghost = gateEl.cloneNode(true);
            ghost.classList.add("drag-ghost");
            ghost.style.position = "fixed";
            ghost.style.pointerEvents = "none";
            ghost.style.left = `${e.clientX - 22}px`; // roughly center it
            ghost.style.top = `${e.clientY - 22}px`;
            ghost.style.zIndex = "1000"; // ensure it's on top
            document.body.appendChild(ghost);
            ptrState.ghost = ghost;

            // Hide the original gate visually while dragging
            gateEl.style.opacity = "0.2";

            gridContainer.querySelectorAll(".ql-drop-zone").forEach((s) => {
              if (!s.querySelector(".ql-placed-gate")) {
                s.classList.add("drop-ready");
              }
            });
          }

          if (!ptrState.dragging || !ptrState.ghost) {
            return;
          }

          ptrState.ghost.style.left = `${e.clientX - 22}px`;
          ptrState.ghost.style.top = `${e.clientY - 22}px`;

          ptrState.ghost.style.visibility = "hidden";
          const underEl = document.elementFromPoint(e.clientX, e.clientY);
          ptrState.ghost.style.visibility = "";
          const slot = underEl?.closest(".ql-drop-zone") || null;
          if (slot !== ptrState.activeSlot) {
            if (ptrState.activeSlot) {
              ptrState.activeSlot.classList.remove("drop-hover");
            }
            ptrState.activeSlot = slot;
            if (slot) {
              slot.classList.add("drop-hover");
            }
          }
        };
        gateEl.addEventListener("pointermove", onPointerMove);

        const finishDrag = (e) => {
          if (!ptrState) {
            return;
          }
          const state = ptrState;
          ptrState = null;
          
          gateEl.style.opacity = ""; // restore opacity

          if (!state.dragging) {
            // Was just a click. Dispatch synthetic click so param popover or selection works.
            const clickEvent = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            });
            gateEl.dispatchEvent(clickEvent);
            return;
          }

          if (state.ghost) {
            state.ghost.remove();
          }
          clearDropHighlights();

          if (state.activeSlot) {
            state.activeSlot.classList.remove("drop-hover");
            const newStep = parseInt(state.activeSlot.dataset.step);
            const newQubit = parseInt(state.activeSlot.dataset.qubit);
            
            if ((newStep !== state.oldStep || newQubit !== state.oldQubit) && onMove) {
              onMove(state.oldStep, state.oldQubit, newStep, newQubit);
            }
          }
        };
        gateEl.addEventListener("pointerup", finishDrag);
        
        const cancelDrag = () => {
          if (!ptrState) {
            return;
          }
          if (ptrState.ghost) {
            ptrState.ghost.remove();
          }
          gateEl.style.opacity = "";
          clearDropHighlights();
          ptrState = null;
        };
        gateEl.addEventListener("pointercancel", cancelDrag);
      });

      // Re-apply pending highlights on freshly rendered slots
      if (pending) {
        pending.qubits.forEach((q) => {
          const slot = gridContainer.querySelector(
            `.ql-drop-zone[data-step="${pending.step}"][data-qubit="${q}"]`,
          );
          applyPendingVisual(slot, pending.gate);
        });
      }
    }

    // CORE STATE MACHINE
    // Single entry point for both click-to-place AND drag-and-drop.
    function resolveGatePlacement(step, qubit, gate) {
      if (!gate) {
        return;
      }
      const info = getGateInfo(gate);
      if (!info) {
        return;
      }

      // Single-qubit gate: place immediately
      if (info.type !== "multi") {
        // Run optional validation before placing
        if (onBeforePlace && !onBeforePlace(step, qubit, gate, [])) {
          return;
        }
        onPlace(step, gate, [qubit], null);
        return;
      }

      // Multi-qubit gate state machine
      if (!pending) {
        // First qubit — validate before accepting
        if (onBeforePlace && !onBeforePlace(step, qubit, gate, [])) {
          return;
        }

        pending = { gate, step, qubits: [qubit], needed: info.targets };
        gridContainer.classList.add("editor-placing");
        
        if (onPendingChange) {
          onPendingChange({ ...pending });
        } else {
          // Optional callback undefined, do nothing
        }

        // Show visual highlight on pending slot
        const slot = gridContainer.querySelector(
          `.ql-drop-zone[data-step="${step}"][data-qubit="${qubit}"]`,
        );
        applyPendingVisual(slot, gate);
      } else if (pending.gate === gate && pending.step === step) {
        // Subsequent qubit for same gate in same step

        // Handle "variable" target gates (e.g. multi-control) — double-click last to finish
        if (pending.needed === "variable") {
          const lastQ = pending.qubits[pending.qubits.length - 1];
          if (qubit === lastQ && pending.qubits.length >= 2) {
            // Finish
            const finishedQubits = [...pending.qubits];
            clearPending();
            ignoreNextDelete = true;
            setTimeout(() => {
              ignoreNextDelete = false;
            }, 100);
            onPlace(step, gate, finishedQubits, null);
            return;
          }
        }

        // Handle "span" target gates (e.g. U2) — second click finishes and selects everything in between
        if (pending.needed === "span") {
          const startQ = pending.qubits[0];
          const minQ = Math.min(startQ, qubit);
          const maxQ = Math.max(startQ, qubit);
          
          const finishedQubits = [];
          for (let q = minQ; q <= maxQ; q++) {
            finishedQubits.push(q);
          }
          
          clearPending();
          onPlace(step, gate, finishedQubits, null);
          return;
        }

        if (pending.qubits.includes(qubit)) {
          // Already selected — ignore (or handle as finish for variable)
          return;
        }

        // Validate subsequent qubit before accepting it
        if (onBeforePlace && !onBeforePlace(step, qubit, gate, pending.qubits)) {
          return;
        }

        pending.qubits.push(qubit);

        // Show pending visual
        const slot = gridContainer.querySelector(
          `.ql-drop-zone[data-step="${step}"][data-qubit="${qubit}"]`,
        );
        applyPendingVisual(slot, gate);

        const needed = pending.needed;
        if (needed !== "variable" && pending.qubits.length >= needed) {
          // All qubits collected — place the gate
          const finishedQubits = [...pending.qubits];
          clearPending();
          onPlace(step, gate, finishedQubits, null);
        } else {
          if (onPendingChange) {
            onPendingChange({ ...pending });
          } else {
            // Optional callback undefined, do nothing
          }
        }
      } else {
        // Different gate or step — reset and retry
        clearPending();
        resolveGatePlacement(step, qubit, gate);
      }
    }

    // HELPERS
    function clearPending() {
      if (!pending) {
        return;
      }
      pending = null;
      if (onPendingChange) {
        onPendingChange(null);
      }
      
      gridContainer
        .querySelectorAll(".editor-pending")
        .forEach((s) => s.classList.remove("editor-pending"));
      gridContainer
        .querySelectorAll(".pending-ghost")
        .forEach((g) => g.remove());
        
      if (!selectedGate) {
        gridContainer.classList.remove("editor-placing");
      }
      clearDropHighlights();
    }

    // Render the component into the DOM
    function applyPendingVisual(slot, gate) {
      if (!slot) {
        return;
      }
      slot.classList.add("editor-pending");
      if (!slot.querySelector(".pending-ghost")) {
        slot.innerHTML = "";
        const ghost = document.createElement("div");
        ghost.className = "placed-gate pending-ghost";
        // Simply display the gate name as a generic preview
        ghost.innerHTML = `<b>${gate}</b>`;
        slot.appendChild(ghost);
      }
    }

    // Cleanup resources
    function clearDropHighlights() {
      gridContainer
        .querySelectorAll(".drop-ready, .drop-hover")
        .forEach((s) => {
          s.classList.remove("drop-ready");
          s.classList.remove("drop-hover");
        });
    }

    // Clear selected gate
    function clearSelectedGate() {
      selectedGate = null;
      paletteContainer
        .querySelectorAll(paletteSelector)
        .forEach((b) => b.classList.remove("active"));
      gridContainer.classList.remove("editor-placing");
    }

    // Cleanup resources
    function destroy() {
      _handlers.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
      _handlers.length = 0;
    }

    // Keyboard support for deleting selected gates
    const onKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        const selectedEl = gridContainer.querySelector(
          ".ql-placed-gate.selected",
        );
        if (selectedEl) {
          const slot = selectedEl.closest(".ql-drop-zone") || selectedEl;
          const step = parseInt(slot.dataset.step);
          const qubit = parseInt(slot.dataset.qubit);
          if (!isNaN(step) && !isNaN(qubit)) {
            onDelete(step, qubit);
          }
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    _handlers.push({ el: document, type: "keydown", fn: onKeyDown });

    // Initialize palette bindings
    bindPalette();

    return {
      bindSlots,
      clearPending,
      clearSelectedGate,
      destroy,
    };
  }

  return { create };
})();
