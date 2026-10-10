import { Search, X } from "lucide-react"
import { useState } from "react"
import { CARBON_SOURCE_INPUTS, ITEM_IDS, ITEMS, type CityItem } from "../data/items"
import { GRID_EMISSIONS_FACTOR, MODEL_HORIZON } from "../lib/carbon"

type SourceRow = {
  name: string
  value: number
  unit: string
  status: CityItem["sourceStatus"]
  basis: string
  url?: string
  relatedRef?: string
  relatedUrl?: string
}

const labels: Record<string, string> = {
  GRID_FACTOR: "Grid emissions factor",
  TRANSPORT_T_PER_PERSON: "Transport emissions per resident",
  "residential.floorArea": "Residential floor area",
  "residential.embodiedKgPerM2": "Residential embodied intensity",
  "residential.energyKwhPerM2Yr": "Residential energy intensity",
  "residential.residents": "Residential occupancy",
  "residential.cost": "Residential cost",
  "office.floorArea": "Office floor area",
  "office.embodiedKgPerM2": "Office embodied intensity",
  "office.energyKwhPerM2Yr": "Office energy intensity",
  "office.cost": "Office cost",
  "road.floorArea": "Road area",
  "road.embodiedKgPerM2": "Road embodied intensity",
  "road.energyKwhPerM2Yr": "Road energy intensity",
  "road.cost": "Road cost",
  "park.floorArea": "Park area",
  "park.embodiedKgPerM2": "Park embodied intensity",
  "park.cost": "Park cost",
  "park.sink": "Park annual carbon sink",
  "solar.embodiedTotal": "Solar embodied carbon",
  "solar.generationMWhYr": "Solar annual generation",
  "solar.cost": "Solar cost",
  "metro.floorArea": "Metro station area",
  "metro.embodiedKgPerM2": "Metro embodied intensity",
  "metro.energyKwhPerM2Yr": "Metro energy intensity",
  "metro.cost": "Metro cost",
  TRANSPORT_MULTIPLIER_NEAR_METRO: "Transport multiplier near metro",
  ENERGY_MULTIPLIER_NEAR_PARK: "Energy multiplier near park",
  "industry.floorArea": "Industry facility floor area",
  "industry.embodiedKgPerM2": "Industry embodied carbon intensity (A1 to A5)",
  "industry.energyKwhPerM2Yr": "Industry building energy intensity",
  "industry.cost": "Industry capital cost",
  "industry.capacity": "Industry worker capacity",
  "water.area": "Water body surface area",
  "water.embodied": "Water body construction carbon (excluded)",
  "water.directKgPerM2Yr": "Urban pond direct GHG flux",
  "water.cost": "Water body capital cost",
  "water.capacity": "Water body population capacity",
  "school.floorArea": "School facility floor area",
  "school.energyKwhPerM2Yr": "School energy intensity",
  "school.cost": "School capital cost",
  "hospital.floorArea": "Hospital facility floor area",
  "hospital.energyKwhPerM2Yr": "Hospital energy intensity",
  "hospital.cost": "Hospital capital cost",
  "wastewater.flowM3Yr": "Wastewater treated per year",
  "wastewater.energyKwhPerM3": "Wastewater electricity per m³",
  "wastewater.directKgPerM3": "Wastewater fugitive GHG per m³",
  "wastewater.cost": "Wastewater plant capital cost",
  "datacenter.itLoadMw": "Data center IT load",
  "datacenter.utilization": "Data center average utilization",
  "datacenter.pue": "Data center power usage effectiveness",
  "datacenter.cost": "Data center capital cost",
  "hotel.floorArea": "Hotel facility floor area",
  "hotel.energyKwhPerM2Yr": "Hotel energy intensity",
  "hotel.cost": "Hotel capital cost",
  "mall.floorArea": "Shopping mall floor area",
  "mall.energyKwhPerM2Yr": "Shopping mall energy intensity",
  "mall.cost": "Shopping mall capital cost",
  "landfill.ch4TonnesYr": "Reference landfill methane emissions",
  "landfill.siteScale": "Landfill size scaling factor",
  "landfill.methaneGwp100": "Biogenic methane GWP100",
  "landfill.cost": "Landfill capital cost",
  "urbanforest.treeCount": "Urban forest assumed tree count",
  "urbanforest.co2KgPerTreeYr": "Urban tree annual sequestration",
  "urbanforest.cost": "Urban forest cost",
  "wind.capacityMw": "Wind turbine rated capacity",
  "wind.generationGWh": "India wind generation FY 2025 to 2026",
  "wind.installedCapacityMw": "India wind installed capacity",
  "wind.cost": "Wind turbine cost",
  "busdepot.buses": "Diesel depot fleet size",
  "busdepot.kmPerDay": "Bus distance per day",
  "busdepot.passengers": "Average bus passenger load",
  "busdepot.kgPerPassengerKm": "Intracity bus emissions factor",
  "busdepot.cost": "Bus depot capital cost",
}

const inputRows: SourceRow[] = Object.entries(CARBON_SOURCE_INPUTS).map(([id, source]) => ({
  name: labels[id] ?? id,
  value: source.value,
  unit: source.unit,
  status: source.status,
  basis: source.ref || "Assumption supplied in the attached table.",
  url: source.url,
  relatedRef: source.relatedRef,
  relatedUrl: source.relatedUrl,
}))

