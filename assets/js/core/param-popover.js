// QUANTUM LABS — Param Popover
// Manages the UI popover for editing parametric quantum gates.

import { GateMath } from "./math-renderer.js";

export const ParamPopover = (() => {
  "use strict";

  // Initialize param popover
  function init() {
    // Param Slider sync
    const paramInput = document.getElementById("param-input");
    const paramSlider = document.getElementById("param-slider");

    if (paramInput && paramSlider) {
      paramSlider.addEventListener("input", () => {
        const unit =
          document.querySelector(".param-toggle-btn.active")?.dataset.unit ||
          "rad";
        if (unit === "rad") {
          const val = parseFloat(paramSlider.value);
          if (val === 0) {
            paramInput.value = "0";
          } else if (val === 1) {
            paramInput.value = "π";
          } else if (val === -1) {
            paramInput.value = "-π";
          } else {
            paramInput.value = `${val}π`;
          }
        } else {
          paramInput.value = paramSlider.value;
        }
      });

      paramInput.addEventListener("input", () => {
        const unit =
          document.querySelector(".param-toggle-btn.active")?.dataset.unit ||
          "rad";
        let str = paramInput.value.replace(/°|deg/g, "").trim().toLowerCase();
        if (unit === "rad") {
          let sign = 1;
          if (str.startsWith("-")) {
            sign = -1;
            str = str.substring(1);
          }
          let hasPi = false;
          str = str.replace(/pi|π/g, () => {
            hasPi = true;
            return "";
          });
          if (str === "" || str.startsWith("/")) {
            str = `1${str}`;
          }
          str = str.replace(/\*$/, "");
          let v = 0;
          if (str.includes("/")) {
            const pts = str.split("/");
            v = (parseFloat(pts[0]) || 1) / (parseFloat(pts[1]) || 1);
          } else {
            v = parseFloat(str);
            if (isNaN(v)) {
              v = hasPi ? 1 : 0;
            }
          }
          if (!hasPi) {
            v = v / Math.PI;
          }
          paramSlider.value = sign * v;
        } else {
          paramSlider.value = parseFloat(str) || 0;
        }
      });
    }

    // Param Popover toggle
    document.querySelectorAll(".param-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".param-toggle-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const unit = btn.dataset.unit;
        const popover = document.getElementById("param-popover");
        const gate = popover.dataset.gate || "Angle";

        let gateTex = gate;
        if (gate === "Rx") {
          gateTex = "R_x";
        } else if (gate === "Ry") {
          gateTex = "R_y";
        } else if (gate === "Rz") {
          gateTex = "R_z";
        } else if (gate === "CP") {
          gateTex = "CP";
        }

        const gateHtml =
          gate === "Angle"
            ? "Angle"
            : `${GateMath.toHTML(`\\mathbf{${gateTex}}`)} Angle`;
        document.getElementById("param-label").innerHTML = gateHtml;
        document.getElementById("param-input").placeholder =
          unit === "deg" ? "e.g. 90" : "e.g. π/2";

        if (paramSlider && paramInput) {
          if (unit === "deg") {
            paramSlider.min = -360;
            paramSlider.max = 360;
            paramSlider.step = 1;
          } else {
            paramSlider.min = -2;
            paramSlider.max = 2;
            paramSlider.step = 0.125;
          }
          paramSlider.value = 0;
          paramInput.value = "";
        }
      });
    });
  }

  // Show single angle param popover
  function showSingleAngle(gate, referenceEl, onOkCallback, currentParam, onCancelCallback) {
    const popover = document.getElementById("param-popover");
    const input = document.getElementById("param-input");
    const okBtn = document.getElementById("param-ok");
    const cancelBtn = document.getElementById("param-cancel");
    const slider = document.getElementById("param-slider");

    popover.dataset.gate = gate;

    // Set initial title (trigger active unit button logic to format title correctly)
    const activeUnitBtn =
      document.querySelector(".param-toggle-btn.active") ||
      document.querySelector(".param-toggle-btn");
    if (activeUnitBtn) {
      activeUnitBtn.click();
    }

    const rect = referenceEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 8}px`;
    popover.classList.add("show");

    let popLeft = rect.left;
    if (popLeft + popover.offsetWidth > window.innerWidth - 10) {
      popLeft = rect.right - popover.offsetWidth;
    }
    popover.style.left = `${popLeft}px`;

    input.value = currentParam || "";
    // Trigger input event to sync slider
    input.dispatchEvent(new Event("input"));
    input.focus();

    const cleanup = () => {
      popover.classList.remove("show");
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
    };

    const onOk = () => {
      let val = input.value.trim();
      if (!val) {
        return;
      }
      const activeUnit = document.querySelector(".param-toggle-btn.active")
        ?.dataset.unit;
      if (activeUnit === "deg" &&
      !val.includes("°") &&
      !val.toLowerCase().includes("deg")) {
        val += "°";
      }

      onOkCallback(val);
      cleanup();
    };
    
    const onCancel = () => {
      if (onCancelCallback) {
        onCancelCallback();
      }
      cleanup();
    };

    okBtn.onclick = onOk;
    cancelBtn.onclick = onCancel;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        onOk();
      }
      if (e.key === "Escape") {
        onCancel();
      }
    };
  }

  // Show u1 param popover
  function showU1(gate, referenceEl, onOkCallback, currentParam, onCancelCallback) {
    const popover = document.getElementById("u1-popover");
    const nameIn = document.getElementById("u1-name");
    const thetaIn = document.getElementById("u1-theta");
    const phiIn = document.getElementById("u1-phi");
    const lambdaIn = document.getElementById("u1-lambda");
    const thetaSl = document.getElementById("u1-theta-slider");
    const phiSl = document.getElementById("u1-phi-slider");
    const lambdaSl = document.getElementById("u1-lambda-slider");
    const okBtn = document.getElementById("u1-ok");
    const cancelBtn = document.getElementById("u1-cancel");

    document.getElementById("u1-label").innerHTML =
      `${GateMath.toHTML("\\mathbf{U}_1")} Angle`;

    let currentUnit = "rad";
    const toggleBtns = document.querySelectorAll(".u1-toggle-btn");
    const updateUnit = (unit) => {
      currentUnit = unit;
      toggleBtns.forEach((b) =>
        b.classList.toggle("active", b.dataset.unit === unit),
      );
      const isDeg = unit === "deg";
      [thetaIn, phiIn, lambdaIn].forEach((inp) => {
        inp.placeholder = isDeg ? "e.g. 90" : "e.g. π/2";
        // Only clear inputs if we are explicitly clicking the toggle, not on init
      });
      [thetaSl, phiSl, lambdaSl].forEach((sl) => {
        sl.min = isDeg ? -360 : -2;
        sl.max = isDeg ? 360 : 2;
        sl.step = isDeg ? 1 : 0.125;
      });
    };
    toggleBtns.forEach((btn) => {
      btn.onclick = () => {
        updateUnit(btn.dataset.unit);
        [thetaIn, phiIn, lambdaIn].forEach((inp) => (inp.value = ""));
        [thetaSl, phiSl, lambdaSl].forEach((sl) => (sl.value = 0));
      };
    });

    updateUnit("rad"); // Default

    if (currentParam) {
      try {
        let p = {};
        if (currentParam.startsWith("{")) {
          p = JSON.parse(currentParam);
        } else {
          const parts = currentParam.split("|");
          p = { name: parts[0], theta: parts[1], phi: parts[2], lambda: parts[3] };
        }
        nameIn.value = p.name ?? "";
        thetaIn.value = p.theta ?? "0";
        phiIn.value = p.phi ?? "0";
        lambdaIn.value = p.lambda ?? "0";
        if (
          p.theta?.includes("°") ||
          p.phi?.includes("°") ||
          p.lambda?.includes("°")
        ) {
          updateUnit("deg");
          thetaIn.value = p.theta;
          phiIn.value = p.phi;
          lambdaIn.value = p.lambda;
          thetaSl.value = parseFloat(p.theta) || 0;
          phiSl.value = parseFloat(p.phi) || 0;
          lambdaSl.value = parseFloat(p.lambda) || 0;
        } else {
          thetaSl.value = parseFloat(p.theta) / Math.PI || 0;
          phiSl.value = parseFloat(p.phi) / Math.PI || 0;
          lambdaSl.value = parseFloat(p.lambda) / Math.PI || 0;
        }
      } catch {
        nameIn.value = thetaIn.value = phiIn.value = lambdaIn.value = "";
      }
    } else {
      nameIn.value = thetaIn.value = phiIn.value = lambdaIn.value = "";
      thetaSl.value = phiSl.value = lambdaSl.value = 0;
    }

    const formatVal = (val) => {
      if (currentUnit === "deg") {
        return val;
      }
      if (val === 0) {
        return "0";
      }
      if (val === 1) {
        return "π";
      }
      if (val === -1) {
        return "-π";
      }
      return `${val}π`;
    };
    const parseInput = (str) => {
      str = str.trim().toLowerCase();
      if (currentUnit === "deg") {
        return parseFloat(str.replace(/°|deg/g, "")) || 0;
      }
      let sign = 1;
      if (str.startsWith("-")) {
        sign = -1;
        str = str.substring(1);
      }
      let hasPi = false;
      str = str.replace(/pi|π/g, () => {
        hasPi = true;
        return "";
      });
      if (str === "" || str.startsWith("/")) {
        str = `1${str}`;
      }
      str = str.replace(/\*$/, "");
      let v = 0;
      if (str.includes("/")) {
        const pts = str.split("/");
        v = (parseFloat(pts[0]) || 1) / (parseFloat(pts[1]) || 1);
      } else {
        v = parseFloat(str);
        if (isNaN(v)) {
          v = hasPi ? 1 : 0;
        }
      }
      if (!hasPi) {
        v = v / Math.PI;
      }
      return sign * v;
    };

    [
      [thetaIn, thetaSl],
      [phiIn, phiSl],
      [lambdaIn, lambdaSl],
    ].forEach(([inp, sl]) => {
      inp.oninput = () => {
        sl.value = parseInput(inp.value);
      };
      sl.oninput = () => {
        inp.value = formatVal(parseFloat(sl.value));
      };
    });

    const rect = referenceEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 8}px`;
    popover.classList.add("show");
    let left = rect.left;
    if (left + popover.offsetWidth > window.innerWidth - 10) {
      left = rect.right - popover.offsetWidth;
    }
    popover.style.left = `${left}px`;
    nameIn.focus();

    const cleanup = () => {
      popover.classList.remove("show");
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      let tVal = thetaIn.value.trim();
      let pVal = phiIn.value.trim();
      let lVal = lambdaIn.value.trim();
      if (!tVal || !pVal || !lVal) {
        return;
      }
      if (currentUnit === "deg") {
        if (!tVal.includes("°")) {
          tVal += "°";
        }
        if (!pVal.includes("°")) {
          pVal += "°";
        }
        if (!lVal.includes("°")) {
          lVal += "°";
        }
      }
      const paramStr = [
        nameIn.value.trim() || "U₁",
        tVal,
        pVal,
        lVal
      ].join("|");
      onOkCallback(paramStr);
      cleanup();
    };
    
    cancelBtn.onclick = () => {
      if (onCancelCallback) {
        onCancelCallback();
      }
      cleanup();
    };
  }

  // Show param popover
  function show(gate, referenceEl, onOkCallback, currentParam = null, onCancelCallback = null) {
    if (gate === "U1") {
      showU1(gate, referenceEl, onOkCallback, currentParam, onCancelCallback);
    } else {
      showSingleAngle(gate, referenceEl, onOkCallback, currentParam, onCancelCallback);
    }
  }

  // Return param popover
  return {
    init,
    show,
  };
})();
