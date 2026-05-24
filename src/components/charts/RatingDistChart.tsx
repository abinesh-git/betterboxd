import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
  } from 'recharts'
  import type { RatingBucket } from '../../types'
  
  const STARS = ['½','1','1½','2','2½','3','3½','4','4½','5']
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#2c3440] rounded-lg px-3 py-2 text-sm">
        <p className="text-white font-medium">{payload[0].payload.count} films</p>
        <p className="text-[#99aabb]">{payload[0].payload.percentage.toFixed(1)}%</p>
      </div>
    )
  }
  
  export default function RatingDistChart({ data }: { data: RatingBucket[] }) {
    const max = Math.max(...data.map(d => d.count))
  
    return (
      <div className="bg-[#1c2228] rounded-xl p-5">
        <p className="text-sm text-[#99aabb] mb-4">rating distribution</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="rating"
              tickFormatter={(v, i) => STARS[i] ?? v}
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
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill="#f5c518"
                  opacity={0.4 + (d.count / max) * 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }