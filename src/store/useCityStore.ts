import { create } from "zustand"
import { ITEM_IDS, ITEMS, type ItemId } from "../data/items.ts"
import { computeCarbon, MODEL_HORIZON, type City } from "../lib/carbon.ts"
import { eraseAsset, GRID_SIZE, placeAsset } from "../lib/grid.ts"
import { optimizeCity, optimizeCityForReduction } from "../lib/optimizer.ts"

type Tool = "place" | "erase"

type CityState = {
  city: City
  selectedItem: ItemId
  tool: Tool
  year: number
  savedLayoutA: City | null
  savedLayoutB: City | null
  reductionResult: { targetPercent: number; achievedPercent: number; targetMet: boolean; mode: "target" | "minimum" } | null
  optimizationStatus: "idle" | "running"
  setSelectedItem: (item: ItemId) => void
  setTool: (tool: Tool) => void
  setYear: (year: number) => void
  placeAt: (row: number, col: number) => void
  eraseAt: (row: number, col: number) => void
  resetCity: () => void
  loadStarter: () => void
  saveLayout: (slot: "A" | "B") => void
  optimize: (budget: number) => void
  optimizeForReduction: (targetPercent: number) => void
  optimizeInWorker: (mode: "budget" | "reduction" | "minimum", value: number) => Promise<void>
}

const emptyCity = (): City =>
  Array.from({ length: GRID_SIZE }, () => Array<ItemId | null>(GRID_SIZE).fill(null))
const cloneCity = (city: City): City => city.map((row) => [...row])

function starterCity() {
  const city = emptyCity()
  // A fresh seed gives each starter load a different street/block arrangement.
  // The asset counts and footprint validity remain fixed for fair comparisons.
  let seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x100000000
  }
  for (const road of [9, 19, 29]) {
    for (let index = 0; index < GRID_SIZE; index += 1) {
      city[road][index] = "road"
      city[index][road] = "road"
    }
  }

  const placeAtVariedPosition = (itemId: ItemId) => {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const row = Math.floor(random() * GRID_SIZE)
      const col = Math.floor(random() * GRID_SIZE)
      if (placeAsset(city, itemId, row, col)) return true
    }
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (placeAsset(city, itemId, row, col)) return true
      }
    }
    return false
  }

  // Keep every asset type represented while reducing the previous 547-tile
  // starter by one quarter to 410 tiles; roads remain on the same main avenues.
  const groups: Array<{ count: number; items: ItemId[] }> = [
    { count: 28, items: ["industry", "hospital", "datacenter", "mall", "landfill", "busdepot"] },
    { count: 57, items: ["water", "school", "wastewater", "hotel", "urbanforest", "wind", "solar", "park"] },
    { count: 94, items: ["residential", "office", "residential", "residential", "metro"] },
  ]
  const planned: ItemId[] = []
  for (const group of groups) {
    for (let index = 0; index < group.count; index += 1) {
      const itemId = group.items[(index * (group.items.length === 5 ? 2 : 5)) % group.items.length]
      planned.push(itemId)
    }
  }
  planned.sort((a, b) => ITEMS[b].footprint - ITEMS[a].footprint || random() - 0.5)
  for (const itemId of planned) {
    if (!placeAtVariedPosition(itemId)) throw new Error(`Trial city could not place ${itemId}`)
  }
  return city
}

