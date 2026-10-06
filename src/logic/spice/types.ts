// =====================================================
// SPICE関連の型
// =====================================================

export type SpiceAnalysisType =
  | "op"
  | "tran"
  | "dc"
  | "ac"


export type SpiceResult = {
  success: boolean
  message: string
  nodeVoltages: Record<
    string,
    number
  >

  branchCurrents: Record<
    string,
    number
  >


  /*
   * 回路部品ごとの電流
   *
   * key:
   *   CircuitComponent.id
   *
   * value:
   *   「左端子 → 右端子」を正とした電流[A]
   */
  componentCurrents: Record<
    string,
    number
  >

  rawOutput?: string
}