import { useMemo, useState } from "react"
import { AlertTriangle, Lightbulb, TrendingDown } from "lucide-react"
import { computeCarbon, MODEL_HORIZON } from "../lib/carbon"
import { ITEMS } from "../data/items"
import { listAssets } from "../lib/grid"
import { useCityStore } from "../store/useCityStore"
import CanvasPlaceholder from "./CanvasPlaceholder"
import CompareView from "./CompareView"
import Palette from "./Palette"
import SourcesModal from "./SourcesModal"
import StatsPanel from "./StatsPanel"
import TimeSlider from "./TimeSlider"
import TopBar from "./TopBar"

export default function Layout() {
  const [compareMode, setCompareMode] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{
    row: number
    col: number
    item: string | null
  } | null>(null)
  const city = useCityStore((state) => state.city)
  const year = useCityStore((state) => state.year)
  const savedLayoutA = useCityStore((state) => state.savedLayoutA)
  const savedLayoutB = useCityStore((state) => state.savedLayoutB)
  const reductionResult = useCityStore((state) => state.reductionResult)

  const optimizationNotice = useMemo(() => {
    if (!reductionResult || (reductionResult.mode === "target" && reductionResult.targetMet) || !savedLayoutB) return null
    const baseline = savedLayoutA ?? city
    const beforeCounts = new Map<string, number>()
    const afterCounts = new Map<string, number>()
    const beforeAssets = listAssets(baseline)
    const afterAssets = listAssets(savedLayoutB)
    for (const { itemId } of beforeAssets) beforeCounts.set(itemId, (beforeCounts.get(itemId) ?? 0) + 1)
    for (const { itemId } of afterAssets) afterCounts.set(itemId, (afterCounts.get(itemId) ?? 0) + 1)
    const beforeAnchors = new Set(beforeAssets.map(({ itemId, row, col }) => `${itemId}:${row},${col}`))
    const unchangedCount = afterAssets.filter(({ itemId, row, col }) => beforeAnchors.has(`${itemId}:${row},${col}`)).length
    const retainedCount = Math.min(beforeAssets.length, afterAssets.length)
    const relocatedCount = Math.max(0, retainedCount - unchangedCount)
    const additions = [...afterCounts].flatMap(([itemId, count]) => {
      const added = count - (beforeCounts.get(itemId) ?? 0)
      return added > 0 ? [`${ITEMS[itemId as keyof typeof ITEMS].label} +${added}`] : []
    })
    const minimumTotal = computeCarbon(savedLayoutB, MODEL_HORIZON).total
    return { additions, minimumTotal, relocatedCount }
  }, [city, reductionResult, savedLayoutA, savedLayoutB])

  const result = useMemo(() => {
    try {
      return { metrics: computeCarbon(city, year), error: null }
    } catch (error) {
      return {
        metrics: null,
        error:
          error instanceof Error
            ? error.message
            : "The carbon estimate could not be calculated.",
      }
    }
  }, [city, year])

  return (
    <main className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-canvas text-primary">
      <TopBar
        compareMode={compareMode}
        metrics={result.metrics}
        onCompareChange={setCompareMode}
        onOpenSources={() => setSourcesOpen(true)}
      />

      {optimizationNotice && reductionResult ? (
        <section aria-live="polite" className="mx-3 mt-2 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-primary" role={reductionResult.mode === "target" ? "alert" : "status"}>
          <div className="flex items-start gap-3">
            {reductionResult.mode === "minimum" ? <TrendingDown className="mt-0.5 shrink-0 text-accent" size={18} /> : <AlertTriangle className="mt-0.5 shrink-0 text-amber" size={18} />}
            <div className="min-w-0 flex-1">
              <strong className="text-white">
                {reductionResult.mode === "minimum" ? "Lowest carbon result found with the current model" : `Target not reached: requested ${reductionResult.targetPercent}%, best result ${reductionResult.achievedPercent.toFixed(1)}%`}
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {reductionResult.mode === "minimum"
                  ? `The city is now at ${Math.round(optimizationNotice.minimumTotal).toLocaleString()} tCO₂e over ${MODEL_HORIZON} years, a ${reductionResult.achievedPercent.toFixed(1)}% reduction from the starting layout. Existing buildings are retained.`
                  : `The best layout reduces emissions by ${reductionResult.achievedPercent.toFixed(1)}%, leaving ${Math.max(0, reductionResult.targetPercent - reductionResult.achievedPercent).toFixed(1)} percentage points to go. The optimizer retained every existing building; remaining emissions include sources the current asset mix cannot directly change.`}
              </p>
              <p className="mt-1 text-xs text-secondary"><span className="font-semibold text-white">Route used:</span> {optimizationNotice.additions.length ? `${optimizationNotice.additions.join(" · ")} · ` : "No new assets · "}{optimizationNotice.relocatedCount} existing assets repositioned.</p>
              {reductionResult.mode === "target" ? <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-secondary"><Lightbulb className="mt-0.5 shrink-0 text-accent" size={14} /><span>To target further, model efficiency or direct-emissions upgrades for high-emitting facilities, expand clean-energy options or their limits, or revise the city assumptions in Sources. The current model caps added wind at one turbine per run.</span></p> : <p className="mt-2 text-[10px] text-muted">“Minimum” means the lowest result found within the current grid, asset limits, and carbon assumptions.</p>}
            </div>
          </div>
        </section>
      ) : null}

      {result.error ? (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-soft">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Carbon model temporarily unavailable.</strong> Your city is
            safe. {result.error}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <Palette />
        {compareMode ? (
          <CompareView />
        ) : (
          <>
            <CanvasPlaceholder
              hoveredCell={hoveredCell}
              onHoverCell={setHoveredCell}
            />
            {result.metrics ? <StatsPanel metrics={result.metrics} /> : null}
          </>
        )}
      </div>

      <TimeSlider />
      <SourcesModal open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </main>
  )
}
