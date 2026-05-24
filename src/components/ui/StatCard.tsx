interface Props {
    label: string
    value: string
    highlight?: 'green' | 'red'
  }
  
  export default function StatCard({ label, value, highlight }: Props) {
    const valueColor = highlight === 'green'
      ? 'text-[#00c030]'
      : highlight === 'red'
      ? 'text-red-400'
      : 'text-white'
  
    return (
      <div className="bg-[#1c2228] rounded-xl p-5">
        <p className="text-[#99aabb] text-xs uppercase tracking-wider mb-2">{label}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </div>
    )
  }