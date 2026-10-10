import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { computeCarbon, MODEL_HORIZON, type City } from "../lib/carbon"

export default function CarbonChart({ city }: { city: City }) {
  const data = Array.from({ length: MODEL_HORIZON + 1 }, (_, year) => {
    const result = computeCarbon(city, year)
    return {
      year,
      embodied: Math.round(result.embodied),
      operational: Math.round(result.operational + result.transport),
      offset: -Math.round(result.offset),
    }
  })
  const yearOne = computeCarbon(city, 1)
  const paybackYear =
    yearOne.offset > 0
      ? Math.min(MODEL_HORIZON, Math.ceil(yearOne.embodied / yearOne.offset))
      : null

  return (
    <div className="h-44 min-h-44 min-w-0 w-full">
      <ResponsiveContainer
        height="100%"
        initialDimension={{ height: 176, width: 320 }}
        minHeight={176}
        minWidth={1}
        width="100%"
      >
        <AreaChart
          data={data}
          margin={{ bottom: 0, left: -22, right: 5, top: 8 }}
        >
          <defs>
            <linearGradient id="embodiedFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="operationalFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.32} />
              <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="offsetFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--emerald)" stopOpacity={0.02} />
              <stop
                offset="95%"
                stopColor="var(--emerald)"
                stopOpacity={0.35}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--line)"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="year"
            fontSize={10}
            stroke="var(--dim)"
            tickLine={false}
            ticks={[0, 10, 20, MODEL_HORIZON]}
          />
          <YAxis
            axisLine={false}
            fontSize={9}
            stroke="var(--dim)"
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel-solid)",
              border: "1px solid var(--line-strong)",
              borderRadius: "10px",
              color: "var(--primary)",
              fontSize: "11px",
            }}
            formatter={(value) => [
              `${Number(value).toLocaleString()} tCO₂`,
              "",
            ]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Area
            dataKey="embodied"
            fill="url(#embodiedFill)"
            name="Embodied"
            stackId="positive"
            stroke="var(--amber)"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            dataKey="operational"
            fill="url(#operationalFill)"
            name="Operational"
            stackId="positive"
            stroke="var(--danger)"
            strokeWidth={2}
            type="monotone"
          />
          <Area
            dataKey="offset"
            fill="url(#offsetFill)"
            name="Offset"
            stroke="var(--emerald)"
            strokeWidth={2}
            type="monotone"
          />
          {paybackYear ? (
            <ReferenceLine
              label={{
                fill: "var(--emerald)",
                fontSize: 9,
                position: "insideTopRight",
                value: `Payback Y${paybackYear}`,
              }}
              stroke="var(--emerald)"
              strokeDasharray="4 4"
              x={paybackYear}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
