// QUANTUM LABS — Matrix Popover
// Manages the UI popover for editing custom 2x2 unitary matrix gates (U_mat).

import { GateMath } from "../core/math-renderer.js";
import { QuantumMath } from "../core/quantum-math.js";

export const MatrixPopover = (() => {
  "use strict";

  // Parses a mathematical expression string into a complex number [real, imag].
  function parseComplexExpr(expr) {
    if (typeof expr !== "string") {
      if (typeof expr === "number" && !isNaN(expr)) return [expr, 0];
      if (
        Array.isArray(expr) &&
        expr.length === 2 &&
        typeof expr[0] === "number" &&
        typeof expr[1] === "number"
      ) {
        return [expr[0], expr[1]];
      }
      return null;
    }

    let s = expr.trim();
    if (!s) return null;

    s = s.replace(/π/g, "pi");

    // Tokenizer
    const tokens = [];
    let pos = 0;
    const n = s.length;

    while (pos < n) {
      const ch = s[pos];

      if (/\s/.test(ch)) {
        pos++;
        continue;
      }

      if (/[0-9.]/.test(ch)) {
        let numStr = "";
        while (pos < n && /[0-9.]/.test(s[pos])) {
          numStr += s[pos++];
        }
        const num = parseFloat(numStr);
        if (isNaN(num)) return null;
        tokens.push({ type: "NUM", value: num });
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        let ident = "";
        while (pos < n && /[a-zA-Z0-9_]/.test(s[pos])) {
          ident += s[pos++];
        }
        ident = ident.toLowerCase();
        tokens.push({ type: "IDENT", value: ident });
        continue;
      }

      if ("+-*/^()".includes(ch)) {
        if (ch === "*" && pos + 1 < n && s[pos + 1] === "*") {
          tokens.push({ type: "OP", value: "^" });
          pos += 2;
          continue;
        }
        tokens.push({
          type: ch === "(" ? "LPAREN" : ch === ")" ? "RPAREN" : "OP",
          value: ch,
        });
        pos++;
        continue;
      }

      return null;
    }

    // Implicit multiplication
    const normalized = [];
    for (let i = 0; i < tokens.length; i++) {
      const curr = tokens[i];
      normalized.push(curr);
      if (i + 1 < tokens.length) {
        const next = tokens[i + 1];
        const isCurrValue =
          curr.type === "NUM" ||
          (curr.type === "IDENT" &&
            (curr.value === "i" || curr.value === "pi" || curr.value === "e")) ||
          curr.type === "RPAREN";
        const isNextValue =
          next.type === "NUM" || next.type === "IDENT" || next.type === "LPAREN";
        if (isCurrValue && isNextValue) {
          if (
            !(
              curr.type === "IDENT" &&
              ["sqrt", "exp", "cos", "sin"].includes(curr.value) &&
              next.type === "LPAREN"
            )
          ) {
            normalized.push({ type: "OP", value: "*" });
          }
        }
      }
    }

    let tIdx = 0;
    function peek() {
      return normalized[tIdx] || null;
    }
    function consume(expectedValue) {
      const t = peek();
      if (!t) return null;
      if (expectedValue && t.value !== expectedValue) return null;
      tIdx++;
      return t;
    }

    function parseAddSub() {
      let left = parseMulDiv();
      if (!left) return null;

      while (peek() && (peek().value === "+" || peek().value === "-")) {
        const op = consume().value;
        const right = parseMulDiv();
        if (!right) return null;
        if (op === "+") {
          left = [left[0] + right[0], left[1] + right[1]];
        } else {
          left = [left[0] - right[0], left[1] - right[1]];
        }
      }
      return left;
    }

    function parseMulDiv() {
      let left = parseUnary();
      if (!left) return null;

      while (peek() && (peek().value === "*" || peek().value === "/")) {
        const op = consume().value;
        const right = parseUnary();
        if (!right) return null;
        if (op === "*") {
          left = [
            left[0] * right[0] - left[1] * right[1],
            left[0] * right[1] + left[1] * right[0],
          ];
        } else {
          const denom = right[0] * right[0] + right[1] * right[1];
          if (denom < 1e-18) return null;
          left = [
            (left[0] * right[0] + left[1] * right[1]) / denom,
            (left[1] * right[0] - left[0] * right[1]) / denom,
          ];
        }
      }
      return left;
    }

    function parseUnary() {
      if (peek() && peek().value === "+") {
        consume();
        return parseUnary();
      }
      if (peek() && peek().value === "-") {
        consume();
        const val = parseUnary();
        return val ? [-val[0], -val[1]] : null;
      }
      return parsePower();
    }

    function parsePower() {
      let left = parsePrimary();
      if (!left) return null;

      if (peek() && peek().value === "^") {
        consume();
        const right = parseUnary();
        if (!right) return null;
        const isE =
          Math.abs(left[0] - Math.E) < 1e-12 && Math.abs(left[1]) < 1e-12;
        if (isE) {
          const expA = Math.exp(right[0]);
          return [expA * Math.cos(right[1]), expA * Math.sin(right[1])];
        }
        const r = Math.hypot(left[0], left[1]);
        if (r < 1e-18) return [0, 0];
        const theta = Math.atan2(left[1], left[0]);
        const lnZ = [Math.log(r), theta];
        const p = [
          right[0] * lnZ[0] - right[1] * lnZ[1],
          right[0] * lnZ[1] + right[1] * lnZ[0],
        ];
        const expR = Math.exp(p[0]);
        return [expR * Math.cos(p[1]), expR * Math.sin(p[1])];
      }
      return left;
    }

    function parsePrimary() {
      const t = peek();
      if (!t) return null;

      if (t.type === "NUM") {
        consume();
        return [t.value, 0];
      }

      if (t.type === "IDENT") {
        consume();
        const id = t.value;
        if (id === "i") return [0, 1];
        if (id === "pi") return [Math.PI, 0];
        if (id === "e") return [Math.E, 0];

        if (["sqrt", "exp", "cos", "sin"].includes(id)) {
          if (!peek() || peek().type !== "LPAREN") return null;
          consume("(");
          const arg = parseAddSub();
          if (!arg) return null;
          if (!consume(")")) return null;

          if (id === "sqrt") {
            const r = Math.hypot(arg[0], arg[1]);
            const th = Math.atan2(arg[1], arg[0]);
            const sqrtR = Math.sqrt(r);
            return [sqrtR * Math.cos(th / 2), sqrtR * Math.sin(th / 2)];
          }
          if (id === "exp") {
            const expA = Math.exp(arg[0]);
            return [expA * Math.cos(arg[1]), expA * Math.sin(arg[1])];
          }
          if (id === "cos") {
            return [
              Math.cos(arg[0]) * Math.cosh(arg[1]),
              -Math.sin(arg[0]) * Math.sinh(arg[1]),
            ];
          }
          if (id === "sin") {
            return [
              Math.sin(arg[0]) * Math.cosh(arg[1]),
              Math.cos(arg[0]) * Math.sinh(arg[1]),
            ];
          }
        }
        return null;
      }

      if (t.type === "LPAREN") {
        consume("(");
        const val = parseAddSub();
        if (!val) return null;
        if (!consume(")")) return null;
        return val;
      }

      return null;
    }

    const result = parseAddSub();
    if (!result || tIdx !== normalized.length) return null;
    const re = Math.abs(result[0]) < 1e-14 ? 0 : result[0];
    const im = Math.abs(result[1]) < 1e-14 ? 0 : result[1];
    return [re, im];
  }

  // Format complex number for LaTeX display
  function formatComplexLatex(c) {
    let r = Math.abs(c[0]) < 1e-6 ? 0 : c[0];
    let i = Math.abs(c[1]) < 1e-6 ? 0 : c[1];

    const invSqrt2 = 1 / Math.SQRT2;
    const isClose = (a, b) => Math.abs(Math.abs(a) - b) < 1e-4;

    const fmtNum = (num) => {
      if (Math.abs(num - Math.round(num)) < 1e-5) return String(Math.round(num));
      if (isClose(num, invSqrt2)) {
        return num < 0 ? "-\\frac{1}{\\sqrt{2}}" : "\\frac{1}{\\sqrt{2}}";
      }
      if (isClose(num, 0.5)) {
        return num < 0 ? "-\\frac{1}{2}" : "\\frac{1}{2}";
      }
      return parseFloat(num.toFixed(4)).toString();
    };

    if (i === 0) {
      return fmtNum(r);
    }
    if (r === 0) {
      if (Math.abs(i - 1) < 1e-5) return "i";
      if (Math.abs(i + 1) < 1e-5) return "-i";
      if (isClose(i, invSqrt2)) {
        return i < 0 ? "-\\frac{i}{\\sqrt{2}}" : "\\frac{i}{\\sqrt{2}}";
      }
      return `${fmtNum(i)}i`;
    }

    const rStr = fmtNum(r);
    let iStr = "";
    if (Math.abs(i - 1) < 1e-5) {
      iStr = "+ i";
    } else if (Math.abs(i + 1) < 1e-5) {
      iStr = "- i";
    } else if (i < 0) {
      iStr = `- ${fmtNum(-i)}i`;
    } else {
      iStr = `+ ${fmtNum(i)}i`;
    }
    return `${rStr} ${iStr}`;
  }

  // Show matrix popover
  function show(
    gate,
    referenceEl,
    onOkCallback,
    currentParam = null,
    onCancelCallback = null
  ) {
    const popover = document.getElementById("matrix-popover");
    if (!popover) return;

    const nameIn = document.getElementById("matrix-popover-name");
    const m00In = document.getElementById("matrix-m00");
    const m01In = document.getElementById("matrix-m01");
    const m10In = document.getElementById("matrix-m10");
    const m11In = document.getElementById("matrix-m11");
    const polarBtn = document.getElementById("matrix-method-polar");
    const qrBtn = document.getElementById("matrix-method-qr");
    const statusEl = document.getElementById("matrix-unitary-status");
    const previewEl = document.getElementById("matrix-result-preview");
    const decompEl = document.getElementById("matrix-decomp-text");
    const okBtn = document.getElementById("matrix-popover-ok");
    const cancelBtn = document.getElementById("matrix-popover-cancel");
    const labelEl = document.getElementById("matrix-popover-label");

    if (labelEl) {
      labelEl.innerHTML = `${GateMath.toHTML("\\mathbf{U}_\\text{mat}")} Gate Parameters`;
    }

    let currentMethod = "polar";
    let evaluatedMat = [
      [1, 0],
      [0, 0],
      [0, 0],
      [1, 0],
    ];
    let decompAngles = { theta: 0, phi: 0, lambda: 0, alpha: 0 };
    let isValid = true;

    // Load initial values
    if (currentParam) {
      try {
        let p = {};
        if (typeof currentParam === "string") {
          if (currentParam.startsWith("{")) {
            p = JSON.parse(currentParam);
          } else {
            const parts = currentParam.split("|");
            p = {
              name: parts[0],
              raw: [parts[1], parts[2], parts[3], parts[4]],
              method: parts[5],
            };
          }
        } else {
          p = currentParam;
        }

        if (nameIn) nameIn.value = p.name ?? "U_mat";
        if (Array.isArray(p.raw) && p.raw.length === 4) {
          if (m00In) m00In.value = p.raw[0] ?? "0";
          if (m01In) m01In.value = p.raw[1] ?? "1";
          if (m10In) m10In.value = p.raw[2] ?? "1";
          if (m11In) m11In.value = p.raw[3] ?? "0";
        } else if (Array.isArray(p.matrix) && p.matrix.length === 4) {
          if (m00In) m00In.value = formatComplexLatex(p.matrix[0]);
          if (m01In) m01In.value = formatComplexLatex(p.matrix[1]);
          if (m10In) m10In.value = formatComplexLatex(p.matrix[2]);
          if (m11In) m11In.value = formatComplexLatex(p.matrix[3]);
        }
        if (p.method === "qr" || p.method === "polar") {
          currentMethod = p.method;
        }
      } catch {
        if (nameIn) nameIn.value = "";
        if (m00In) m00In.value = "";
        if (m01In) m01In.value = "";
        if (m10In) m10In.value = "";
        if (m11In) m11In.value = "";
      }
    } else {
      if (nameIn) nameIn.value = "";
      if (m00In) m00In.value = "";
      if (m01In) m01In.value = "";
      if (m10In) m10In.value = "";
      if (m11In) m11In.value = "";
    }

    const updateMethodUI = () => {
      if (polarBtn) polarBtn.classList.toggle("active", currentMethod === "polar");
      if (qrBtn) qrBtn.classList.toggle("active", currentMethod === "qr");
    };
    updateMethodUI();

    if (polarBtn) {
      polarBtn.onclick = () => {
        currentMethod = "polar";
        updateMethodUI();
        evaluateAndRender();
      };
    }
    if (qrBtn) {
      qrBtn.onclick = () => {
        currentMethod = "qr";
        updateMethodUI();
        evaluateAndRender();
      };
    }

    function evaluateAndRender() {
      const s00 = m00In ? m00In.value.trim() : "";
      const s01 = m01In ? m01In.value.trim() : "";
      const s10 = m10In ? m10In.value.trim() : "";
      const s11 = m11In ? m11In.value.trim() : "";

      if (!s00 || !s01 || !s10 || !s11) {
        isValid = false;
        if (statusEl) {
          statusEl.className = "matrix-unitary-status";
          statusEl.textContent = "";
        }
        if (previewEl) {
          previewEl.innerHTML = `<span class="matrix-result-preview-empty">(Enter matrix entries)</span>`;
        }
        if (decompEl) {
          decompEl.textContent = `—`;
        }
        if (okBtn) okBtn.disabled = true;
        return;
      }

      const v00 = parseComplexExpr(s00);
      const v01 = parseComplexExpr(s01);
      const v10 = parseComplexExpr(s10);
      const v11 = parseComplexExpr(s11);

      if (!v00 || !v01 || !v10 || !v11) {
        isValid = false;
        if (statusEl) {
          statusEl.className = "matrix-unitary-status is-invalid";
          statusEl.textContent = "✗ Invalid matrix expression";
        }
        if (previewEl) {
          previewEl.innerHTML = `<span class="matrix-result-preview-empty">(Invalid input)</span>`;
        }
        if (decompEl) {
          decompEl.textContent = `—`;
        }
        if (okBtn) okBtn.disabled = true;
        return;
      }

      isValid = true;
      if (okBtn) okBtn.disabled = false;

      const rawMat = [v00, v01, v10, v11];
      const isUnitary = QuantumMath.isUnitary2x2(rawMat);

      if (isUnitary) {
        evaluatedMat = rawMat;
        if (statusEl) {
          statusEl.className = "matrix-unitary-status is-valid";
          statusEl.textContent = "✓ Matrix is unitary";
        }
      } else {
        if (currentMethod === "qr") {
          evaluatedMat = QuantumMath.enforceUnitary2x2_qr(rawMat);
          if (statusEl) {
            statusEl.className = "matrix-unitary-status is-adjusted";
            statusEl.textContent = "⚠ Adjusted via QR Decomposition";
          }
        } else {
          evaluatedMat = QuantumMath.enforceUnitary2x2_polar(rawMat);
          if (statusEl) {
            statusEl.className = "matrix-unitary-status is-adjusted";
            statusEl.textContent = "⚠ Adjusted via Polar Decomposition";
          }
        }
      }

      // Render KaTeX matrix
      const l00 = formatComplexLatex(evaluatedMat[0]);
      const l01 = formatComplexLatex(evaluatedMat[1]);
      const l10 = formatComplexLatex(evaluatedMat[2]);
      const l11 = formatComplexLatex(evaluatedMat[3]);
      const latexStr = `\\begin{pmatrix} ${l00} & ${l01} \\\\ ${l10} & ${l11} \\end{pmatrix}`;

      if (previewEl) {
        GateMath.renderLatex(latexStr, previewEl, true);
      }

      // Decompose into Euler angles
      try {
        decompAngles = QuantumMath.decomposeUnitary2x2(evaluatedMat);
        const thStr = decompAngles.theta.toFixed(4);
        const phStr = decompAngles.phi.toFixed(4);
        const lmStr = decompAngles.lambda.toFixed(4);
        if (decompEl) {
          decompEl.textContent = `U(${thStr}, ${phStr}, ${lmStr})`;
        }
      } catch (e) {
        if (decompEl) decompEl.textContent = `—`;
      }
    }

    // Attach input listeners
    [m00In, m01In, m10In, m11In].forEach((inp) => {
      if (inp) inp.oninput = evaluateAndRender;
    });

    evaluateAndRender();

    // Position Popover
    popover.classList.add("show");

    if (referenceEl) {
      const rect = referenceEl.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      let left = rect.right + 10;
      let top = rect.top;

      if (left + popoverRect.width > window.innerWidth - 10) {
        left = rect.left - popoverRect.width - 10;
      }
      if (top + popoverRect.height > window.innerHeight - 10) {
        top = window.innerHeight - popoverRect.height - 10;
      }
      if (top < 10) top = 10;
      if (left < 10) left = 10;

      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    }

    const cleanup = () => {
      popover.classList.remove("show");
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        if (onCancelCallback) onCancelCallback();
        cleanup();
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (isValid && okBtn) okBtn.click();
      }
    };

    const handleOutsideClick = (e) => {
      if (
        !popover.contains(e.target) &&
        (!referenceEl || !referenceEl.contains(e.target))
      ) {
        if (onCancelCallback) onCancelCallback();
        cleanup();
      }
    };

    setTimeout(() => {
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("pointerdown", handleOutsideClick);
    }, 50);

    if (okBtn) {
      okBtn.onclick = () => {
        if (!isValid) return;
        const gateName = nameIn ? nameIn.value.trim() || "U_mat" : "U_mat";
        const resultData = {
          name: gateName,
          raw: [
            m00In?.value.trim() || "0",
            m01In?.value.trim() || "0",
            m10In?.value.trim() || "0",
            m11In?.value.trim() || "0",
          ],
          matrix: evaluatedMat,
          method: currentMethod,
          theta: decompAngles.theta,
          phi: decompAngles.phi,
          lambda: decompAngles.lambda,
          alpha: decompAngles.alpha,
        };
        onOkCallback(JSON.stringify(resultData));
        cleanup();
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (onCancelCallback) onCancelCallback();
        cleanup();
      };
    }

    if (nameIn) {
      nameIn.focus();
      nameIn.select();
    }
  }

  return {
    show,
    parseComplexExpr,
    formatComplexLatex,
  };
})();
