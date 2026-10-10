import { ENERGY_MULTIPLIER_NEAR_PARK, GRID_EMISSIONS_FACTOR, ITEMS, TRANSPORT_MULTIPLIER_NEAR_METRO, TRANSPORT_T_PER_PERSON, type ItemId } from "../data/items.ts"
import { computeCarbon, MODEL_HORIZON, type City } from "./carbon.ts"
import { canPlace, eraseAsset, footprintCells, GRID_SIZE, listAssets, placeAsset } from "./grid.ts"

const OPTIMIZABLE_ASSETS = ["solar", "wind", "urbanforest", "park", "metro"] as const satisfies readonly ItemId[]
const MAX_NEW_ASSETS: Record<(typeof OPTIMIZABLE_ASSETS)[number], number> = {
  solar: 75,
  wind: 1,
  urbanforest: 40,
  park: 40,
  metro: 8,
}
type Position = { row: number; col: number }

function nearTargets(itemId: ItemId, row: number, col: number, targets: ReturnType<typeof listAssets>, radius: number) {
  const size = ITEMS[itemId].footprint
  return targets.some((target) => {
    const targetSize = ITEMS[target.itemId].footprint
    const rowGap = Math.max(0, target.row - (row + size - 1), row - (target.row + targetSize - 1))
    const colGap = Math.max(0, target.col - (col + size - 1), col - (target.col + targetSize - 1))
    return Math.max(rowGap, colGap) <= radius
  })
}

function locationSensitiveAnnual(itemId: ItemId, row: number, col: number, parks: ReturnType<typeof listAssets>, metros: ReturnType<typeof listAssets>) {
  const item = ITEMS[itemId]
  const energy = item.energy > 0 && nearTargets(itemId, row, col, parks, 1)
    ? item.energy * ENERGY_MULTIPLIER_NEAR_PARK
    : Math.max(item.energy, 0)
  const transport = itemId === "residential"
    ? item.capacity * TRANSPORT_T_PER_PERSON * (nearTargets(itemId, row, col, metros, 3) ? TRANSPORT_MULTIPLIER_NEAR_METRO : 1)
    : 0
  return energy * GRID_EMISSIONS_FACTOR + transport
}

