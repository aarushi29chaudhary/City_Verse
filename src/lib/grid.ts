import { ITEMS, type ItemId } from "../data/items.ts"
import type { City, CityCell } from "./carbon.ts"

export type Cell = { row: number; col: number }
export const GRID_SIZE = 40

export function getCellItemId(cell: CityCell): ItemId | null {
  if (!cell) return null
  return cell.includes("@") ? cell.slice(0, cell.indexOf("@")) as ItemId : cell as ItemId
}

function getCellAnchor(cell: CityCell, row: number, col: number): Cell {
  if (!cell || !cell.includes("@")) return { row, col }
  const [, anchor] = cell.split("@")
  const [anchorRow, anchorCol] = anchor.split(",").map(Number)
  return { row: anchorRow, col: anchorCol }
}

export function footprintCells(itemId: ItemId, row: number, col: number): Cell[] {
  const size = ITEMS[itemId].footprint
  return Array.from({ length: size * size }, (_, index) => ({
    row: row + Math.floor(index / size),
    col: col + (index % size),
  }))
}

export function canPlace(city: City, itemId: ItemId, row: number, col: number) {
  return footprintCells(itemId, row, col).every(
    ({ row: r, col: c }) => r >= 0 && c >= 0 && r < city.length && c < city[r].length && city[r][c] === null,
  )
}

export function placeAsset(city: City, itemId: ItemId, row: number, col: number) {
  if (!canPlace(city, itemId, row, col)) return false
  const value: CityCell = ITEMS[itemId].footprint > 1 ? `${itemId}@${row},${col}` : itemId
  footprintCells(itemId, row, col).forEach(({ row: r, col: c }) => { city[r][c] = value })
  return true
}

export function findAssetAnchor(city: City, row: number, col: number): Cell | null {
  const cell = city[row]?.[col]
  const itemId = getCellItemId(cell)
  if (!itemId) return null
  if (cell?.includes("@")) return getCellAnchor(cell, row, col)
  const size = ITEMS[itemId].footprint
  for (let r = Math.max(0, row - size + 1); r <= row; r += 1) {
    for (let c = Math.max(0, col - size + 1); c <= col; c += 1) {
      if (footprintCells(itemId, r, c).every((cell) => city[cell.row]?.[cell.col] === itemId)) return { row: r, col: c }
    }
  }
  return { row, col }
}

export function eraseAsset(city: City, row: number, col: number) {
  const cell = city[row]?.[col]
  if (!cell) return false
  const anchor = findAssetAnchor(city, row, col)
  if (!anchor) return false
  const itemId = getCellItemId(cell)!
  const value: CityCell = ITEMS[itemId].footprint > 1 ? `${itemId}@${anchor.row},${anchor.col}` : itemId
  footprintCells(itemId, anchor.row, anchor.col).forEach(({ row: r, col: c }) => {
    if (city[r]?.[c] === value) city[r][c] = null
  })
  return true
}

export function listAssets(city: City): Array<{ itemId: ItemId; row: number; col: number }> {
  const visited = new Set<string>()
  const assets: Array<{ itemId: ItemId; row: number; col: number }> = []
  city.forEach((line, row) => line.forEach((cell, col) => {
    const itemId = getCellItemId(cell)
    if (!itemId || visited.has(`${row},${col}`)) return
    const anchor = getCellAnchor(cell, row, col)
    if (anchor.row !== row || anchor.col !== col) return
    assets.push({ itemId, row, col })
    footprintCells(itemId, row, col).forEach((footprintCell) => visited.add(`${footprintCell.row},${footprintCell.col}`))
  }))
  return assets
}
