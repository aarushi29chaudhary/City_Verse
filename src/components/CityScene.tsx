import { memo, useMemo, useRef } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { GRID_SIZE, listAssets } from "../lib/grid"
import type { City } from "../lib/carbon"
import { ITEMS, type ItemId } from "../data/items"
import { useCityStore } from "../store/useCityStore"

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.3, 6]} />
        <meshStandardMaterial color="#70553e" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <coneGeometry args={[0.25, 0.55, 7]} />
        <meshStandardMaterial color="#657f56" roughness={0.96} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <coneGeometry args={[0.17, 0.42, 7]} />
        <meshStandardMaterial color="#819365" roughness={0.96} />
      </mesh>
    </group>
  )
}

function HouseModel() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.52, 0.64]} />
        <meshStandardMaterial color="#c59b73" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.54, 0.48, 4]} />
        <meshStandardMaterial color="#855b4f" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.18, 0.326]}>
        <boxGeometry args={[0.14, 0.31, 0.025]} />
        <meshStandardMaterial color="#594739" roughness={0.9} />
      </mesh>
      {[-0.21, 0.21].map((x) => (
        <mesh key={x} position={[x, 0.37, 0.33]}>
          <boxGeometry args={[0.12, 0.13, 0.025]} />
          <meshStandardMaterial color="#a9bfbe" metalness={0.08} roughness={0.48} />
        </mesh>
      ))}
    </group>
  )
}

function OfficeModel() {
  return (
    <group>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 1.28, 0.66]} />
        <meshStandardMaterial color="#596b70" roughness={0.52} metalness={0.1} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.66, 0.337]}>
          <boxGeometry args={[0.04, 1.2, 0.025]} />
          <meshStandardMaterial color="#afc1bd" metalness={0.08} roughness={0.42} />
        </mesh>
      ))}
      {[-0.25, 0.04, 0.33, 0.62, 0.91].map((y) => (
        <mesh key={y} position={[0, y, 0.34]}>
          <boxGeometry args={[0.62, 0.025, 0.025]} />
          <meshStandardMaterial color="#9eaaa4" metalness={0.06} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[0.72, 0.06, 0.72]} />
        <meshStandardMaterial color="#424c4c" roughness={0.65} />
      </mesh>
    </group>
  )
}

function RoadModel() {
  return (
    <group>
      <mesh position-y={0.025} receiveShadow>
        <boxGeometry args={[0.98, 0.05, 0.98]} />
        <meshStandardMaterial color="#42443f" roughness={0.98} />
      </mesh>
      {[-0.28, 0, 0.28].map((z) => (
        <mesh key={z} position={[0, 0.054, z]}>
          <boxGeometry args={[0.2, 0.008, 0.025]} />
          <meshStandardMaterial color="#d1c29d" roughness={0.94} />
        </mesh>
      ))}
    </group>
  )
}

function MetroModel() {
  return (
    <group>
      <mesh position-y={0.045} receiveShadow><boxGeometry args={[0.98, 0.09, 0.98]} /><meshStandardMaterial color="#555750" roughness={0.96} /></mesh>
      {[-0.23, 0.23].map((x) => <mesh key={x} position={[x, 0.11, 0]} castShadow><boxGeometry args={[0.055, 0.045, 0.86]} /><meshStandardMaterial color="#c2c1b7" metalness={0.65} roughness={0.36} /></mesh>)}
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 0.095, -0.38 + i * 0.108]} castShadow><boxGeometry args={[0.62, 0.035, 0.065]} /><meshStandardMaterial color="#806c56" roughness={0.92} /></mesh>)}
      {[-0.23, 0.23].map((x) => <mesh key={`bolt-${x}`} position={[x, 0.137, 0]}><boxGeometry args={[0.018, 0.012, 0.86]} /><meshStandardMaterial color="#e0d8c8" metalness={0.7} roughness={0.3} /></mesh>)}
    </group>
  )
}

