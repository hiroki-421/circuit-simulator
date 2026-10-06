import type { Circuit } from "../../types/circuit"
import { circuitToNetlist } from "./netlist"
import createNgspiceModule from "./ngspice.js"
import type { SpiceResult } from "./types"

type NgspiceModule = Awaited<
  ReturnType<typeof createNgspiceModule>
>

let ngspiceModule: NgspiceModule | null = null
let loadingPromise: Promise<NgspiceModule> | null = null

let capturedOutput = ""
let capturedError = ""

async function loadNgspice() {
  if (ngspiceModule) {
    return ngspiceModule
  }

  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = createNgspiceModule({
    noInitialRun: true,

    ENV: {
    SPICE_NO_DATASEG_CHECK: "1",
  },

  preRun: [
    (module: NgspiceModule) => {
      console.log("===== ngspice WASM preRun =====")

      // /proc を作る
      try {
        module.FS.mkdir("/proc")
      } catch {
        // すでに存在していれば無視
      }

      // /proc/meminfo を作る
      try {
        module.FS.writeFile(
          "/proc/meminfo",
          "MemTotal: 16400000 kB\nMemFree: 16000000 kB\n",
        )

        console.log("✅ /proc/meminfo created")
      } catch (error) {
        console.error(
          "❌ /proc/meminfo creation failed",
          error,
        )
      }

      // /proc/self を作る
      try {
        module.FS.mkdir("/proc/self")
      } catch {
        // すでに存在していれば無視
      }

      // /proc/self/statm を作る
      try {
        module.FS.writeFile(
          "/proc/self/statm",
          "100000 50000 10000 5000 0 0 0\n",
        )

        console.log("✅ /proc/self/statm created")
      } catch (error) {
        console.error(
          "❌ /proc/self/statm creation failed",
          error,
        )
      }

      // spinit
      try {
        module.FS.writeFile(
          "/spinit",
          "* ngspice initialization\n",
        )

        console.log("✅ /spinit created")
      } catch (error) {
        console.error(
          "❌ /spinit creation failed",
          error,
        )
      }

      console.log("==============================")
    },
  ],

    print: (text: string) => {
      console.log("[ngspice]", text)
      capturedOutput += text + "\n"
    },

    printErr: (text: string) => {
      console.error("[ngspice error]", text)
      capturedError += text + "\n"
    },

    locateFile: (path: string, prefix: string) => {
      return `${prefix}${path}`
    },
  })

  try {
    ngspiceModule = await loadingPromise

    if (ngspiceModule.ENV) {
      ngspiceModule.ENV.SPICE_NO_DATASEG_CHECK = "1"
    }

    console.log("===== ngspice loaded =====")
    console.log("_main:", typeof ngspiceModule._main)
    console.log("stackAlloc:", typeof ngspiceModule.stackAlloc)
    console.log("stackSave:", typeof ngspiceModule.stackSave)
    console.log("stackRestore:", typeof ngspiceModule.stackRestore)
    console.log("setValue:", typeof ngspiceModule.setValue)
    console.log("FS:", typeof ngspiceModule.FS)
    console.log("==========================")

    return ngspiceModule
  } catch (error) {
    loadingPromise = null
    throw error
  }
}

/**
 * ngspiceへ渡すargvを作る
 */
function createArgv(
  module: NgspiceModule,
  args: string[],
) {
  const argvPtr = module.stackAlloc(
    (args.length + 1) * 4,
  )

  for (let i = 0; i < args.length; i++) {
    const text = args[i]

    const byteLength =
      module.lengthBytesUTF8(text) + 1

    const textPtr =
      module.stackAlloc(byteLength)

    module.stringToUTF8(
      text,
      textPtr,
      byteLength,
    )

    module.setValue(
      argvPtr + i * 4,
      textPtr,
      "*",
    )
  }

  module.setValue(
    argvPtr + args.length * 4,
    0,
    "*",
  )

  return argvPtr
}

/**
 * .print用Netlistを作る
 */
