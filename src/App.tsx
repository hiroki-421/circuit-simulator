import {
  useEffect,
  useRef,
  useState,
} from "react"

import type {
  ChangeEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import type {
  Circuit,
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

const EDITOR_WIDTH = 900
const EDITOR_HEIGHT = 650

const GRID_SIZE = 20

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

  const [circuit, setCircuit] =
    useState<Circuit>({
      name:
        "新しい回路",

      components: [],

      wires: [],
    })


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
  // IDカウンター
  // ---------------------------------------------------

  const idCounter =
    useRef(1)


  // ---------------------------------------------------
  // 部品ドラッグ
  // ---------------------------------------------------

  const draggingRef =
    useRef<{
      componentId: string
      startX: number
      startY: number
      originalX: number
      originalY: number
    } | null>(null)


  // ---------------------------------------------------
  // 折れ点ドラッグ
  // ---------------------------------------------------

  const bendDraggingRef =
    useRef<{
      wireId: string
      bendId: string
      startX: number
      startY: number
      originalX: number
      originalY: number
    } | null>(null)


  // ===================================================
  // 部品追加
  // ===================================================

  const addComponent = (
    type: ComponentType
  ) => {

    const id =
      `${type}-${Date.now()}-${idCounter.current++}`


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
  // 部品ドラッグ開始
  // ===================================================

  function handleComponentPointerDown(
    e: ReactPointerEvent<SVGGElement>,
    componentId: string
  ) {

    e.stopPropagation()


    const component =
      circuit.components.find(
        (c) =>
          c.id ===
          componentId
      )


    if (!component) {
      return
    }


    setSelectedComponentId(
      componentId
    )

    setSelectedWireId(
      null
    )

    setSelectedBendId(
      null
    )


    setValueInput(
      component.valueInput
    )


    draggingRef.current = {
      componentId,

      startX:
        e.clientX,

      startY:
        e.clientY,

      originalX:
        component.x,

      originalY:
        component.y,
    }


    window.addEventListener(
      "pointermove",
      handleComponentPointerMove
    )

    window.addEventListener(
      "pointerup",
      handleComponentPointerUp
    )
  }


  // ===================================================
  // 部品ドラッグ中
  // ===================================================
  function handleComponentPointerMove(
    e: globalThis.PointerEvent
  ) {

    const drag =
      draggingRef.current

    if (!drag) {
      return
    }

    const dx =
      e.clientX -
      drag.startX

    const dy =
      e.clientY -
      drag.startY

    const rawX =
      drag.originalX +
      dx

    const rawY =
      drag.originalY +
      dy

    const snappedX =
      Math.round(
        rawX / GRID_SIZE
      ) *
      GRID_SIZE

    const snappedY =
      Math.round(
        rawY / GRID_SIZE
      ) *
      GRID_SIZE

    setCircuit(
      (prev) => ({
        ...prev,

        components:
          prev.components.map(
            (component) =>
              component.id ===
              drag.componentId
                ? {
                    ...component,

                    x: snappedX,

                    y: snappedY,
                  }
                : component
          ),
      })
    )
  }
  
  // ===================================================
  // 部品ドラッグ終了
  // ===================================================

  function handleComponentPointerUp() {

    draggingRef.current =
      null


    window.removeEventListener(
      "pointermove",
      handleComponentPointerMove
    )

    window.removeEventListener(
      "pointerup",
      handleComponentPointerUp
    )
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
// 折れ点クリック
// ===================================================

function handleBendClick(
  e: MouseEvent<SVGCircleElement>,
  bendId: string
) {
  e.stopPropagation()

  // -----------------------------------------------
  // まだ接続元が選択されていない
  // -----------------------------------------------

  if (
    selectedTerminalId === null
  ) {
    setSelectedBendId(
      bendId
    )

    setSelectedWireId(
      null
    )

    setSelectedComponentId(
      null
    )

    return
  }

  // -----------------------------------------------
  // すでに同じ接続があるか確認
  // -----------------------------------------------

  const alreadyConnected =
    circuit.wires.some(
      (wire) =>
        (
          wire.from ===
            selectedTerminalId &&
          wire.to === bendId
        ) ||
        (
          wire.from === bendId &&
          wire.to ===
            selectedTerminalId
        )
    )

  if (
    alreadyConnected
  ) {
    setSelectedTerminalId(
      null
    )

    setSelectedBendId(
      null
    )

    return
  }

  // -----------------------------------------------
  // 新しい配線
  // -----------------------------------------------

  const wireId =
    `wire-${idCounter.current++}`

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
            bendId,

          bends: [],
        },
      ],
    })
  )

  // -----------------------------------------------
  // 選択状態
  // -----------------------------------------------

  setSelectedTerminalId(
    null
  )

  setSelectedBendId(
    bendId
  )

  setSelectedWireId(
    wireId
  )

  setSelectedComponentId(
    null
  )

  // -----------------------------------------------
  // 計算結果をリセット
  // -----------------------------------------------

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
  // 配線選択
  // ===================================================

  function selectWire(
    wireId: string
  ) {

    setSelectedWireId(
      wireId
    )

    setSelectedComponentId(
      null
    )

    setSelectedTerminalId(
      null
    )

    setSelectedBendId(
      null
    )

    setValueInput(
      ""
    )
  }


  // ===================================================
  // 配線ダブルクリック
  // ===================================================

  function handleWireDoubleClick(
    e: MouseEvent<SVGLineElement>,
    wireId: string
  ) {

    e.stopPropagation()


    const svg =
      e.currentTarget.ownerSVGElement


    if (!svg) {
      return
    }


    const rect =
      svg.getBoundingClientRect()


    const scaleX =
      EDITOR_WIDTH /
      rect.width


    const scaleY =
      EDITOR_HEIGHT /
      rect.height


    const x =
      (
        e.clientX -
        rect.left
      ) * scaleX


    const y =
      (
        e.clientY -
        rect.top
      ) * scaleY


    const bendId =
      `bend-${idCounter.current++}`


    setCircuit(
      (prev) => ({
        ...prev,

        wires:
          prev.wires.map(
            (wire) => {

              if (
                wire.id !==
                wireId
              ) {
                return wire
              }


              return {
                ...wire,

                bends: [
                  ...wire.bends,

                  {
                    id: bendId,

                    x,

                    y,
                  },
                ],
              }
            }
          ),
      })
    )


    setSelectedWireId(
      wireId
    )

    setSelectedBendId(
      bendId
    )
  }


  // ===================================================
  // 折れ点ドラッグ開始
  // ===================================================

  function handleBendPointerDown(
    e: ReactPointerEvent<SVGCircleElement>,
    wireId: string,
    bendId: string
  ) {

    e.stopPropagation()


    const wire =
      circuit.wires.find(
        (w) =>
          w.id ===
          wireId
      )


    const bend =
      wire?.bends.find(
        (b) =>
          b.id ===
          bendId
      )


    if (!bend) {
      return
    }


    setSelectedWireId(
      wireId
    )

    setSelectedBendId(
      bendId
    )


    bendDraggingRef.current = {
      wireId,

      bendId,

      startX:
        e.clientX,

      startY:
        e.clientY,

      originalX:
        bend.x,

      originalY:
        bend.y,
    }


    window.addEventListener(
      "pointermove",
      handleBendPointerMove
    )

    window.addEventListener(
      "pointerup",
      handleBendPointerUp
    )
  }


  // ===================================================
  // 折れ点ドラッグ中
  // ===================================================

  function handleBendPointerMove(
    e: globalThis.PointerEvent
  ) {

    const drag =
      bendDraggingRef.current


    if (!drag) {
      return
    }


    const dx =
      e.clientX -
      drag.startX


    const dy =
      e.clientY -
      drag.startY


    setCircuit(
      (prev) => ({
        ...prev,

        wires:
          prev.wires.map(
            (wire) =>
              wire.id ===
              drag.wireId
                ? {
                    ...wire,

                    bends:
                      wire.bends.map(
                        (bend) =>
                          bend.id ===
                          drag.bendId
                            ? {
                                ...bend,

                                x:
                                  drag.originalX +
                                  dx,

                                y:
                                  drag.originalY +
                                  dy,
                              }
                            : bend
                      ),
                  }
                : wire
          ),
      })
    )
  }


  // ===================================================
  // 折れ点ドラッグ終了
  // ===================================================

  function handleBendPointerUp() {

    bendDraggingRef.current =
      null


    window.removeEventListener(
      "pointermove",
      handleBendPointerMove
    )

    window.removeEventListener(
      "pointerup",
      handleBendPointerUp
    )
  }


  // ===================================================
  // 折れ点削除
  // ===================================================

  function deleteSelectedBend() {

    if (
      selectedWireId ===
        null ||
      selectedBendId ===
        null
    ) {
      return
    }


    setCircuit(
      (prev) => ({
        ...prev,

        wires:
          prev.wires.map(
            (wire) =>
              wire.id ===
              selectedWireId
                ? {
                    ...wire,

                    bends:
                      wire.bends.filter(
                        (bend) =>
                          bend.id !==
                          selectedBendId
                      ),
                  }
                : wire
          ),
      })
    )


    setSelectedBendId(
      null
    )
  }


  // ===================================================
  // 配線削除
  // ===================================================

  function deleteSelectedWire() {

    if (
      selectedWireId ===
      null
    ) {
      return
    }


    setCircuit(
      (prev) => ({
        ...prev,

        wires:
          prev.wires.filter(
            (wire) =>
              wire.id !==
              selectedWireId
          ),
      })
    )


    setSelectedWireId(
      null
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