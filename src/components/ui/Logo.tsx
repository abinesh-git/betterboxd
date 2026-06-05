interface Props {
  size: 'sm' | 'md' | 'lg'
  labelOpacity?: number
}

const SIZES = {
  sm: { text: 14, icon: 16, gap: 6, radius: 4 },
  md: { text: 18, icon: 22, gap: 8, radius: 5 },
  lg: { text: 28, icon: 32, gap: 10, radius: 7 },
}

export default function Logo({ size, labelOpacity = 1 }: Props) {
  const s = SIZES[size]
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap }}>
      <div
        style={{
          width: s.icon,
          height: s.icon,
          backgroundColor: 'var(--accent)',
          borderRadius: s.radius,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: s.text,
          color: 'var(--text-primary)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          opacity: labelOpacity,
          transition: 'opacity 0.15s ease',
        }}
      >
        Cinestamp
      </span>
    </div>
  )
}
