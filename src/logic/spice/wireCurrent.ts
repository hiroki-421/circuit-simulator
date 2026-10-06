import type {
  Circuit,
  CircuitComponent,
  Wire,
} from "../../types/circuit"

import type {
  SpiceResult,
} from "./types"


/*
 * ==========================================
 * Wire電流情報
 * ==========================================
 */

export type WireCurrent = {
  wireId: string
  current: number
}


/*
 * ==========================================
 * 端子を取得
 * ==========================================
 */

function findTerminal(
  component: CircuitComponent,
  terminalId: string,
) {
  return component.terminals.find(
    (terminal) =>
      terminal.id === terminalId,
  )
}


/*
 * ==========================================
 * 部品電流
 *
 * 正方向：
 *
 * left → right
 *
 * 負方向：
 *
 * right → left
 * ==========================================
 */

function getComponentCurrent(
  component: CircuitComponent,
  spiceResult: SpiceResult,
) {
  const current =
    spiceResult.componentCurrents[
      component.id
    ]

  if (current === undefined) {
    return null
  }

  return current
}


/*
 * ==========================================
 * 端子から見た電流の流れ
 *
 * nodeInjection:
 *
 * 「部品からノードへ流れ込む電流」
 *
 * left terminal:
 *   +I
 *
 * right terminal:
 *   -I
 *
 * となる。
 * ==========================================
 */

function getTerminalInjection(
  component: CircuitComponent,
  terminalId: string,
  current: number,
) {
  const terminal =
    findTerminal(
      component,
      terminalId,
    )

  if (!terminal) {
    return null
  }

  /*
   * 部品電流：
   *
   * left → right
   *
   * の場合、
   *
   * left側から部品へ電流が入る。
   *
   * つまり左端子では
   * ノードから部品へ流れる。
   *
   * ノードへの注入量は -I。
   */

  if (terminal.side === "left") {
    return -current
  }

  /*
   * right側では
   * 部品からノードへ電流が出る。
   *
   * ノードへの注入量は +I。
   */

  return current
}


/*
 * ==========================================
 * Wireで接続された端子を取得
 *
 * 指定した端子からWireだけを通って
 * 到達できる端子を調べる。
 * ==========================================
 */

function getWireNeighbors(
  circuit: Circuit,
  terminalId: string,
  excludedWireId: string,
) {
  const result: string[] = []

  for (
    const wire of circuit.wires
  ) {
    /*
     * 今調べているWireは除外する。
     */
    if (
      wire.id ===
      excludedWireId
    ) {
      continue
    }

    if (
      wire.from ===
      terminalId
    ) {
      result.push(
        wire.to,
      )
    }

    if (
      wire.to ===
      terminalId
    ) {
      result.push(
        wire.from,
      )
    }
  }

  return result
}


/*
 * ==========================================
 * Wireを1本切ったときの
 * 片側ネットワークを調べる
 *
 * startTerminal
 *   ↓
 * Wireだけをたどる
 *
 * component内部には入らない。
 * ==========================================
 */

function collectTerminalNetwork(
  circuit: Circuit,
  startTerminal: string,
  excludedWireId: string,
) {
  const visited =
    new Set<string>()

  const queue: string[] = [
    startTerminal,
  ]

  while (
    queue.length > 0
  ) {
    const terminalId =
      queue.shift()!

    if (
      visited.has(
        terminalId,
      )
    ) {
      continue
    }

    visited.add(
      terminalId,
    )

    const neighbors =
      getWireNeighbors(
        circuit,
        terminalId,
        excludedWireId,
      )

    for (
      const neighbor of
      neighbors
    ) {
      if (
        !visited.has(
          neighbor,
        )
      ) {
        queue.push(
          neighbor,
        )
      }
    }
  }

  return visited
}


/*
 * ==========================================
 * ネットワーク内の
 * 部品電流注入量を合計する
 * ==========================================
 */

function calculateNetworkInjection(
  circuit: Circuit,
  terminals: Set<string>,
  spiceResult: SpiceResult,
) {
  let total = 0

  for (
    const component of
    circuit.components
  ) {
    const current =
      getComponentCurrent(
        component,
        spiceResult,
      )

    if (
      current === null
    ) {
      continue
    }

    for (
      const terminal of
      component.terminals
    ) {
      if (
        !terminals.has(
          terminal.id,
        )
      ) {
        continue
      }

      const injection =
        getTerminalInjection(
          component,
          terminal.id,
          current,
        )

      if (
        injection !== null
      ) {
        total += injection
      }
    }
  }

  return total
}


/*
 * ==========================================
 * Wireの電流を計算
 *
 * 正：
 *
 *   wire.from → wire.to
 *
 * 負：
 *
 *   wire.to → wire.from
 * ==========================================
 */

export function getWireCurrent(
  circuit: Circuit,
  wire: Wire,
  spiceResult: SpiceResult | null,
): number | null {

  /*
   * SPICE結果がない
   */
  if (
    !spiceResult ||
    !spiceResult.success
  ) {
    return null
  }


  /*
   * from側のネットワークを取得
   *
   * このWire自身は通らない。
   */
  const fromNetwork =
    collectTerminalNetwork(
      circuit,
      wire.from,
      wire.id,
    )


  /*
   * from側ネットワークにある
   * 部品からの電流注入量を合計。
   */
  const fromInjection =
    calculateNetworkInjection(
      circuit,
      fromNetwork,
      spiceResult,
    )


  /*
   * ほぼ0の場合
   */
  if (
    Math.abs(fromInjection) <
    0.000000001
  ) {
    return 0
  }


  /*
   * from側へ
   * 電流が注入されているなら、
   *
   * その電流はWireを通って
   * from → to
   *
   * に流れる。
   */
  return fromInjection
}