import {
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
} from "lucide-react"
import { lazy, Suspense } from "react"
import { computeCarbon, MODEL_HORIZON, type City } from "../lib/carbon"
import { listAssets } from "../lib/grid"
import { useCityStore } from "../store/useCityStore"
const CityScene = lazy(() => import("./CityScene"))

function LayoutCard({
  city,
  label,
  emptyMessage,
}: {
  city: City | null
  label: string
  emptyMessage: string
}) {
  const result = city ? computeCarbon(city, MODEL_HORIZON) : null
  const empty = !city
  return (
    <div className="w-full min-w-0 rounded-2xl border border-line bg-raised/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Scenario</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {label}
          </div>
        </div>
        {empty ? <span className="tag">No result yet</span> : <CheckCircle2 className="text-emerald" size={20} />}
      </div>
      {empty ? (
        <div className="mt-5 flex min-h-64 flex-1 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-canvas/35 p-6 text-center">
          <p className="max-w-xs text-sm leading-relaxed text-muted">{emptyMessage}</p>
        </div>
      ) : <>
      <div aria-label={`${label} 3D city preview`} className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-[#191a17]" role="img">
        <Suspense fallback={<div aria-live="polite" className="grid h-full place-items-center text-sm text-muted">Preparing city preview…</div>}>
          <CityScene city={city} readonly />
        </Suspense>
      </div>
      <div className="mt-2 text-[10px] text-muted">3D preview of asset placement and density</div>
      <div className="mt-5 rounded-2xl border border-line bg-canvas/55 p-5">
        <div className="text-xs text-muted">Total carbon · {MODEL_HORIZON} years</div>
        <div className="mt-1 text-4xl font-bold tracking-tight text-white tabular-nums">
          {Math.round(result!.total).toLocaleString()}
          <span className="ml-2 text-sm font-medium text-muted">tCO₂</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-dim">
          estimate
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          ["Embodied", result!.embodied, "tCO₂"],
          ["Operations + transport", result!.operational + result!.transport, "tCO₂"],
          ["Offset", result!.offset, "tCO₂"],
          ["Capital cost", result!.cost, "₹ Cr"],
        ].map(([name, value, unit]) => (
          <div
            className="rounded-xl border border-line bg-panel/50 p-3"
            key={String(name)}
          >
            <div className="text-[10px] text-muted">{name}</div>
            <div className="mt-1 text-lg font-semibold text-primary tabular-nums">
              {Math.round(Number(value)).toLocaleString()}{" "}
              <span className="text-[10px] text-muted">{unit}</span>
            </div>
          </div>
        ))}
      </div>
      </>}
    </div>
  )
}

export default function CompareView() {
  const city = useCityStore((state) => state.city)
  const savedLayoutA = useCityStore((state) => state.savedLayoutA)
  const savedLayoutB = useCityStore((state) => state.savedLayoutB)
  const reductionResult = useCityStore((state) => state.reductionResult)
  const optimizationStatus = useCityStore((state) => state.optimizationStatus)
  const view1 = savedLayoutA ?? city
  const resultA = computeCarbon(view1, MODEL_HORIZON)
  const resultB = savedLayoutB ? computeCarbon(savedLayoutB, MODEL_HORIZON) : null
  const changePercent = resultB && resultA.total !== 0
    ? ((resultB.total - resultA.total) / Math.abs(resultA.total)) * 100
    : 0
  const relocatedCount = savedLayoutB ? (() => {
    const countByType = (layout: City) => {
      const counts = new Map<string, number>()
      for (const { itemId } of listAssets(layout)) counts.set(itemId, (counts.get(itemId) ?? 0) + 1)
      return counts
    }
    const original = countByType(view1)
    const optimized = countByType(savedLayoutB)
    const exact = new Set(listAssets(view1).map(({ itemId, row, col }) => `${itemId}:${row},${col}`))
    const samePositions = listAssets(savedLayoutB).filter(({ itemId, row, col }) => exact.has(`${itemId}:${row},${col}`)).length
    const originalCount = [...original.values()].reduce((sum, count) => sum + count, 0)
    const retainedCount = Math.min(originalCount, [...optimized.values()].reduce((sum, count) => sum + count, 0))
    return Math.max(0, retainedCount - samePositions)
  })() : 0

  return (
    <section className="panel flex min-w-0 flex-1 flex-col overflow-auto p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <GitCompareArrows className="text-accent" size={20} />
            Compare city versions
          </div>
          <p className="mt-1 text-xs text-muted">
            View 1 updates as you edit. View 2 shows the optimized city. Existing buildings may move, but none are removed.
          </p>
        </div>
      </div>

      <div className="my-5 grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-4">
        <LayoutCard city={view1} label="View 1 · Your city" emptyMessage="Your city and edits appear here." />
        <div className="flex shrink-0 items-center text-dim">
          <ArrowRight size={22} />
        </div>
        <LayoutCard city={savedLayoutB} label="View 2 · Optimized" emptyMessage="Run Optimize to see the updated city here." />
      </div>

      <div
        className={`mt-auto rounded-2xl border p-5 text-center ${
          !resultB ? "border-line bg-raised/30" : changePercent <= 0
            ? "border-emerald/30 bg-emerald/10"
            : "border-danger/30 bg-danger/10"
        }`}
      >
        <div
          className={`text-4xl font-extrabold tracking-tight ${
          !resultB ? "text-muted" : changePercent <= 0 ? "text-emerald" : "text-danger-soft"
          }`}
        >
          {optimizationStatus === "running" ? "Optimizing city…" : !resultB ? "No result yet" : changePercent <= 0 ? `${Math.round(-changePercent)}% lower carbon` : `${Math.round(changePercent)}% higher emissions`}
        </div>
        <div className="mt-2 text-xs text-secondary">
          {!resultB ? "Your original and optimized cities will appear side by side." : `${relocatedCount} existing assets moved. No buildings removed. ${reductionResult ? reductionResult.mode === "minimum" ? `Lowest result found: ${reductionResult.achievedPercent.toFixed(1)}% reduction. ` : `Target: ${reductionResult.targetPercent}%. Achieved: ${reductionResult.achievedPercent.toFixed(1)}%. ${reductionResult.targetMet ? "Target reached." : "Target not reached. Space, asset limits, or model values prevent further reductions."} ` : ""}Estimate over ${MODEL_HORIZON} years.`}
        </div>
      </div>
    </section>
  )
}
