# Carbon-Aware 3D City Builder

An interactive 40 × 40 low-poly city planner with an eighteen-asset palette, carbon and cost estimates, comparison layouts, a projection timeline, and budget- or target-based carbon optimization.

## Run and validate

The Figma Make development server is already running. Project scripts:

```bash
pnpm dev
pnpm test
pnpm build
```

## City model

`src/store/useCityStore.ts` owns the grid and user actions. Single-cell assets are stored as their item ID. Multi-tile assets use an origin-tagged value in each occupied cell, which keeps adjacent identical assets distinct. `src/lib/grid.ts` validates footprints, places and erases whole assets, and lists each asset once for rendering and calculations.

The 3D canvas lives in `src/components/CityScene.tsx`. It reads the shared store, maps grid rows to world-space depth and columns to world-space width, renders each asset at its footprint center, and sends ground clicks back through the store. `src/components/CanvasPlaceholder.tsx` retains the palette-independent scene overlays and inspector.

## Carbon model and sources

`src/data/carbon-inputs.json` preserves the carbon input table shared by the user. `src/data/items.ts` derives per-asset embodied carbon and energy from area and intensity where the table provides those values. `src/lib/carbon.ts` applies the grid factor, transport emissions, metro and park adjacency assumptions, and the shared projection horizon. Every asset contributes embodied carbon, energy, and cost once, regardless of its occupied cell count.

The searchable Sources panel shows raw inputs, calculated values, source links, and candidate/assumption status. Factory embodied carbon and building energy use published Indian factory and railway-workshop benchmarks. Water-body direct emissions use a measured urban-pond flux proxy; its area is assumed, construction carbon is excluded, and climate/water-quality differences make the result uncertain. School, hospital, hotel, and mall energy use published Indian benchmarks. Wastewater energy and fugitive emissions use surveyed Indian treatment-plant values scaled to an assumed 10 MLD plant; data-center electricity is calculated from India's published load/utilization/PUE method with an illustrative 1 MW IT load. New hotel, mall, landfill, forest, wind, and diesel-depot values use published rates scaled to the documented design assumptions. Construction carbon for these assets is unmodeled and is labeled that way. Budget optimization retains its budget limit; target optimization greedily adds low-carbon assets until the requested 30-year reduction is reached or the model cannot find another helpful legal placement. Neither optimizer removes existing assets, and both save the original city in compare View 1 and the result in View 2.

## Main files

- `src/components/` — 3D scene, palette, metrics, charts, comparison, and sources UI
- `src/data/carbon-inputs.json` — supplied source values, units, references, and statuses
- `src/data/items.ts` — asset catalog and calculated model values
- `src/lib/grid.ts` — placement, footprint, origin, and erase logic
- `src/lib/carbon.ts` — carbon, energy, cost, population, and horizon calculations
- `src/lib/optimizer.ts` — footprint-aware budget optimizer
- `src/store/useCityStore.ts` — city and scenario state
- `src/lib/grid.test.ts` — grid, accounting, and optimizer tests