function ParkModel() {
  return (
    <group>
      <mesh position-y={0.035} receiveShadow>
        <boxGeometry args={[0.98, 0.07, 0.98]} />
        <meshStandardMaterial color="#6c865d" roughness={1} />
      </mesh>
      <Tree position={[-0.25, 0.07, -0.18]} scale={0.72} />
      <Tree position={[0.22, 0.07, 0.14]} scale={0.83} />
      <Tree position={[-0.1, 0.07, 0.3]} scale={0.58} />
    </group>
  )
}

function SolarModel() {
  return (
    <group>
      <mesh position-y={0.035} receiveShadow>
        <boxGeometry args={[0.98, 0.07, 0.98]} />
        <meshStandardMaterial color="#777754" roughness={0.96} />
      </mesh>
      {[-0.22, 0.22].flatMap((x) => [-0.2, 0.2].map((z) => (
        <group key={`${x}-${z}`} position={[x, 0.17, z]} rotation-x={-0.38}>
          <mesh position-y={0.05} castShadow>
            <boxGeometry args={[0.38, 0.025, 0.31]} />
            <meshStandardMaterial color="#28617c" metalness={0.18} roughness={0.4} />
          </mesh>
          <mesh position-y={0.034}>
            <boxGeometry args={[0.41, 0.018, 0.34]} />
            <meshStandardMaterial color="#d1aa5d" roughness={0.62} />
          </mesh>
          <mesh position={[0, -0.07, -0.09]}>
            <boxGeometry args={[0.035, 0.18, 0.035]} />
            <meshStandardMaterial color="#92948c" roughness={0.8} />
          </mesh>
        </group>
      ))) }
    </group>
  )
}

function IndustryModel() {
  return (
    <group>
      <mesh position-y={0.055} receiveShadow>
        <boxGeometry args={[1.94, 0.11, 1.94]} />
        <meshStandardMaterial color="#68675d" roughness={0.98} />
      </mesh>
      <mesh position={[0, 0.43, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.66, 1.14]} />
        <meshStandardMaterial color="#a96f50" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.8, -0.12]} castShadow>
        <boxGeometry args={[1.24, 0.12, 1.2]} />
        <meshStandardMaterial color="#53554e" roughness={0.78} />
      </mesh>
      <mesh position={[-0.36, 0.96, -0.38]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.8, 8]} />
        <meshStandardMaterial color="#62645e" roughness={0.88} />
      </mesh>
      <mesh position={[0.38, 1.05, -0.34]} castShadow>
        <cylinderGeometry args={[0.085, 0.11, 1, 8]} />
        <meshStandardMaterial color="#795541" roughness={0.88} />
      </mesh>
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.46]}>
          <boxGeometry args={[0.18, 0.25, 0.025]} />
          <meshStandardMaterial color="#d0c8b8" roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0.75, 0.13, 0.57]}>
        <boxGeometry args={[0.18, 0.26, 0.48]} />
        <meshStandardMaterial color="#3f4945" roughness={0.88} />
      </mesh>
    </group>
  )
}

function WaterModel() {
  return (
    <group>
      <mesh position-y={0.06} receiveShadow>
        <boxGeometry args={[1.94, 0.12, 1.94]} />
        <meshStandardMaterial color="#82765c" roughness={1} />
      </mesh>
      <mesh position-y={0.132} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[0.87, 12]} />
        <meshStandardMaterial color="#587f83" roughness={0.4} metalness={0.02} />
      </mesh>
      <mesh position-y={0.138} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.72, 12]} />
        <meshStandardMaterial color="#78999a" roughness={0.35} metalness={0.02} />
      </mesh>
    </group>
  )
}

