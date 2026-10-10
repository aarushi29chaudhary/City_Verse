import { Search, X } from "lucide-react"
import { useState } from "react"
import { CARBON_SOURCE_INPUTS, type CityItem } from "../data/items"

type Row = {
  id: string
  name: string
  value: number
  unit: string
  status: CityItem["sourceStatus"]
  basis: string
}

type Group = {
  url: string
  ref: string
  relatedRef?: string
  relatedUrl?: string
  rows: Row[]
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
  "industry.embodiedKgPerM2": "Industry embodied carbon intensity (A1–A5)",
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
  "datacenter.itLoadMw": "Data-center IT load",
  "datacenter.utilization": "Data-center average utilization",
  "datacenter.pue": "Data-center power usage effectiveness",
  "datacenter.cost": "Data-center capital cost",
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
  "wind.generationGWh": "India wind generation FY 2025–26",
  "wind.installedCapacityMw": "India wind installed capacity",
  "wind.cost": "Wind turbine cost",
  "busdepot.buses": "Diesel depot fleet size",
  "busdepot.kmPerDay": "Bus distance per day",
  "busdepot.passengers": "Average bus passenger load",
  "busdepot.kgPerPassengerKm": "Intracity bus emissions factor",
  "busdepot.cost": "Bus depot capital cost",
}

const groupMap = new Map<string, Group>()
const unsourced: Row[] = []

Object.entries(CARBON_SOURCE_INPUTS).forEach(([id, source]) => {
  const row: Row = {
    id,
    name: labels[id] ?? id,
    value: source.value,
    unit: source.unit,
    status: source.status,
    basis: source.ref || "Assumption: no source found yet.",
  }
  if (source.url) {
    const group = groupMap.get(source.url) ?? {
      url: source.url,
      ref: source.ref,
      relatedRef: source.relatedRef,
      relatedUrl: source.relatedUrl,
      rows: [],
    }
    group.rows.push(row)
    groupMap.set(source.url, group)
  } else {
    unsourced.push(row)
  }
})

const groups = Array.from(groupMap.values())
const sourcedCount = groups.reduce((total, group) => total + group.rows.length, 0)

const statusStyles: Record<CityItem["sourceStatus"], string> = {
  cited: "bg-emerald/15 text-emerald",
  candidate: "bg-amber/15 text-amber",
  assumption: "bg-accent/15 text-accent",
  placeholder: "bg-raised text-muted",
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function StatusBadge({ status }: { status: CityItem["sourceStatus"] }) {
  return (
    <strong
      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </strong>
  )
}

export default function SourcesModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  if (!open) return null

  const q = query.trim().toLowerCase()
  const visibleGroups = q
    ? groups.filter((group) =>
        `${group.ref} ${group.url} ${group.rows.map((row) => row.name).join(" ")}`
          .toLowerCase()
          .includes(q),
      )
    : groups
  const visibleUnsourced = q
    ? unsourced.filter((row) =>
        `${row.name} ${row.basis}`.toLowerCase().includes(q),
      )
    : unsourced

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        aria-labelledby="sources-title"
        aria-modal="true"
        className="w-full max-w-3xl rounded-2xl border border-line-strong bg-panel-solid p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Transparent assumptions</div>
            <div
              className="mt-1 text-xl font-semibold text-white"
              id="sources-title"
            >
              Where our numbers come from
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              This is a curated list of the sources we used to build the model, along with the assumptions we made where no source was available. We welcome feedback and suggestions for better sources.
            </p>
            <p className="mt-2 text-[11px] text-dim">
              {groups.length} source links · {sourcedCount} sourced inputs ·{" "}
              {unsourced.length} assumptions without a source
            </p>
          </div>
          <button
            aria-label="Close sources"
            className="icon-button"
            onClick={onClose}
            title="Close sources"
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2 text-xs text-muted">
            <Search size={14} aria-hidden="true" />
            <input
              aria-label="Search sources"
              className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-dim"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by asset or source"
              value={query}
            />
          </label>
        </div>

        <div className="mt-3 max-h-[58vh] overflow-auto rounded-xl border border-line">
          <div className="sticky top-0 z-10 bg-raised px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Source links ({visibleGroups.length})
          </div>
          {visibleGroups.map((group) => (
            <div
              className="border-t border-line px-4 py-3 text-xs text-secondary"
              key={group.url}
            >
              <a
                className="font-medium text-accent underline underline-offset-2"
                href={group.url}
                rel="noreferrer"
                target="_blank"
              >
                Open source ↗ {host(group.url)}
              </a>
              <p className="mt-1 leading-relaxed">{group.ref}</p>
              {group.relatedRef && group.relatedUrl ? (
                <p className="mt-1 leading-relaxed text-muted">
                  {group.relatedRef}{" "}
                  <a
                    className="text-accent underline underline-offset-2"
                    href={group.relatedUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Regional context ↗
                  </a>
                </p>
              ) : null}
              <ul className="mt-2 space-y-1">
                {group.rows.map((row) => (
                  <li
                    className="flex flex-wrap items-center gap-2"
                    key={row.id}
                  >
                    <StatusBadge status={row.status} />
                    <span className="text-primary">{row.name}</span>
                    <span className="font-mono tabular-nums text-white">
                      {row.value.toLocaleString("en-IN", {
                        maximumFractionDigits: 3,
                      })}
                    </span>
                    <span className="text-muted">{row.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {visibleGroups.length === 0 ? (
            <div className="border-t border-line px-4 py-6 text-center text-xs text-muted">
              No source links match that search.
            </div>
          ) : null}

          <div className="sticky top-0 z-10 border-t border-line bg-raised px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Assumptions with no source yet ({visibleUnsourced.length})
          </div>
          {visibleUnsourced.map((row) => (
            <div
              className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2 text-xs text-secondary"
              key={row.id}
            >
              <StatusBadge status={row.status} />
              <span className="font-medium text-primary">{row.name}</span>
              <span className="font-mono tabular-nums text-white">
                {row.value.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
              </span>
              <span className="text-muted">{row.unit}</span>
              <span className="text-muted">· {row.basis}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}