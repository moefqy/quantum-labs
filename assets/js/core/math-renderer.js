// QUANTUM LABS — Math Renderer
// LaTeX rendering helpers via KaTeX.

export const GateMath = (() => {
  "use strict";

  // Renders a LaTeX mathematical expression string into a target HTML element using KaTeX.
  // If the KaTeX library has not been loaded, it gracefully falls back to inserting raw text.
  //
  // @param {string} latex - The LaTeX math string to be rendered.
  // @param {HTMLElement} element - The DOM element where the rendered math should be injected.
  // @param {boolean} [displayMode=false] - If true, renders the math in block/display mode; otherwise renders in inline mode.
  function renderLatex(latex, element, displayMode = false) {
    if (!element) {
      return;
    }
    if (typeof katex !== "undefined") {
      try {
        katex.render(latex, element, {
          throwOnError: false,
          displayMode: displayMode,
          trust: true,
          output: "html",
        });
      } catch (e) {
        element.textContent = latex;
      }
    } else {
      element.textContent = latex;
    }
  }

  // Renders a LaTeX mathematical expression directly into an HTML string using KaTeX.
  function toHTML(latex, displayMode = false) {
    if (typeof katex !== "undefined") {
      try {
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: displayMode,
          trust: true,
          output: "html",
        });
      } catch (e) {
        return `<span>${latex}</span>`;
      }
    }
    return `<span>${latex}</span>`;
  }

  // Format complex number (real, imaginary)
  function formatComplex(r, i) {
    if (Math.abs(r) < 1e-10) {
      r = 0;
    }
    if (Math.abs(i) < 1e-10) {
      i = 0;
    }
    const s2 = 1 / Math.sqrt(2);
    if (i === 0 && Math.abs(r - s2) < 1e-10) {
      return "\\frac{1}{\\sqrt{2}}";
    }
    if (i === 0 && Math.abs(r + s2) < 1e-10) {
      return "-\\frac{1}{\\sqrt{2}}";
    }
    if (r === 0 && Math.abs(i - s2) < 1e-10) {
      return "\\frac{i}{\\sqrt{2}}";
    }
    if (r === 0 && Math.abs(i + s2) < 1e-10) {
      return "-\\frac{i}{\\sqrt{2}}";
    }
    if (r === 0 && i === 0) {
      return "0";
    }
    if (i === 0) {
      return r === 1 ? "1" : r === -1 ? "-1" : String(+r.toFixed(4));
    }
    if (r === 0) {
      return i === 1 ? "i" : i === -1 ? "-i" : `${+i.toFixed(4)}i`;
    }
    const ip =
      i === 1 ? "+i" : i === -1 ? "-i" : `${i > 0 ? "+" : ""}${+i.toFixed(4)}i`;
    return `${+r.toFixed(4)}${ip}`;
  }

  // Format coefficient (real, imaginary)
  function formatCoef(r, i) {
    const s = formatComplex(r, i);
    if (s === "1") {
      return "";
    }
    if (s === "-1") {
      return "-";
    }
    if (s.startsWith("\\frac") || s.startsWith("-\\frac")) {
      return s;
    }
    return s;
  }

  // Convert matrix to LaTeX
  function matrixToLatex(M) {
    let s = "\\begin{bmatrix} ";
    for (let r = 0; r < M.length; r++) {
      for (let c = 0; c < M[r].length; c++) {
        s += formatComplex(M[r][c][0], M[r][c][1]);
        if (c < M[r].length - 1) {
          s += " & ";
        }
      }
      if (r < M.length - 1) {
        s += " \\\\ ";
      }
    }
    return `${s} \\end{bmatrix}`;
  }

  // Convert vector to LaTeX
  function vectorToLatex(v) {
    let s = "\\begin{bmatrix} ";
    for (let i = 0; i < v.length; i++) {
      s += formatComplex(v[i][0], v[i][1]);
      if (i < v.length - 1) {
        s += " \\\\ ";
      }
    }
    return `${s} \\end{bmatrix}`;
  }

  return {
    renderLatex,
    toHTML,
    formatComplex,
    formatCoef,
    matrixToLatex,
    vectorToLatex,
  };
})();
