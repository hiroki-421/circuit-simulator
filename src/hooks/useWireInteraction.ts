import {
  useRef,
} from "react"

import type {
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import type {
  Circuit,
} from "../types/circuit"

type BendDraggingState = {
  wireId: string
  bendId: string
  startX: number
  startY: number
  originalX: number
  originalY: number
}

type UseWireInteractionProps = {
  circuit: Circuit

  setCircuit: React.Dispatch<
    React.SetStateAction<Circuit>
  >

  idCounter: React.MutableRefObject<number>

  selectedTerminalId: string | null
  selectedWireId: string | null
  selectedBendId: string | null

  setSelectedTerminalId: (
    id: string | null
  ) => void

  setSelectedComponentId: (
    id: string | null
  ) => void

  setSelectedWireId: (
    id: string | null
  ) => void

  setSelectedBendId: (
    id: string | null
  ) => void

  setValueInput: (
    value: string
  ) => void

  setClosedCircuit: (
    value: boolean | null
  ) => void

  setTotalResistance: (
    value: number
  ) => void

  setTotalCurrent: (
    value: number
  ) => void

  setResistorResults: (
    value: never[]
  ) => void

  editorWidth: number
  editorHeight: number
}

export function useWireInteraction({
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

  editorWidth,
  editorHeight,
}: UseWireInteractionProps) {
  const bendDraggingRef =
    useRef<BendDraggingState | null>(
      null
    )

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

    resetCalculation()
  }

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
      editorWidth /
      rect.width

    const scaleY =
      editorHeight /
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

    resetCalculation()
  }

  function resetCalculation() {
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

  return {
    handleBendClick,
    selectWire,
    handleWireDoubleClick,
    handleBendPointerDown,
    deleteSelectedBend,
    deleteSelectedWire,
  }
}