import sourceInputs from "./carbon-inputs.json" with { type: "json" }

export type ItemId =
  | "residential"
  | "office"
  | "road"
  | "metro"
  | "park"
  | "solar"
  | "industry"
  | "water"
  | "school"
  | "hospital"
  | "wastewater"
  | "datacenter"
  | "hotel"
  | "mall"
  | "landfill"
  | "urbanforest"
  | "wind"
  | "busdepot"

export type CityItem = {
  label: string
  color: string
  embodied: number
  energy: number
  directEmissions: number
  cost: number
  floor: number
  sink: number
  capacity: number
  footprint: number
  description: string
  sourceStatus: "cited" | "candidate" | "assumption" | "placeholder"
}

type InputRow = { value: number; unit: string; ref: string; url: string; relatedRef?: string; relatedUrl?: string; year: number | null; status: CityItem["sourceStatus"] }
const input = sourceInputs as Record<string, InputRow>
const value = (id: string) => input[id].value
const areaScaleFromBaseFacility = (footprint: number) => footprint ** 2 / 4

// Asset totals are derived from the supplied table: kg/m² × m² ÷ 1000 = tCO₂e;
// kWh/m²/year × m² ÷ 1000 = MWh/year. Solar's generation is negative city energy.
export const GRID_EMISSIONS_FACTOR = value("GRID_FACTOR")
export const TRANSPORT_T_PER_PERSON = value("TRANSPORT_T_PER_PERSON")
export const TRANSPORT_MULTIPLIER_NEAR_METRO = value("TRANSPORT_MULTIPLIER_NEAR_METRO")
export const ENERGY_MULTIPLIER_NEAR_PARK = value("ENERGY_MULTIPLIER_NEAR_PARK")
export const CARBON_SOURCE_INPUTS = input

