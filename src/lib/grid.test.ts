import assert from "node:assert/strict"
import test from "node:test"
import { ITEM_IDS, ITEMS } from "../data/items.ts"
import { computeCarbon, getPopulation, GRID_EMISSIONS_FACTOR, TRANSPORT_T_PER_PERSON } from "./carbon.ts"
import { canPlace, eraseAsset, footprintCells, getCellItemId, GRID_SIZE, listAssets, placeAsset } from "./grid.ts"
import { optimizeCity, optimizeCityForReduction } from "./optimizer.ts"
import { useCityStore } from "../store/useCityStore.ts"

const emptyCity = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))

test("catalog contains the supported city assets", () => {
  assert.equal(ITEM_IDS.length, 18)
  assert.deepEqual(ITEM_IDS, ["residential", "office", "road", "metro", "park", "solar", "industry", "water", "school", "hospital", "wastewater", "datacenter", "hotel", "mall", "landfill", "urbanforest", "wind", "busdepot"])
  assert.equal("mixed-use" in ITEMS, false)
  assert.equal(GRID_SIZE, 40)
})

test("assets occupy realistic one, two, and three tile footprints", () => {
  const city = emptyCity()
  assert.equal(placeAsset(city, "residential", 0, 0), true)
  assert.equal(city[0][0], "residential")
  for (const itemId of ["industry", "water", "school", "hospital", "wastewater", "datacenter", "mall", "busdepot"] as const) {
    const grid = emptyCity()
    assert.equal(placeAsset(grid, itemId, 4, 5), true)
    assert.equal(footprintCells(itemId, 4, 5).length, ITEMS[itemId].footprint ** 2)
    assert.equal(grid.flat().filter((cell) => getCellItemId(cell) === itemId).length, ITEMS[itemId].footprint ** 2)
    assert.equal(listAssets(grid).length, 1)
  }
})

test("multi-tile placement rejects collisions and every out-of-grid edge", () => {
  const city = emptyCity()
  placeAsset(city, "road", 1, 2)
  assert.equal(canPlace(city, "industry", 1, 1), false)
  assert.equal(placeAsset(city, "industry", 39, 39), false)
  assert.equal(placeAsset(city, "water", 39, 38), false)
})

test("erasing any footprint cell removes only that asset", () => {
  const city = emptyCity()
  placeAsset(city, "industry", 5, 5)
  placeAsset(city, "water", 5, 8)
  placeAsset(city, "road", 5, 10)
  assert.equal(eraseAsset(city, 6, 6), true)
  assert.equal(city[5][5], null)
  assert.equal(city[6][6], null)
  assert.equal(city[5][8], "water@5,8")
  assert.equal(city[6][9], "water@5,8")
  assert.equal(city[5][10], "road")
})

test("adjacent same-type footprints retain separate identities", () => {
  const city = emptyCity()
  placeAsset(city, "water", 5, 5)
  placeAsset(city, "water", 5, 7)
  assert.equal(listAssets(city).length, 2)
  eraseAsset(city, 6, 7)
  assert.equal(city[5][5], "water@5,5")
  assert.equal(city[6][6], "water@5,5")
  assert.equal(city[5][7], null)
  assert.equal(city[6][8], null)
  assert.equal(listAssets(city).length, 1)
})

test("industry and water are counted once in metrics, population, and trajectory", () => {
  const city = emptyCity()
  placeAsset(city, "industry", 2, 3)
  placeAsset(city, "water", 8, 9)
  const year0 = computeCarbon(city, 0)
  const year1 = computeCarbon(city, 1)
  assert.equal(year0.embodied, ITEMS.industry.embodied + ITEMS.water.embodied)
  assert.equal(year0.cost, ITEMS.industry.cost + ITEMS.water.cost)
  assert.equal(year1.energy, ITEMS.industry.energy + ITEMS.water.energy)
  assert.equal(year1.operational, ITEMS.industry.energy * GRID_EMISSIONS_FACTOR + ITEMS.water.directEmissions)
  assert.equal(year1.transport, 0)
  assert.equal(getPopulation(city), ITEMS.industry.capacity + ITEMS.water.capacity)
  assert.equal(year1.total, year1.embodied + year1.operational + year1.transport - year1.offset)
  assert.equal(computeCarbon(city, 30).cost, year1.cost)
})

test("candidate assets must pass the same footprint and budget prerequisites", () => {
  const city = emptyCity()
  const budget = ITEMS.industry.cost - 1
  assert.equal(ITEMS.industry.cost <= budget, false)
  assert.equal(canPlace(city, "water", 18, 18), true)
  placeAsset(city, "office", 19, 19)
  assert.equal(canPlace(city, "industry", 18, 18), false)
})