function createOutputNetlist(
  circuit: Circuit,
) {
  const original =
    circuitToNetlist(circuit)

  const lines =
    original.split("\n")

  const nodeSet =
    new Set<string>()

  for (const line of lines) {
    const matches =
      line.match(/\bN\d+\b/g)

    if (!matches) continue

    for (const node of matches) {
      nodeSet.add(node)
    }
  }

  /*
   * ノード電圧
   */
  const printArguments =
    Array.from(nodeSet).map(
      node => `v(${node})`,
    )

  /*
   * 電圧源電流
   */
  for (const component of circuit.components) {
    if (component.type !== "battery") {
      continue
    }

    const index =
      circuit.components.indexOf(component) + 1

    printArguments.push(
      `i(V${index})`,
    )
  }

  const printLine =
    `.print op ${printArguments.join(" ")}`

  const endIndex =
    lines.findIndex(
      line =>
        line.trim().toLowerCase() ===
        ".end",
    )

  if (endIndex >= 0) {
    lines.splice(
      endIndex,
      0,
      printLine,
    )
  } else {
    lines.push(printLine)
    lines.push(".end")
  }

  return lines.join("\n")
}

/**
 * SPICEの数値をJavaScriptのnumberへ
 */
function parseSpiceNumber(
  value: string,
) {
  const number =
    Number(
      value
        .replace(/[dD]/g, "e")
        .trim(),
    )

  return Number.isFinite(number)
    ? number
    : null
}

/**
 * ngspiceの出力から
 * ノード電圧を取り出す
 */
function parseNodeVoltages(
  output: string,
  nodes: string[],
) {
  const nodeVoltages:
    Record<string, number> = {}

  /*
   * まず直接検索
   *
   * v(N1) = 5
   *
   * のような形式にも対応
   */
  for (const node of nodes) {
    const patterns = [
      new RegExp(
        `v\\(${node}\\)\\s*=\\s*` +
        `([-+]?\\d+(?:\\.\\d*)?` +
        `(?:[eEdD][-+]?\\d+)?)`,
        "i",
      ),

      new RegExp(
        `\\b${node}\\s*=\\s*` +
        `([-+]?\\d+(?:\\.\\d*)?` +
        `(?:[eEdD][-+]?\\d+)?)`,
        "i",
      ),
    ]

    for (const regex of patterns) {
      const match =
        output.match(regex)

      if (!match) continue

      const value =
        parseSpiceNumber(match[1])

      if (value !== null) {
        nodeVoltages[node] = value
        break
      }
    }
  }

  /*
   * 表形式にも対応
   *
   * 例：
   *
   * Index   v(n1)   v(n2)   v2#branch
   * 0       5       3       -0.005
   */
  const lines =
    output.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const headerLine =
      lines[i].trim()

    /*
     * v(n1), v(n2) などを含む行を
     * ヘッダーとして扱う
     */
    if (
      !/\bv\([^)]+\)/i.test(
        headerLine,
      )
    ) {
      continue
    }

    const headers =
      headerLine.split(/\s+/)

    /*
     * 次の数値行を探す
     */
    for (
      let j = i + 1;
      j < Math.min(i + 10, lines.length);
      j++
    ) {
      const valueLine =
        lines[j].trim()

      if (!valueLine) continue

      /*
       * 区切り線は無視
       */
      if (
        /^[-=]+$/.test(
          valueLine.replace(/\s/g, ""),
        )
      ) {
        continue
      }

      const values =
        valueLine.split(/\s+/)

      const hasIndex =
        headers[0]?.toLowerCase() ===
        "index"

      /*
       * Indexあり
       *
       * Index   v(n1)   v(n2)
       * 0       5       3
       */
      const valuesHaveIndex =
        hasIndex &&
        values.length ===
          headers.length

      /*
       * Indexなし
       *
       * Index   v(n1)   v(n2)
       *         5       3
       */
      const valuesWithoutIndex =
        hasIndex &&
        values.length ===
          headers.length - 1

      /*
       * ヘッダーと数値を対応させる
       */
      for (
        let h = 0;
        h < headers.length;
        h++
      ) {
        const header =
          headers[h]

        const match =
          header.match(
            /^v\(([^)]+)\)$/i,
          )

        if (!match) {
          continue
        }

        const node =
          match[1]

        /*
         * Netlist側のノード名と
         * 大文字小文字を無視して照合
         */
        const requestedNode =
          nodes.find(
            (n) =>
              n.toLowerCase() ===
              node.toLowerCase(),
          )

        if (!requestedNode) {
          continue
        }

        let valueIndex = h

        /*
         * Index列があるが、
         * 数値行にIndexがない場合
         */
        if (valuesWithoutIndex) {
          valueIndex = h - 1
        }

        /*
         * Indexが実際に数値行にもある場合
         */
        if (valuesHaveIndex) {
          valueIndex = h
        }

        /*
         * Index列がない場合
         */
        if (!hasIndex) {
          valueIndex = h
        }

        if (
          valueIndex < 0 ||
          valueIndex >= values.length
        ) {
          continue
        }

        const value =
          parseSpiceNumber(
            values[valueIndex],
          )

        if (value !== null) {
          nodeVoltages[
            requestedNode
          ] = value
        }
      }

      /*
       * 必要なノードが全部取得できたら終了
       */
      const allNodesFound =
        nodes.every(
          (node) =>
            nodeVoltages[node] !==
            undefined,
        )

      if (allNodesFound) {
        break
      }
    }
  }

  console.log(
    "===== parseNodeVoltages =====",
  )

  console.log(
    "Requested nodes:",
    nodes,
  )

  console.log(
    "Parsed node voltages:",
    nodeVoltages,
  )

  console.log(
    "=============================",
  )

  return nodeVoltages
}

