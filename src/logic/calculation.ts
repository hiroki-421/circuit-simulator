import type {
  Circuit,
  ResistorResult,
} from "../types/circuit"

export type CalculationResult = {
  success: boolean
  message: string
  totalResistance: number
  totalCurrent: number
  resistorResults: ResistorResult[]
}

export function calculateCircuit(
  circuit: Circuit,
  closedCircuit: boolean
): CalculationResult {
  if (!closedCircuit) {
    return {
      success: false,
      message:
        "開回路です。スイッチがOFFになっていないか、配線を確認してください。",
      totalResistance: 0,
      totalCurrent: 0,
      resistorResults: [],
    }
  }

  const battery = circuit.components.find(
    (component) => component.type === "battery"
  )

  if (!battery) {
    return {
      success: false,
      message: "電池がありません。",
      totalResistance: 0,
      totalCurrent: 0,
      resistorResults: [],
    }
  }

  const resistors = circuit.components.filter(
    (component) => component.type === "resistor"
  )

  if (resistors.length === 0) {
    return {
      success: false,
      message: "抵抗がありません。",
      totalResistance: 0,
      totalCurrent: 0,
      resistorResults: [],
    }
  }

  const totalResistance = resistors.reduce(
    (sum, resistor) =>
      sum + Math.max(resistor.value, 0),
    0
  )

  if (totalResistance <= 0) {
    return {
      success: false,
      message: "抵抗値が0Ω以下です。",
      totalResistance: 0,
      totalCurrent: 0,
      resistorResults: [],
    }
  }

  const voltage = battery.value

  const totalCurrent =
    voltage / totalResistance

  const resistorResults = resistors.map(
    (resistor) => ({
      id: resistor.id,
      resistance: resistor.value,
      current: totalCurrent,
      voltage:
        totalCurrent * resistor.value,
    })
  )

  return {
    success: true,
    message: "計算しました。",
    totalResistance,
    totalCurrent,
    resistorResults,
  }
}