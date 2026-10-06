import {
  useState,
} from "react"

import type {
  Circuit,
} from "../types/circuit"

import type {
  SpiceResult,
} from "../logic/spice/types"

import {
  createSpiceNetlist,
  runSpiceSimulation,
} from "../logic/spice/engine"

type Props = {
  circuit: Circuit

  onResult: (
    result: SpiceResult
  ) => void
}

export default function SpicePanel({
  circuit,
  onResult,
}: Props) {
  const [
    result,
    setResult,
  ] = useState<SpiceResult | null>(
    null
  )

  const [
    running,
    setRunning,
  ] = useState(false)

  const [
    netlist,
    setNetlist,
  ] = useState("")

  async function handleRunSpice() {
    setRunning(true)

    /*
     * 実行前に現在のNetlistを表示
     */
    try {
      const currentNetlist =
        createSpiceNetlist(
          circuit
        )

      setNetlist(
        currentNetlist
      )
    } catch {
      setNetlist("")
    }

    try {
      const spiceResult =
        await runSpiceSimulation(
          circuit
        )

      setResult(
        spiceResult
      )

      /*
       * App.tsxへ結果を渡す
       */
      onResult(
        spiceResult
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error)

      const failedResult:
        SpiceResult = {
          success: false,

          message:
            "SPICE実行中にエラーが発生しました",

          nodeVoltages: {},

          branchCurrents: {},

          componentCurrents: {},

          rawOutput:
            message,
        }

      setResult(
        failedResult
      )

      onResult(
        failedResult
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <div
      style={{
        width: "320px",

        minWidth: "320px",

        height: "100vh",

        overflowY: "auto",

        background: "#fff",

        borderLeft:
          "1px solid #ccc",

        padding: "10px",

        boxSizing:
          "border-box",
      }}
    >

      {/* ================================= */}
      {/* SPICE */}
      {/* ================================= */}

      <h2
        style={{
          marginTop: 0,
          marginBottom: "10px",
        }}
      >
        SPICE
      </h2>

      <button
        onClick={
          handleRunSpice
        }
        disabled={running}
        style={{
          width: "100%",

          padding:
            "8px",

          cursor:
            running
              ? "default"
              : "pointer",
        }}
      >
        {running
          ? "⚡ 計算中..."
          : "⚡ SPICE実行"}
      </button>

      {/* ================================= */}
      {/* ステータス */}
      {/* ================================= */}

      {result && (
        <div
          style={{
            marginTop:
              "10px",

            padding:
              "8px",

            border:
              result.success
                ? "1px solid #4caf50"
                : "1px solid #f44336",

            background:
              result.success
                ? "#f1f8e9"
                : "#ffebee",

            fontSize:
              "13px",
          }}
        >
          {result.success
            ? "✅ "
            : "❌ "}

          {result.message}
        </div>
      )}

      {/* ================================= */}
      {/* ノード電圧 */}
      {/* ================================= */}

      {result &&
        result.success && (
          <div
            style={{
              marginTop:
                "10px",

              padding:
                "8px",

              border:
                "1px solid #ddd",

              background:
                "#fafafa",
            }}
          >
            <strong>
              ノード電圧
            </strong>

            {Object.entries(
              result.nodeVoltages
            ).map(
              ([
                node,
                voltage,
              ]) => (
                <div
                  key={node}
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    marginTop:
                      "5px",

                    fontSize:
                      "13px",
                  }}
                >
                  <span>
                    {node}
                  </span>

                  <span>
                    {voltage.toFixed(
                      6
                    )}{" "}
                    V
                  </span>
                </div>
              )
            )}
          </div>
        )}

      {/* ================================= */}
      {/* 抵抗電流 */}
      {/* ================================= */}

      {result &&
        result.success && (
          <div
            style={{
              marginTop:
                "10px",

              padding:
                "8px",

              border:
                "1px solid #ddd",

              background:
                "#fafafa",
            }}
          >
            <strong>
              抵抗電流
            </strong>

            {Object.entries(
              result.branchCurrents
            ).map(
              ([
                name,
                current,
              ]) => (
                <div
                  key={name}
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    marginTop:
                      "5px",

                    fontSize:
                      "13px",
                  }}
                >
                  <span>
                    {name}
                  </span>

                  <span>
                    {(
                      current *
                      1000
                    ).toFixed(
                      6
                    )}{" "}
                    mA
                  </span>
                </div>
              )
            )}
          </div>
        )}

      {/* ================================= */}
      {/* Netlist */}
      {/* ================================= */}

      <div
        style={{
          marginTop:
            "10px",
        }}
      >
        <strong>
          Netlist
        </strong>

        <textarea
          value={netlist}
          readOnly
          style={{
            width: "100%",

            height:
              "120px",

            marginTop:
              "5px",

            resize:
              "vertical",

            boxSizing:
              "border-box",

            fontSize:
              "11px",

            fontFamily:
              "monospace",
          }}
        />
      </div>

      {/* ================================= */}
      {/* SPICE Output */}
      {/* ================================= */}

      {result?.rawOutput && (
        <div
          style={{
            marginTop:
              "10px",
          }}
        >
          <strong>
            SPICE Output
          </strong>

          <textarea
            value={
              result.rawOutput
            }
            readOnly
            style={{
              width:
                "100%",

              height:
                "250px",

              marginTop:
                "5px",

              resize:
                "vertical",

              boxSizing:
                "border-box",

              fontSize:
                "10px",

              fontFamily:
                "monospace",
            }}
          />
        </div>
      )}
    </div>
  )
}