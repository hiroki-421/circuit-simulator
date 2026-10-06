import type { Wire } from "../types/circuit"

type Props = {
  wire: Wire
  selected: boolean
  selectedBendId: string | null
  onSelect: (wireId: string) => void
  onDoubleClick: (
    e: React.MouseEvent<SVGLineElement>,
    wireId: string
  ) => void
  onBendPointerDown: (
    e: React.PointerEvent<SVGCircleElement>,
    wireId: string,
    bendId: string
  ) => void
}

type Point = {
  x: number
  y: number
}

export default function WireView({
  wire,
  selectedBendId,
  onSelect,
  onDoubleClick,
  onBendPointerDown,
}: Props) {
  const points: Point[] = [
    // from / to は親側で計算した値を利用するため、
    // このコンポーネントでは bends の描画を担当します。
  ]

  void points

  return (
    <g>
      {/* 実際の線は CircuitEditor 側で描画 */}
      {wire.bends.map((bend) => (
        <circle
          key={bend.id}
          cx={bend.x}
          cy={bend.y}
          r={selectedBendId === bend.id ? 9 : 7}
          fill={selectedBendId === bend.id ? "red" : "orange"}
          stroke="black"
          strokeWidth="2"
          style={{ cursor: "move" }}
          onPointerDown={(e) =>
            onBendPointerDown(e, wire.id, bend.id)
          }
        />
      ))}

      {/* ダブルクリック検出用の透明線は
          CircuitEditor側で処理します */}
      <g
        onClick={() => onSelect(wire.id)}
        onDoubleClick={(e) => {
          const target = e.currentTarget.parentElement
            ?.querySelector("line[data-wire-hit='true']")

          if (target) {
            onDoubleClick(
              e as unknown as React.MouseEvent<SVGLineElement>,
              wire.id
            )
          }
        }}
      />
    </g>
  )
}