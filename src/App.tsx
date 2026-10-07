import {
  useEffect,
  useRef,
  useState,
} from "react"

import type {
  ChangeEvent,
  MouseEvent,
} from "react"

import type {
  CircuitComponent,
  ComponentType,
  ResistorResult,
} from "./types/circuit"

import type {
  SpiceResult,
} from "./logic/spice/types"


import LeftPanel from "./components/LeftPanel"
import RightPanel from "./components/RightPanel"
import CircuitEditor from "./components/CircuitEditor"
import SpicePanel from "./components/SpicePanel"

import {
  checkClosedCircuit,
} from "./logic/circuitCheck"

import {
  calculateCircuit,
} from "./logic/calculation"

import {
  saveCircuitToJson,
  loadCircuitFromFile,
} from "./storage/circuitFile"

import {
  useCircuitSelection,
} from "./hooks/useCircuitSelection"

import {
  useComponentDrag,
} from "./hooks/useComponentDrag"

import {
  useWireInteraction,
} from "./hooks/useWireInteraction"

import {
  useCircuit,
} from "./hooks/useCircuit"

const EDITOR_WIDTH = 900
const EDITOR_HEIGHT = 650

// =====================================================
// 数値入力の正規化
// 半角・全角数字に対応
// =====================================================

function normalizeNumberInput(
  value: string
) {
  return value
    .replace(
      /[０-９]/g,
      (char) =>
        String.fromCharCode(
          char.charCodeAt(0) -
            0xfee0
        )
    )
    .replace(
      /．/g,
      "."
    )
    .replace(
      /－/g,
      "-"
    )
    .replace(
      /[^0-9.-]/g,
      ""
    )
}

// =====================================================
// 部品生成
// =====================================================

function createComponent(
  type: ComponentType,
  id: string
): CircuitComponent {

  const defaults: Record<
    ComponentType,
    number
  > = {
    battery: 5,
    resistor: 1000,
    capacitor: 0.00001,
    inductor: 0.001,
    switch: 0,
    ground: 0,
  }

  const isGround =
    type === "ground"

  const isSwitch =
    type === "switch"


  return {
    id,

    type,

    x: 300,

    y: 200,

    value:
      defaults[type],

    valueInput:
      isGround || isSwitch
        ? ""
        : String(
            defaults[type]
          ),

    terminals:
      isGround
        ? [
            {
              id:
                `${id}-terminal`,
              side: "left",
            },
          ]
        : [
            {
              id:
                `${id}-left`,
              side: "left",
            },
            {
              id:
                `${id}-right`,
              side: "right",
            },
          ],

    ...(isSwitch
      ? {
          switchOn: false,
        }
      : {}),
  }
}


// =====================================================
// App
// =====================================================

