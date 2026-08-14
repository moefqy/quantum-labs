// QUANTUM LABS — QECC Cirq Exporter
// Generates Cirq Python code for QECC encoding and syndrome extraction.

function formatMatrix(mat) {
  if (!mat || mat.length === 0) return "    []";
  return mat.map(row => "    [" + row.join(",") + "]").join(",\n");
}

export function exportQeccCirq(qeccData) {
  const { n, k, r, r_sf, Hx, Hz, permHx, permHz, isPermuted, colPerm, xBar, zBar, xBarSt, zBarSt } = qeccData;
  const activeXBar = (isPermuted && xBarSt) ? xBarSt : xBar;
  const activeZBar = (isPermuted && zBarSt) ? zBarSt : zBar;
  const activeR = r_sf !== undefined ? r_sf : r;

  const lines = [
    "# import libraries",
    "import cirq",
    "import sympy as sp",
    "",
    "# circuit generator",
    "def circuit_gen(n,k):",
    "    q = [cirq.NamedQubit(f'q_{i}') for i in range(n)]",
    "    s = [cirq.NamedQubit(f'syndrome_{i}') for i in range(n-k)]",
    "    return cirq.Circuit(), q, s",
    "",
    "# stabilizer generator",
    "def stabilizer_gen(n,k,H,circuit,q,s):",
    "    Hx = H[:, :H.shape[1] // 2]",
    "    Hz = H[:, H.shape[1] // 2:]",
    "    ",
    "    for i in range(n-k):",
    "        circuit.append(cirq.H(s[i]))",
    "        ",
    "    for i in range(n-k):",
    "        for j in range(n):",
    "            if Hx[i,j] == 1 and Hz[i,j] == 1:",
    "                circuit.append(cirq.Y(q[j]).controlled_by(s[i]))",
    "            elif Hx[i,j] == 1 and Hz[i,j] == 0:",
    "                circuit.append(cirq.CX(s[i], q[j]))",
    "            elif Hx[i,j] == 0 and Hz[i,j] == 1:",
    "                circuit.append(cirq.CZ(s[i], q[j]))",
    "                ",
    "    for i in range(n-k):",
    "        circuit.append(cirq.H(s[i]))",
    "        ",
    "    return circuit",
    "",
    "# encoder generator",
    "def encoder_gen(n,k,r,X_bar,H,circuit,q,s):",
    "    Hx = H[:, :H.shape[1] // 2]",
    "    Hz = H[:, H.shape[1] // 2:]",
    "    for i in range(k):",
    "        for j in range(r, n-k):",
    "            if X_bar[i, n+j] or X_bar[i, j]:",
    "                circuit.append(cirq.CX(q[n-k+i], q[j]))",
    "    for i in range(r):",
    "        circuit.append(cirq.H(q[i]))",
    "        for j in range(n):",
    "            if i == j:",
    "                continue",
    "            elif Hx[i, j] and Hz[i, j]:",
    "                circuit.append(cirq.CX(q[i], q[j]))",
    "                circuit.append(cirq.CZ(q[i], q[j]))",
    "            elif Hx[i, j]:",
    "                circuit.append(cirq.CX(q[i], q[j]))",
    "            elif Hz[i, j]:",
    "                circuit.append(cirq.CZ(q[i], q[j]))",
    "    return circuit",
    "",
    "# compute standard form (gauss-jordan elimination on H mod 2)",
    "def gauss_jordan(H):",
    "    H_gauss_jordan = H.rref()[0]",
    "    H_gauss_jordan = H_gauss_jordan.applyfunc(lambda x: sp.Mod(x, 2))",
    "    return H_gauss_jordan",
    "",
    "# define parameters",
    `N = ${n}`,
    `K = ${k}`,
    `r = ${activeR}`,
    "",
  ];

  if (isPermuted) {
    // Commented out original PCM
    lines.push("# define PCM");
    lines.push("# define Hx");
    lines.push("# Hx = sp.Matrix([");
    Hx.forEach((row, i) => {
      const comma = i < Hx.length - 1 ? "," : "";
      lines.push(`#     [${row.join(",")}]${comma}`);
    });
    lines.push("# ], dtype=int)");
    lines.push("#");
    lines.push("# define Hz");
    lines.push("# Hz = sp.Matrix([");
    Hz.forEach((row, i) => {
      const comma = i < Hz.length - 1 ? "," : "";
      lines.push(`#     [${row.join(",")}]${comma}`);
    });
    lines.push("# ], dtype=int)");
    lines.push("");
    lines.push("# note: the original PCM cannot be reduced to standard form without column swaps.");
    lines.push("# a permuted PCM is defined below to enable standard-form gaussian elimination.");
    if (colPerm && colPerm.length) {
      lines.push(`col_perm = [${colPerm.join(", ")}]`);
    } else {
      lines.push("col_perm = list(range(N))");
    }
    lines.push("");
    lines.push("# define PCM");
    lines.push("# define Hx");
    lines.push("Hx = sp.Matrix([");
    lines.push(formatMatrix(permHx || Hx));
    lines.push("], dtype=int)");
    lines.push("");
    lines.push("# define Hz");
    lines.push("Hz = sp.Matrix([");
    lines.push(formatMatrix(permHz || Hz));
    lines.push("], dtype=int)");
  } else {
    lines.push("col_perm = list(range(N))");
    lines.push("");
    lines.push("# define PCM");
    lines.push("# define Hx");
    lines.push("Hx = sp.Matrix([");
    lines.push(formatMatrix(Hx));
    lines.push("], dtype=int)");
    lines.push("");
    lines.push("# define Hz");
    lines.push("Hz = sp.Matrix([");
    lines.push(formatMatrix(Hz));
    lines.push("], dtype=int)");
  }

  lines.push(
    "",
    "# define H",
    "H = Hx.row_join(Hz)",
    "",
    "# calculate SIP",
    "SIP = (Hx * Hz.transpose() + Hz * Hx.transpose()) % 2",
    "",
    "# perform gauss jordan elimination on H",
    "H_gauss_jordan = gauss_jordan(H)",
    "",
    "# define logical operator X",
    "X_bar = sp.Matrix([",
    formatMatrix(activeXBar),
    "], dtype=int)",
    "",
    "# define logical operator Z",
    "Z_bar = sp.Matrix([",
    formatMatrix(activeZBar),
    "], dtype=int)",
    "",
    "# define the Pauli list",
    "pauli_list = [('I', -1)]",
    "for pauli in ['X', 'Y', 'Z']:",
    "    for i in range(N):",
    "        pauli_list.append((pauli, i))",
    "",
    "# define dummy list",
    "syndrome_result = []",
    "",
    "simulator = cirq.Simulator()",
    "",
    "# iterate over the Pauli list and apply the corresponding gates",
    "for pauli, qubit in pauli_list:",
    "    circuit, q, s = circuit_gen(N, K)",
    "    circuit = encoder_gen(N, K, r, X_bar, H_gauss_jordan, circuit, q, s)",
    "    ",
    "    # map physical qubit to circuit qubit",
    "    target_qubit = col_perm.index(qubit) if qubit != -1 else -1",
    "    ",
    "    if pauli == 'X':",
    "        circuit.append(cirq.X(q[target_qubit]))",
    "    elif pauli == 'Y':",
    "        circuit.append(cirq.Y(q[target_qubit]))",
    "    elif pauli == 'Z':",
    "        circuit.append(cirq.Z(q[target_qubit]))",
    "        ",
    "    circuit = stabilizer_gen(N, K, H, circuit, q, s)",
    "    circuit.append(cirq.measure(*s, key='syndrome'))",
    "    ",
    "    result = simulator.run(circuit, repetitions=1)",
    "    measurements = result.measurements['syndrome'][0]",
    "    syndrome = \"\".join(str(x) for x in measurements)",
    "    syndrome_result.append(syndrome)",
    "    ",
    "    pauli_str = ['I'] * N",
    "    if qubit != -1:",
    "        pauli_str[qubit] = pauli",
    "    pauli_str = ''.join(pauli_str)",
    "    print('Measured syndrome of ', pauli_str, ' are: ', {syndrome: 1})",
    "",
    "total_count = len(syndrome_result)",
    "unique_syndrome = set(syndrome_result)",
    "unique_count = len(unique_syndrome)",
    "",
    "print('----------------------------------------------------------')",
    "print('Unique syndrome is ', unique_count, ' out of ', total_count)"
  );

  return lines.join("\n");
}