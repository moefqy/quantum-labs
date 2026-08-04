// QUANTUM LABS — LaTeX Exporter
// Pure function that generates LaTeX code using the Qcircuit package.

// Safely convert a param value to a display string
function paramToStr(param) {
  if (param == null) return "";
  return String(param);
}

// Generate LaTeX (Qcircuit) code from circuit data.
export function exportLatex(circuitData) {
  const { numQubits, numSteps, grid } = circuitData;

  const lines = [];
  lines.push("\\documentclass{article}");
  lines.push("\\usepackage{qcircuit}");
  lines.push("\\usepackage{braket}");
  lines.push("\\begin{document}");
  lines.push("");
  lines.push("\\Qcircuit @C=1em @R=.7em {");

  for (let q = 0; q < numQubits; q++) {
    const parts = [`  \\lstick{\\ket{q_{${q}}}}`];
    for (let s = 0; s < numSteps; s++) {
      const cell = grid[s][q];
      if (!cell) {
        parts.push("\\qw");
        continue;
      }

      const gate = cell.gate;
      if (cell.linkedQubits) {
        if (gate === "CNOT" || gate === "CZ") {
          const isControl = cell.linkedQubits[0] === q;
          const targetQ = cell.linkedQubits[1];
          if (isControl) {
            parts.push(`\\ctrl{${targetQ - q}}`);
          } else {
            parts.push(gate === "CNOT" ? "\\targ" : "\\gate{Z}");
          }
        } else if (gate === "SWAP") {
          const otherQ =
            cell.linkedQubits[0] === q
              ? cell.linkedQubits[1]
              : cell.linkedQubits[0];
          parts.push(`\\qswap \\qwx[${otherQ - q}]`);
        } else {
          parts.push(`\\gate{${gate}}`);
        }
      } else {
        const pStr = paramToStr(cell.param);
        const label = pStr ? `${gate}(${pStr})` : gate;
        parts.push(`\\gate{${label}}`);
      }
    }
    parts.push("\\qw");
    lines.push(`${parts.join(" & ")} \\\\`);
  }

  lines.push("}");
  lines.push("");
  lines.push("\\end{document}");

  return lines.join("\n");
}
