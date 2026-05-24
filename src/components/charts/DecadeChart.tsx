import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
  } from 'recharts'
  import type { DecadeStat } from '../../types'
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload as DecadeStat
    return (
      <div className="bg-[#2c3440] rounded-lg px-3 py-2 text-sm">
        <p className="text-[#99aabb]">{label}</p>
        <p className="text-white font-medium">{d.count} films</p>
        {d.avgRating && <p className="text-[#f5c518]">avg {d.avgRating.toFixed(2)} ★</p>}
      </div>
    )
  }
  
  export default function DecadeChart({ data }: { data: DecadeStat[] }) {
    return (
      <div className="bg-[#1c2228] rounded-xl p-5">
        <p className="text-sm text-[#99aabb] mb-4">films watched by decade</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="decade"
              tick={{ fill: '#456', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#456', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2c3440' }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill="#00c030" opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }