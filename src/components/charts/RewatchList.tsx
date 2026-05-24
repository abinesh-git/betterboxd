import type { Film } from '../../types'

interface Props {
  data: { film: Film; rewatchCount: number }[]
}

export default function RewatchList({ data }: Props) {
  if (!data.length) return (
    <div className="bg-[#1c2228] rounded-xl p-5 text-[#456] text-sm">
      no rewatches logged
    </div>
  )

  return (
    <div className="bg-[#1c2228] rounded-xl p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map(({ film, rewatchCount }) => (
          <div key={film.uri} className="flex items-center justify-between py-2 border-b border-[#2c3440] last:border-0">
            <div>
              <p className="text-white text-sm font-medium">{film.title}</p>
              <p className="text-[#456] text-xs">{film.year}</p>
            </div>
            <div className="text-right">
              <p className="text-[#00c030] text-sm font-medium">{rewatchCount}×</p>
              {film.rating && <p className="text-[#f5c518] text-xs">{film.rating} ★</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}