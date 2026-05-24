import type { AttributeStat } from '../../types'

interface Props {
  title: string
  data: AttributeStat[]
  metric: 'count' | 'rating'
}

export default function AttributeTable({ title, data, metric }: Props) {
  const max = Math.max(...data.map(d => metric === 'count' ? d.count : (d.avgRating ?? 0)))

  return (
    <div className="bg-[#1c2228] rounded-xl p-5">
      <p className="text-sm text-[#99aabb] mb-4">{title}</p>
      <div className="space-y-3">
        {data.map((item, i) => {
          const val = metric === 'count' ? item.count : item.avgRating
          const pct = max > 0 ? ((val ?? 0) / max) * 100 : 0
          return (
            <div key={item.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white truncate max-w-[70%]">
                  <span className="text-[#456] mr-2 text-xs">{i + 1}</span>
                  {item.name}
                </span>
                <span className="text-[#99aabb] shrink-0">
                  {metric === 'count'
                    ? item.count
                    : item.avgRating?.toFixed(2) + ' ★'}
                </span>
              </div>
              <div className="w-full bg-[#2c3440] rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-[#00c030] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}