function SchoolModel() {
  return (
    <group>
      <mesh position-y={0.08} receiveShadow>
        <boxGeometry args={[1.94, 0.16, 1.94]} />
        <meshStandardMaterial color="#827e6d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.12, 0.72, 0.88]} />
        <meshStandardMaterial color="#c2a875" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.18, 0.08, 0.94]} />
        <meshStandardMaterial color="#65594a" roughness={0.82} />
      </mesh>
      {[-0.36, 0, 0.36].map((x) => <mesh key={x} position={[x, 0.48, 0.45]}>
        <boxGeometry args={[0.17, 0.24, 0.025]} />
        <meshStandardMaterial color="#9db6b5" roughness={0.5} />
      </mesh>)}
      <mesh position={[0, 0.32, 0.454]}>
        <boxGeometry args={[0.18, 0.34, 0.03]} />
        <meshStandardMaterial color="#735d49" roughness={0.9} />
      </mesh>
      <mesh position={[0.68, 0.18, -0.5]} castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#6e7770" />
      </mesh>
      <mesh position={[0.68, 0.48, -0.5]} castShadow>
        <boxGeometry args={[0.28, 0.2, 0.035]} />
        <meshStandardMaterial color="#b87560" />
      </mesh>
    </group>
  )
}

function HospitalModel() {
  return (
    <group>
      <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#777a72" /></mesh>
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow><boxGeometry args={[0.94, 1, 0.92]} /><meshStandardMaterial color="#d0c8b8" roughness={0.75} /></mesh>
      <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[1, 0.06, 0.98]} /><meshStandardMaterial color="#737b78" /></mesh>
      {[-0.28, 0.28].flatMap((x) => [0.38, 0.7].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 0.47]}><boxGeometry args={[0.16, 0.14, 0.025]} /><meshStandardMaterial color="#93aeaf" /></mesh>))}
      <mesh position={[0, 0.76, 0.49]}><boxGeometry args={[0.09, 0.36, 0.025]} /><meshStandardMaterial color="#a65f59" /></mesh>
      <mesh position={[0, 0.76, 0.49]}><boxGeometry args={[0.3, 0.09, 0.025]} /><meshStandardMaterial color="#a65f59" /></mesh>
      <mesh position={[0, 0.24, 0.48]}><boxGeometry args={[0.18, 0.32, 0.03]} /><meshStandardMaterial color="#716758" /></mesh>
    </group>
  )
}

function WastewaterModel() {
  return (
    <group>
      <mesh position-y={0.07} receiveShadow><boxGeometry args={[1.94, 0.14, 1.94]} /><meshStandardMaterial color="#77766c" /></mesh>
      {[-0.48, 0.48].map((x) => <group key={x} position={[x, 0.14, 0]}>
        <mesh position-y={0.16} receiveShadow><cylinderGeometry args={[0.36, 0.36, 0.28, 12]} /><meshStandardMaterial color="#777f78" roughness={0.84} /></mesh>
        <mesh position-y={0.31}><cylinderGeometry args={[0.31, 0.31, 0.025, 12]} /><meshStandardMaterial color="#618a88" roughness={0.42} /></mesh>
        <mesh position-y={0.34}><cylinderGeometry args={[0.035, 0.035, 0.04, 8]} /><meshStandardMaterial color="#c1b89f" /></mesh>
      </group>)}
      <mesh position={[0, 0.27, 0.68]} castShadow><boxGeometry args={[0.4, 0.38, 0.4]} /><meshStandardMaterial color="#93866e" /></mesh>
      <mesh position={[0, 0.48, 0.68]} castShadow><cylinderGeometry args={[0.1, 0.13, 0.46, 8]} /><meshStandardMaterial color="#74766f" /></mesh>
    </group>
  )
}

function DataCenterModel() {
  return (
    <group>
      <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#767873" /></mesh>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow><boxGeometry args={[1.06, 0.72, 0.92]} /><meshStandardMaterial color="#68747a" roughness={0.65} /></mesh>
      <mesh position={[0, 0.86, 0]} castShadow><boxGeometry args={[1.12, 0.08, 0.98]} /><meshStandardMaterial color="#454e50" /></mesh>
      {[-0.34, 0, 0.34].map((x) => <group key={x} position={[x, 0.42, 0.47]}>
        <mesh castShadow><boxGeometry args={[0.2, 0.52, 0.035]} /><meshStandardMaterial color="#414c4e" /></mesh>
        {[-0.16, 0, 0.16].map((y) => <mesh key={y} position={[0, y, 0.022]}><boxGeometry args={[0.13, 0.025, 0.012]} /><meshStandardMaterial color="#9da49b" /></mesh>)}
      </group>)}
      <mesh position={[0.7, 0.2, -0.48]} castShadow><boxGeometry args={[0.22, 0.32, 0.2]} /><meshStandardMaterial color="#89918a" /></mesh>
    </group>
  )
}

