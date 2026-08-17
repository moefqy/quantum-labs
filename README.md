# Quantum Labs: Quantum Computing Toolkit

## Introduction

A free, open-source quantum circuit simulator and toolkit built with pure HTML, CSS, and JavaScript. Build complex quantum circuits, visualize quantum states in real-time on the Bloch sphere, and explore quantum algorithms entirely in your browser using a drag-and-drop, no-code interface.

## Features

- **Drag-and-Drop Builder**: Intuitively design quantum circuits by dragging gates onto the grid.
- **Real-Time Simulation**: Instantly visualize the statevector and measurement probabilities of your circuit.
- **Custom Gates**: Encapsulate complex sub-circuits into custom f(x) gates, define arbitrary unitary rotations with U gates, or input custom 2x2 matrices backed by Unitary Projection Methods (U_mat).
- **Bloch Sphere, State Analyzer & Entanglement Tracker**: Dive deep into the mathematical state of each qubit and visualize quantum entanglement dynamics using interactive tools.
- **QECC Simulator**: Explore Quantum Error Correction Codes and noise models with a dedicated simulation environment.
- **Stateless URL Sharing**: Share complex circuits instantly via deep links. The entire state of the simulator is serialized into a highly readable and compact URL query string.
- **Local Storage Saves**: Save your work securely in your browser's Local Storage for quick access later.
- **Premium Design**: Beautiful, modern aesthetic with dynamic micro-animations, glassmorphism, and system-aware light/dark themes.
- **Zero Build Step**: Pure static files with no complex build processes.

## How to use?

### Local Development

Serve with any static file server:

```bash
# Using npx serve (recommended)
cd quantum-lab
npx serve .

# Or Python
python3 -m http.server 8080
```

Then open `http://localhost:3000` (or `8080`).

> **Note:** Do NOT open `index.html` directly via `file://` — module imports and web workers require a server environment to load properly.

## Project Structure

Quantum Labs relies on a deeply modular, static-file architecture:

```
quantum-lab/
├── assets/
│   ├── css/          # Modular design system, components, and page stylesheets
│   ├── img/          # Favicons, vector icons, and graphical assets
│   └── js/
│       ├── core/     # Simulation engine, quantum math library, Web Worker, and code exporters
│       ├── tools/    # Interactive tools (Circuit Builder, Bloch Sphere, State Analyzer, QECC, etc.)
│       ├── ui/       # Shared UI components, toolbars, matrix inputs, and popovers
│       ├── pages/    # SPA page controllers (Home, Simulator, Docs, Examples, About)
│       ├── app.js    # Application entry point and lifecycle coordinator
│       └── router.js # Client-side SPA routing system
├── tests/            # Automated test suites for simulation engine, gates, and math
├── 404.html          # SPA fallback route handler
├── index.html        # Main HTML host file
├── serve.json        # Static server rewrite configuration
└── sitemap.xml       # Search engine sitemap
```

## Circuit Serialization

Quantum Labs achieves perfect session portability without requiring a backend database.

**URL Parameter Structure:**
- `qubits`: Number of quantum wires in the register.
- `cbits`: Number of classical wires.
- `steps`: Width of the grid (number of columns).
- `mode`: The simulation mode (`exact` for Statevector, `shots` for Monte Carlo).
- `shots`: The number of shots configured in the UI.
- `gates`: A delimited string representing the circuit operations.

**Gate Serialization Syntax (`gates=`):**
Each gate operation is formatted as `[step]:[qubits]:[type]:[param]` and delimited by a semicolon (`;`).
- Single Qubit Gate (e.g., Hadamard on Qubit 0 at Step 0): `0:0:H`
- Parameterized Gate (e.g., Rx rotation by π/2 on Qubit 0 at Step 1): `1:0:Rx:π/2`
- Multi-Qubit Gate (e.g., CNOT controlled by Qubit 0 targeting Qubit 1 at Step 2): `2:0,1:CX`
- N-Qubit Gate (e.g., Toffoli/CCX controlled by Q0, Q1 targeting Q2 at Step 3): `3:0,1,2:Toffoli`
- General Unitary U Gate: `1:0:U:{"name":"U","theta":"π/2","phi":"0","lambda":"π"}`
- Custom Matrix U_mat Gate: `1:0:U_mat:{"name":"U_mat","matrix":[[0,1],[1,0],[1,0],[0,0]],"method":"polar"}`
- Custom f(x) Sub-Circuit Gate: `0:0,1:f(x):{"name":"MyGate","steps":"0:0:H;1:0,1:CX;"}`

## Preview

Take a look at Quantum Labs in action! From building complex circuits to visualizing quantum states in real-time, the toolkit provides an intuitive and powerful interface for all your quantum computing learning needs.

### Circuit Builder
<img src="https://i.imgur.com/1QBvBlq.png" width="100%" alt="Circuit Builder" />

### Bloch Sphere
<img src="https://i.imgur.com/RoyQUOf.png" width="100%" alt="Bloch Sphere" />

### State Analyzer
<img src="https://i.imgur.com/094uwDI.png" width="100%" alt="State Analyzer" />

### Entanglement Tracker
<img src="https://i.imgur.com/lpIW2J6.png" width="100%" alt="Entanglement Tracker" />

### QECC Simulator
<img src="https://i.imgur.com/w86zmrU.png" width="100%" alt="QECC Simulator" />

## Contact

For any inquiries or feedback, you can reach me at moefqy@rocketmail.com.