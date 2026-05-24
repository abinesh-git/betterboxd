import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
  } from 'recharts'
  
  interface Props {
    title: string
    data: Record<string, any>[]
    xKey: string
    yKey: string
    color?: string
    domain?: [number, number]
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#2c3440] rounded-lg px-3 py-2 text-sm">
        <p className="text-[#99aabb]">{label}</p>
        <p className="text-white font-medium">
          {typeof payload[0].value === 'number'
            ? payload[0].value % 1 === 0
              ? payload[0].value.toLocaleString()
              : payload[0].value.toFixed(2)
            : payload[0].value}
        </p>
      </div>
    )
  }
  
  export default function BarChartCard({ title, data, xKey, yKey, color = '#00c030', domain }: Props) {
    return (
      <div className="bg-[#1c2228] rounded-xl p-5">
        <p className="text-sm text-[#99aabb] mb-4">{title}</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#456', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#456', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={domain}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2c3440' }} />
            <Bar dataKey={yKey} radius={[2, 2, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={color} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }