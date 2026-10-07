import type {
  Circuit,
  CircuitComponent,
  Wire,
} from "../types/circuit"

import type {
  SpiceResult,
} from "../logic/spice/types"

import ComponentItem from "./ComponentItem"
import SpiceResultOverlay from "./SpiceResultOverlay"
import CurrentFlowAnimation from "./CurrentFlowAnimation"

type Props = {
  circuit: Circuit

  selectedComponentId: string | null
  selectedTerminalId: string | null
  selectedWireId: string | null
  selectedBendId: string | null

  spiceResult: SpiceResult | null

  onComponentPointerDown: (
    e: React.PointerEvent<SVGGElement>,
    componentId: string
  ) => void

  onTerminalClick: (
    e: React.MouseEvent<SVGCircleElement>,
    terminalId: string
  ) => void

  onSelectWire: (
    wireId: string
  ) => void

  onWireDoubleClick: (
    e: React.MouseEvent<SVGLineElement>,
    wireId: string
  ) => void

  onBendPointerDown: (
    e: React.PointerEvent<SVGCircleElement>,
    wireId: string,
    bendId: string
  ) => void

  onBendClick: (
    e: React.MouseEvent<SVGCircleElement>,
    bendId: string
  ) => void

  onToggleSwitch: (
    componentId: string
  ) => void

  onClearSelection: () => void
}

const WIDTH = 900
const HEIGHT = 650

function getTerminalPosition(
  component: CircuitComponent,
  terminalId: string
) {
  const terminal =
    component.terminals.find(
      (t) =>
        t.id === terminalId
    )

  if (!terminal) {
    return {
      x: component.x,
      y: component.y,
    }
  }

  return {
    x:
      terminal.side === "left"
        ? component.x - 30
        : component.x + 30,

    y: component.y,
  }
}

function getWirePointPosition(
  pointId: string,
  circuit: Circuit
) {
  // -----------------------------------------------
  // 部品端子
  // -----------------------------------------------

  for (
    const component of
      circuit.components
  ) {
    const terminal =
      component.terminals.find(
        (t) =>
          t.id === pointId
      )

    if (terminal) {
      return getTerminalPosition(
        component,
        pointId
      )
    }
  }

  // -----------------------------------------------
  // 折れ点
  // -----------------------------------------------

  for (
    const wire of
      circuit.wires
  ) {
    const bend =
      wire.bends.find(
        (b) =>
          b.id === pointId
      )

    if (bend) {
      return {
        x: bend.x,
        y: bend.y,
      }
    }
  }

  return null
}

function getWirePoints(
  wire: Wire,
  circuit: Circuit
) {
  const from =
    getWirePointPosition(
      wire.from,
      circuit
    )

  const to =
    getWirePointPosition(
      wire.to,
      circuit
    )

  if (
    !from ||
    !to
  ) {
    return []
  }

  return [
    from,

    ...wire.bends.map(
      (bend) => ({
        x: bend.x,
        y: bend.y,
      })
    ),

    to,
  ]
}

export default function CircuitEditor({
  circuit,

  selectedComponentId,
  selectedTerminalId,
  selectedWireId,
  selectedBendId,

  spiceResult,

  onComponentPointerDown,
  onTerminalClick,
  onSelectWire,
  onWireDoubleClick,
  onBendPointerDown,
  onBendClick,
  onToggleSwitch,
  onClearSelection,
}: Props) {
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: "#eee",
      }}
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{
          background: "white",
          display: "block",
        }}
        onClick={
          onClearSelection
        }
      >

        <defs>
          <pattern
            id="circuit-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#circuit-grid)"
          pointerEvents="none"
        />

        {/* ================================= */}
        {/* 配線 */}
        {/* ================================= */}

        {circuit.wires.map(
          (wire) => {
            const points =
              getWirePoints(
                wire,
                circuit
              )

            if (
              points.length < 2
            ) {
              return null
            }

            return (
              <g key={wire.id}>
                {points
                  .slice( 0, -1 )
                  .map( ( p, index ) => {

                      const next =
                        points[ index + 1 ]

                      return (
                        <g key={`${wire.id}-${index}`} >
                          {/* 実際の配線 */}
                          <line
                            x1={p.x}
                            y1={p.y}
                            x2={next.x}
                            y2={next.y}
                            stroke={
                              selectedWireId ===
                              wire.id
                                ? "orange"
                                : "black"
                            }
                            strokeWidth="3"
                            fill="none"
                            style={{
                              pointerEvents:
                                "none",
                            }}
                          />

                          {/* クリック用透明線 */}
                          <line
                            data-wire-hit="true"
                            x1={p.x}
                            y1={p.y}
                            x2={next.x}
                            y2={next.y}
                            stroke="transparent"
                            strokeWidth="16"
                            style={{
                              cursor: "pointer",
                            }}
                            onClick={( e ) => {
                              e.stopPropagation()
                              onSelectWire(
                                wire.id
                              )
                            }}
                            onDoubleClick={( e ) => {
                              e.stopPropagation()
                              onWireDoubleClick(
                                e,
                                wire.id
                              )
                            }}
                          />
                        </g>
                      )
                    }
                  )}

                {/* 折れ点 */}
                {wire.bends.map(
                  (bend) => (
                    <circle
                      key={ bend.id }
                      cx={bend.x}
                      cy={bend.y}
                      r={
                        selectedBendId ===
                        bend.id
                          ? 9
                          : 7
                      }
                      fill={
                        selectedBendId ===
                        bend.id
                          ? "red"
                          : "orange"
                      }
                      stroke="black"
                      strokeWidth="2"
                      style={{
                        cursor:
                          "move",
                      }}
                      onPointerDown={(
                        e
                      ) =>
                        onBendPointerDown(
                          e,
                          wire.id,
                          bend.id
                        )
                      }
                      onClick={(e) =>{
                        e.stopPropagation()

                        onBendClick(
                          e,
                          bend.id
                        )
                      }}
                    />
                  )
                )}
                {/* ============================== */}
                {/* 電流アニメーション */}
                {/* ============================== */}

                <CurrentFlowAnimation
                  circuit={circuit}
                  wire={wire}
                  spiceResult={spiceResult}
                />

              </g>
            )
          }
        )}

        {/* ================================= */}
        {/* 部品 */}
        {/* ================================= */}

        {circuit.components.map(
          (component) => (
            <ComponentItem
              key={
                component.id
              }

              component={
                component
              }

              selected={
                selectedComponentId ===
                component.id
              }

              selectedTerminalId={
                selectedTerminalId
              }

              onPointerDown={
                onComponentPointerDown
              }

              onTerminalClick={
                onTerminalClick
              }

              onToggleSwitch={
                onToggleSwitch
              }
            />
          )
        )}

        {/* ================================= */}
        {/* SPICE計算結果 */}
        {/* ================================= */}

        <SpiceResultOverlay
          circuit={
            circuit
          }

          spiceResult={
            spiceResult
          }
        />

      </svg>
    </div>
  )
}