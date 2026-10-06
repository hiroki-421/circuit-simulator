import type { ComponentType } from "../types/circuit"

type Props = {
  onAddComponent: (type: ComponentType) => void
  circuitName: string
  onCircuitNameChange: (name: string) => void
  onSave: () => void
  onLoad: () => void
}

export default function LeftPanel({
  onAddComponent,
  circuitName,
  onCircuitNameChange,
  onSave,
  onLoad,
}: Props) {
  return (
    <div
      style={{
        width: 220,
        padding: 15,
        borderRight: "1px solid #ccc",
        background: "#f5f5f5",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ marginTop: 0 }}>部品</h2>

      <button
        style={buttonStyle}
        onClick={() => onAddComponent("battery")}
      >
        🔋 電池
      </button>

      <button
        style={buttonStyle}
        onClick={() => onAddComponent("resistor")}
      >
        ⬜ 抵抗
      </button>

      <button
        style={buttonStyle}
        onClick={() => onAddComponent("capacitor")}
      >
        ▫️ コンデンサ
      </button>

      <button
        style={buttonStyle}
        onClick={() => onAddComponent("inductor")}
      >
        🌀 コイル
      </button>

      <button
        style={buttonStyle}
        onClick={() => onAddComponent("switch")}
      >
        🔘 スイッチ
      </button>

      <button
        onClick={() => onAddComponent("ground")}
      >
        ⏚ GND
      </button>

      <hr />

      <h3>回路名</h3>

      <input
        value={circuitName}
        onChange={(e) => onCircuitNameChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 8,
          marginBottom: 10,
        }}
      />

      <button style={buttonStyle} onClick={onSave}>
        💾 JSON保存
      </button>

      <button style={buttonStyle} onClick={onLoad}>
        📂 JSON読み込み
      </button>
    </div>
  )
}

const buttonStyle = {
  width: "100%",
  padding: "10px 8px",
  marginBottom: 8,
  cursor: "pointer",
}