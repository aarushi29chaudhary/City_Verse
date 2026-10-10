import { Leaf } from "lucide-react"
import type { CarbonResult } from "../lib/carbon"
import { computeCarbon, getPopulation, MODEL_HORIZON } from "../lib/carbon"
import { useMemo } from "react"
import { useCityStore } from "../store/useCityStore"

function getGrade(annualPerResident: number) {
  if (annualPerResident < 0) return "A+"
  if (annualPerResident <= 2) return "A"
  if (annualPerResident <= 4) return "B+"
  if (annualPerResident <= 6) return "B"
  if (annualPerResident <= 10) return "C"
  if (annualPerResident <= 15) return "D"
  return "E"
}

export default function ScoreBadge({
  metrics,
  year,
}: {
  metrics: CarbonResult | null
  year: number
}) {
  const city = useCityStore((state) => state.city)
  const population = getPopulation(city)
  const gradeMetrics = useMemo(() => computeCarbon(city, MODEL_HORIZON), [city])
  const annualPerResident = metrics && population > 0
    ? gradeMetrics.total / population / MODEL_HORIZON
    : null
  const grade = annualPerResident === null ? "N/A" : getGrade(annualPerResident)
  return (
    <div aria-label={annualPerResident === null ? "Add homes to see a per resident carbon grade" : `Grade ${grade}: ${annualPerResident.toFixed(1)} tonnes of carbon per resident per year`} className="flex items-center gap-3 rounded-xl border border-emerald/25 bg-emerald/10 px-3 py-2" title={`Displayed total covers ${year} years. Grade uses the average carbon per resident over 30 years.`}>
      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald text-sm font-extrabold text-emerald-ink">
        {grade}
      </div>
      <div className="leading-tight">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Leaf size={14} aria-hidden="true" />
          {metrics
            ? `${Math.round(metrics.total).toLocaleString()} tCO₂`
            : "Estimate unavailable"}
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          {annualPerResident === null ? "Add residents for a grade" : `${annualPerResident.toFixed(1)} tCO₂ / resident / year · 30y avg`}
        </div>
      </div>
    </div>
  )
}
