// QUANTUM LABS — QECC Serializer
// Handles URL serialization and deserialization for the QECC Simulator state.

export const QECCSerializer = {
  // Parses the URL search parameters and restores the simulator state.
  initFromURL(simulator, QECCMath) {
    const params = new URLSearchParams(window.location.search);
    const pcm = params.get('pcm');
    const type = params.get('type');
    const h = params.get('h');
    const hx = params.get('hx');
    const hz = params.get('hz');
    
    let shouldAnalyze = false;

    if (pcm && (pcm === 'gf2' || pcm === 'gf4')) {
      const fmtBtn = simulator.container.querySelector(`[data-fmt="${pcm}"]`);
      if (fmtBtn) fmtBtn.click();
    }
    
    if (type && QECCMath.CODE_TYPES[type]) {
      const typeBtn = simulator.container.querySelector(`[data-gate="${type}"]`);
      if (typeBtn) typeBtn.click();
    }

    if (h && simulator.state.inputFormat === 'gf4') {
      if (simulator.elements.hInput) simulator.elements.hInput.value = h;
      shouldAnalyze = true;
    } else {
      if (simulator.state.codeType === "dual-css") {
        if (hx) {
          if (simulator.elements.hxInput) simulator.elements.hxInput.value = hx;
          shouldAnalyze = true;
        }
      } else {
        if (hx) {
          if (simulator.elements.hxInput) simulator.elements.hxInput.value = hx;
          shouldAnalyze = true;
        }
        if (hz) {
          if (simulator.elements.hzInput) simulator.elements.hzInput.value = hz;
          shouldAnalyze = true;
        }
      }
    }

    if (shouldAnalyze) {
      setTimeout(() => simulator.handleAnalyze(), 50);
    }
  },

  // Serializes the current simulator state into URL search parameters and updates the browser history.
  updateURL(simulator) {
    const params = new URLSearchParams();
    if (simulator.state.inputFormat) params.set('pcm', simulator.state.inputFormat);
    if (simulator.state.codeType) params.set('type', simulator.state.codeType);
    
    if (simulator.state.inputFormat === 'gf4') {
      const hText = simulator.elements.hInput?.value.trim();
      if (hText) params.set('h', hText);
    } else {
      const hxText = simulator.elements.hxInput?.value.trim();
      const hzText = simulator.elements.hzInput?.value.trim();
      
      if (simulator.state.codeType === "dual-css") {
        if (hxText) params.set('hx', hxText);
      } else {
        if (hxText) params.set('hx', hxText);
        if (hzText) params.set('hz', hzText);
      }
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }
};