/** Relocate existing assets toward useful neighbors, validating only each completed move. */
function repositionForBenefit(city: City): City {
  let current = city
  let currentTotal = computeCarbon(current, MODEL_HORIZON).total
  for (let move = 0; move < 24; move += 1) {
    const assets = listAssets(current)
    const metros = assets.filter((asset) => asset.itemId === "metro")
    const parks = assets.filter((asset) => asset.itemId === "park")
    if (!metros.length && !parks.length) break
    let best: { source: (typeof assets)[number]; destination: Position; total: number; swapWith?: (typeof assets)[number] } | null = null
    // Roads are infrastructure, not optimizer candidates. Keep their locations
    // fixed so recommendations never appear to be arbitrary new road tiles.
    const movable = assets.filter(({ itemId }) => itemId !== "road").map((asset) => {
      const residential = asset.itemId === "residential"
      const energy = ITEMS[asset.itemId].energy
      const targets = residential ? metros : parks
      const radius = residential ? 3 : 1
      const benefit = residential
        ? ITEMS.residential.capacity * TRANSPORT_T_PER_PERSON * (1 - TRANSPORT_MULTIPLIER_NEAR_METRO) * MODEL_HORIZON
        : energy * (1 - ENERGY_MULTIPLIER_NEAR_PARK) * GRID_EMISSIONS_FACTOR * MODEL_HORIZON
      return { asset, targets, radius, benefit, eligible: (residential || energy > 0) && targets.length > 0 && !nearTargets(asset.itemId, asset.row, asset.col, targets, radius) }
    }).filter((entry) => entry.eligible).sort((a, b) => b.benefit - a.benefit).slice(0, 40)

    for (const { asset, targets, radius } of movable) {
      const trial = current.map((line) => [...line])
      eraseAsset(trial, asset.row, asset.col)
      const size = ITEMS[asset.itemId].footprint
      const candidates = new Map<string, Position>()
      for (const target of targets) {
        const targetSize = ITEMS[target.itemId].footprint
        for (let row = Math.max(0, target.row - size - radius); row <= Math.min(GRID_SIZE - size, target.row + targetSize + radius); row += 1) {
          for (let col = Math.max(0, target.col - size - radius); col <= Math.min(GRID_SIZE - size, target.col + targetSize + radius); col += 1) {
            if ((row !== asset.row || col !== asset.col) && nearTargets(asset.itemId, row, col, [target], radius)) candidates.set(`${row},${col}`, { row, col })
          }
        }
      }
      const oldNearPark = nearTargets(asset.itemId, asset.row, asset.col, parks, 1)
      const oldNearMetro = asset.itemId === "residential" && nearTargets(asset.itemId, asset.row, asset.col, metros, 3)
      const oldAnnual = ITEMS[asset.itemId].energy * (oldNearPark ? ENERGY_MULTIPLIER_NEAR_PARK : 1) * GRID_EMISSIONS_FACTOR
        + (asset.itemId === "residential" ? ITEMS.residential.capacity * TRANSPORT_T_PER_PERSON * (oldNearMetro ? TRANSPORT_MULTIPLIER_NEAR_METRO : 1) : 0)
      for (const destination of candidates.values()) {
        if (!canPlace(trial, asset.itemId, destination.row, destination.col)) continue
        const newNearPark = nearTargets(asset.itemId, destination.row, destination.col, parks, 1)
        const newNearMetro = asset.itemId === "residential" && nearTargets(asset.itemId, destination.row, destination.col, metros, 3)
        const newAnnual = ITEMS[asset.itemId].energy * (newNearPark ? ENERGY_MULTIPLIER_NEAR_PARK : 1) * GRID_EMISSIONS_FACTOR
          + (asset.itemId === "residential" ? ITEMS.residential.capacity * TRANSPORT_T_PER_PERSON * (newNearMetro ? TRANSPORT_MULTIPLIER_NEAR_METRO : 1) : 0)
        const total = currentTotal - (oldAnnual - newAnnual) * MODEL_HORIZON
        if (total < currentTotal - 0.001 && (!best || total < best.total)) best = { source: asset, destination, total }
      }

      // If the useful tiles are occupied, swap with an equally sized non-road building.
      // The model checks both buildings' new park and metro effects before accepting it.
      const sourceSize = ITEMS[asset.itemId].footprint
      const oldSourceAnnual = locationSensitiveAnnual(asset.itemId, asset.row, asset.col, parks, metros)
      for (const other of assets) {
        if (other.itemId === asset.itemId || other.itemId === "road" || other.itemId === "park" || other.itemId === "metro") continue
        if (ITEMS[other.itemId].footprint !== sourceSize || !nearTargets(other.itemId, other.row, other.col, targets, radius)) continue
        const oldOtherAnnual = locationSensitiveAnnual(other.itemId, other.row, other.col, parks, metros)
        const newSourceAnnual = locationSensitiveAnnual(asset.itemId, other.row, other.col, parks, metros)
        const newOtherAnnual = locationSensitiveAnnual(other.itemId, asset.row, asset.col, parks, metros)
        const total = currentTotal - (oldSourceAnnual + oldOtherAnnual - newSourceAnnual - newOtherAnnual) * MODEL_HORIZON
        if (total < currentTotal - 0.001 && (!best || total < best.total)) {
          best = { source: asset, destination: { row: other.row, col: other.col }, swapWith: other, total }
        }
      }
    }
    if (!best) break
    const next = current.map((line) => [...line])
    eraseAsset(next, best.source.row, best.source.col)
    if (best.swapWith) eraseAsset(next, best.swapWith.row, best.swapWith.col)
    if (!placeAsset(next, best.source.itemId, best.destination.row, best.destination.col)) break
    if (best.swapWith && !placeAsset(next, best.swapWith.itemId, best.source.row, best.source.col)) break
    current = next
    currentTotal = best.total
  }
  return current
}

