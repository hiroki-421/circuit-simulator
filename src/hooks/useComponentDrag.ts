import { useRef } from "react"

import type {
  PointerEvent as ReactPointerEvent,
} from "react"

import type {
  Circuit,
} from "../types/circuit"

const GRID_SIZE = 20

type DraggingState = {
  componentId: string
  startX: number
  startY: number
  originalX: number
  originalY: number
}

type UseComponentDragProps = {
  circuit: Circuit
  setCircuit: React.Dispatch<
    React.SetStateAction<Circuit>
  >
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
}

export function useComponentDrag({
  circuit,
  setCircuit,
  setSelectedComponentId,
  setSelectedWireId,
  setSelectedBendId,
  setValueInput,
}: UseComponentDragProps) {
  const draggingRef = useRef<
    DraggingState | null
  >(null)

  function handleComponentPointerDown(
    e: ReactPointerEvent<SVGGElement>,
    componentId: string
  ) {
    e.stopPropagation()

    const component =
      circuit.components.find(
        (c) =>
          c.id === componentId
      )

    if (!component) {
      return
    }

    setSelectedComponentId(
      componentId
    )

    setSelectedWireId(null)
    setSelectedBendId(null)

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
      ) * GRID_SIZE

    const snappedY =
      Math.round(
        rawY / GRID_SIZE
      ) * GRID_SIZE

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

  return {
    handleComponentPointerDown,
  }
}