const calculatedRows: SourceRow[] = ITEM_IDS.flatMap((id): SourceRow[] => {
  const item = ITEMS[id]
  const perAsset = item.footprint > 1 ? `per ${item.footprint} by ${item.footprint} asset` : "per asset"
  return [
    { name: `${item.label}: embodied carbon`, value: item.embodied, unit: `tCO₂e ${perAsset}`, status: item.sourceStatus, basis: item.description },
    { name: `${item.label}: net annual energy`, value: item.energy, unit: `MWh / year ${perAsset}`, status: item.sourceStatus, basis: item.description },
    { name: `${item.label}: annual direct emissions`, value: item.directEmissions, unit: `tCO₂e / year ${perAsset}`, status: item.sourceStatus, basis: item.description },
    { name: `${item.label}: annual carbon uptake`, value: item.sink, unit: `tCO₂e / year ${perAsset}`, status: item.sourceStatus, basis: item.description },
  ]
})

const sources: SourceRow[] = [
  ...calculatedRows,
  ...inputRows,
  { name: "Projection horizon", value: MODEL_HORIZON, unit: "years", status: "assumption", basis: "Shared by the metrics, chart, and optimizer." },
  { name: "Asset footprints", value: 3, unit: "maximum tiles per side", status: "assumption", basis: "Assets use their listed 1×1, 2×2, or 3×3 grid area. Larger facilities scale with their footprint." },
  { name: "Optimizer relocation rule", value: 48, unit: "maximum relocation steps per run", status: "assumption", basis: "The optimizer can move homes and energy users closer to metro or parks when the 30 year result improves. It may also swap buildings of the same size. Roads stay in place, and existing buildings are never removed." },
  { name: "Optimizer mix and siting rules", value: 75, unit: "maximum new solar assets for a reduction target", status: "assumption", basis: "The reduction target can add up to 75 solar farms, 1 wind turbine, 40 urban forests, 40 parks, and 8 metro stops, within available space. Budget runs use lower limits and follow the entered budget. Solar goes near large energy users, green space near homes and offices, and metro near housing. Roads are not added." },
]

const statusStyles: Record<CityItem["sourceStatus"], string> = {
  cited: "bg-emerald/15 text-emerald",
  candidate: "bg-amber/15 text-amber",
  assumption: "bg-accent/15 text-accent",
  placeholder: "bg-raised text-muted",
}

export default function SourcesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("")
  if (!open) return null
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSources = normalizedQuery
    ? sources.filter((row) => `${row.name} ${row.unit} ${row.status} ${row.basis}`.toLowerCase().includes(normalizedQuery))
    : sources
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6 backdrop-blur-sm" onMouseDown={onClose}>
      <section aria-labelledby="sources-title" aria-modal="true" className="w-full max-w-3xl rounded-2xl border border-line-strong bg-panel-solid p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Transparent assumptions</div>
            <div className="mt-1 text-xl font-semibold text-white" id="sources-title">Model sources and calculated values</div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              The 40 × 40 city model separates research inputs, calculated values, and assumptions. Search by asset or source. Estimates and missing construction data are labeled clearly.
            </p>
            <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-dim">
              Embodied carbon = area × kgCO₂e/m² ÷ 1,000. Annual energy = area × kWh/m² ÷ 1,000. Energy use and pond gas create emissions. Solar and parks can reduce the total. Homes near Metro get a transport adjustment. Parks can lower nearby energy use. Larger facilities scale with their 1×1, 2×2, or 3×3 footprint.
            </p>
          </div>
          <button aria-label="Close sources" className="icon-button" onClick={onClose} title="Close sources" type="button"><X size={17} /></button>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2 text-xs text-muted">
            <Search size={14} aria-hidden="true" />
            <input aria-label="Search sources and model values" className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-dim" onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, sources, or assumptions" value={query} />
          </label>
          <span className="shrink-0 text-[10px] text-muted">{visibleSources.length} rows · 40 × 40 grid</span>
        </div>
        <div className="mt-3 max-h-[55vh] overflow-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-raised text-[10px] uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-3">Input / result</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Status and basis</th></tr>
            </thead>
            <tbody>
              {visibleSources.map(({ name, value, unit, status, basis, url, relatedRef, relatedUrl }) => (
                <tr className="border-t border-line text-secondary" key={name}>
                  <td className="px-4 py-3 font-medium text-primary">{name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{value.toLocaleString("en-IN", { maximumFractionDigits: 3 })}</td>
                  <td className="px-4 py-3 text-muted">{unit}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-start gap-1.5">
                      <strong className={`mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}>{status}</strong>
                      <span>{basis}{url ? <> <a className="text-accent underline underline-offset-2" href={url} rel="noreferrer" target="_blank">Source link</a></> : null}{relatedRef && relatedUrl ? <> {relatedRef} <a className="text-accent underline underline-offset-2" href={relatedUrl} rel="noreferrer" target="_blank">Regional context</a></> : null}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {visibleSources.length === 0 ? <tr><td className="px-4 py-8 text-center text-muted" colSpan={4}>No source rows match that search.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