test("optimizer preserves valid footprints, avoids collisions, and stays within budget", () => {
  const source = emptyCity()
  placeAsset(source, "industry", 2, 2)
  placeAsset(source, "water", 2, 4)
  placeAsset(source, "road", 2, 6)
  const budget = 100
  const sourceAssets = listAssets(source)
  const optimized = optimizeCity(source, budget)
  assert.ok(computeCarbon(optimized, 0).cost - computeCarbon(source, 0).cost <= budget)
  for (const existing of sourceAssets) {
    assert.ok(listAssets(optimized).some((asset) => asset.itemId === existing.itemId && asset.row === existing.row && asset.col === existing.col))
  }
  const validationGrid = emptyCity()
  for (const asset of listAssets(optimized)) {
    assert.equal(canPlace(validationGrid, asset.itemId, asset.row, asset.col), true)
    placeAsset(validationGrid, asset.itemId, asset.row, asset.col)
  }
})

test("target optimizer reaches an achievable reduction while preserving all original assets", () => {
  const city = emptyCity()
  placeAsset(city, "hotel", 5, 5)
  const original = city.map((row) => [...row])
  const optimized = optimizeCityForReduction(city, 20)
  assert.deepEqual(city, original)
  assert.ok(computeCarbon(optimized, 30).total <= computeCarbon(city, 30).total * 0.8)
  assert.ok(listAssets(optimized).some(({ itemId }) => itemId === "hotel"))
  assert.ok(listAssets(optimized).length > listAssets(city).length)
  for (const asset of listAssets(optimized)) {
    const validation = emptyCity()
    assert.equal(canPlace(validation, asset.itemId, asset.row, asset.col), true)
    placeAsset(validation, asset.itemId, asset.row, asset.col)
  }
})

test("optimizer can reposition an existing home near metro without removing or duplicating assets", () => {
  const city = emptyCity()
  placeAsset(city, "residential", 1, 1)
  placeAsset(city, "metro", 12, 12)
  const originalAssets = listAssets(city)
  const optimized = optimizeCityForReduction(city, 1)
  const optimizedAssets = listAssets(optimized)
  assert.equal(optimizedAssets.filter(({ itemId }) => itemId === "residential").length, 1)
  assert.equal(optimizedAssets.filter(({ itemId }) => itemId === "metro").length, 1)
  assert.ok(optimizedAssets.some(({ itemId, row, col }) => itemId === "residential" && (row !== 1 || col !== 1)))
  assert.ok(computeCarbon(optimized, 30).total < computeCarbon(city, 30).total)
  for (const itemId of new Set(originalAssets.map(({ itemId }) => itemId))) {
    assert.ok(optimizedAssets.filter((asset) => asset.itemId === itemId).length >= originalAssets.filter((asset) => asset.itemId === itemId).length)
  }
})

test("solar is sited by major electricity users and wind additions are limited", () => {
  const city = emptyCity()
  placeAsset(city, "industry", 18, 18)
  placeAsset(city, "datacenter", 22, 18)
  placeAsset(city, "datacenter", 22, 22)
  const optimized = optimizeCityForReduction(city, 80)
  const assets = listAssets(optimized)
  assert.ok(assets.some(({ itemId }) => itemId === "solar"))
  assert.ok(assets.filter(({ itemId }) => itemId === "wind").length <= 1)
  for (const solar of assets.filter(({ itemId }) => itemId === "solar")) {
    const nearbyMajorLoad = assets.some((asset) =>
      ["industry", "datacenter", "mall", "wastewater", "busdepot"].includes(asset.itemId)
      && Math.max(Math.abs(asset.row - solar.row), Math.abs(asset.col - solar.col)) <= 6,
    )
    assert.ok(nearbyMajorLoad)
  }
})

test("existing solar and forest assets are regrouped beside relevant neighborhoods", () => {
  const city = emptyCity()
  placeAsset(city, "industry", 20, 20)
  placeAsset(city, "residential", 25, 25)
  placeAsset(city, "office", 27, 25)
  placeAsset(city, "solar", 0, 0)
  placeAsset(city, "urbanforest", 0, 2)
  const optimized = optimizeCityForReduction(city, 1)
  const assets = listAssets(optimized)
  const solar = assets.find(({ itemId }) => itemId === "solar")!
  const forest = assets.find(({ itemId }) => itemId === "urbanforest")!
  assert.ok(Math.max(Math.abs(solar.row - 20), Math.abs(solar.col - 20)) <= 6)
  assert.ok(assets.filter(({ itemId }) => itemId === "residential" || itemId === "office").some((home) =>
    Math.max(Math.abs(forest.row - home.row), Math.abs(forest.col - home.col)) <= 6,
  ))
})