function HotelModel() {
  return <group>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#76736b" /></mesh>
    <mesh position={[0, 0.72, 0]} castShadow receiveShadow><boxGeometry args={[0.9, 1.26, 0.82]} /><meshStandardMaterial color="#a78975" roughness={0.62} /></mesh>
    {[-0.28, 0, 0.28].flatMap((x) => [0.28, 0.55, 0.82, 1.09].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 0.42]}><boxGeometry args={[0.13, 0.14, 0.025]} /><meshStandardMaterial color="#c8d0c5" roughness={0.4} /></mesh>))}
    <mesh position={[0, 1.38, 0]} castShadow><boxGeometry args={[0.98, 0.08, 0.9]} /><meshStandardMaterial color="#574d45" /></mesh>
    <mesh position={[0.65, 0.3, -0.35]} castShadow><boxGeometry args={[0.32, 0.42, 0.5]} /><meshStandardMaterial color="#796e5e" /></mesh>
  </group>
}

function MallModel() {
  return <group>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#77756e" /></mesh>
    <mesh position={[0, 0.38, 0]} castShadow receiveShadow><boxGeometry args={[1.38, 0.58, 1.22]} /><meshStandardMaterial color="#9a8976" roughness={0.6} /></mesh>
    <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[1.48, 0.08, 1.3]} /><meshStandardMaterial color="#585a55" /></mesh>
    <mesh position={[0, 0.42, 0.62]}><boxGeometry args={[1.12, 0.34, 0.025]} /><meshStandardMaterial color="#a9c1bd" metalness={0.16} roughness={0.36} /></mesh>
    <mesh position={[0, 0.74, 0.65]}><boxGeometry args={[0.76, 0.12, 0.035]} /><meshStandardMaterial color="#b5765e" /></mesh>
    {[-0.44, 0.44].map((x) => <mesh key={x} position={[x, 0.21, 0.63]}><boxGeometry args={[0.18, 0.36, 0.04]} /><meshStandardMaterial color="#6e6658" /></mesh>)}
  </group>
}

function LandfillModel() {
  return <group>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#797466" /></mesh>
    <mesh position={[0, 0.33, 0]} castShadow><coneGeometry args={[0.78, 0.56, 7]} /><meshStandardMaterial color="#827254" roughness={1} /></mesh>
    <mesh position={[0, 0.61, 0]} castShadow><coneGeometry args={[0.54, 0.36, 7]} /><meshStandardMaterial color="#938262" roughness={1} /></mesh>
    <mesh position={[-0.48, 0.14, 0.35]} castShadow><boxGeometry args={[0.08, 0.42, 0.08]} /><meshStandardMaterial color="#676b64" /></mesh>
    <mesh position={[-0.48, 0.36, 0.35]} castShadow><cylinderGeometry args={[0.1, 0.1, 0.035, 8]} /><meshStandardMaterial color="#b27c4f" /></mesh>
  </group>
}

function UrbanForestModel() {
  return <group>
    <mesh position-y={0.035} receiveShadow><boxGeometry args={[1.94, 0.07, 1.94]} /><meshStandardMaterial color="#71805d" roughness={1} /></mesh>
    {[[ -0.58, -0.5, 0.72], [0, -0.53, 0.93], [0.58, -0.48, 0.68], [-0.48, 0.2, 0.9], [0.27, 0.15, 0.76], [-0.03, 0.68, 0.65]].map(([x, z, scale], index) => <Tree key={index} position={[x, 0.07, z]} scale={scale} />)}
  </group>
}

