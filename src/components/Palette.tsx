import { Eraser, Keyboard, House, Building2, Route, TrainTrack, Trees, Sun, Factory, Waves, School, Hospital, Database, Droplets, Hotel, Store, Trash2, TreePine, Wind, BusFront, type LucideIcon } from "lucide-react"
import { ITEM_IDS, ITEMS, ITEM_SHORTCUTS, type ItemId } from "../data/items"
import { useCityStore } from "../store/useCityStore"

const ASSET_ICONS: Record<ItemId, LucideIcon> = {
  residential: House,
  office: Building2,
  road: Route,
  metro: TrainTrack,
  park: Trees,
  solar: Sun,
  industry: Factory,
  water: Waves,
  school: School,
  hospital: Hospital,
  wastewater: Droplets,
  datacenter: Database,
  hotel: Hotel,
  mall: Store,
  landfill: Trash2,
  urbanforest: TreePine,
  wind: Wind,
  busdepot: BusFront,
}

export default function Palette() {
  const selectedItem = useCityStore((state) => state.selectedItem)
  const tool = useCityStore((state) => state.tool)
  const setSelectedItem = useCityStore((state) => state.setSelectedItem)
  const setTool = useCityStore((state) => state.setTool)

  return (
    <aside className="panel flex min-h-0 w-[244px] shrink-0 flex-col overflow-y-auto p-3">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <div className="eyebrow">Build palette</div>
          <div className="mt-1 text-sm font-semibold text-white">
            Choose a city asset
          </div>
        </div>
        <span className="rounded-md bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
          {ITEM_IDS.length} assets
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ITEM_IDS.map((itemId) => {
          const item = ITEMS[itemId]
          const Icon = ASSET_ICONS[itemId]
          const selected = tool === "place" && selectedItem === itemId
          return (
            <button
              aria-pressed={selected}
              className={`group relative rounded-xl border p-2 text-left transition duration-200 ${
                selected
                  ? "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--accent)]"
                  : "border-line bg-raised/50 hover:-translate-y-0.5 hover:border-line-strong hover:bg-raised"
              }`}
              key={itemId}
              onClick={() => setSelectedItem(itemId)}
              title={`Select ${item.label}${ITEM_SHORTCUTS[itemId] ? ` (${ITEM_SHORTCUTS[itemId]})` : ""}`}
              type="button"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="flex size-6 items-center justify-center rounded-md"
                  style={{ color: item.color, backgroundColor: `${item.color}22` }}
                ><Icon size={15} aria-hidden="true" /></span>
                {ITEM_SHORTCUTS[itemId] ? <kbd className="text-[9px] text-dim">{ITEM_SHORTCUTS[itemId]}</kbd> : null}
              </div>
              <div className="min-h-8 text-[11px] font-semibold leading-tight text-primary">
                {item.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="tag">₹{item.cost}Cr</span>
                <span className="tag" title={item.embodied === 0 ? "Construction carbon is not modeled for this asset" : "Embodied carbon per asset, tCO₂e"}>{item.embodied === 0 ? "Embodied n/a" : `${item.embodied}t`}</span>
                <span className="tag" title="Grid footprint">{item.footprint}×{item.footprint}</span>
              </div>
            </button>
          )
        })}
      </div>

      <button
        aria-pressed={tool === "erase"}
        className={`mt-2 flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition ${
          tool === "erase"
            ? "border-danger bg-danger/10 text-danger-soft"
            : "border-line bg-raised/50 text-secondary hover:border-line-strong"
        }`}
        onClick={() => setTool("erase")}
        title="Erase placed assets (E)"
        type="button"
      >
        <span className="flex items-center gap-2">
          <Eraser size={15} aria-hidden="true" />
          Eraser
        </span>
        <kbd className="text-[10px] text-dim">E</kbd>
      </button>

      <div className="mt-auto rounded-xl border border-line bg-canvas/50 p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          <Keyboard size={13} aria-hidden="true" />
          Shortcuts
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          Press 1 to 9 to select the first nine assets. Use the palette for the rest. Press E to erase.
        </p>
      </div>
    </aside>
  )
}
