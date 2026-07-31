// QUANTUM LABS — Ui Component
// Provides a standard lifecycle for rendering and updating UI components
// using granular DOM updates instead of destroying innerHTML.

export class UIComponent {
  // Initialize component state and bindings
  constructor() {
    this.container = null;
    this.elements = {}; // Cache for DOM elements to avoid repeated querySelector calls
    this.state = {};
  }

  // Mounts the initial static HTML shell into the container.
  // This is only called ONCE to prevent layout thrashing.
  // container - The DOM element to mount into.
  mount(container) {
    this.container = container;
    this.container.innerHTML = this.template();
    this.bindElements();
    this.bindEvents();
    this.render();
  }

  // Returns the static HTML shell template.
  // Should be overridden by child classes.
  // Returns HTML string
  template() {
    return "";
  }

  // Caches specific DOM elements into `this.elements`.
  // Should be overridden by child classes.
  bindElements() {}

  // Attaches one-time event listeners (like click handlers).
  // Should be overridden by child classes.
  bindEvents() {}

  // Surgically updates specific DOM elements based on `this.state`.
  // Should be overridden by child classes.
  render() {}

  // Updates the internal state and triggers a granular re-render.
  // newState - The new state variables to merge
  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this.container) {
      this.render();
    }
  }
}