function WindModel() {
  return <group>
    <mesh position-y={0.06} receiveShadow><boxGeometry args={[1.94, 0.12, 1.94]} /><meshStandardMaterial color="#77776e" /></mesh>
    <mesh position={[0, 0.82, 0]} castShadow><cylinderGeometry args={[0.045, 0.09, 1.45, 8]} /><meshStandardMaterial color="#ddd9ca" metalness={0.18} roughness={0.48} /></mesh>
    <group position={[0, 1.52, 0]}>
      <mesh castShadow><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#c6c3b7" metalness={0.2} /></mesh>
      {[0, 2 * Math.PI / 3, 4 * Math.PI / 3].map((angle) => <mesh key={angle} position={[Math.sin(angle) * 0.48, Math.cos(angle) * 0.48, 0]} rotation-z={-angle} castShadow><boxGeometry args={[0.09, 0.95, 0.045]} /><meshStandardMaterial color="#e1ded2" roughness={0.46} /></mesh>)}
    </group>
  </group>
}

function BusDepotModel() {
  return <group>
    <mesh position-y={0.08} receiveShadow><boxGeometry args={[1.94, 0.16, 1.94]} /><meshStandardMaterial color="#77766d" /></mesh>
    <mesh position={[0, 0.42, -0.28]} castShadow receiveShadow><boxGeometry args={[1.28, 0.68, 0.75]} /><meshStandardMaterial color="#83796b" /></mesh>
    <mesh position={[0, 0.8, -0.28]} castShadow><boxGeometry args={[1.38, 0.08, 0.84]} /><meshStandardMaterial color="#565b56" /></mesh>
    <mesh position={[0, 0.27, 0.52]} castShadow><boxGeometry args={[0.95, 0.32, 0.38]} /><meshStandardMaterial color="#a66c52" /></mesh>
    <mesh position={[0.31, 0.42, 0.72]}><boxGeometry args={[0.28, 0.13, 0.025]} /><meshStandardMaterial color="#a8bfbc" /></mesh>
    {[-0.31, 0.31].map((x) => <mesh key={x} position={[x, 0.12, 0.58]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.06, 10]} /><meshStandardMaterial color="#343735" /></mesh>)}
  </group>
}

const AssetModel = memo(function AssetModel({ itemId }: { itemId: ItemId }) {
  switch (itemId) {
    case "residential": return <HouseModel />
    case "office": return <OfficeModel />
    case "road": return <RoadModel />
    case "metro": return <MetroModel />
    case "park": return <ParkModel />
    case "solar": return <SolarModel />
    case "industry": return <IndustryModel />
    case "water": return <WaterModel />
    case "school": return <SchoolModel />
    case "hospital": return <HospitalModel />
    case "wastewater": return <WastewaterModel />
    case "datacenter": return <DataCenterModel />
    case "hotel": return <HotelModel />
    case "mall": return <MallModel />
    case "landfill": return <LandfillModel />
    case "urbanforest": return <UrbanForestModel />
    case "wind": return <WindModel />
    case "busdepot": return <BusDepotModel />
  }
})

const SINGLE_CELL_MODELS = new Set(["residential", "office", "road", "metro", "park", "solar"])