/** Give existing solar and forest assets sensible neighborhoods when that leaves carbon unchanged. */
function repositionContextualAssets(city: City): City {
  let current = city
  let currentTotal = computeCarbon(current, MODEL_HORIZON).total
  for (let move = 0; move < 24; move += 1) {
    const assets = listAssets(current)
    let moved = false
    for (const asset of assets) {
      if (asset.itemId !== "solar" && asset.itemId !== "urbanforest") continue
      const targets = asset.itemId === "solar"
        ? assets.filter(({ itemId }) => ["industry", "datacenter", "mall", "wastewater", "busdepot"].includes(itemId))
        : assets.filter(({ itemId }) => itemId === "residential" || itemId === "office")
      // Keep renewable assets close to their purpose-built neighbors rather than merely
      // somewhere in the same district. This makes the relocation visible in dense cities.
      if (!targets.length || nearTargets(asset.itemId, asset.row, asset.col, targets, 2)) continue
      const trial = current.map((line) => [...line])
      eraseAsset(trial, asset.row, asset.col)
      let destination: Position | undefined
      for (let row = 0; row <= GRID_SIZE - ITEMS[asset.itemId].footprint && !destination; row += 1) {
        for (let col = 0; col <= GRID_SIZE - ITEMS[asset.itemId].footprint; col += 1) {
          if ((row === asset.row && col === asset.col) || !nearTargets(asset.itemId, row, col, targets, 2)) continue
          if (canPlace(trial, asset.itemId, row, col)) {
            destination = { row, col }
            break
          }
        }
      }
      if (!destination || !placeAsset(trial, asset.itemId, destination.row, destination.col)) continue
      const total = computeCarbon(trial, MODEL_HORIZON).total
      if (total > currentTotal + 0.001) continue
      current = trial
      currentTotal = total
      moved = true
      break
    }
    if (!moved) break
  }
  return current
}

function candidatePositions(city: City, itemId: (typeof OPTIMIZABLE_ASSETS)[number]): Position[] {
  const assets = listAssets(city)
  const ranked: Array<{ position: Position; context: number }> = []
  const targets = assets.filter((asset) => {
    if (itemId === "metro") return asset.itemId === "residential"
    if (itemId === "park") return ITEMS[asset.itemId].energy > 0 && !nearTargets(asset.itemId, asset.row, asset.col, assets.filter(({ itemId: targetId }) => targetId === "park"), 1)
    if (itemId === "urbanforest") return asset.itemId === "residential" || asset.itemId === "office"
    if (itemId === "solar") return ["industry", "datacenter", "mall", "wastewater", "busdepot"].includes(asset.itemId)
    return asset.itemId !== "wind" && asset.itemId !== "solar"
  })
  const targetAreas = targets.map((asset) => ({
    row: asset.row,
    col: asset.col,
    size: ITEMS[asset.itemId].footprint,
    weight: itemId === "solar"
      ? Math.max(1, ITEMS[asset.itemId].energy / 500)
      : itemId === "park" ? Math.max(1, ITEMS[asset.itemId].energy / 500)
      : itemId === "metro" ? ITEMS.residential.capacity : 1,
  }))
  const generators = itemId === "wind" || itemId === "solar"
    ? assets.filter((asset) => asset.itemId === "wind" || asset.itemId === "solar")
    : []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!canPlace(city, itemId, row, col)) continue
      const radius = itemId === "metro" ? 3 : itemId === "solar" || itemId === "urbanforest" ? 6 : 1
      const candidateSize = ITEMS[itemId].footprint
      const weighted = targetAreas.reduce((sum, target) => {
        const rowDistance = Math.max(0, target.row - (row + candidateSize - 1), row - (target.row + target.size - 1))
        const colDistance = Math.max(0, target.col - (col + candidateSize - 1), col - (target.col + target.size - 1))
        const distance = Math.max(rowDistance, colDistance)
        if (distance > radius) return sum
        return sum + target.weight * (radius + 1 - distance)
      }, 0)
      const generationSpacing = itemId === "wind" || itemId === "solar"
        ? generators.reduce((sum, asset) => sum + 1 / (1 + Math.max(Math.abs(asset.row - row), Math.abs(asset.col - col))), 0)
        : 0
      ranked.push({ position: { row, col }, context: weighted - generationSpacing * (itemId === "solar" ? 16 : 3) })
    }
  }

  // A few well-ranked locations are enough: carbon gains are calculated by the model,
  // while this ranking keeps solar, trees, and transit close to relevant neighbors.
  ranked.sort((a, b) => b.context - a.context)
  const count = itemId === "wind" ? 8 : 12
  return ranked.slice(0, count).map(({ position }) => position)
}

