import { optimizeCity, optimizeCityForReduction } from "./optimizer.ts"
import type { City } from "./carbon.ts"

type Request = { city: City; mode: "budget"; value: number } | { city: City; mode: "reduction" | "minimum"; value: number }

self.onmessage = (event: MessageEvent<Request>) => {
  const { city, mode, value } = event.data
  const optimized = mode === "budget" ? optimizeCity(city, value) : optimizeCityForReduction(city, mode === "minimum" ? 99 : value)
  self.postMessage(optimized)
}
