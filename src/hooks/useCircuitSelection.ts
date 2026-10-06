import { useState } from "react"

export function useCircuitSelection() {
  const [
    selectedComponentId,
    setSelectedComponentId,
  ] = useState<string | null>(null)

  const [
    selectedTerminalId,
    setSelectedTerminalId,
  ] = useState<string | null>(null)

  const [
    selectedWireId,
    setSelectedWireId,
  ] = useState<string | null>(null)

  const [
    selectedBendId,
    setSelectedBendId,
  ] = useState<string | null>(null)

  function clearCircuitSelection() {
    setSelectedComponentId(null)
    setSelectedTerminalId(null)
    setSelectedWireId(null)
    setSelectedBendId(null)
  }

  return {
    selectedComponentId,
    setSelectedComponentId,

    selectedTerminalId,
    setSelectedTerminalId,

    selectedWireId,
    setSelectedWireId,

    selectedBendId,
    setSelectedBendId,

    clearCircuitSelection,
  }
}