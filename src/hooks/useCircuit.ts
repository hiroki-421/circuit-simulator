import { useRef, useState } from "react"

import type { Circuit } from "../types/circuit"

export function useCircuit() {
  const [circuit, setCircuit] =
    useState<Circuit>({
      name: "新しい回路",
      components: [],
      wires: [],
    })

  const idCounter =
    useRef(1)

  function createId(
    prefix: string
  ) {
    return `${prefix}-${Date.now()}-${idCounter.current++}`
  }

  return {
    circuit,
    setCircuit,
    idCounter,
    createId,
  }
}
