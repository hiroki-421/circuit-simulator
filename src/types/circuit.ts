export type ComponentType =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "switch"
  | "ground"

export type Terminal = {
  id: string
  side: "left" | "right"
}

export type BendPoint = {
  id: string
  x: number
  y: number
}

export type CircuitComponent = {
  id: string
  type: ComponentType
  x: number
  y: number
  value: number
  valueInput: string
  terminals: Terminal[]
  switchOn?: boolean
}

export type Wire = {
  id: string
  from: string
  to: string
  bends: BendPoint[]
}

export type Circuit = {
  name: string
  components: CircuitComponent[]
  wires: Wire[]
}

export type ResistorResult = {
  id: string
  resistance: number
  current: number
  voltage: number
}