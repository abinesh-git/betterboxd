interface Props { title: string }

export default function SectionHeader({ title }: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex-1 h-px bg-[#2c3440]" />
    </div>
  )
}