export const useCityStore = create<CityState>((set, get) => ({
  city: emptyCity(),
  selectedItem: "residential",
  tool: "place",
  year: MODEL_HORIZON,
  savedLayoutA: null,
  savedLayoutB: null,
  reductionResult: null,
  optimizationStatus: "idle",
  setSelectedItem: (selectedItem) => set({ selectedItem, tool: "place" }),
  setTool: (tool) => set({ tool }),
  setYear: (year) => set({ year: Math.max(0, Math.min(MODEL_HORIZON, year)) }),
  placeAt: (row, col) =>
    set((state) => {
      const city = cloneCity(state.city)
      if (row < 0 || col < 0 || row >= city.length || col >= city[row].length) return state
      if (state.tool === "erase") {
        if (!eraseAsset(city, row, col)) return state
      } else if (!placeAsset(city, state.selectedItem, row, col)) return state
      return { city, savedLayoutA: cloneCity(city), reductionResult: null }
    }),
  eraseAt: (row, col) => set((state) => {
    const city = cloneCity(state.city)
    if (!eraseAsset(city, row, col)) return state
    return { city, savedLayoutA: cloneCity(city), reductionResult: null }
  }),
  resetCity: () =>
    set({ city: emptyCity(), savedLayoutA: null, savedLayoutB: null, reductionResult: null, optimizationStatus: "idle" }),
  loadStarter: () => set(() => {
    const city = starterCity()
    return { city, savedLayoutA: cloneCity(city), savedLayoutB: null, reductionResult: null, optimizationStatus: "idle" }
  }),
  saveLayout: (slot) =>
    set((state) =>
      slot === "A"
        ? { savedLayoutA: cloneCity(state.city) }
        : { savedLayoutB: cloneCity(state.city) },
    ),
  optimize: (budget) => {
    const before = cloneCity(get().city)
    const optimized = optimizeCity(before, budget)
    set({ city: cloneCity(optimized), savedLayoutA: before, savedLayoutB: cloneCity(optimized), reductionResult: null })
  },
  optimizeForReduction: (targetPercent) => {
    const before = cloneCity(get().city)
    const baseline = computeCarbon(before, MODEL_HORIZON).total
    const optimized = optimizeCityForReduction(before, targetPercent)
    const after = computeCarbon(optimized, MODEL_HORIZON).total
    const achievedPercent = baseline > 0 ? ((baseline - after) / baseline) * 100 : 0
    const target = Math.max(0, Math.min(99, Number.isFinite(targetPercent) ? targetPercent : 0))
    set({
      city: cloneCity(optimized),
      savedLayoutA: before,
      savedLayoutB: cloneCity(optimized),
      reductionResult: { targetPercent: target, achievedPercent, targetMet: achievedPercent >= target, mode: "target" },
    })
  },
  optimizeInWorker: async (mode, value) => {
    const sourceCity = get().city
    const before = cloneCity(sourceCity)
    set({ optimizationStatus: "running" })
    let optimized: City
    const reductionTarget = mode === "minimum" ? 99 : value
    const optimizeOnMainThread = () => mode === "budget" ? optimizeCity(before, value) : optimizeCityForReduction(before, reductionTarget)
    try {
      if (typeof Worker === "undefined") optimized = optimizeOnMainThread()
      else optimized = await new Promise<City>((resolve) => {
        const worker = new Worker(new URL("../lib/optimizer.worker.ts", import.meta.url), { type: "module" })
        const finish = (city: City) => { worker.terminate(); resolve(city) }
        worker.onmessage = (event: MessageEvent<City>) => finish(event.data)
        worker.onerror = () => finish(optimizeOnMainThread())
        worker.postMessage({ city: before, mode, value })
      })
    } catch {
      optimized = optimizeOnMainThread()
    }
    if (get().city !== sourceCity) {
      set({ optimizationStatus: "idle" })
      return
    }
    if (mode === "budget") {
      set({ city: cloneCity(optimized), savedLayoutA: before, savedLayoutB: cloneCity(optimized), reductionResult: null, optimizationStatus: "idle" })
      return
    }
    const baseline = computeCarbon(before, MODEL_HORIZON).total
    const after = computeCarbon(optimized, MODEL_HORIZON).total
    const achievedPercent = baseline > 0 ? ((baseline - after) / baseline) * 100 : 0
    const target = mode === "minimum" ? 99 : Math.max(0, Math.min(99, Number.isFinite(value) ? value : 0))
    set({ city: cloneCity(optimized), savedLayoutA: before, savedLayoutB: cloneCity(optimized), reductionResult: { targetPercent: target, achievedPercent, targetMet: mode === "minimum" || achievedPercent >= target, mode: mode === "minimum" ? "minimum" : "target" }, optimizationStatus: "idle" })
  },
}))

export { ITEM_IDS, computeCarbon }
