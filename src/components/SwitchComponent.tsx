type Props = {
  x: number
  y: number
  switchOn: boolean
  selected: boolean
  onToggle: () => void
}

export default function SwitchComponent({
  x,
  y,
  switchOn,
  selected,
  onToggle,
}: Props) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      style={{ cursor: "pointer" }}
    >
      {/* 選択枠 */}
      {selected && (
        <rect
          x="-42"
          y="-32"
          width="84"
          height="64"
          fill="none"
          stroke="blue"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      )}

      {/* 左右の端子 */}
      <circle
        cx="-30"
        cy="0"
        r="7"
        fill="white"
        stroke="black"
        strokeWidth="2"
      />

      <circle
        cx="30"
        cy="0"
        r="7"
        fill="white"
        stroke="black"
        strokeWidth="2"
      />

      {/* 導線 */}
      <line
        x1="-30"
        y1="0"
        x2="-10"
        y2="0"
        stroke="black"
        strokeWidth="3"
      />

      <line
        x1="10"
        y1="0"
        x2="30"
        y2="0"
        stroke="black"
        strokeWidth="3"
      />

      {/* スイッチ本体 */}
      {switchOn ? (
        <line
          x1="-10"
          y1="0"
          x2="10"
          y2="0"
          stroke="black"
          strokeWidth="4"
        />
      ) : (
        <line
          x1="-10"
          y1="0"
          x2="7"
          y2="-12"
          stroke="black"
          strokeWidth="4"
        />
      )}

      <text
        x="0"
        y="27"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
      >
        {switchOn ? "ON" : "OFF"}
      </text>
    </g>
  )
}