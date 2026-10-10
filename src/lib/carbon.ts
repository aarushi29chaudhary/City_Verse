import {
  ENERGY_MULTIPLIER_NEAR_PARK,
  GRID_EMISSIONS_FACTOR,
  ITEMS,
  TRANSPORT_MULTIPLIER_NEAR_METRO,
  TRANSPORT_T_PER_PERSON,
  type ItemId,
} from "../data/items.ts"
import { footprintCells, GRID_SIZE, listAssets } from "./grid.ts"

export { GRID_EMISSIONS_FACTOR, TRANSPORT_T_PER_PERSON }

export type CityCell = ItemId | `${ItemId}@${number},${number}` | null
export type City = Array<Array<CityCell>>

export type CarbonResult = {
  embodied: number
  operational: number
  transport: number
  offset: number
  total: number
  cost: number
  energy: number
}

export const MODEL_HORIZON = 30

export function computeCarbon(city: City, year: number): CarbonResult {
  if (
    !Array.isArray(city) ||
    city.length !== GRID_SIZE ||
    city.some((row) => row.length !== GRID_SIZE)
  ) {
    throw new Error(`Expected a ${GRID_SIZE} × ${GRID_SIZE} city grid.`)
  }

  const years = Math.max(0, Math.min(MODEL_HORIZON, year))
  let embodied = 0
  let annualEnergy = 0
  let annualConsumedEnergy = 0
  let annualGeneratedEnergy = 0
  let annualDirectEmissions = 0
  let annualSink = 0
  let annualTransport = 0
  let cost = 0

  const assets = listAssets(city)
  const parks = assets.filter(({ itemId }) => itemId === "park")
  const metros = assets.filter(({ itemId }) => itemId === "metro")
  const parkCoverage = Array.from({ length: GRID_SIZE }, () => new Uint8Array(GRID_SIZE))
  const metroCoverage = Array.from({ length: GRID_SIZE }, () => new Uint8Array(GRID_SIZE))
  const markCoverage = (coverage: Uint8Array[], asset: (typeof assets)[number], radius: number) => {
    for (const cell of footprintCells(asset.itemId, asset.row, asset.col)) {
      for (let row = Math.max(0, cell.row - radius); row <= Math.min(GRID_SIZE - 1, cell.row + radius); row += 1) {
        for (let col = Math.max(0, cell.col - radius); col <= Math.min(GRID_SIZE - 1, cell.col + radius); col += 1) {
          coverage[row][col] = 1
        }
      }
    }
  }
  parks.forEach((park) => markCoverage(parkCoverage, park, 1))
  metros.forEach((metro) => markCoverage(metroCoverage, metro, 3))
  assets.forEach(({ itemId, row, col }) => {
    const item = ITEMS[itemId]
    if (!item) throw new Error(`Unknown city item: ${itemId}`)
    embodied += item.embodied
    const cells = footprintCells(itemId, row, col)
    const nearPark = itemId !== "park" && cells.some(({ row: cellRow, col: cellCol }) => parkCoverage[cellRow][cellCol] === 1)
    const adjustedEnergy = item.energy > 0 && nearPark
      ? item.energy * ENERGY_MULTIPLIER_NEAR_PARK
      : item.energy
    annualEnergy += adjustedEnergy
    annualConsumedEnergy += Math.max(adjustedEnergy, 0)
    annualGeneratedEnergy += Math.max(-adjustedEnergy, 0)
    annualSink += item.sink
    annualDirectEmissions += item.directEmissions
    if (itemId === "residential") {
      const nearMetro = cells.some(({ row: cellRow, col: cellCol }) => metroCoverage[cellRow][cellCol] === 1)
      annualTransport += item.capacity * TRANSPORT_T_PER_PERSON * (nearMetro ? TRANSPORT_MULTIPLIER_NEAR_METRO : 1)
    }
    cost += item.cost
  })

  const operational = (annualConsumedEnergy * GRID_EMISSIONS_FACTOR + annualDirectEmissions) * years
  const transport = annualTransport * years
  const offset = (annualSink + annualGeneratedEnergy * GRID_EMISSIONS_FACTOR) * years

  return {
    embodied,
    operational,
    transport,
    offset,
    total: embodied + operational + transport - offset,
    cost,
    energy: annualEnergy * years,
  }
}

export function getPopulation(city: City) {
  return listAssets(city).reduce((total, { itemId }) => total + ITEMS[itemId].capacity, 0)
}
