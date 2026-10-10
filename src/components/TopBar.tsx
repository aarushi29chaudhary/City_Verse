import { BookOpen, RotateCcw, Route } from "lucide-react"
import { useEffect } from "react"
import type { CarbonResult } from "../lib/carbon"
import { useCityStore } from "../store/useCityStore"
import ScoreBadge from "./ScoreBadge"

type Props = {
  compareMode: boolean
  metrics: CarbonResult | null
  onCompareChange: (enabled: boolean) => void
  onOpenSources: () => void
}

export default function TopBar({
  compareMode,
  metrics,
  onCompareChange,
  onOpenSources,
}: Props) {
  useEffect(() => { document.title = "Buildit" }, [])
  const resetCity = useCityStore((state) => state.resetCity)
  const loadStarter = useCityStore((state) => state.loadStarter)
  const year = useCityStore((state) => state.year)

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-line bg-panel/80 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald">
            CITY CARBON PLANNER
          </div>
          <div className="text-lg font-semibold tracking-tight text-white">
            Buildit
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-secondary"
          onClick={resetCity}
          title="Clear every tile and start again"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reset city
        </button>
        <button
          className="btn-secondary"
          onClick={loadStarter}
          title="Load the busy trial city"
        >
          <Route size={15} aria-hidden="true" />
          Load trial city
        </button>
        <button
          className="btn-secondary"
          onClick={onOpenSources}
          title="Open model sources and assumptions"
        >
          <BookOpen size={15} aria-hidden="true" />
          Sources
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-secondary transition hover:border-line-strong">
          Compare
          <input
            className="peer sr-only"
            type="checkbox"
            checked={compareMode}
            onChange={(event) => onCompareChange(event.target.checked)}
          />
          <span className="relative h-5 w-9 rounded-full bg-raised transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition peer-checked:translate-x-4" />
          </span>
        </label>
        <ScoreBadge metrics={metrics} year={year} />
      </div>
    </header>
  )
}
