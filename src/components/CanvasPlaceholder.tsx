import { lazy, Suspense, useEffect, useState } from "react"
import { Crosshair, Layers3 } from "lucide-react"
import { ITEM_IDS, ITEMS, ITEM_SHORTCUTS } from "../data/items"
import { useCityStore } from "../store/useCityStore"
const CityScene = lazy(() => import("./CityScene"))

type HoveredCell = { row: number; col: number; item: string | null } | null

type Props = {
  hoveredCell: HoveredCell
  onHoverCell: (cell: HoveredCell) => void
}

export default function CanvasPlaceholder({ hoveredCell, onHoverCell }: Props) {
  const [paintDrag, setPaintDrag] = useState(false)
  const selectedItem = useCityStore((state) => state.selectedItem)
  const tool = useCityStore((state) => state.tool)
  const setSelectedItem = useCityStore((state) => state.setSelectedItem)
  const setTool = useCityStore((state) => state.setTool)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key.toLowerCase() === "e") setTool("erase")
      const itemId = ITEM_IDS.find((id) => ITEM_SHORTCUTS[id] === event.key)
      if (itemId) setSelectedItem(itemId)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setSelectedItem, setTool])

  return (
    <section className="panel relative min-w-0 flex-1 overflow-hidden" aria-label="Interactive 3D city scene">
      <Suspense fallback={<div aria-live="polite" className="absolute inset-0 grid place-items-center text-sm text-muted">Loading city scene…</div>}>
        <CityScene
          hover={hoveredCell ? { row: hoveredCell.row, col: hoveredCell.col } : null}
          onHover={onHoverCell}
          paintDrag={paintDrag}
        />
      </Suspense>

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
        <Crosshair size={14} className="text-accent" aria-hidden="true" />
        <span className="text-muted">Active tool</span>
        <strong className="text-white">{tool === "erase" ? "Eraser" : ITEMS[selectedItem].label}</strong>
        <button
          aria-pressed={paintDrag}
          className={`ml-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${paintDrag ? "border-accent bg-accent/15 text-accent" : "border-line text-muted hover:border-line-strong hover:text-primary"}`}
          onClick={() => setPaintDrag((enabled) => !enabled)}
          title={paintDrag ? "Turn off drag placement to orbit the camera" : "Hold and drag across empty tiles to place multiple assets"}
          type="button"
        >
          Paint drag {paintDrag ? "On" : "Off"}
        </button>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-xl border border-line bg-panel/90 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          <Layers3 size={13} aria-hidden="true" /> Scene legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {ITEM_IDS.map((id) => (
            <div className="flex items-center gap-1.5 text-[10px] text-secondary" key={id}>
              <span className="size-2 rounded-sm" style={{ backgroundColor: ITEMS[id].color }} />
              {ITEMS[id].label}
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 min-w-52 rounded-xl border border-line bg-panel/90 p-3 shadow-xl backdrop-blur">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Tile inspector</div>
        <div className="mt-1 text-xs text-white">
          {hoveredCell ? `Row ${hoveredCell.row + 1}, column ${hoveredCell.col + 1}` : "Hover over a tile"}
        </div>
        <div className="mt-0.5 text-[11px] text-dim">
          {hoveredCell?.item ? ITEMS[hoveredCell.item as keyof typeof ITEMS].label : "No asset placed"}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-lg border border-line bg-panel/85 px-3 py-2 text-[10px] text-muted">
      {paintDrag ? "Hold and drag to place · Scroll to zoom · Right click to erase" : "Drag to orbit · Scroll to zoom · Right click to erase"}
      </div>
    </section>
  )
}