function reductionFromAddition(city: City, itemId: ItemId, row: number, col: number, assets = listAssets(city)) {
  const item = ITEMS[itemId]
  const cells = footprintCells(itemId, row, col)
  let reduction = -item.embodied
    - Math.max(item.energy, 0) * GRID_EMISSIONS_FACTOR * MODEL_HORIZON
    + Math.max(-item.energy, 0) * GRID_EMISSIONS_FACTOR * MODEL_HORIZON
    - item.directEmissions * MODEL_HORIZON
    + item.sink * MODEL_HORIZON

  if (itemId === "park") {
    const parks = assets.filter((asset) => asset.itemId === "park")
    assets.forEach((asset) => {
      const existing = ITEMS[asset.itemId]
      if (asset.itemId === "park" || existing.energy <= 0) return
      const targetCells = footprintCells(asset.itemId, asset.row, asset.col)
      const alreadyShaded = parks.some((park) => footprintCells(park.itemId, park.row, park.col).some((parkCell) =>
        targetCells.some((target) => Math.max(Math.abs(parkCell.row - target.row), Math.abs(parkCell.col - target.col)) <= 1),
      ))
      if (alreadyShaded) return
      const shadesAsset = cells.some((cell) => targetCells.some((target) =>
        Math.max(Math.abs(cell.row - target.row), Math.abs(cell.col - target.col)) <= 1,
      ))
      if (shadesAsset) reduction += existing.energy * (1 - ENERGY_MULTIPLIER_NEAR_PARK) * GRID_EMISSIONS_FACTOR * MODEL_HORIZON
    })
  }

  if (itemId === "metro") {
    const metros = assets.filter((asset) => asset.itemId === "metro")
    assets.forEach((asset) => {
      if (asset.itemId !== "residential") return
      const targetCells = footprintCells(asset.itemId, asset.row, asset.col)
      const alreadyServed = metros.some((metro) => footprintCells(metro.itemId, metro.row, metro.col).some((metroCell) =>
        targetCells.some((target) => Math.max(Math.abs(metroCell.row - target.row), Math.abs(metroCell.col - target.col)) <= 3),
      ))
      if (alreadyServed) return
      const servesAsset = cells.some((cell) => targetCells.some((target) =>
        Math.max(Math.abs(cell.row - target.row), Math.abs(cell.col - target.col)) <= 3,
      ))
      if (servesAsset) reduction += ITEMS.residential.capacity * TRANSPORT_T_PER_PERSON * (1 - TRANSPORT_MULTIPLIER_NEAR_METRO) * MODEL_HORIZON
    })
  }

  return reduction
}

