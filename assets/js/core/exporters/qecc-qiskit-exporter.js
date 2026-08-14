// QUANTUM LABS — QECC Qiskit Exporter
// Generates Qiskit Python code for QECC encoding and syndrome extraction.

function formatMatrix(mat) {
  if (!mat || mat.length === 0) return "    []";
  return mat.map(row => "    [" + row.join(",") + "]").join(",\n");
}

export function exportQeccQiskit(qeccData) {
  const { n, k, r, r_sf, Hx, Hz, permHx, permHz, isPermuted, colPerm, xBar, zBar, xBarSt, zBarSt } = qeccData;
  const activeXBar = (isPermuted && xBarSt) ? xBarSt : xBar;
  const activeZBar = (isPermuted && zBarSt) ? zBarSt : zBar;
  const activeR = r_sf !== undefined ? r_sf : r;

  const lines = [
    "# import libraries",
    "from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister, transpile",
    "from qiskit_aer import AerSimulator",
    "import sympy as sp",
    "",
    "# circuit generator",
    "def circuit_gen(n,k):",
    "    qr = QuantumRegister(n, 'q')",
    "    cr = ClassicalRegister(n, 'c')",
    "    sr = QuantumRegister(n-k, 'syndrome')",
    "    crs = ClassicalRegister(n-k, 'cs')",
    "    return QuantumCircuit(qr,cr,sr,crs)",
    "",
    "# stabilizer generator",
    "def stabilizer_gen(n,k,H,circuit):",
    "    Hx = H[:, :H.shape[1] // 2]",
    "    Hz = H[:, H.shape[1] // 2:]",
    "    circuit.h(range(n,n+(n-k)))",
    "    for i in range(n-k):",
    "        for j in range(n):",
    "            if Hx[i,j] == 1 and Hz[i,j] == 1:",
    "                circuit.cy(n+i,j)",
    "            elif Hx[i,j] == 1 and Hz[i,j] == 0:",
    "                circuit.cx(n+i,j)",
    "            elif Hx[i,j] == 0 and Hz[i,j] == 1:",
    "                circuit.cz(n+i,j)",
    "        circuit.barrier()",
    "    circuit.h(range(n,n+(n-k)))",
    "    return circuit",
    "",
    "# encoder generator",
    "def encoder_gen(n,k,r,X_bar,H,circuit):",
    "    Hx = H[:, :H.shape[1] // 2]",
    "    Hz = H[:, H.shape[1] // 2:]",
    "    for i in range(k):",
    "        for j in range(r, n-k):",
    "            if X_bar[i, j]:",
    "                circuit.cx(n-k+i, j)",
    "    circuit.barrier()",
    "    for i in range(r):",
    "        circuit.h(i)",
    "        for j in range(n):",
    "            if i == j:",
    "                continue",
    "            elif Hx[i, j] and Hz[i, j]:",
    "                circuit.cx(i, j)",
    "                circuit.cz(i, j)",
    "            elif Hx[i, j]:",
    "                circuit.cx(i, j)",
    "            elif Hz[i, j]:",
    "                circuit.cz(i, j)",
    "        circuit.barrier()",
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
    "simulator = AerSimulator()",
    "",
    "# iterate over the Pauli list and apply the corresponding gates",
    "for pauli, qubit in pauli_list:",
    "    circuit = circuit_gen(N, K)",
    "    circuit = encoder_gen(N, K, r, X_bar, H_gauss_jordan, circuit)",
    "    ",
    "    # map physical qubit to circuit qubit",
    "    target_qubit = col_perm.index(qubit) if qubit != -1 else -1",
    "    ",
    "    if pauli == 'X':",
    "        circuit.x(target_qubit)",
    "    elif pauli == 'Y':",
    "        circuit.y(target_qubit)",
    "    elif pauli == 'Z':",
    "        circuit.z(target_qubit)",
    "        ",
    "    circuit = stabilizer_gen(N, K, H, circuit)",
    "    circuit.measure(range(N, N+(N-K)), range(N, N+(N-K)))",
    "    ",
    "    compiled_circuit = transpile(circuit, simulator)",
    "    job = simulator.run(compiled_circuit, shots=1)",
    "    result = job.result().get_counts()",
    "    ",
    "    # note: Qiskit returns bits in little-endian order (bit n-k-1 down to bit 0)",
    "    syndrome = list(result.keys())[0].split()[0][::-1]",
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