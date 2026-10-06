import type {
  Circuit,
  Wire,
} from "../types/circuit"

export function saveCircuitToJson(
  circuit: Circuit
) {
  const json = JSON.stringify(
    circuit,
    null,
    2
  )

  const blob = new Blob(
    [json],
    { type: "application/json" }
  )

  const url =
    URL.createObjectURL(blob)

  const a =
    document.createElement("a")

  a.href = url

  a.download =
    `${circuit.name || "circuit"}.json`

  a.click()

  URL.revokeObjectURL(url)
}

export function loadCircuitFromFile(
  file: File
): Promise<Circuit> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader()

      reader.onload = () => {
        try {
          const data =
            JSON.parse(
              reader.result as string
            )

          const wires: Wire[] =
            Array.isArray(data.wires)
              ? data.wires.map(
                  (wire: any) => ({
                    ...wire,

                    bends: Array.isArray(
                      wire.bends
                    )
                      ? wire.bends
                      : wire.bend
                      ? [
                          {
                            id: `bend-${wire.id}`,
                            x: wire.bend.x,
                            y: wire.bend.y,
                          },
                        ]
                      : [],
                  })
                )
              : []

          if (
            typeof data.name !==
              "string" ||
            !Array.isArray(
              data.components
            )
          ) {
            throw new Error(
              "回路データの形式が正しくありません。"
            )
          }

          resolve({
            name: data.name,
            components:
              data.components.map(
                (component: any) => ({
                  ...component,

                  switchOn:
                    component.type ===
                    "switch"
                      ? component.switchOn ??
                        false
                      : undefined,
                })
              ),
            wires,
          })
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(
          new Error(
            "ファイルを読み込めませんでした。"
          )
        )
      }

      reader.readAsText(file)
    }
  )
}