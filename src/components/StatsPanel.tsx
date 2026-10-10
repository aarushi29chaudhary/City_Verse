import { ArrowDownRight, ArrowUpRight, CircleMinus, Info } from "lucide-react"
import { useEffect, useRef } from "react"
import type { CarbonResult } from "../lib/carbon"
import { getPopulation, MODEL_HORIZON } from "../lib/carbon"
import { useCityStore } from "../store/useCityStore"
import AnimatedNumber from "./AnimatedNumber"
import CarbonChart from "./CarbonChart"

type MetricCardProps = {
  label: string
  value: number
  previous: number
  unit: string
  prefix?: string
  decimals?: number
  goodWhenDown?: boolean
}

function MetricCard({
  label,
  value,
  previous,
  unit,
  prefix,
  decimals,
  goodWhenDown = true,
}: MetricCardProps) {
  const difference = value - previous
  const improved = goodWhenDown ? difference < 0 : difference > 0
  const DeltaIcon =
    difference === 0
      ? CircleMinus
      : difference > 0
        ? ArrowUpRight
        : ArrowDownRight
  return (
    <div className="rounded-xl border border-line bg-raised/45 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted">{label}</span>
        <span
          className={`flex items-center gap-0.5 text-[9px] font-semibold ${
            difference === 0
              ? "text-dim"
              : improved
                ? "text-emerald"
                : "text-danger-soft"
          }`}
        >
          <DeltaIcon size={11} aria-hidden="true" />
          {Math.abs(difference).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}
        </span>
      </div>
      <div className="mt-1 whitespace-nowrap text-lg font-bold tracking-tight text-white tabular-nums">
        <AnimatedNumber decimals={decimals} prefix={prefix} value={value} />
        <span className="ml-1 text-[10px] font-medium text-muted">{unit}</span>
      </div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider text-dim">
        estimate
      </div>
    </div>
  )
}

export default function StatsPanel({ metrics }: { metrics: CarbonResult }) {
  const city = useCityStore((state) => state.city)
  const previous = useRef(metrics)
  const comparison = previous.current
  useEffect(() => {
    previous.current = metrics
  }, [metrics])

  const population = getPopulation(city)
  const perCapita = metrics.total / Math.max(population, 100)
  const meter = Math.max(4, Math.min(96, 100 - perCapita * 4))

  const cards: MetricCardProps[] = [
    {
      label: "Total carbon",
      value: metrics.total,
      previous: comparison.total,
      unit: "tCO₂",
    },
    {
      label: "Embodied",
      value: metrics.embodied,
      previous: comparison.embodied,
      unit: "tCO₂",
    },
    {
      label: "Operations + transit",
      value: metrics.operational + metrics.transport,
      previous: comparison.operational + comparison.transport,
      unit: "tCO₂",
    },
    {
      label: "Offset",
      value: metrics.offset,
      previous: comparison.offset,
      unit: "tCO₂",
      goodWhenDown: false,
    },
    {
      label: "Capital cost",
      value: metrics.cost,
      previous: comparison.cost,
      unit: "Cr",
      prefix: "₹",
      decimals: 1,
    },
    {
      label: "Net energy",
      value: metrics.energy,
      previous: comparison.energy,
      unit: "MWh",
    },
  ]

  return (
    <aside className="panel flex w-[380px] shrink-0 flex-col overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="eyebrow">Live impact model</div>
          <div className="mt-1 text-base font-semibold text-white">
            {MODEL_HORIZON} year city outlook
          </div>
        </div>
        <button
          className="icon-button"
          title="All values are modeled estimates"
          type="button"
        >
          <Info size={15} aria-hidden="true" />
          <span className="sr-only">About model estimates</span>
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-secondary">
            Carbon intensity
          </span>
          <span className="text-[10px] text-muted">
            {perCapita.toFixed(1)} tCO₂ / capita
          </span>
        </div>
        <div className="carbon-meter">
          <span style={{ left: `${meter}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-dim">
          <span>High impact</span>
          <span>Net zero</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {cards.map((card) => (
          <MetricCard {...card} key={card.label} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">
            Carbon trajectory
          </div>
          <div className="text-[10px] text-muted">
            Total tCO₂ · years 0 to {MODEL_HORIZON}
          </div>
        </div>
        <div className="flex gap-2 text-[9px] text-muted">
          <span className="text-amber">● Embodied</span>
          <span className="text-danger-soft">● Ops</span>
          <span className="text-emerald">● Offset</span>
        </div>
      </div>
      <CarbonChart city={city} />
    </aside>
  )
}
