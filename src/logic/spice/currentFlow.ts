import type {
  Circuit,
  CircuitComponent,
  Wire,
} from "../../types/circuit"

import type {
  SpiceResult,
} from "./types"

import {
  getWireCurrent,
} from "./wireCurrent"


/*
 * ==========================================
 * CurrentFlow
 * ==========================================
 *
 * 回路上の電流情報を
 * 共通形式で扱うための型。
 * ==========================================
 */

export type CurrentFlow = {
  current: number
  magnitude: number
  direction: "forward" | "reverse" | "none"
}


/*
 * ==========================================
 * 部品の電流を取得
 * ==========================================
 */

export function getComponentCurrent(
  component: CircuitComponent,
  spiceResult: SpiceResult | null,
): number | null {

  if (
    !spiceResult ||
    !spiceResult.success
  ) {
    return null
  }

  const current =
    spiceResult.componentCurrents[
      component.id
    ]

  if (
    current === undefined
  ) {
    return null
  }

  return current
}


/*
 * ==========================================
 * 電流情報を作る
 * ==========================================
 */

export function createCurrentFlow(
  current: number | null,
): CurrentFlow | null {

  if (current === null) {
    return null
  }

  const magnitude =
    Math.abs(current)

  /*
   * 微小電流は0として扱う。
   */

  if (
    magnitude <
    0.000000001
  ) {
    return {
      current: 0,
      magnitude: 0,
      direction: "none",
    }
  }

  return {
    current,
    magnitude,

    direction:
      current > 0
        ? "forward"
        : "reverse",
  }
}


/*
 * ==========================================
 * 部品の電流情報
 * ==========================================
 */

export function getComponentCurrentFlow(
  component: CircuitComponent,
  spiceResult: SpiceResult | null,
) {
  const current =
    getComponentCurrent(
      component,
      spiceResult,
    )

  return createCurrentFlow(
    current,
  )
}


/*
 * ==========================================
 * Wireの電流情報
 * ==========================================
 */

export function getWireCurrentFlow(
  circuit: Circuit,
  wire: Wire,
  spiceResult: SpiceResult | null,
) {
  const current =
    getWireCurrent(
      circuit,
      wire,
      spiceResult,
    )

  return createCurrentFlow(
    current,
  )
}


/*
 * ==========================================
 * 電流値を表示用文字列に変換
 * ==========================================
 */

export function formatCurrent(
  current: number,
) {

  const abs =
    Math.abs(current)

  /*
   * A
   */

  if (abs >= 1) {
    return `${current.toFixed(3)} A`
  }

  /*
   * mA
   */

  if (abs >= 0.001) {
    return `${(current * 1000).toFixed(3)} mA`
  }

  /*
   * μA
   */

  if (abs >= 0.000001) {
    return `${(current * 1000000).toFixed(3)} μA`
  }

  /*
   * nA
   */

  return `${(current * 1000000000).toFixed(3)} nA`
}