/**
 * Netlistから抵抗を取り出す
 */
function parseResistors(
  netlist: string,
) {
  const resistors: {
    name: string
    node1: string
    node2: string
    resistance: number
  }[] = []

  for (
    const line of netlist.split("\n")
  ) {
    const parts =
      line.trim().split(/\s+/)

    if (parts.length < 4) {
      continue
    }

    const name =
      parts[0]

    if (
      !/^R\d+$/i.test(name)
    ) {
      continue
    }

    const node1 =
      parts[1]

    const node2 =
      parts[2]

    const resistance =
      Number(parts[3])

    if (
      !node1 ||
      !node2 ||
      !Number.isFinite(resistance)
    ) {
      continue
    }

    resistors.push({
      name,
      node1,
      node2,
      resistance,
    })
  }

  return resistors
}

/**
 * ngspiceの出力から
 * 電圧源の電流を取り出す
 *
 * 対応例:
 *
 * v2#branch   -5.00000e-03
 *
 * または
 *
 * i(v2) = -5.00000e-03
 */
function parseVoltageSourceCurrents(
  output: string,
) {
  const currents:
    Record<string, number> = {}

  const lines =
    output.split("\n")

  for (
    const line of lines
  ) {
    const trimmed =
      line.trim()

    /*
     * -------------------------
     * v2#branch  -5.0e-03
     * -------------------------
     */
    const branchMatch =
      trimmed.match(
        /^([vV]\d+)#branch\s+([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eEdD][-+]?\d+)?)/
      )

    if (branchMatch) {
      const name =
        branchMatch[1].toUpperCase()

      const value =
        parseSpiceNumber(
          branchMatch[2],
        )

      if (value !== null) {
        currents[name] =
          value
      }

      continue
    }

    /*
     * -------------------------
     * i(v2) = -5.0e-03
     * -------------------------
     */
    const iMatch =
      trimmed.match(
        /^i\(\s*([vV]\d+)\s*\)\s*=\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eEdD][-+]?\d+)?)/
      )

    if (iMatch) {
      const name =
        iMatch[1].toUpperCase()

      const value =
        parseSpiceNumber(
          iMatch[2],
        )

      if (value !== null) {
        currents[name] =
          value
      }
    }
  }

  return currents
}

