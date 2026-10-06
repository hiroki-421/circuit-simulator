import type {
  Circuit,
  CircuitComponent,
} from "../../types/circuit"

class UnionFind {
  private parent =
    new Map<string, string>()

  add(value: string) {
    if (!this.parent.has(value)) {
      this.parent.set(
        value,
        value
      )
    }
  }

  find(value: string): string {
    const parent =
      this.parent.get(value)

    if (!parent) {
      this.parent.set(
        value,
        value
      )

      return value
    }

    if (parent === value) {
      return value
    }

    const root =
      this.find(parent)

    this.parent.set(
      value,
      root
    )

    return root
  }

  union(
    a: string,
    b: string
  ) {
    const rootA =
      this.find(a)

    const rootB =
      this.find(b)

    if (rootA !== rootB) {
      this.parent.set(
        rootB,
        rootA
      )
    }
  }
}

function buildNodeMap(
  circuit: Circuit
) {
  const uf =
    new UnionFind()

  /*
  * 全端子を登録
  */
  for (
    const component of
      circuit.components
  ) {
    for (
      const terminal of
        component.terminals
    ) {
      uf.add(
        terminal.id
      )
    }
  }

  /*
  * 全配線の折れ点を登録
  *
  * BendPointも
  * 電気的な接続点として扱う
  */
  for (
    const wire of
      circuit.wires
  ) {
    for (
      const bend of
        wire.bends
    ) {
      uf.add(
        bend.id
      )
    }
  }

  /*
 　* 配線された端子・折れ点を
 　* 同じノードにする
  */
  for (
    const wire of
      circuit.wires
  ) {
    const points = [
      wire.from,

      ...wire.bends.map(
        (bend) =>
          bend.id
      ),

      wire.to,
    ]

    for (
      let i = 1;
      i < points.length;
      i++
    ) {
      uf.union(
        points[i - 1],
        points[i]
      )
    }
  }

  /*
   * GND端子を探す
   */
  let groundRoot:
    string | null = null

  for (
    const component of
      circuit.components
  ) {
    if (
      component.type !==
      "ground"
    ) {
      continue
    }

    const terminal =
      component.terminals[0]

    if (!terminal) {
      continue
    }

    groundRoot =
      uf.find(
        terminal.id
      )

    break
  }

  const rootToNode =
    new Map<
      string,
      string
    >()

  let nodeNumber = 1

  /*
   * GNDノードは必ず0
   */
  if (groundRoot) {
    rootToNode.set(
      groundRoot,
      "0"
    )
  }

  /*
   * その他のノード
   */
  for (
    const component of
      circuit.components
  ) {
    for (
      const terminal of
        component.terminals
    ) {
      const root =
        uf.find(
          terminal.id
        )

      if (
        !rootToNode.has(
          root
        )
      ) {
        rootToNode.set(
          root,
          `N${nodeNumber++}`
        )
      }
    }
  }

  /*
   * 端子ID → SPICEノード
   */
    const terminalToNode =
      new Map<
        string,
        string
      >()

    for (
      const component of
        circuit.components
    ) {
      for (
        const terminal of
          component.terminals
      ) {
        const root =
          uf.find(
            terminal.id
          )

        const node =
          rootToNode.get(
            root
          ) ?? "0"

        terminalToNode.set(
          terminal.id,
          node
        )
      }
    }

  /*
  * BendPoint ID → SPICEノード
  */
  for (
    const wire of
      circuit.wires
  ) {
    for (
      const bend of
        wire.bends
    ) {
      const root =
        uf.find(
          bend.id
        )

      const node =
        rootToNode.get(
          root
        ) ?? "0"

      terminalToNode.set(
        bend.id,
        node
      )
    }
  }

  return terminalToNode
}

function getNode(
  nodeMap: Map<
    string,
    string
  >,
  terminalId: string
) {
  return (
    nodeMap.get(
      terminalId
    ) ?? "0"
  )
}

function componentToSpice(
  component: CircuitComponent,
  nodeMap: Map<
    string,
    string
  >,
  index: number
) {
  /*
   * GND部品そのものは
   * SPICE素子として出さない
   */
  if (
    component.type ===
    "ground"
  ) {
    return ""
  }

  const left =
    getNode(
      nodeMap,
      component.terminals[0]?.id ??
        ""
    )

  const right =
    getNode(
      nodeMap,
      component.terminals[1]?.id ??
        ""
    )

  switch (
    component.type
  ) {
    case "battery":
      return (
        `V${index} ` +
        `${left} ` +
        `${right} ` +
        `DC ${component.value}`
      )

    case "resistor":
      return (
        `R${index} ` +
        `${left} ` +
        `${right} ` +
        `${component.value}`
      )

    case "capacitor":
      return (
        `C${index} ` +
        `${left} ` +
        `${right} ` +
        `${component.value}`
      )

    case "inductor":
      return (
        `L${index} ` +
        `${left} ` +
        `${right} ` +
        `${component.value}`
      )

    case "switch":
      /*
       * ON
       */
      if (component.switchOn) {
        return (
          `R${index} ` +
          `${left} ` +
          `${right} ` +
          `0.001`
        )
      }

      /*
       * OFF
       */
      return (
        `R${index} ` +
        `${left} ` +
        `${right} ` +
        `1e12`
      )

    default:
      return ""
  }
}

export function circuitToNetlist(
  circuit: Circuit
) {
  const nodeMap =
    buildNodeMap(
      circuit
    )

  const lines: string[] =
    []

  lines.push(
    `* ${
      circuit.name ||
      "Circuit"
    }`
  )

  circuit.components.forEach(
    (
      component,
      index
    ) => {
      const line =
        componentToSpice(
          component,
          nodeMap,
          index + 1
        )

      if (line) {
        lines.push(
          line
        )
      }
    }
  )

  lines.push("")
  lines.push(".op")
  lines.push(".end")

  return lines.join(
    "\n"
  )
}