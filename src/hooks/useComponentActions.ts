import type { Dispatch, SetStateAction } from "react"

import type {
  Circuit,
  CircuitComponent,
  ComponentType,
  ResistorResult,
} from "../types/circuit"

type UseComponentActionsProps = {
  circuit: Circuit
  setCircuit: Dispatch<SetStateAction<Circuit>>

  createId: (prefix: string) => string

  selectedComponentId: string | null

  setSelectedComponentId: (id: string | null) => void
  setSelectedTerminalId: (id: string | null) => void
  setSelectedWireId: (id: string | null) => void
  setSelectedBendId: (id: string | null) => void

  setValueInput: (value: string) => void

  setClosedCircuit: (value: boolean | null) => void
  setTotalResistance: (value: number) => void
  setTotalCurrent: (value: number) => void

  setResistorResults: Dispatch<
    SetStateAction<ResistorResult[]>
  >
}

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

export function useComponentActions({
  circuit,
  setCircuit,
  createId,
  selectedComponentId,
  setSelectedComponentId,
  setSelectedTerminalId,
  setSelectedWireId,
  setSelectedBendId,
  setValueInput,
  setClosedCircuit,
  setTotalResistance,
  setTotalCurrent,
  setResistorResults,
}: UseComponentActionsProps) {

  function resetCalculation() {
    setClosedCircuit(null)
    setTotalResistance(0)
    setTotalCurrent(0)
    setResistorResults([])
  }

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

  function addComponent(
    type: ComponentType
  ) {
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

    resetCalculation()
  }

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

    resetCalculation()
  }

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

    resetCalculation()
  }

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

    resetCalculation()
  }

  return {
    addComponent,
    toggleSwitch,
    handleValueChange,
    deleteSelectedComponent,
  }
}