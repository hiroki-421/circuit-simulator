import type {
  CircuitComponent,
  Wire,
  ResistorResult,
} from "../types/circuit"

type Props = {
  selectedComponent:
    | CircuitComponent
    | null

  selectedWire:
    | Wire
    | null

  valueInput: string

  onValueChange: (
    value: string
  ) => void

  onDeleteComponent: () => void

  onToggleSwitch: (
    componentId: string
  ) => void

  onDeleteWire: () => void

  onDeleteBend: () => void

  selectedBendId:
    | string
    | null

  closedCircuit:
    | boolean
    | null

  onCheckCircuit: () => void

  onCalculate: () => void

  totalResistance: number

  totalCurrent: number

  resistorResults:
    ResistorResult[]
}

export default function RightPanel({
  selectedComponent,
  selectedWire,
  valueInput,
  onValueChange,
  onDeleteComponent,
  onToggleSwitch,
  onDeleteWire,
  onDeleteBend,
  selectedBendId,
  closedCircuit,
  onCheckCircuit,
  onCalculate,
  totalResistance,
  totalCurrent,
  resistorResults,
}: Props) {
  return (
    <div
      style={{
        width: 280,
        padding: 15,
        borderLeft: "1px solid #ccc",
        background: "#fafafa",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        設定
      </h2>

      {selectedComponent && (
        <section>
          <h3>部品設定</h3>

          <p>
            種類：
            {selectedComponent.type}
          </p>

          {selectedComponent.type ===
            "switch" ? (
            <>
              <p>
                状態：
                <strong>
                  {selectedComponent.switchOn
                    ? " ON"
                    : " OFF"}
                </strong>
              </p>

              <button
                style={buttonStyle}
                onClick={() =>
                  onToggleSwitch(
                    selectedComponent.id
                  )
                }
              >
                🔄 スイッチ切替
              </button>
            </>
          ) : (
            <>
              <label>
                値
                <input
                  value={valueInput}
                  onChange={(e) =>
                    onValueChange(
                      e.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: 8,
                    boxSizing:
                      "border-box",
                    marginTop: 5,
                  }}
                />
              </label>

              <button
                style={buttonStyle}
                onClick={
                  onDeleteComponent
                }
              >
                🗑️ この部品を削除
              </button>
            </>
          )}
        </section>
      )}

{selectedWire && (
  <section>
    <h3>🔌 配線設定</h3>

    <button
      style={buttonStyle}
      onClick={onDeleteWire}
    >
      🗑️ この配線を削除
    </button>
  </section>
)}

{selectedBendId && (
  <section>
    <h3>📍 折れ点設定</h3>

    <p>
      選択中の折れ点：
      <strong>{selectedBendId}</strong>
    </p>

    <button
      style={buttonStyle}
      onClick={onDeleteBend}
    >
      ➖ 選択した折れ点を削除
    </button>
  </section>
)}

      <hr />

      <section>
        <h3>
          🔄 閉回路チェック
        </h3>

        <button
          style={buttonStyle}
          onClick={onCheckCircuit}
        >
          🔍 回路をチェック
        </button>

        {closedCircuit !== null && (
          <p>
            結果：
            <strong>
              {closedCircuit
                ? " 閉回路です"
                : " 開回路です"}
            </strong>
          </p>
        )}
      </section>

      <hr />

      <section>
        <h3>
          ⚡ 電圧・電流計算
        </h3>

        <button
          style={buttonStyle}
          onClick={onCalculate}
        >
          ⚡ 計算する
        </button>

        {totalResistance > 0 && (
          <>
            <p>
              合成抵抗：
              {totalResistance.toFixed(
                2
              )} Ω
            </p>

            <p>
              回路電流：
              {totalCurrent.toFixed(
                6
              )} A
            </p>

            <h4>
              各抵抗
            </h4>

            {resistorResults.map(
              (result) => (
                <div
                  key={result.id}
                  style={{
                    border:
                      "1px solid #ccc",
                    padding: 8,
                    marginBottom: 5,
                  }}
                >
                  <div>
                    抵抗：
                    {result.resistance}
                    Ω
                  </div>

                  <div>
                    電流：
                    {result.current.toFixed(
                      6
                    )} A
                  </div>

                  <div>
                    電圧：
                    {result.voltage.toFixed(
                      3
                    )} V
                  </div>
                </div>
              )
            )}
          </>
        )}
      </section>
    </div>
  )
}

const buttonStyle = {
  width: "100%",
  padding: 9,
  marginBottom: 8,
  cursor: "pointer",
}