test("starter optimization moves existing buildings and never adds roads", () => {
  useCityStore.getState().loadStarter()
  const before = useCityStore.getState().city
  const original = listAssets(before)
  const originalAnchors = new Set(original.map(({ itemId, row, col }) => `${itemId}:${row},${col}`))
  const originalRoadAnchors = original.filter(({ itemId }) => itemId === "road").map(({ itemId, row, col }) => `${itemId}:${row},${col}`).sort()
  const originalRoads = original.filter(({ itemId }) => itemId === "road").length
  const optimized = optimizeCityForReduction(before, 10)
  const after = listAssets(optimized)
  const unchanged = after.filter(({ itemId, row, col }) => originalAnchors.has(`${itemId}:${row},${col}`)).length
  assert.ok(unchanged < original.length, "at least one existing building should move")
  assert.equal(after.filter(({ itemId }) => itemId === "road").length, originalRoads)
  assert.deepEqual(after.filter(({ itemId }) => itemId === "road").map(({ itemId, row, col }) => `${itemId}:${row},${col}`).sort(), originalRoadAnchors)
  assert.ok(after.filter(({ itemId }) => itemId === "solar").length <= original.filter(({ itemId }) => itemId === "solar").length + 75)
  assert.ok(after.filter(({ itemId }) => itemId === "wind").length <= original.filter(({ itemId }) => itemId === "wind").length + 1)
})

test("starter optimizers improve the city, obey the budget, and can meet a 50% target", () => {
  useCityStore.getState().loadStarter()
  const starter = useCityStore.getState().city
  const baseline = computeCarbon(starter, 30)
  const original = listAssets(starter)
  const budgetResult = optimizeCity(starter, 300)
  const budgetMetrics = computeCarbon(budgetResult, 30)
  assert.ok(budgetMetrics.cost - baseline.cost <= 300)
  assert.ok(budgetMetrics.total < baseline.total * 0.95, "the 300 Cr plan should make a meaningful reduction")
  const targetResult = optimizeCityForReduction(starter, 50)
  const targetMetrics = computeCarbon(targetResult, 30)
  assert.ok(targetMetrics.total <= baseline.total * 0.5, "target optimization should reach 50% on the starter city")
  assert.ok(listAssets(targetResult).filter(({ itemId }) => itemId === "wind").length <= original.filter(({ itemId }) => itemId === "wind").length + 1)
  const optimizedCounts = new Map<string, number>()
  for (const { itemId } of listAssets(targetResult)) optimizedCounts.set(itemId, (optimizedCounts.get(itemId) ?? 0) + 1)
  const originalCounts = new Map<string, number>()
  for (const { itemId } of original) originalCounts.set(itemId, (originalCounts.get(itemId) ?? 0) + 1)
  for (const [itemId, count] of originalCounts) {
    assert.ok((optimizedCounts.get(itemId) ?? 0) >= count, `original ${itemId} assets should be preserved`)
  }
})

test("starter and reset layouts remain valid with the new catalog", () => {
  const store = useCityStore.getState()
  store.loadStarter()
  const starter = useCityStore.getState().city
  assert.ok(listAssets(starter).length > 0)
  assert.ok(starter.flat().every((cell) => {
    const itemId = getCellItemId(cell)
    return itemId === null || ITEMS[itemId] !== undefined
  }))
  assert.deepEqual(starter.map((row) => row.length), Array(GRID_SIZE).fill(GRID_SIZE))
  assert.deepEqual(new Set(listAssets(starter).map(({ itemId }) => itemId)), new Set(ITEM_IDS))
  const emptyCells = starter.flat().filter((cell) => cell === null).length
  assert.equal(listAssets(starter).length, 410)
  assert.ok(emptyCells > GRID_SIZE * GRID_SIZE * 0.05)
  assert.ok(emptyCells < GRID_SIZE * GRID_SIZE * 0.7, "the trial city should still feel built up")
  assert.equal(computeCarbon(starter, 30).cost > 0, true)
  useCityStore.getState().loadStarter()
  assert.notDeepEqual(useCityStore.getState().city, starter, "each starter load should randomize the asset layout")
  useCityStore.getState().resetCity()
  assert.ok(useCityStore.getState().city.flat().every((cell) => cell === null))
  assert.equal(useCityStore.getState().savedLayoutA, null)
  assert.equal(useCityStore.getState().savedLayoutB, null)
})

