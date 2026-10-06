import type {
  Circuit,
  Wire,
} from "../types/circuit"

import type {
  SpiceResult,
} from "../logic/spice/types"

import {
  getWireCurrentFlow,
} from "../logic/spice/currentFlow"


type Props = {
  circuit: Circuit
  wire: Wire
  spiceResult: SpiceResult | null
}


/*
 * ==========================================
 * 端子位置を取得
 * ==========================================
 */

function getTerminalPosition(
  circuit: Circuit,
  terminalId: string,
) {
  for (
    const component of
    circuit.components
  ) {
    const terminal =
      component.terminals.find(
        (t) =>
          t.id === terminalId,
      )

    if (!terminal) {
      continue
    }

    return {
      x:
        terminal.side === "left"
          ? component.x - 30
          : component.x + 30,

      y:
        component.y,
    }
  }

  return null
}


/*
 * ==========================================
 * WireのSVG Pathを作成
 * ==========================================
 */

function createPath(
  circuit: Circuit,
  wire: Wire,
) {
  const from =
    getTerminalPosition(
      circuit,
      wire.from,
    )

  const to =
    getTerminalPosition(
      circuit,
      wire.to,
    )

  if (
    !from ||
    !to
  ) {
    return null
  }

  let path =
    `M ${from.x} ${from.y}`

  for (
    const bend of
    wire.bends
  ) {
    path +=
      ` L ${bend.x} ${bend.y}`
  }

  path +=
    ` L ${to.x} ${to.y}`

  return path
}


/*
 * ==========================================
 * 電流アニメーション
 * ==========================================
 */

export default function CurrentFlowAnimation({
  circuit,
  wire,
  spiceResult,
}: Props) {

  /*
   * Wire電流を取得
   */

  const currentFlow =
    getWireCurrentFlow(
      circuit,
      wire,
      spiceResult,
    )


  /*
   * 電流情報がない
   */

  if (
    currentFlow === null
  ) {
    return null
  }


  /*
   * 電流が0なら表示しない
   */

  if (
    currentFlow.direction ===
    "none"
  ) {
    return null
  }


  /*
   * WireのPathを作成
   */

  const path =
    createPath(
      circuit,
      wire,
    )

  if (!path) {
    return null
  }


  /*
   * SVG Path ID
   */

  const pathId =
    `current-flow-${wire.id}`


  /*
   * 電流の大きさ
   */

  const magnitude =
    currentFlow.magnitude


  /*
   * 電流が大きいほど速くする
   *
   * ただし速すぎないように制限。
   */

  const duration =
    Math.max(
      0.25,
      Math.min(
        2.0,
        0.02 /
          magnitude,
      ),
    )


  /*
   * reverseなら逆方向
   */

  const reverse =
    currentFlow.direction ===
    "reverse"


  /*
   * ========================================
   * 描画
   * ========================================
   */

  return (
    <g
      pointerEvents="none"
    >

      {/* アニメーション用の透明Path */}

      <path
        id={pathId}
        d={path}
        fill="none"
        stroke="none"
      />


      {/* ==================================
          1個目の電流粒
          ================================== */}

      <circle
        r="4"
        fill="#e53935"
      >
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"

          keyPoints={
            reverse
              ? "1;0"
              : "0;1"
          }

          keyTimes="0;1"
          calcMode="linear"
        >

          <mpath
            href={`#${pathId}`}
          />

        </animateMotion>
      </circle>


      {/* ==================================
          2個目の電流粒
          ================================== */}

      <circle
        r="4"
        fill="#e53935"
      >
        <animateMotion
          dur={`${duration}s`}
          begin={`${duration / 3}s`}
          repeatCount="indefinite"

          keyPoints={
            reverse
              ? "1;0"
              : "0;1"
          }

          keyTimes="0;1"
          calcMode="linear"
        >

          <mpath
            href={`#${pathId}`}
          />

        </animateMotion>
      </circle>


      {/* ==================================
          3個目の電流粒
          ================================== */}

      <circle
        r="4"
        fill="#e53935"
      >
        <animateMotion
          dur={`${duration}s`}
          begin={`${(duration * 2) / 3}s`}
          repeatCount="indefinite"

          keyPoints={
            reverse
              ? "1;0"
              : "0;1"
          }

          keyTimes="0;1"
          calcMode="linear"
        >

          <mpath
            href={`#${pathId}`}
          />

        </animateMotion>
      </circle>

    </g>
  )
}