/** Adds a mixed, context-aware set of affordable assets without deleting existing buildings. */
export function optimizeCity(source: City, budget: number): City {
  const city = source.map((row) => [...row])
  const availableBudget = Number.isFinite(budget) ? Math.max(0, budget) : 0
  let spent = 0
  const added: Record<(typeof OPTIMIZABLE_ASSETS)[number], number> = { solar: 0, wind: 0, urbanforest: 0, park: 0, metro: 0 }
  let currentTotal = computeCarbon(city, MODEL_HORIZON).total
  const cheapestAsset = Math.min(...OPTIMIZABLE_ASSETS.map((itemId) => ITEMS[itemId].cost))
  const totalAssetLimit = OPTIMIZABLE_ASSETS.reduce((sum, itemId) => sum + MAX_NEW_ASSETS[itemId], 0)
  const maxAdditions = Math.min(city.flat().filter((cell) => cell === null).length, totalAssetLimit, Math.floor(availableBudget / cheapestAsset))

  for (let addition = 0; addition < maxAdditions; addition += 1) {
    let best: { itemId: (typeof OPTIMIZABLE_ASSETS)[number]; row: number; col: number; benefitPerCost: number; total: number } | null = null
    const assets = listAssets(city)

    for (const itemId of OPTIMIZABLE_ASSETS) {
      if (added[itemId] >= MAX_NEW_ASSETS[itemId]) continue
      const cost = ITEMS[itemId].cost
      if (spent + cost > availableBudget) continue

      for (const { row, col } of candidatePositions(city, itemId)) {
        if (!canPlace(city, itemId, row, col)) continue
        const benefit = reductionFromAddition(city, itemId, row, col, assets)
        const candidateTotal = currentTotal - benefit
        const benefitPerCost = benefit / cost
        if (benefitPerCost > 0 && (!best || benefitPerCost > best.benefitPerCost)) {
          best = { itemId, row, col, benefitPerCost, total: candidateTotal }
        }
      }
    }

    // Stop when no affordable placement reduces the modeled 30-year carbon total.
    if (!best) break
    placeAsset(city, best.itemId, best.row, best.col)
    added[best.itemId] += 1
    spent += ITEMS[best.itemId].cost
    currentTotal = best.total
  }

  return repositionContextualAssets(repositionForBenefit(city))
}

/** Improves the 30-year estimate toward the requested reduction, then relocates assets where useful. */
export function optimizeCityForReduction(source: City, targetPercent: number): City {
  const city = source.map((row) => [...row])
  const requested = Number.isFinite(targetPercent) ? Math.max(0, Math.min(99, targetPercent)) : 0
  const baseline = computeCarbon(city, MODEL_HORIZON).total
  if (baseline <= 0 || requested === 0) return repositionContextualAssets(city)
  const targetTotal = baseline * (1 - requested / 100)
  let currentTotal = baseline
  const added: Record<(typeof OPTIMIZABLE_ASSETS)[number], number> = { solar: 0, wind: 0, urbanforest: 0, park: 0, metro: 0 }

  for (let addition = 0; addition < GRID_SIZE * GRID_SIZE && currentTotal > targetTotal; addition += 1) {
    let best: { itemId: (typeof OPTIMIZABLE_ASSETS)[number]; row: number; col: number; total: number; benefitPerCost: number } | null = null
    const assets = listAssets(city)

    for (const itemId of OPTIMIZABLE_ASSETS) {
      if (added[itemId] >= MAX_NEW_ASSETS[itemId]) continue
      for (const { row, col } of candidatePositions(city, itemId)) {
        if (!canPlace(city, itemId, row, col)) continue
        const reduction = reductionFromAddition(city, itemId, row, col, assets)
        const total = currentTotal - reduction
        const benefitPerCost = reduction / Math.max(ITEMS[itemId].cost, 0.01)
        if (benefitPerCost > 0 && (!best || benefitPerCost > best.benefitPerCost)) {
          best = { itemId, row, col, total, benefitPerCost }
        }
      }
    }

    if (!best) break
    placeAsset(city, best.itemId, best.row, best.col)
    added[best.itemId] += 1
    currentTotal = best.total
  }

  return repositionContextualAssets(repositionForBenefit(city))
}
