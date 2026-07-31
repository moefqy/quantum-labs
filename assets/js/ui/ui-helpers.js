// QUANTUM LABS — Ui Helpers
// Reusable HTML generators and event binders for sidebar components.

import { Icons } from "./ui-icons.js";

export const UI = (() => {
  "use strict";

  // HTML Generators

  // Returns a chevron SVG string for accordion headers.
  function chevronSVG() {
    return Icons.chevronDown;
  }

  // Returns a group header element string.
  function groupHeader(text) {
    return `<div class="ql-group-header">${text}</div>`;
  }

  // Returns a complete accordion section HTML string.
  // id: unique accordion ID, title: label, bodyHtml: inner content, open: default state
  function accordion(id, title, bodyHtml, open = true) {
    return `
      <div class="ql-accordion${open ? " ql-accordion--open" : ""}" id="${id}">
        <div class="ql-accordion-header" data-acc="${id}">
          <span class="ql-accordion-title">${title}</span>
          ${chevronSVG()}
        </div>
        <div class="ql-accordion-body">
          ${bodyHtml}
        </div>
      </div>`;
  }

  // Returns a single gate item HTML string (standard format, matches CB draggable style).
  // gate: data-gate value, sym: inner KaTeX symbol HTML, name: label text
  // extraClasses: optional extra CSS classes, extraAttrs: optional extra HTML attributes string
  function gateButton(gate, sym, name, extraClasses = "", extraAttrs = "") {
    return `<div class="ql-gate-btn ${extraClasses}" data-gate="${gate}" ${extraAttrs}>
      <span class="ql-gate-sym">${sym}</span>
      <span class="ql-gate-label">${name}</span>
    </div>`;
  }

  // Event Binders

  // Binds accordion toggle behavior to all ql-accordion-header elements within a container.
  function bindAccordions(container) {
    if (!container) {
      return;
    }
    container.querySelectorAll(".ql-accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        const accId = header.dataset.acc;
        const acc = document.getElementById(accId);
        if (acc) {
          acc.classList.toggle("ql-accordion--open");
        }
      });
    });
  }

  // Binds a mobile FAB toggle to show/hide a bottom-sheet panel.
  // panelSelector: CSS selector for the panel element to toggle.
  function bindMobileToggle(panelSelector) {
    const mobileToggle = document.getElementById("ql-mobile-toggle");
    if (!mobileToggle) {
      return;
    }
    const ICON_HAMBURGER = Icons.hamburger;
    const ICON_CLOSE = Icons.close;
    mobileToggle.addEventListener("click", () => {
      const panel = document.querySelector(panelSelector);
      if (!panel) {
        return;
      }
      panel.classList.toggle("show");
      mobileToggle.innerHTML = panel.classList.contains("show")
        ? ICON_CLOSE
        : ICON_HAMBURGER;
    });
  }

  // Toast Notifications
  // Shows a transient toast notification at the bottom of the screen.
  function showToast(message, type = "success") {
    const existing = document.querySelector(".toast");
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("removing");
      toast.addEventListener("animationend", () => toast.remove());
    }, 2000);
  }

  // Clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject();
  }

  // Binds a visual range slider to a number input, syncing their values.
  function bindSlider(slider, input, callback) {
    if (!slider || !input) {
      return;
    }
    slider.addEventListener("input", (e) => {
      input.value = e.target.value;
      if (callback) {
        callback(e.target.value);
      }
    });
    input.addEventListener("input", (e) => {
      let v = parseFloat(e.target.value) || 0;
      if (input.hasAttribute("min")) {
        v = Math.max(v, parseFloat(input.getAttribute("min")));
      }
      if (input.hasAttribute("max")) {
        v = Math.min(v, parseFloat(input.getAttribute("max")));
      }
      slider.value = v;
      if (callback) {
        callback(v);
      }
    });
    input.addEventListener("change", (e) => {
      let v = parseFloat(e.target.value) || 0;
      if (input.hasAttribute("min")) {
        v = Math.max(v, parseFloat(input.getAttribute("min")));
      }
      if (input.hasAttribute("max")) {
        v = Math.min(v, parseFloat(input.getAttribute("max")));
      }
      input.value = v; // enforce clamped value visually on blur
    });
  }

  return {
    chevronSVG,
    groupHeader,
    accordion,
    gateButton,
    bindAccordions,
    bindMobileToggle,
    showToast,
    copyToClipboard,
    bindSlider,
  };
})();
