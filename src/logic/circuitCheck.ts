import type { Circuit } from "../types/circuit"

export function checkClosedCircuit(
  circuit: Circuit
): boolean {
  const activeComponents = circuit.components.filter(
    (component) => {
      if (component.type === "switch") {
        return component.switchOn === true
      }

      return true
    }
  )

  if (activeComponents.length === 0) {
    return false
  }

  const adjacency = new Map<string, Set<string>>()

  for (const component of activeComponents) {
    for (const terminal of component.terminals) {
      adjacency.set(terminal.id, new Set())
    }
  }

  // 部品内部の接続
  for (const component of activeComponents) {
    const [a, b] = component.terminals

    adjacency.get(a.id)?.add(b.id)
    adjacency.get(b.id)?.add(a.id)
  }

  // 配線
  for (const wire of circuit.wires) {
    if (
      adjacency.has(wire.from) &&
      adjacency.has(wire.to)
    ) {
      adjacency.get(wire.from)?.add(wire.to)
      adjacency.get(wire.to)?.add(wire.from)
    }
  }

  const battery = activeComponents.find(
    (component) => component.type === "battery"
  )

  if (!battery) {
    return false
  }

  const start = battery.terminals[0].id
  const goal = battery.terminals[1].id

  const visited = new Set<string>()
  const queue = [start]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current === goal) {
      return true
    }

    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    const nextNodes =
      adjacency.get(current) ?? new Set<string>()

    for (const next of nextNodes) {
      if (!visited.has(next)) {
        queue.push(next)
      }
    }
  }

  return false
}