test("View 1 tracks manual edits and saved snapshots preserve complete multi-tile assets", () => {
  useCityStore.getState().resetCity()
  useCityStore.getState().setSelectedItem("industry")
  useCityStore.getState().placeAt(3, 4)
  useCityStore.getState().saveLayout("A")
  const snapshot = useCityStore.getState().savedLayoutA!
  assert.equal(computeCarbon(snapshot, 30).cost, ITEMS.industry.cost)
  useCityStore.getState().eraseAt(4, 5)
  assert.equal(computeCarbon(useCityStore.getState().savedLayoutA!, 30).cost, 0)
  assert.equal(computeCarbon(useCityStore.getState().city, 30).cost, 0)
})

test("Optimize snapshots the original into View 1 and an independent result into View 2", () => {
  const store = useCityStore.getState()
  store.resetCity()
  store.setSelectedItem("residential")
  store.placeAt(8, 8)
  const before = useCityStore.getState().city.map((row) => [...row])
  useCityStore.getState().optimize(100)

  const optimized = useCityStore.getState()
  assert.deepEqual(optimized.savedLayoutA, before)
  assert.deepEqual(optimized.savedLayoutB, optimized.city)
  assert.notEqual(optimized.savedLayoutA, optimized.savedLayoutB)
  assert.ok(computeCarbon(optimized.savedLayoutB!, 30).total < computeCarbon(optimized.savedLayoutA!, 30).total)

  const view2BeforeEdit = optimized.savedLayoutB!.map((row) => [...row])
  const openCell = optimized.city.flatMap((line, row) => line.map((cell, col) => cell === null ? { row, col } : null)).find(Boolean)!
  optimized.setSelectedItem("office")
  optimized.placeAt(openCell.row, openCell.col)
  const afterEdit = useCityStore.getState()
  assert.deepEqual(afterEdit.savedLayoutA, afterEdit.city)
  assert.deepEqual(afterEdit.savedLayoutB, view2BeforeEdit)
})

test("target-reduction optimization records whether its goal was attained and saves View 2", () => {
  const store = useCityStore.getState()
  store.resetCity()
  store.setSelectedItem("hotel")
  store.placeAt(5, 5)
  const before = useCityStore.getState().city.map((row) => [...row])
  useCityStore.getState().optimizeForReduction(20)
  const after = useCityStore.getState()
  assert.deepEqual(after.savedLayoutA, before)
  assert.deepEqual(after.savedLayoutB, after.city)
  assert.ok(after.reductionResult?.targetMet)
  assert.ok(after.reductionResult!.achievedPercent >= 20)
})

test("minimum-carbon action saves the best found layout and marks the result as a minimum", async () => {
  useCityStore.getState().resetCity()
  useCityStore.getState().setSelectedItem("hotel")
  useCityStore.getState().placeAt(5, 5)
  const before = useCityStore.getState().city.map((row) => [...row])
  await useCityStore.getState().optimizeInWorker("minimum", 99)
  const after = useCityStore.getState()
  assert.deepEqual(after.savedLayoutA, before)
  assert.deepEqual(after.savedLayoutB, after.city)
  assert.equal(after.reductionResult?.mode, "minimum")
  assert.ok(computeCarbon(after.city, 30).total < computeCarbon(before, 30).total)
})

test("new assets clearly label provisional sources and water has no carbon credit", () => {
  assert.equal(ITEMS.industry.footprint, 3)
  assert.equal(ITEMS.industry.sourceStatus, "candidate")
  assert.match(ITEMS.industry.description, /factory embodied-carbon baseline/i)
  assert.equal(ITEMS.water.footprint, 2)
  assert.equal(ITEMS.water.sourceStatus, "candidate")
  assert.equal(ITEMS.water.energy, 0)
  assert.equal(ITEMS.water.sink, 0)
  assert.ok(ITEMS.water.directEmissions > 0)
  assert.equal(ITEMS.water.embodied, 0)
  assert.match(ITEMS.water.description, /construction carbon.*excluded/i)
})

