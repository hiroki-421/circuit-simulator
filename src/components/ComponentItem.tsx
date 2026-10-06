import type {
  CircuitComponent,
} from "../types/circuit"

type Props = {
  component: CircuitComponent
  selected: boolean
  selectedTerminalId: string | null

  onPointerDown: (
    e: React.PointerEvent<SVGGElement>,
    componentId: string
  ) => void

  onTerminalClick: (
    e: React.MouseEvent<SVGCircleElement>,
    terminalId: string
  ) => void

  onToggleSwitch: (
    componentId: string
  ) => void
}

function getLabel(
  component: CircuitComponent
) {
  switch (component.type) {
    case "battery":
      return "🔋"

    case "resistor":
      return "R"

    case "capacitor":
      return "C"

    case "inductor":
      return "L"

    case "switch":
      return component.switchOn
        ? "SW ON"
        : "SW OFF"

    case "ground":
      return "GND"

    default:
      return ""
  }
}

function getValueText(
  component: CircuitComponent
) {
  if (component.type === "ground") {
    return ""
  }

  if (component.type === "switch") {
    return component.switchOn
      ? "ON"
      : "OFF"
  }

  return String(component.value)
}

export default function ComponentItem({
  component,
  selected,
  selectedTerminalId,
  onPointerDown,
  onTerminalClick,
  onToggleSwitch,
}: Props) {

  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      onPointerDown={(e) => {
        e.stopPropagation()

        onPointerDown(
          e,
          component.id
        )
      }}
      onClick={(e) => {
      e.stopPropagation()
      }}
      style={{
        cursor: "grab",
      }}
    >
      {/* 部品本体 */}

      {component.type === "resistor" && (
        <polyline
          points="-20,0 -14,-10 -7,10 0,-10 7,10 14,-10 20,0"
          fill="none"
          stroke={selected ? "blue" : "black"}
          strokeWidth="3"
        />
      )}

      {component.type === "battery" && (
        <>
          <line
            x1="-10"
            y1="-15"
            x2="-10"
            y2="15"
            stroke={selected ? "blue" : "black"}
            strokeWidth="4"
          />

          <line
            x1="10"
            y1="-8"
            x2="10"
            y2="8"
            stroke={selected ? "blue" : "black"}
            strokeWidth="4"
          />
        </>
      )}

      {component.type === "capacitor" && (
        <>
          <line
            x1="-8"
            y1="-15"
            x2="-8"
            y2="15"
            stroke={selected ? "blue" : "black"}
            strokeWidth="4"
          />

          <line
            x1="8"
            y1="-15"
            x2="8"
            y2="15"
            stroke={selected ? "blue" : "black"}
            strokeWidth="4"
          />
        </>
      )}

      {component.type === "inductor" && (
        <path
          d="M -20 0
             C -15 -15, -5 -15, 0 0
             C 5 -15, 15 -15, 20 0"
          fill="none"
          stroke={selected ? "blue" : "black"}
          strokeWidth="3"
        />
      )}

      {component.type === "switch" && (
        <>
          <circle
            cx="-18"
            cy="0"
            r="4"
            fill="white"
            stroke="black"
            strokeWidth="2"
          />

          <circle
            cx="18"
            cy="0"
            r="4"
            fill="white"
            stroke="black"
            strokeWidth="2"
          />

          <line
            x1="-18"
            y1="0"
            x2={
              component.switchOn
                ? "18"
                : "8"
            }
            y2={
              component.switchOn
                ? "0"
                : "-12"
            }
            stroke={
              selected
                ? "blue"
                : "black"
            }
            strokeWidth="4"
          />

          <text
            x="0"
            y="-25"
            textAnchor="middle"
            fontSize="12"
            onClick={(e) => {
              e.stopPropagation()

              onToggleSwitch(
                component.id
              )
            }}
            style={{
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {component.switchOn
              ? "ON"
              : "OFF"}
          </text>
        </>
      )}

      {component.type === "ground" && (
        <>
          <line
            x1="0"
            y1="-5"
            x2="0"
            y2="5"
            stroke="black"
            strokeWidth="3"
          />

          <line
            x1="-15"
            y1="5"
            x2="15"
            y2="5"
            stroke="black"
            strokeWidth="3"
          />

          <line
            x1="-10"
            y1="10"
            x2="10"
            y2="10"
            stroke="black"
            strokeWidth="3"
          />

          <line
            x1="-5"
            y1="15"
            x2="5"
            y2="15"
            stroke="black"
            strokeWidth="3"
          />
        </>
      )}

      {/* 部品名 */}

      <text
        x="0"
        y="32"
        textAnchor="middle"
        fontSize="14"
        fill="black"
        style={{
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {getLabel(component)}
      </text>

      {/* 値 */}

      <text
        x="0"
        y="48"
        textAnchor="middle"
        fontSize="12"
        fill="black"
        style={{
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {getValueText(component)}
      </text>

      {/* 左端子 */}

      <circle
        cx="-30"
        cy="0"
        r="7"
        fill={
          selectedTerminalId ===
          component.terminals[0]?.id
            ? "red"
            : "white"
        }
        stroke="black"
        strokeWidth="2"
        onClick={(e) => {
          e.stopPropagation()

          const terminal =
            component.terminals[0]

          if (terminal) {
            onTerminalClick(
              e,
              terminal.id
            )
          }
        }}
        style={{
          cursor: "crosshair",
        }}
      />

      {/* 右端子 */}

      {component.terminals.length > 1 && (
        <circle
          cx="30"
          cy="0"
          r="7"
          fill={
            selectedTerminalId ===
            component.terminals[1]?.id
              ? "red"
              : "white"
          }
          stroke="black"
          strokeWidth="2"
          onClick={(e) => {
            e.stopPropagation()

            const terminal =
              component.terminals[1]

            if (terminal) {
              onTerminalClick(
                e,
                terminal.id
              )
            }
          }}
          style={{
            cursor: "crosshair",
          }}
        />
      )}

      {/* 選択枠 */}

      {selected && (
        <rect
          x="-38"
          y="-25"
          width="76"
          height="50"
          fill="none"
          stroke="blue"
          strokeWidth="2"
          strokeDasharray="5 3"
          pointerEvents="none"
        />
      )}
    </g>
  )
}