function App() {

  // ---------------------------------------------------
  // 回路データ
  // ---------------------------------------------------

  const {
    circuit,
    setCircuit,
    idCounter,
    createId,
  } = useCircuit()

  // ---------------------------------------------------
  // 選択状態
  // ---------------------------------------------------

  const {
  selectedComponentId,
  setSelectedComponentId,

  selectedTerminalId,
  setSelectedTerminalId,

  selectedWireId,
  setSelectedWireId,

  selectedBendId,
  setSelectedBendId,

  clearCircuitSelection, 
} = useCircuitSelection()

  // ---------------------------------------------------
  // 部品値入力
  // ---------------------------------------------------

  const [
    valueInput,
    setValueInput,
  ] = useState("")

// 部品ドラッグ
  const {
    handleComponentPointerDown,
  } = useComponentDrag({
    circuit,
    setCircuit,

    setSelectedComponentId,
    setSelectedWireId,
    setSelectedBendId,

    setValueInput,
  })

  // ---------------------------------------------------
  // 計算結果
  // ---------------------------------------------------

  const [
    closedCircuit,
    setClosedCircuit,
  ] = useState<
    boolean | null
  >(null)


  const [
    totalResistance,
    setTotalResistance,
  ] = useState(0)


  const [
    totalCurrent,
    setTotalCurrent,
  ] = useState(0)


  const [
    resistorResults,
    setResistorResults,
  ] = useState<
    ResistorResult[]
  >([])

  const [
    spiceResult,
    setSpiceResult,
  ] = useState<
    SpiceResult | null
  >(null)

  // ---------------------------------------------------
  // ファイル
  // ---------------------------------------------------

  const fileInputRef =
    useRef<
      HTMLInputElement | null
    >(null)

      // ---------------------------------------------------
  // 配線操作
  // ---------------------------------------------------

  const {
    handleBendClick,
    selectWire,
    handleWireDoubleClick,
    handleBendPointerDown,
    deleteSelectedBend,
    deleteSelectedWire,
  } = useWireInteraction({
    circuit,
    setCircuit,

    idCounter,

    selectedTerminalId,
    selectedWireId,
    selectedBendId,

    setSelectedTerminalId,
    setSelectedComponentId,
    setSelectedWireId,
    setSelectedBendId,

    setValueInput,

    setClosedCircuit,
    setTotalResistance,
    setTotalCurrent,

    setResistorResults,

    editorWidth: EDITOR_WIDTH,
    editorHeight: EDITOR_HEIGHT,
  })

  // ===================================================
  // 部品追加
  // ===================================================

  const addComponent = (
    type: ComponentType
  ) => {

    const id =
      createId(type)


    const newComponent =
      createComponent(
        type,
        id
      )


    setCircuit(
      (prev) => ({
        ...prev,

        components: [
          ...prev.components,
          newComponent,
        ],
      })
    )


    setClosedCircuit(
      null
    )

    setTotalResistance(
      0
    )

    setTotalCurrent(
      0
    )

    setResistorResults(
      []
    )
  }

  function clearSelection() {
  clearCircuitSelection()
  setValueInput("")
}

  

  // ===================================================
  // 端子クリック
  // ===================================================

  function handleTerminalClick(
    e: MouseEvent<SVGCircleElement>,
    terminalId: string
  ) {

    e.stopPropagation()

    // -----------------------------------------------
    // 1個目の端子
    // -----------------------------------------------

    if (
      selectedTerminalId ===
      null
    ) {

      setSelectedTerminalId(
        terminalId
      )

      return
    }


    // -----------------------------------------------
    // 同じ端子をクリック
    // -----------------------------------------------

    if (
      selectedTerminalId ===
      terminalId
    ) {

      setSelectedTerminalId(
        null
      )

      return
    }


    // -----------------------------------------------
    // すでに接続されているか確認
    // -----------------------------------------------

    const alreadyConnected =
      circuit.wires.some(
        (wire) =>
          (
            wire.from ===
              selectedTerminalId &&
            wire.to ===
              terminalId
          ) ||
          (
            wire.from ===
              terminalId &&
            wire.to ===
              selectedTerminalId
          )
      )


    if (alreadyConnected) {

      setSelectedTerminalId(
        null
      )

      return
    }


    // -----------------------------------------------
    // 接続元部品
    // -----------------------------------------------

    const fromComponent =
      circuit.components.find(
        (component) =>
          component.terminals.some(
            (terminal) =>
              terminal.id ===
              selectedTerminalId
          )
      )


    // -----------------------------------------------
    // 接続先部品
    // -----------------------------------------------

    const toComponent =
      circuit.components.find(
        (component) =>
          component.terminals.some(
            (terminal) =>
              terminal.id ===
              terminalId
          )
      )


    if (
      !fromComponent ||
      !toComponent
    ) {

      setSelectedTerminalId(
        null
      )

      return
    }


    // -----------------------------------------------
    // 接続元端子
    // -----------------------------------------------

    const fromTerminal =
      fromComponent.terminals.find(
        (terminal) =>
          terminal.id ===
          selectedTerminalId
      )


    // -----------------------------------------------
    // 接続先端子
    // -----------------------------------------------

    const toTerminal =
      toComponent.terminals.find(
        (terminal) =>
          terminal.id ===
          terminalId
      )


    if (
      !fromTerminal ||
      !toTerminal
    ) {

      setSelectedTerminalId(
        null
      )

      return
    }


    // -----------------------------------------------
    // 折れ点の初期位置
    // -----------------------------------------------

    const fromX =
      fromTerminal.side ===
      "left"
        ? fromComponent.x - 30
        : fromComponent.x + 30


    const toX =
      toTerminal.side ===
      "left"
        ? toComponent.x - 30
        : toComponent.x + 30


    // -----------------------------------------------
    // Wire ID
    // -----------------------------------------------

    const wireId =
      `wire-${idCounter.current++}`


    // -----------------------------------------------
    // Bend ID
    // -----------------------------------------------

    const bendId =
      `bend-${idCounter.current++}`


    // -----------------------------------------------
    // 配線追加
    // -----------------------------------------------

    setCircuit(
      (prev) => ({
        ...prev,

        wires: [
          ...prev.wires,

          {
            id: wireId,

            from:
              selectedTerminalId,

            to:
              terminalId,

            bends: [
              {
                id: bendId,

                x:
                  (
                    fromX +
                    toX
                  ) / 2,

                y:
                  (
                    fromComponent.y +
                    toComponent.y
                  ) / 2,
              },
            ],
          },
        ],
      })
    )


    setSelectedTerminalId(
      null
    )

    setSelectedWireId(
      wireId
    )

    setSelectedBendId(
      null
    )

    setClosedCircuit(
      null
    )


    setTotalResistance(
      0
    )

    setTotalCurrent(
      0
    )

    setResistorResults(
      []
    )
  }

  // ===================================================
  // スイッチ切替
  // ===================================================

  function toggleSwitch(
    componentId: string
  ) {

    setCircuit(
      (prev) => ({
        ...prev,

        components:
          prev.components.map(
            (component) =>
              component.id ===
              componentId
                ? {
                    ...component,

                    switchOn:
                      !(
                        component.switchOn ??
                        false
                      ),
                  }
                : component
          ),
      })
    )


    setClosedCircuit(
      null
    )

    setTotalResistance(
      0
    )

    setTotalCurrent(
      0
    )

    setResistorResults(
      []
    )
  }


  // ===================================================
  // 部品値変更
  // ===================================================

  function handleValueChange(
    rawValue: string
  ) {

    const normalized =
      normalizeNumberInput(
        rawValue
      )


    setValueInput(
      normalized
    )


    if (
      selectedComponentId ===
      null
    ) {
      return
    }


    const value =
      Number(normalized)


    if (
      normalized === "" ||
      Number.isNaN(value)
    ) {
      return
    }


    setCircuit(
      (prev) => ({
        ...prev,

        components:
          prev.components.map(
            (component) =>
              component.id ===
              selectedComponentId
                ? {
                    ...component,

                    value,

                    valueInput:
                      normalized,
                  }
                : component
          ),
      })
    )


    setClosedCircuit(
      null
    )

    setTotalResistance(
      0
    )

    setTotalCurrent(
      0
    )

    setResistorResults(
      []
    )
  }


  // ===================================================
  // 部品削除
  // ===================================================

  function deleteSelectedComponent() {

    if (
      selectedComponentId ===
      null
    ) {
      return
    }


    const component =
      circuit.components.find(
        (c) =>
          c.id ===
          selectedComponentId
      )


    if (!component) {
      return
    }


    const terminalIds =
      new Set(
        component.terminals.map(
          (terminal) =>
            terminal.id
        )
      )


    setCircuit(
      (prev) => ({
        ...prev,

        components:
          prev.components.filter(
            (c) =>
              c.id !==
              selectedComponentId
          ),

        wires:
          prev.wires.filter(
            (wire) =>
              !terminalIds.has(
                wire.from
              ) &&
              !terminalIds.has(
                wire.to
              )
          ),
      })
    )


    setSelectedComponentId(
      null
    )

    setSelectedTerminalId(
      null
    )

    setSelectedWireId(
      null
    )

    setSelectedBendId(
      null
    )

    setValueInput(
      ""
    )

    setClosedCircuit(
      null
    )

    setTotalResistance(
      0
    )

    setTotalCurrent(
      0
    )

    setResistorResults(
      []
    )
  }

  // ===================================================
  // 閉回路チェック
  // ===================================================

  function handleCheckCircuit() {

    const result =
      checkClosedCircuit(
        circuit
      )


    setClosedCircuit(
      result
    )
  }


  // ===================================================
  // 回路計算
  // ===================================================

  function handleCalculate() {

    const closed =
      checkClosedCircuit(
        circuit
      )


    setClosedCircuit(
      closed
    )


    const result =
      calculateCircuit(
        circuit,
        closed
      )


    if (!result.success) {

      setTotalResistance(
        0
      )

      setTotalCurrent(
        0
      )

      setResistorResults(
        []

      )

      return
    }


    setTotalResistance(
      result.totalResistance
    )


    setTotalCurrent(
      result.totalCurrent
    )


    setResistorResults(
      result.resistorResults
    )
  }


  // ===================================================
  // JSON保存
  // ===================================================

  function handleSave() {

    saveCircuitToJson(
      circuit
    )
  }


  // ===================================================
  // JSON読み込みボタン
  // ===================================================

  function handleLoadClick() {

    fileInputRef.current?.click()
  }


  // ===================================================
  // JSON読み込み
  // ===================================================

  async function handleFileChange(
    e: ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0]


    if (!file) {
      return
    }


    try {

      const loaded =
        await loadCircuitFromFile(
          file
        )


      setCircuit(
        loaded
      )


      setSelectedComponentId(
        null
      )

      setSelectedTerminalId(
        null
      )

      setSelectedWireId(
        null
      )

      setSelectedBendId(
        null
      )

      setValueInput(
        ""
      )

      setClosedCircuit(
        null
      )

      setTotalResistance(
        0
      )

      setTotalCurrent(
        0
      )

      setResistorResults(
        []
      )


      // ---------------------------------------------
      // IDカウンターを更新
      // ---------------------------------------------

      let maxNumber = 0


      loaded.components.forEach(
        (component) => {

          const match =
            component.id.match(
              /(\d+)$/
            )


          if (match) {

            maxNumber =
              Math.max(
                maxNumber,
                Number(
                  match[1]
                )
              )
          }
        }
      )


      loaded.wires.forEach(
        (wire) => {

          const wireMatch =
            wire.id.match(
              /(\d+)$/
            )


          if (wireMatch) {

            maxNumber =
              Math.max(
                maxNumber,
                Number(
                  wireMatch[1]
                )
              )
          }


          wire.bends.forEach(
            (bend) => {

              const bendMatch =
                bend.id.match(
                  /(\d+)$/
                )


              if (bendMatch) {

                maxNumber =
                  Math.max(
                    maxNumber,
                    Number(
                      bendMatch[1]
                    )
                  )
              }
            }
          )
        }
      )


      idCounter.current =
        maxNumber + 1

    } catch (error) {

      console.error(
        error
      )


      alert(
        "JSONファイルの読み込みに失敗しました。"
      )
    }


    e.target.value =
      ""
  }

  // ===================================================
  // 選択中の部品
  // ===================================================

  const selectedComponent =
    circuit.components.find(
      (component) =>
        component.id ===
        selectedComponentId
    ) ?? null


  // ===================================================
  // 選択中の配線
  // ===================================================

  const selectedWire =
    circuit.wires.find(
      (wire) =>
        wire.id ===
        selectedWireId
    ) ?? null


  // ===================================================
  // 画面
  // ===================================================

  return (
    <div
      style={{
        display: "flex",

        height: "100vh",

        width: "100vw",

        overflow: "hidden",

        fontFamily:
          "Arial, sans-serif",
      }}
    >

      {/* ===========================================
          左パネル
          =========================================== */}

      <LeftPanel
        onAddComponent={
          addComponent
        }

        circuitName={
          circuit.name
        }

        onCircuitNameChange={(
          name
        ) =>
          setCircuit(
            (prev) => ({
              ...prev,

              name,
            })
          )
        }

        onSave={
          handleSave
        }

        onLoad={
          handleLoadClick
        }
      />


      {/* ===========================================
          回路エディタ
          =========================================== */}

      <CircuitEditor
        circuit={
          circuit
        }

        selectedComponentId={
          selectedComponentId
        }

        selectedTerminalId={
          selectedTerminalId
        }

        selectedWireId={
          selectedWireId
        }

        selectedBendId={
          selectedBendId
        }

         spiceResult={
          spiceResult
        }

        onComponentPointerDown={
          handleComponentPointerDown
        }

        onTerminalClick={
          handleTerminalClick
        }

        onSelectWire={
          selectWire
        }

        onWireDoubleClick={
          handleWireDoubleClick
        }

        onBendPointerDown={
          handleBendPointerDown
        }

        onToggleSwitch={
          toggleSwitch
        }

        onClearSelection={
          clearSelection
        }

        onBendClick={
          handleBendClick
        }

      />


      {/* ===========================================
          右パネル
          =========================================== */}

      <RightPanel
        selectedComponent={
          selectedComponent
        }

        selectedWire={
          selectedWire
        }

        valueInput={
          valueInput
        }

        onValueChange={
          handleValueChange
        }

        onDeleteComponent={
          deleteSelectedComponent
        }

        onToggleSwitch={
          toggleSwitch
        }

        onDeleteWire={
          deleteSelectedWire
        }

        onDeleteBend={
          deleteSelectedBend
        }

        selectedBendId={
          selectedBendId
        }

        closedCircuit={
          closedCircuit
        }

        onCheckCircuit={
          handleCheckCircuit
        }

        onCalculate={
          handleCalculate
        }

        totalResistance={
          totalResistance
        }

        totalCurrent={
          totalCurrent
        }

        resistorResults={
          resistorResults
        }
      />

      <SpicePanel
        circuit={circuit}
        onResult={setSpiceResult}
      />


      {/* ===========================================
          JSONファイル読み込み
          =========================================== */}

      <input
        ref={
          fileInputRef
        }

        type="file"

        accept=".json,application/json"

        style={{
          display: "none",
        }}

        onChange={
          handleFileChange
        }
      />

    </div>
  )

  useEffect(() => {
    setSpiceResult(null)
  }, [circuit])

}


export default App