test("supplied carbon table drives asset values and energy conversion", () => {
  assert.equal(GRID_EMISSIONS_FACTOR, 0.727)
  assert.equal(TRANSPORT_T_PER_PERSON, 0.34)
  assert.equal(ITEMS.residential.embodied, 2724)
  assert.equal(ITEMS.residential.energy, 480)
  assert.equal(ITEMS.office.embodied, 4400)
  assert.equal(ITEMS.office.energy, 1440)
  assert.equal(ITEMS.road.embodied, 80)
  assert.equal(ITEMS.road.energy, 4.8)
  assert.equal(ITEMS.park.embodied, 9.6)
  assert.equal(ITEMS.park.sink, 1.75)
  assert.equal(ITEMS.solar.embodied, 2055)
  assert.equal(ITEMS.solar.energy, -1214)
  assert.equal(ITEMS.metro.embodied, 4000)
  assert.equal(ITEMS.metro.energy, 1250)
  assert.equal(ITEMS.industry.embodied, 4038.4 * 2.25)
  assert.equal(ITEMS.industry.energy, 406.4 * 2.25)
  assert.equal(ITEMS.water.directEmissions, 3.131008)
  assert.equal(ITEMS.school.energy, 224)
  assert.equal(ITEMS.hospital.energy, 302.08 * 2.25)
  assert.ok(Math.abs(ITEMS.wastewater.energy - 511) < 1e-9)
  assert.ok(Math.abs(ITEMS.wastewater.directEmissions - 2106.78) < 1e-9)
  assert.ok(Math.abs(ITEMS.datacenter.energy - 5606.4) < 1e-9)
})

test("new civic and utility assets use researched operating rates and disclose missing construction carbon", () => {
  for (const itemId of ["school", "hospital", "wastewater", "datacenter"] as const) {
    assert.equal(ITEMS[itemId].footprint, itemId === "hospital" || itemId === "datacenter" ? 3 : 2)
    assert.equal(ITEMS[itemId].sourceStatus, "candidate")
    assert.equal(ITEMS[itemId].embodied, 0)
    assert.match(ITEMS[itemId].description, /construction carbon.*unmodeled/i)
  }
  assert.match(ITEMS.school.description, /higher-secondary/i)
  assert.match(ITEMS.hospital.description, /Surat/i)
  assert.match(ITEMS.wastewater.description, /10 MLD/i)
  assert.match(ITEMS.datacenter.description, /PUE/i)
})

test("six added urban assets have sourced operating values and unique playable footprints", () => {
  const addedAssets = ["hotel", "mall", "landfill", "urbanforest", "wind", "busdepot"] as const
  for (const itemId of addedAssets) {
    assert.equal(ITEMS[itemId].footprint, itemId === "mall" || itemId === "landfill" || itemId === "busdepot" ? 3 : 2)
    assert.equal(ITEMS[itemId].sourceStatus, "candidate")
    assert.equal(ITEMS[itemId].embodied, 0)
  }
  assert.equal(ITEMS.hotel.energy, 1856)
  assert.equal(ITEMS.mall.energy, 2080 * 2.25)
  assert.ok(ITEMS.landfill.directEmissions > 260)
  assert.equal(ITEMS.urbanforest.sink, 5.5)
  assert.ok(ITEMS.wind.energy < -3700)
  assert.ok(ITEMS.busdepot.directEmissions > 286)
})

test("metro reduces nearby residential transport and park reduces nearby building energy", () => {
  const residential = emptyCity()
  placeAsset(residential, "residential", 5, 5)
  const withMetro = residential.map((row) => [...row])
  placeAsset(withMetro, "metro", 8, 8)
  assert.equal(computeCarbon(withMetro, 30).transport, 200 * 0.34 * 0.7 * 30)
  assert.equal(computeCarbon(residential, 30).transport, 200 * 0.34 * 30)

  const office = emptyCity()
  placeAsset(office, "office", 5, 5)
  const withPark = office.map((row) => [...row])
  placeAsset(withPark, "park", 5, 6)
  assert.equal(computeCarbon(office, 1).energy, 1440)
  assert.ok(computeCarbon(withPark, 1).operational < computeCarbon(office, 1).operational)
})

test("optimizer preserves existing assets, respects additional budget, and improves emissions", () => {
  const city = emptyCity()
  placeAsset(city, "residential", 8, 8)
  placeAsset(city, "road", 9, 8)
  const original = city.map((row) => [...row])
  const optimized = optimizeCity(city, 100)
  assert.deepEqual(city, original)
  assert.ok(computeCarbon(optimized, 0).cost - computeCarbon(city, 0).cost <= 100)
  assert.ok(computeCarbon(optimized, 30).total < computeCarbon(city, 30).total)
  assert.ok(listAssets(optimized).length > listAssets(city).length)
  assert.deepEqual(optimizeCity(city, 0), city)
})