function AssetHighlight({ size, color }: { size: number; color: string }) {
  const thickness = Math.max(0.055, size * 0.035)
  const y = 0.2
  return (
    <group>
      <mesh position={[0, 0.105, 0]} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry args={[size - 0.08, size - 0.08]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {[
        [0, y, -size / 2 + thickness / 2, size, thickness],
        [0, y, size / 2 - thickness / 2, size, thickness],
        [-size / 2 + thickness / 2, y, 0, thickness, size],
        [size / 2 - thickness / 2, y, 0, thickness, size],
      ].map(([x, barY, z, width, depth], index) => (
        <mesh key={index} position={[x, barY, z]} renderOrder={3}>
          <boxGeometry args={[width, thickness * 0.55, depth]} />
          <meshBasicMaterial color="#ffe39b" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Buildings({ city: sceneCity }: { city?: City }) {
  const storedCity = useCityStore((state) => state.city)
  const selectedItem = useCityStore((state) => state.selectedItem)
  const tool = useCityStore((state) => state.tool)
  const city = sceneCity ?? storedCity
  const assets = useMemo(() => listAssets(city), [city])
  return <>{assets.map(({ itemId, row, col }) => {
    const footprint = ITEMS[itemId].footprint
    const modelScale = footprint / (SINGLE_CELL_MODELS.has(itemId) ? 1 : 2)
    const centerX = col - GRID_SIZE / 2 + footprint / 2
    const centerZ = row - GRID_SIZE / 2 + footprint / 2
    return (
      <group key={`${row}-${col}-${itemId}`} position={[centerX, 0, centerZ]}>
        {tool === "place" && selectedItem === itemId ? <AssetHighlight size={footprint} color={ITEMS[itemId].color} /> : null}
        <group scale={modelScale}>
          <AssetModel itemId={itemId} />
        </group>
      </group>
    )
  })}</>
}

function Ground({ onHover, paintDrag, city: sceneCity, interactive = true }: {
  onHover: (cell: { row: number; col: number; item: string | null } | null) => void
  paintDrag: boolean
  city?: City
  interactive?: boolean
}) {
  const storedCity = useCityStore((state) => state.city)
  const city = sceneCity ?? storedCity
  const selectedItem = useCityStore((state) => state.selectedItem)
  const tool = useCityStore((state) => state.tool)
  const placeAt = useCityStore((state) => state.placeAt)
  const eraseAt = useCityStore((state) => state.eraseAt)
  const isDraggingAsset = useRef(false)
  const lastPaintedCell = useRef<string | null>(null)
  const lastHoveredCell = useRef<string | null>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas")
    const cellPixels = 32
    canvas.width = canvas.height = GRID_SIZE * cellPixels
    const context = canvas.getContext("2d")!
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        context.fillStyle = (row + col) % 2 ? "#20211e" : "#252621"
        context.fillRect(col * cellPixels, row * cellPixels, cellPixels, cellPixels)
      }
    }
    context.strokeStyle = "#47473f"
    context.lineWidth = 1
    for (let index = 0; index <= GRID_SIZE; index += 1) {
      context.beginPath(); context.moveTo(index * cellPixels, 0); context.lineTo(index * cellPixels, canvas.height); context.stroke()
      context.beginPath(); context.moveTo(0, index * cellPixels); context.lineTo(canvas.width, index * cellPixels); context.stroke()
    }
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 2
    return map
  }, [])

  const toCell = (point: THREE.Vector3) => ({
    col: Math.floor(point.x + GRID_SIZE / 2),
    row: Math.floor(point.z + GRID_SIZE / 2),
  })
  const updateHover = (point: THREE.Vector3) => {
    const { row, col } = toCell(point)
    const item = city[row]?.[col]
    const key = `${row},${col}:${item ? String(item).split("@")[0] : ""}`
    if (lastHoveredCell.current === key) return
    lastHoveredCell.current = key
    onHover({ row, col, item: item ? String(item).split("@")[0] : null })
  }
  const clearHover = () => {
    if (lastHoveredCell.current === null) return
    lastHoveredCell.current = null
    onHover(null)
  }
  const applyToolAt = (row: number, col: number) => {
    const key = `${row},${col}`
    if (lastPaintedCell.current === key) return
    lastPaintedCell.current = key
    if (tool === "erase") eraseAt(row, col)
    else placeAt(row, col)
  }

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      receiveShadow
      onPointerMove={interactive ? (event) => {
        event.stopPropagation()
        updateHover(event.point)
        if (paintDrag && isDraggingAsset.current && (event.nativeEvent.buttons & 1) === 1) {
          const { row, col } = toCell(event.point)
          applyToolAt(row, col)
        }
      } : undefined}
      onPointerDown={interactive ? (event) => {
        if (!paintDrag || event.nativeEvent.button !== 0) return
        event.stopPropagation()
        event.nativeEvent.preventDefault()
        isDraggingAsset.current = true
        lastPaintedCell.current = null
        const canvas = event.nativeEvent.currentTarget as HTMLCanvasElement | null
        canvas?.setPointerCapture(event.pointerId)
        const { row, col } = toCell(event.point)
        applyToolAt(row, col)
      } : undefined}
      onPointerUp={interactive ? (event) => {
        if (!isDraggingAsset.current) return
        isDraggingAsset.current = false
        const canvas = event.nativeEvent.currentTarget as HTMLCanvasElement | null
        if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      } : undefined}
      onPointerCancel={interactive ? () => { isDraggingAsset.current = false } : undefined}
      onPointerOut={interactive ? clearHover : undefined}
      onClick={interactive ? (event) => {
        if (event.delta > 5) return
        if (paintDrag) return
        const { row, col } = toCell(event.point)
        if (tool === "erase") eraseAt(row, col)
        else placeAt(row, col)
      } : undefined}
      onContextMenu={interactive ? (event) => {
        event.stopPropagation()
        event.nativeEvent.preventDefault()
        const { row, col } = toCell(event.point)
        eraseAt(row, col)
      } : undefined}
    >
      <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      <meshStandardMaterial map={texture} roughness={0.95} />
    </mesh>
  )
}

function PlacementPreview({ hover }: { hover: { row: number; col: number } | null }) {
  const city = useCityStore((state) => state.city)
  const selectedItem = useCityStore((state) => state.selectedItem)
  const tool = useCityStore((state) => state.tool)
  if (!hover || tool === "erase") return null

  const size = ITEMS[selectedItem].footprint
  const cells = Array.from({ length: size * size }, (_, index) => ({
    row: hover.row + Math.floor(index / size),
    col: hover.col + index % size,
  }))
  const valid = cells.every(({ row, col }) => row >= 0 && col >= 0 && row < GRID_SIZE && col < GRID_SIZE && city[row][col] === null)
  const centerX = hover.col - GRID_SIZE / 2 + size / 2
  const centerZ = hover.row - GRID_SIZE / 2 + size / 2

  return (
    <group position={[centerX, 0, centerZ]}>
      <mesh position-y={0.018} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[size * 0.97, size * 0.97]} />
        <meshBasicMaterial color={valid ? ITEMS[selectedItem].color : "#b9685f"} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position-y={0.035}>
        <boxGeometry args={[size * 0.8, 0.035, size * 0.8]} />
        <meshBasicMaterial color={valid ? ITEMS[selectedItem].color : "#b9685f"} transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function CityScene({ onHover = () => {}, hover = null, paintDrag = false, city, readonly = false }: {
  onHover?: (cell: { row: number; col: number; item: string | null } | null) => void
  hover?: { row: number; col: number } | null
  paintDrag?: boolean
  city?: City
  readonly?: boolean
}) {
  return (
    <Canvas frameloop="demand" camera={{ position: readonly ? [43, 48, 43] : [36, 40, 42], fov: readonly ? 48 : 42 }} dpr={[1, 1.25]}>
      <color attach="background" args={["#191a17"]} />
      <fog attach="fog" args={["#191a17", 68, 125]} />
      <hemisphereLight args={["#e5dfd2", "#343630", 1.05]} />
      <directionalLight position={[16, 44, 14]} intensity={2.1} />
      <Ground city={city} interactive={!readonly} onHover={onHover} paintDrag={paintDrag} />
      {!readonly ? <PlacementPreview hover={hover} /> : null}
      <Buildings city={city} />
      {!readonly ? <OrbitControls enabled={!paintDrag} makeDefault maxPolarAngle={Math.PI / 2.15} minDistance={8} maxDistance={88} /> : null}
    </Canvas>
  )
}
