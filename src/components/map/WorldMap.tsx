import { useEffect, useRef, useState } from 'react'
import type { CountryStat } from '../../types'

const COUNTRY_TO_ISO: Record<string, string> = {
  'United States of America': 'USA', 'United States': 'USA',
  'United Kingdom': 'GBR', 'France': 'FRA', 'Germany': 'DEU',
  'Italy': 'ITA', 'Spain': 'ESP', 'Japan': 'JPN', 'South Korea': 'KOR',
  'China': 'CHN', 'India': 'IND', 'Australia': 'AUS', 'Canada': 'CAN',
  'Brazil': 'BRA', 'Mexico': 'MEX', 'Russia': 'RUS', 'Sweden': 'SWE',
  'Denmark': 'DNK', 'Norway': 'NOR', 'Finland': 'FIN', 'Poland': 'POL',
  'Czech Republic': 'CZE', 'Austria': 'AUT', 'Switzerland': 'CHE',
  'Netherlands': 'NLD', 'Belgium': 'BEL', 'Portugal': 'PRT',
  'Argentina': 'ARG', 'Chile': 'CHL', 'Colombia': 'COL',
  'Iran': 'IRN', 'Turkey': 'TUR', 'Israel': 'ISR', 'Taiwan': 'TWN',
  'Hong Kong': 'HKG', 'Thailand': 'THA', 'Romania': 'ROU',
  'Hungary': 'HUN', 'Greece': 'GRC', 'Ireland': 'IRL',
  'New Zealand': 'NZL', 'South Africa': 'ZAF', 'Nigeria': 'NGA',
  'Egypt': 'EGY', 'Morocco': 'MAR', 'Senegal': 'SEN',
  'Ukraine': 'UKR', 'Belarus': 'BLR', 'Kazakhstan': 'KAZ',
  'Indonesia': 'IDN', 'Malaysia': 'MYS', 'Philippines': 'PHL',
  'Vietnam': 'VNM', 'Pakistan': 'PAK', 'Bangladesh': 'BGD',
  'Sri Lanka': 'LKA', 'Nepal': 'NPL', 'Afghanistan': 'AFG',
  'Iraq': 'IRQ', 'Syria': 'SYR', 'Lebanon': 'LBN', 'Jordan': 'JOR',
  'Saudi Arabia': 'SAU', 'United Arab Emirates': 'ARE', 'Qatar': 'QAT',
  'Kuwait': 'KWT', 'Algeria': 'DZA', 'Tunisia': 'TUN', 'Libya': 'LBY',
  'Sudan': 'SDN', 'Ethiopia': 'ETH', 'Kenya': 'KEN', 'Ghana': 'GHA',
  'Cameroon': 'CMR', 'Tanzania': 'TZA', 'Uganda': 'UGA',
  'Cuba': 'CUB', 'Peru': 'PER', 'Venezuela': 'VEN', 'Ecuador': 'ECU',
  'Bolivia': 'BOL', 'Paraguay': 'PRY', 'Uruguay': 'URY',
  'Bulgaria': 'BGR', 'Serbia': 'SRB', 'Croatia': 'HRV',
  'Slovakia': 'SVK', 'Slovenia': 'SVN', 'Lithuania': 'LTU',
  'Latvia': 'LVA', 'Estonia': 'EST', 'Iceland': 'ISL',
  'Luxembourg': 'LUX', 'Malta': 'MLT', 'Cyprus': 'CYP',
  'Albania': 'ALB', 'North Macedonia': 'MKD',
  'Bosnia and Herzegovina': 'BIH', 'Montenegro': 'MNE',
  'Moldova': 'MDA', 'Armenia': 'ARM', 'Georgia': 'GEO',
  'Azerbaijan': 'AZE', 'Uzbekistan': 'UZB', 'Turkmenistan': 'TKM',
  'Kyrgyzstan': 'KGZ', 'Tajikistan': 'TJK', 'Mongolia': 'MNG',
  'Myanmar': 'MMR', 'Cambodia': 'KHM', 'Laos': 'LAO',
  'Singapore': 'SGP', 'Brunei': 'BRN', 'Papua New Guinea': 'PNG',
  'Mali': 'MLI', 'Burkina Faso': 'BFA', 'Guinea': 'GIN',
  'Ivory Coast': 'CIV', "Côte d'Ivoire": 'CIV',
  'Zimbabwe': 'ZWE', 'Zambia': 'ZMB', 'Mozambique': 'MOZ',
  'Angola': 'AGO', 'Democratic Republic of the Congo': 'COD',
  'Republic of the Congo': 'COG', 'Gabon': 'GAB',
  'Dominican Republic': 'DOM', 'Guatemala': 'GTM', 'Honduras': 'HND',
  'El Salvador': 'SLV', 'Nicaragua': 'NIC', 'Costa Rica': 'CRI',
  'Panama': 'PAN', 'Jamaica': 'JAM', 'Trinidad and Tobago': 'TTO',
  'Puerto Rico': 'PRI',
}

