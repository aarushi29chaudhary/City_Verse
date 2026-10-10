import { Pause, Play, Sparkles, Target, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react"
import { useCityStore } from "../store/useCityStore"
import { MODEL_HORIZON } from "../lib/carbon"

export default function TimeSlider() {
  const year = useCityStore((state) => state.year)
  const setYear = useCityStore((state) => state.setYear)
  const optimizeInWorker = useCityStore((state) => state.optimizeInWorker)
  const optimizationStatus = useCityStore((state) => state.optimizationStatus)
  const [playing, setPlaying] = useState(false)
  const [budget, setBudget] = useState(900)
  const [targetReduction, setTargetReduction] = useState("25")
  const normalizeTargetReduction = (value: string) => {
    const parsed = value.trim() === "" ? 1 : Number(value)
    return Number.isFinite(parsed) ? Math.max(1, Math.min(99, Math.round(parsed))) : 1
  }

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = useCityStore.getState().year + 1
      if (next > MODEL_HORIZON) {
        setYear(0)
      } else {
        setYear(next)
      }
    }, 400)
    return () => window.clearInterval(timer)
  }, [playing, setYear])

  return (
    <footer aria-busy={optimizationStatus === "running"} className="flex h-[88px] shrink-0 items-center gap-4 border-t border-line bg-panel/85 px-5 backdrop-blur-xl">
      <button
        aria-label={
          playing ? "Pause carbon timeline" : "Play carbon timeline"
        }
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-lg shadow-accent/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setPlaying((current) => !current)}
        title={playing ? "Pause carbon timeline" : "Play carbon timeline"}
        type="button"
      >
        {playing ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between text-[10px] font-medium text-muted">
          <span>Construction</span>
          <strong className="rounded-md bg-accent/10 px-2 py-1 text-accent">
            Year {year}
          </strong>
          <span>{MODEL_HORIZON} year view</span>
        </div>
        <input
          aria-label="Projection year"
          className="timeline-slider"
          max={MODEL_HORIZON}
          min="0"
          onChange={(event) => setYear(Number(event.target.value))}
          type="range"
          value={year}
        />
      </div>
      <div className="h-10 w-px bg-line" />
      <div className="flex items-center gap-2">
        <label className="relative">
          <span className="absolute left-3 top-1.5 text-[9px] uppercase tracking-wider text-dim">
            Budget
          </span>
          <input
            aria-label="Optimization budget in crore rupees"
            className="h-11 w-36 rounded-xl border border-line bg-raised px-3 pt-3 text-sm font-semibold text-white tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            min="0"
            onChange={(event) => setBudget(Number(event.target.value))}
            type="number"
            value={budget}
          />
          <span className="absolute right-3 top-4 text-[10px] text-muted">
            ₹ Cr
          </span>
        </label>
        <button
          className="btn-primary h-11"
            disabled={optimizationStatus === "running"}
            onClick={() => void optimizeInWorker("budget", budget)}
          title="Optimize current city within budget"
          type="button"
        >
          <Sparkles size={15} aria-hidden="true" />
          Optimize
        </button>
        <label className="relative">
          <span className="absolute left-3 top-1.5 text-[9px] uppercase tracking-wider text-dim">
            Target reduction
          </span>
          <input
            aria-label="Target carbon emission reduction percentage"
            className="h-11 w-28 rounded-xl border border-line bg-raised px-3 pr-8 pt-3 text-sm font-semibold text-white tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            min="1"
            max="99"
            step="1"
            inputMode="numeric"
            onChange={(event) => setTargetReduction(event.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={() => setTargetReduction(String(normalizeTargetReduction(targetReduction)))}
            type="text"
            value={targetReduction}
          />
          <span className="absolute right-3 top-4 text-[10px] text-muted">%</span>
        </label>
        <button
          className="btn-secondary h-11 whitespace-nowrap"
          disabled={optimizationStatus === "running"}
          onClick={() => void optimizeInWorker("reduction", normalizeTargetReduction(targetReduction))}
          title="Add cleaner assets to reach this target, or show the closest result possible"
          type="button"
        >
          <Target size={15} aria-hidden="true" />
          {optimizationStatus === "running" ? "Working…" : "Optimize target"}
        </button>
        <button
          className="btn-secondary h-11 whitespace-nowrap"
          disabled={optimizationStatus === "running"}
          onClick={() => void optimizeInWorker("minimum", 99)}
          title="Find the lowest carbon result allowed by the model and available space"
          type="button"
        >
          <TrendingDown size={15} aria-hidden="true" />
          Find minimum
        </button>
      </div>
    </footer>
  )
}