/**
 * 抵抗の電流を計算
 *
 * I = (V1 - V2) / R
 */
function calculateResistorCurrents(
  netlist: string,
  nodeVoltages:
    Record<string, number>,
) {
  const branchCurrents:
    Record<string, number> = {}

  const resistors =
    parseResistors(netlist)

  for (
    const resistor of resistors
  ) {
    const voltage1 =
      resistor.node1 === "0"
        ? 0
        : nodeVoltages[
            resistor.node1
          ]

    const voltage2 =
      resistor.node2 === "0"
        ? 0
        : nodeVoltages[
            resistor.node2
          ]

    /*
     * 電圧が取得できなかった場合は
     * 勝手に0Vにしない
     */
    if (
      voltage1 === undefined ||
      voltage2 === undefined
    ) {
      continue
    }

    if (
      resistor.resistance === 0
    ) {
      continue
    }

    const current =
      (voltage1 - voltage2) /
      resistor.resistance

    branchCurrents[
      resistor.name
    ] = current
  }

  return branchCurrents
}

export function createSpiceNetlist(
  circuit: Circuit,
) {
  return circuitToNetlist(circuit)
}

export function isNgSpiceReady() {
  return ngspiceModule !== null
}

export async function runSpiceSimulation(
  circuit: Circuit,
): Promise<SpiceResult> {
  capturedOutput = ""
  capturedError = ""

  try {
    const originalNetlist =
      circuitToNetlist(circuit)

    /*
     * GND確認
     */
    if (
      !/\s0\s/.test(
        originalNetlist + "\n",
      )
    ) {
      return {
        success: false,
        message:
          "GNDが回路に接続されていません。GND端子を回路の端子へ配線してください。",
        nodeVoltages: {},
        branchCurrents: {},
        componentCurrents: {},
        rawOutput:
          "Netlistにノード0がありません。\n\n" +
          originalNetlist,
      }
    }

    const netlist =
      createOutputNetlist(circuit)

    console.log(
      "===== SPICE Netlist =====",
    )

    console.log(netlist)

    console.log(
      "=========================",
    )

    const module =
      await loadNgspice()

      if (module.ENV) {
        module.ENV.SPICE_NO_DATASEG_CHECK = "1"
      }

    // ngspice用の仮想ファイルシステムを準備
if (module.ENV) {
  module.ENV.HOME = "/"
}

// spinitを作成
try {
  module.FS.writeFile(
    "/spinit",
    "set no_mem_check\n",
  )
  console.log("✅ /spinit created")
} catch (error) {
  console.warn("⚠️ /spinit creation failed:", error)
}

// /proc/meminfoを作成
try {
  try {
    module.FS.mkdir("/proc")
  } catch {
    // 既に存在する場合は無視
  }

  module.FS.writeFile(
    "/proc/meminfo",
    "MemTotal: 16400000 kB\nMemFree: 16000000 kB\n",
  )

  console.log("✅ /proc/meminfo created")
} catch (error) {
  console.warn(
    "⚠️ /proc/meminfo creation failed:",
    error,
  )
}

// /proc/self/statmを作成
try {
  try {
    module.FS.mkdir("/proc/self")
  } catch {
    // 既に存在する場合は無視
  }

  module.FS.writeFile(
    "/proc/self/statm",
    "100000 50000 10000 5000 0 0 0\n",
  )

  console.log("✅ /proc/self/statm created")
} catch (error) {
  console.warn(
    "⚠️ /proc/self/statm creation failed:",
    error,
  )
}

// 回路ファイルを書き込む
module.FS.writeFile(
  "/circuit.cir",
  netlist,
)

console.log("✅ /circuit.cir created")

const args = [
  "ngspice",
  "-b",
  "/circuit.cir",
]

    const stack =
      module.stackSave()

    try {
      const argv =
        createArgv(
          module,
          args,
        )

      let exitCode = 0

      try {
        exitCode =
        module._main(
        args.length,
        argv,
      )
      } catch (error) {
         console.warn(
        "ngspice _main threw:",
        error,
      )

      /*
      * ngspice WASMでは、
      * 正常終了 exit(0) でも
      * ExitStatus が throw される。
      *
       * status === 0 は正常終了として扱う。
      */
        if (
        typeof error === "object" &&
           error !== null &&
        "status" in error &&
        (error as { status?: unknown }).status === 0
        ) {
          exitCode = 0
        } else {
          throw error
        }
      }

      const output =
        capturedOutput.trim()

      const errorOutput =
        capturedError.trim()

      const combinedOutput =
        [
          output,
          errorOutput,
        ]
          .filter(Boolean)
          .join("\n")

      /*
       * ノード一覧
       */
      const nodes =
        Array.from(
          new Set(
            originalNetlist.match(
              /\bN\d+\b/g,
            ) ?? [],
          ),
        )

      /*
       * 電圧取得
       */
      const nodeVoltages =
        parseNodeVoltages(
          combinedOutput,
          nodes,
        )

      /*
       * 抵抗電流
       */
      const branchCurrents =
        calculateResistorCurrents(
          originalNetlist,
          nodeVoltages,
        )

        const voltageSourceCurrents =
          parseVoltageSourceCurrents(
            combinedOutput,
        )

        Object.assign(
          branchCurrents,
            voltageSourceCurrents,
        )

        const componentCurrents:
  Record<string, number> = {}

for (
  const component of
  circuit.components
) {
  const index =
    circuit.components.indexOf(
      component,
    ) + 1

  let spiceName: string | null =
    null

  if (
    component.type ===
    "resistor"
  ) {
    spiceName = `R${index}`
  }

  if (
    component.type ===
    "battery"
  ) {
    spiceName = `V${index}`
  }

  if (!spiceName) {
    continue
  }

  const current =
    branchCurrents[
      spiceName
    ]

  if (
    current === undefined
  ) {
    continue
  }

  componentCurrents[
    component.id
  ] = current
}

      console.log(
        "===== Parsed Results =====",
      )

      console.log(
        "Node Voltages:",
        nodeVoltages,
      )

      console.log(
        "Branch Currents:",
        branchCurrents,
      )

      console.log(
        "Raw Output:",
        combinedOutput,
      )

      console.log(
        "==========================",
      )

      if (!combinedOutput) {
        return {
          success: false,
          message:
            "SPICEは起動しましたが、解析結果を取得できませんでした",
          nodeVoltages,
          branchCurrents,
          componentCurrents,
          rawOutput:
            "SPICEから出力がありませんでした。",
        }
      }

      return {
        success: exitCode === 0,

        message:
          exitCode === 0
            ? "SPICEシミュレーションが完了しました"
            : `SPICEが終了コード ${exitCode} で終了しました`,

        nodeVoltages,
        branchCurrents,
        componentCurrents,

        rawOutput:
          combinedOutput,
      }
    } finally {
      module.stackRestore(stack)
      ngspiceModule = null
      loadingPromise = null
    }
  } catch (error) {
    console.error(
      "===== SPICE EXECUTION ERROR =====",
    )

    console.error(error)

    console.error(
      "=================================",
    )

    let errorMessage =
      "不明なエラー"

    if (error instanceof Error) {
      errorMessage =
        error.message
    } else if (
      typeof error === "string"
    ) {
      errorMessage = error
    } else {
      try {
        errorMessage =
          JSON.stringify(error)
      } catch {
        errorMessage =
          String(error)
      }
    }

    const outputParts = [
      capturedOutput.trim(),
      capturedError.trim(),
      `JavaScript Error: ${errorMessage}`,
    ].filter(Boolean)

    return {
      success: false,
      message:
        "SPICE実行中にエラーが発生しました",
      nodeVoltages: {},
      branchCurrents: {},
      componentCurrents: {},
      rawOutput:
        outputParts.join("\n\n") ||
        `JavaScript Error: ${errorMessage}`,
    }
  }
}