// Reverse map: alpha-3 → primary country name (first entry wins)
const ISO_TO_COUNTRY: Record<string, string> = {}
for (const [name, iso] of Object.entries(COUNTRY_TO_ISO)) {
  if (!ISO_TO_COUNTRY[iso]) ISO_TO_COUNTRY[iso] = name
}

interface TooltipState {
  x: number
  y: number
  country: string
  count: number
}

interface Props {
  data: CountryStat[]
  onCountryClick?: (countryName: string) => void
}

export default function WorldMap({ data, onCountryClick }: Props) {
  const [geoData, setGeoData] = useState<any>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<any>(null)
  const svgRef = useRef<any>(null)
  const zoomRef = useRef<any>(null)
  const onClickRef = useRef(onCountryClick)
  onClickRef.current = onCountryClick

  const countMap = new Map<string, { count: number; name: string }>()
  for (const d of data) {
    const iso = COUNTRY_TO_ISO[d.country] ?? d.isoCode
    if (iso) countMap.set(iso, { count: d.count, name: d.country })
  }
  const max = Math.max(...Array.from(countMap.values()).map(v => v.count), 1)

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(setGeoData)
  }, [])

  useEffect(() => {
    if (!geoData) return
    renderMap()
  }, [geoData, data]) // eslint-disable-line react-hooks/exhaustive-deps

  async function renderMap() {
    if (!containerRef.current || !geoData) return

    const { select } = await import('d3-selection')
    const { geoNaturalEarth1, geoPath } = await import('d3-geo')
    const { zoom } = await import('d3-zoom')
    const topojson = await import('topojson-client') as any

    const container = containerRef.current
    const width = container.clientWidth || 800
    const height = Math.round(width * 0.5)

    select(container).select('svg').remove()

    // Read CSS variable values at render time — D3 SVG .attr() can't use var()
    const cs = getComputedStyle(document.documentElement)
    const bgColor = cs.getPropertyValue('--bg').trim()
    const noDataColor = cs.getPropertyValue('--surface-raised').trim()
    const accentRgb = cs.getPropertyValue('--accent-rgb').trim()

    const svg = select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'var(--bg)')
      .style('cursor', 'grab')

    svgRef.current = svg

    const g = svg.append('g')
    gRef.current = g

    const projection = geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2])

    const path = geoPath().projection(projection)
    const countries = topojson.feature(geoData, geoData.objects.countries)
    const numericToAlpha3 = buildNumericMap()

    g.selectAll('path')
      .data((countries as any).features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const alpha3 = numericToAlpha3[d.id]
        if (!alpha3) return noDataColor
        const entry = countMap.get(alpha3)
        if (!entry) return noDataColor
        // Amber gradient: 0.15 base opacity + sqrt scale for differentiation
        const intensity = 0.15 + 0.85 * Math.sqrt(entry.count / max)
        return `rgba(${accentRgb || '245, 166, 35'}, ${intensity.toFixed(3)})`
      })
      .attr('stroke', bgColor || '#0d0f11')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent, d: any) => {
        const alpha3 = numericToAlpha3[d.id]
        const entry = alpha3 ? countMap.get(alpha3) : undefined
        const countryName = alpha3
          ? (entry?.name ?? ISO_TO_COUNTRY[alpha3] ?? alpha3)
          : null
        if (!countryName) return
        const rect = container.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          country: countryName,
          count: entry?.count ?? 0,
        })
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (_event: MouseEvent, d: any) => {
        const alpha3 = numericToAlpha3[d.id]
        if (!alpha3) return
        const entry = countMap.get(alpha3)
        const countryName = entry?.name ?? ISO_TO_COUNTRY[alpha3] ?? null
        if (countryName && onClickRef.current) onClickRef.current(countryName)
      })

    const zoomBehavior = zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoomBehavior as any)
    zoomRef.current = zoomBehavior
  }

  async function handleReset() {
    if (!svgRef.current || !zoomRef.current) return
    const { zoomIdentity } = await import('d3-zoom')
    svgRef.current.transition().duration(300).call(zoomRef.current.transform, zoomIdentity)
  }

  return (
    <div style={{ position: 'relative' }}>
      {geoData && (
        <button
          onClick={handleReset}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            padding: '4px 10px',
            fontSize: 11,
            color: 'var(--text-dim)',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          reset zoom
        </button>
      )}

      <div ref={containerRef}>
        {!geoData && (
          <div
            style={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            loading map...
          </div>
        )}
      </div>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 52,
            zIndex: 20,
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {tooltip.country}
          </div>
          {tooltip.count > 0 ? (
            <div
              style={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent)',
                marginTop: 2,
              }}
            >
              {tooltip.count} {tooltip.count === 1 ? 'film' : 'films'}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              not yet explored
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildNumericMap(): Record<string, string> {
  return {
    '004': 'AFG', '008': 'ALB', '012': 'DZA', '024': 'AGO', '032': 'ARG',
    '036': 'AUS', '040': 'AUT', '050': 'BGD', '056': 'BEL', '064': 'BTN',
    '068': 'BOL', '070': 'BIH', '076': 'BRA', '100': 'BGR', '104': 'MMR',
    '116': 'KHM', '120': 'CMR', '124': 'CAN', '152': 'CHL', '156': 'CHN',
    '170': 'COL', '178': 'COG', '180': 'COD', '188': 'CRI', '191': 'HRV',
    '192': 'CUB', '196': 'CYP', '203': 'CZE', '208': 'DNK', '218': 'ECU',
    '818': 'EGY', '222': 'SLV', '231': 'ETH', '246': 'FIN', '250': 'FRA',
    '266': 'GAB', '276': 'DEU', '288': 'GHA', '300': 'GRC', '320': 'GTM',
    '324': 'GIN', '332': 'HTI', '340': 'HND', '348': 'HUN', '356': 'IND',
    '360': 'IDN', '364': 'IRN', '368': 'IRQ', '372': 'IRL', '376': 'ISR',
    '380': 'ITA', '388': 'JAM', '392': 'JPN', '400': 'JOR', '398': 'KAZ',
    '404': 'KEN', '410': 'KOR', '408': 'PRK', '414': 'KWT', '418': 'LAO',
    '422': 'LBN', '430': 'LBR', '434': 'LBY', '440': 'LTU', '442': 'LUX',
    '454': 'MWI', '458': 'MYS', '466': 'MLI', '484': 'MEX', '496': 'MNG',
    '504': 'MAR', '508': 'MOZ', '516': 'NAM', '524': 'NPL', '528': 'NLD',
    '554': 'NZL', '558': 'NIC', '566': 'NGA', '578': 'NOR', '586': 'PAK',
    '591': 'PAN', '598': 'PNG', '600': 'PRY', '604': 'PER', '608': 'PHL',
    '616': 'POL', '620': 'PRT', '630': 'PRI', '642': 'ROU', '643': 'RUS',
    '682': 'SAU', '686': 'SEN', '694': 'SLE', '703': 'SVK', '705': 'SVN',
    '706': 'SOM', '710': 'ZAF', '724': 'ESP', '144': 'LKA', '729': 'SDN',
    '752': 'SWE', '756': 'CHE', '760': 'SYR', '158': 'TWN', '762': 'TJK',
    '764': 'THA', '768': 'TGO', '780': 'TTO', '788': 'TUN', '792': 'TUR',
    '800': 'UGA', '804': 'UKR', '784': 'ARE', '826': 'GBR', '840': 'USA',
    '858': 'URY', '860': 'UZB', '862': 'VEN', '704': 'VNM', '887': 'YEM',
    '894': 'ZMB', '716': 'ZWE', '051': 'ARM', '031': 'AZE', '112': 'BLR',
    '233': 'EST', '268': 'GEO', '352': 'ISL', '417': 'KGZ', '428': 'LVA',
    '498': 'MDA', '807': 'MKD', '499': 'MNE', '688': 'SRB', '795': 'TKM',
    '702': 'SGP', '634': 'QAT',
  }
}
