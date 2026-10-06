import type { Circuit } from "../types/circuit"
import type { SpiceResult } from "../logic/spice/types"

type Props = {
  circuit: Circuit
  spiceResult: SpiceResult | null
}


/*
 * ================================
 * 電流表示
 * ================================
 */
function formatCurrent(
  current: number
) {
  const abs =
    Math.abs(current)

  if (abs >= 1) {
    return `${current.toFixed(3)} A`
  }

  if (abs >= 0.001) {
    return `${(
      current * 1000
    ).toFixed(3)} mA`
  }

  if (abs >= 0.000001) {
    return `${(
      current * 1000000
    ).toFixed(3)} µA`
  }

  return `${(
    current * 1000000000
  ).toFixed(3)} nA`
}


/*
 * ================================
 * 電圧表示
 * ================================
 */
function formatVoltage(
  voltage: number
) {
  const abs =
    Math.abs(voltage)

  if (abs >= 1) {
    return `${voltage.toFixed(3)} V`
  }

  if (abs >= 0.001) {
    return `${(
      voltage * 1000
    ).toFixed(3)} mV`
  }

  if (abs >= 0.000001) {
    return `${(
      voltage * 1000000
    ).toFixed(3)} µV`
  }

  return `${(
    voltage * 1000000000
  ).toFixed(3)} nV`
}


/*
 * ================================
 * 電力表示
 * ================================
 */
function formatPower(
  power: number
) {
  const abs =
    Math.abs(power)

  if (abs >= 1) {
    return `${power.toFixed(3)} W`
  }

  if (abs >= 0.001) {
    return `${(
      power * 1000
    ).toFixed(3)} mW`
  }

  if (abs >= 0.000001) {
    return `${(
      power * 1000000
    ).toFixed(3)} µW`
  }

  return `${(
    power * 1000000000
  ).toFixed(3)} nW`
}


export default function SpiceResultOverlay({
  circuit,
  spiceResult,
}: Props) {

  /*
   * SPICE結果がない
   */
  if (!spiceResult) {
    return null
  }

  /*
   * SPICE計算失敗
   */
  if (!spiceResult.success) {
    return null
  }

  /*
   * 抵抗だけ取得
   */
  const resistors =
    circuit.components.filter(
      (component) =>
        component.type ===
        "resistor"
    )

  /*
   * SPICE側の抵抗名を取得
   *
   * 例：
   *
   * R2
   * R3
   */
  const spiceResistorNames =
    Object.keys(
      spiceResult.branchCurrents
    )
      .filter(
        (name) =>
          /^R\d+$/i.test(name)
      )
      .sort(
        (a, b) => {
          const numberA =
            Number(
              a.substring(1)
            )

          const numberB =
            Number(
              b.substring(1)
            )

          return (
            numberA -
            numberB
          )
        }
      )


  return (
    <g>

      {/* ===================================== */}
      {/* 電流矢印用 marker */}
      {/* ===================================== */}

      <defs>

        <marker
          id="spice-current-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 8 4 L 0 8 Z"
            fill="#e53935"
          />
        </marker>

      </defs>


      {/* ===================================== */}
      {/* 抵抗ごとの結果 */}
      {/* ===================================== */}

      {resistors.map(
        (
          resistor,
          index
        ) => {

          /*
           * 対応するSPICE抵抗名
           */
          const spiceName =
            spiceResistorNames[
              index
            ]

          /*
           * SPICE電流
           */
          const current =
            spiceName
              ? spiceResult
                  .branchCurrents[
                    spiceName
                  ]
              : undefined

          /*
           * 電流が取得できなければ
           * 表示しない
           */
          if (
            current ===
            undefined
          ) {
            return null
          }

          /*
           * 抵抗値
           */
          const resistance =
            resistor.value

          /*
           * ==============================
           * 電圧
           *
           * V = I × R
           * ==============================
           */
          
            const displayCurrent =
              Math.abs(current)

            const voltage =
              Math.abs(
                current *
              resistor.value
              )

          /*
           * ==============================
           * 電力
           *
           * P = I² × R
           * ==============================
           */
          const power =
            current *
            current *
            resistance

          /*
           * ==============================
           * 電流矢印
           * ==============================
           *
           * 正：
           * 左 → 右
           *
           * 負：
           * 右 → 左
           */

          const arrowStartX =
            current >= 0
              ? resistor.x - 20
              : resistor.x + 20

          const arrowEndX =
            current >= 0
              ? resistor.x + 20
              : resistor.x - 20

          /*
           * 抵抗の少し上に表示
           */
          const arrowY =
            resistor.y - 22


          return (
            <g
              key={
                resistor.id
              }
              pointerEvents="none"
            >

              {/* ================================= */}
              {/* 電流方向矢印 */}
              {/* ================================= */}

              {current !== 0 && (
                <line
                  x1={
                    arrowStartX
                  }
                  y1={
                    arrowY
                  }
                  x2={
                    arrowEndX
                  }
                  y2={
                    arrowY
                  }
                  stroke="#e53935"
                  strokeWidth="3"
                  markerEnd={
                    "url(#spice-current-arrow)"
                  }
                />
              )}


              {/* ================================= */}
              {/* 結果表示 */}
              {/* ================================= */}

              <rect
                x={
                  resistor.x + 45
                }
                y={
                  resistor.y - 55
                }
                width="160"
                height="78"
                rx="6"
                fill="white"
                stroke="#2196f3"
                strokeWidth="2"
              />


              {/* ================================= */}
              {/* SPICE抵抗名 */}
              {/* ================================= */}

              <text
                x={
                  resistor.x + 53
                }
                y={
                  resistor.y - 38
                }
                fontSize="11"
                fontWeight="bold"
                fill="#1565c0"
              >
                {`SPICE ${spiceName}`}
              </text>


              {/* ================================= */}
              {/* 電流 */}
              {/* ================================= */}

              <text
                x={
                  resistor.x + 53
                }
                y={
                  resistor.y - 21
                }
                fontSize="12"
                fill="#1565c0"
              >
                {`I = ${formatCurrent(
                  displayCurrent                  
                )}`}
              </text>


              {/* ================================= */}
              {/* 電圧 */}
              {/* ================================= */}

              <text
                x={
                  resistor.x + 53
                }
                y={
                  resistor.y - 4
                }
                fontSize="12"
                fill="#1565c0"
              >
                {`V = ${formatVoltage(
                  voltage
                )}`}
              </text>


              {/* ================================= */}
              {/* 電力 */}
              {/* ================================= */}

              <text
                x={
                  resistor.x + 53
                }
                y={
                  resistor.y + 13
                }
                fontSize="12"
                fill="#1565c0"
              >
                {`P = ${formatPower(
                  power
                )}`}
              </text>

            </g>
          )
        }
      )}

    </g>
  )
}