export const ITEMS: Record<ItemId, CityItem> = {
  residential: {
    label: "Residential", color: "#879ba1",
    embodied: value("residential.floorArea") * value("residential.embodiedKgPerM2") / 1000,
    energy: value("residential.floorArea") * value("residential.energyKwhPerM2Yr") / 1000, directEmissions: 0,
    cost: value("residential.cost"), floor: 5, sink: 0,
    capacity: value("residential.residents"), footprint: 1,
    description: "Embodied carbon and energy are derived from the supplied 6,000 m² area and intensities. Cost and occupancy are table assumptions.",
    sourceStatus: "candidate",
  },
  office: {
    label: "Office", color: "#a097a2",
    embodied: value("office.floorArea") * value("office.embodiedKgPerM2") / 1000,
    energy: value("office.floorArea") * value("office.energyKwhPerM2Yr") / 1000, directEmissions: 0,
    cost: value("office.cost"), floor: 8, sink: 0, capacity: 0, footprint: 1,
    description: "Embodied carbon and energy are derived from the supplied table. Cost, area and embodied intensity are assumptions; no office occupancy value was supplied.",
    sourceStatus: "candidate",
  },
  road: {
    label: "Road", color: "#77766f",
    embodied: value("road.floorArea") * value("road.embodiedKgPerM2") / 1000,
    energy: value("road.floorArea") * value("road.energyKwhPerM2Yr") / 1000, directEmissions: 0,
    cost: value("road.cost"), floor: 0, sink: 0, capacity: 0, footprint: 1,
    description: "Derived from the supplied one-tile area, embodied intensity and street-lighting energy assumption.",
    sourceStatus: "assumption",
  },
  metro: {
    label: "Metro", color: "#6e9997",
    embodied: value("metro.floorArea") * value("metro.embodiedKgPerM2") / 1000,
    energy: value("metro.floorArea") * value("metro.energyKwhPerM2Yr") / 1000, directEmissions: 0,
    cost: value("metro.cost"), floor: 0, sink: 0, capacity: 0, footprint: 1,
    description: "Derived from the supplied station area, embodied intensity and operating energy assumptions. Metro travel benefits are modeled separately for nearby homes.",
    sourceStatus: "assumption",
  },
  park: {
    label: "Park", color: "#8ea477",
    embodied: value("park.floorArea") * value("park.embodiedKgPerM2") / 1000,
    energy: 0, directEmissions: 0, cost: value("park.cost"), floor: 0,
    sink: value("park.sink"), capacity: 0, footprint: 1,
    description: "Embodied carbon is derived from the supplied area and intensity. Annual carbon sink is the table's cautious urban-park assumption.",
    sourceStatus: "assumption",
  },
  solar: {
    label: "Solar farm", color: "#c9a45f",
    embodied: value("solar.embodiedTotal"), energy: -value("solar.generationMWhYr"), directEmissions: 0,
    cost: value("solar.cost"), floor: 0, sink: 0, capacity: 0, footprint: 1,
    description: "Embodied carbon and annual generation use the supplied candidate estimates; cost and 800 kWp tile size are assumptions.",
    sourceStatus: "candidate",
  },
  // Area remains a design assumption; the emissions intensities use the selected research proxies.
  industry: {
    label: "Industry", color: "#b87957",
    embodied: value("industry.floorArea") * areaScaleFromBaseFacility(3) * value("industry.embodiedKgPerM2") / 1000,
    energy: value("industry.floorArea") * areaScaleFromBaseFacility(3) * value("industry.energyKwhPerM2Yr") / 1000,
    directEmissions: 0, cost: value("industry.cost"), floor: 3, sink: 0,
    capacity: value("industry.capacity"), footprint: 3,
    description: "Uses an Indian factory embodied-carbon baseline and a railway-workshop building-energy proxy. The 6,400 m² reference area scales to 14,400 m² for this 3×3 asset; cost and reference area are assumptions. Process energy and worker occupancy are not modeled.",
    sourceStatus: "candidate",
  },
  water: {
    label: "Water body", color: "#72969a",
    embodied: value("water.embodied"), energy: 0,
    directEmissions: value("water.area") * value("water.directKgPerM2Yr") / 1000,
    cost: value("water.cost"), floor: 0, sink: 0,
    capacity: value("water.capacity"), footprint: 2,
    description: "Annual direct pond emissions use a published urban artificial-pond flux proxy scaled to the assumed 6,400 m² water surface. Construction carbon, pumping, and treatment are excluded; pond fluxes vary by climate and water quality.",
    sourceStatus: "candidate",
  },
  school: {
    label: "School", color: "#b89b68",
    embodied: 0,
    energy: value("school.floorArea") * value("school.energyKwhPerM2Yr") / 1000,
    directEmissions: 0, cost: value("school.cost"), floor: 2, sink: 0,
    capacity: 0, footprint: 2,
    description: "Annual energy uses the midpoint of India's published higher-secondary school EPI range, scaled to an assumed 6,400 m² facility. Construction carbon and student capacity are unmodeled.",
    sourceStatus: "candidate",
  },
  hospital: {
    label: "Hospital", color: "#a97672",
    embodied: 0,
    energy: value("hospital.floorArea") * areaScaleFromBaseFacility(3) * value("hospital.energyKwhPerM2Yr") / 1000,
    directEmissions: 0, cost: value("hospital.cost"), floor: 4, sink: 0,
    capacity: 0, footprint: 3,
    description: "Annual energy uses the measured EPI of New Civil Hospital, Surat, scaled from a 6,400 m² reference area to 14,400 m² for this 3×3 facility. It is a site-specific proxy; construction carbon and bed capacity are unmodeled.",
    sourceStatus: "candidate",
  },
  wastewater: {
    label: "Wastewater plant", color: "#78928c",
    embodied: 0,
    energy: value("wastewater.flowM3Yr") * value("wastewater.energyKwhPerM3") / 1000,
    directEmissions: value("wastewater.flowM3Yr") * value("wastewater.directKgPerM3") / 1000,
    cost: value("wastewater.cost"), floor: 1, sink: 0,
    capacity: 0, footprint: 2,
    description: "Annual electricity and estimated fugitive emissions are scaled to an assumed 10 MLD municipal plant. Energy and gas rates are research averages; actual results depend strongly on treatment technology and operating conditions. Construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  datacenter: {
    label: "Data center", color: "#788a9a",
    embodied: 0,
    energy: value("datacenter.itLoadMw") * value("datacenter.utilization") * value("datacenter.pue") * 8760,
    directEmissions: 0, cost: value("datacenter.cost"), floor: 5, sink: 0,
    capacity: 0, footprint: 3,
    description: "Annual facility electricity is calculated from an assumed 1 MW IT load, 40% average utilization, 1.6 PUE, and 8,760 hours/year, using India's NITI Aayog method. Construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  hotel: {
    label: "Hotel", color: "#a88772",
    embodied: 0, energy: value("hotel.floorArea") * value("hotel.energyKwhPerM2Yr") / 1000,
    directEmissions: 0, cost: value("hotel.cost"), floor: 5, sink: 0, capacity: 0, footprint: 2,
    description: "Annual electricity uses the published composite-climate EPI for above-three-star Indian hotels, scaled to the assumed 6,400 m² facility. Construction carbon and room capacity are unmodeled.",
    sourceStatus: "candidate",
  },
  mall: {
    label: "Shopping mall", color: "#9b8170",
    embodied: 0, energy: value("mall.floorArea") * areaScaleFromBaseFacility(3) * value("mall.energyKwhPerM2Yr") / 1000,
    directEmissions: 0, cost: value("mall.cost"), floor: 3, sink: 0, capacity: 0, footprint: 3,
    description: "Annual electricity uses the midpoint of BEE's composite-climate one-star shopping-mall EPI band, scaled from a 6,400 m² reference area to 14,400 m² for this 3×3 facility. Construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  landfill: {
    label: "Landfill", color: "#8a705e",
    embodied: 0, energy: 0,
    directEmissions: value("landfill.ch4TonnesYr") * value("landfill.siteScale") * value("landfill.methaneGwp100"),
    cost: value("landfill.cost"), floor: 0, sink: 0, capacity: 0, footprint: 3,
    description: "Annual methane emissions scale the Chandigarh landfill estimate to the assumed daily waste throughput. This linear proxy assumes similar waste composition and unmanaged gas; site emissions vary substantially. Construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  urbanforest: {
    label: "Urban forest", color: "#7e966b",
    embodied: 0, energy: 0, directEmissions: 0,
    cost: value("urbanforest.cost"), floor: 0,
    sink: value("urbanforest.treeCount") * value("urbanforest.co2KgPerTreeYr") / 1000,
    capacity: 0, footprint: 2,
    description: "Annual tree uptake uses a measured Indian urban-tree average multiplied by an assumed 100 trees per 6,400 m² forest tile. Survival, species, age, and permanence are not modeled; construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  wind: {
    label: "Wind turbine", color: "#8b9c9b",
    embodied: 0,
    energy: -value("wind.capacityMw") * (value("wind.generationGWh") * 1000 / (value("wind.installedCapacityMw") * 8760)) * 8760,
    directEmissions: 0, cost: value("wind.cost"), floor: 0, sink: 0, capacity: 0, footprint: 2,
    description: "Annual generation applies India's reported wind output per installed MW to the assumed 2 MW turbine. Capacity factor uses year-end installed capacity and is a rough national proxy; lifecycle construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
  busdepot: {
    label: "Diesel bus depot", color: "#997568",
    embodied: 0, energy: 0,
    directEmissions: value("busdepot.buses") * value("busdepot.kmPerDay") * 365 * value("busdepot.passengers") * value("busdepot.kgPerPassengerKm") / 1000,
    cost: value("busdepot.cost"), floor: 1, sink: 0, capacity: 0, footprint: 3,
    description: "Annual bus-service emissions use an India-specific passenger-kilometre factor, scaled to assumed fleet size, daily distance, and average passenger load. This is an illustrative depot service, not a measured site inventory; construction carbon is unmodeled.",
    sourceStatus: "candidate",
  },
}

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[]
const shortcutKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
export const ITEM_SHORTCUTS = Object.fromEntries(ITEM_IDS.map((id, index) => [id, shortcutKeys[index] ?? ""])) as Record<ItemId, string>
