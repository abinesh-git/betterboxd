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

interface TooltipState {
  x: number
  y: number
  country: string
  count: number
}

export default function WorldMap({ data }: { data: CountryStat[] }) {
  const [geoData, setGeoData] = useState<any>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<any>(null)
  const svgRef = useRef<any>(null)
  const zoomRef = useRef<any>(null)

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
  }, [geoData, data])

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

    const svg = select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
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
        if (!alpha3) return '#2c3440'
        const entry = countMap.get(alpha3)
        if (!entry) return '#2c3440'
        const intensity = Math.sqrt(entry.count / max)
        const g2 = Math.round(192 * intensity)
        return `rgb(${Math.round(48 * intensity)}, ${g2}, 48)`
      })
      .attr('stroke', '#14181c')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mousemove', (event: MouseEvent, d: any) => {
        const alpha3 = numericToAlpha3[d.id]
        const entry = alpha3 ? countMap.get(alpha3) : undefined
        const countryName = alpha3
          ? Object.entries(COUNTRY_TO_ISO).find(([, iso]) => iso === alpha3)?.[0] ?? alpha3
          : null
        if (!countryName) return
        const rect = container.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          country: entry?.name ?? countryName,
          count: entry?.count ?? 0,
        })
      })
      .on('mouseleave', () => setTooltip(null))

    // Zoom behavior
    const zoomBehavior = zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        svg.style('cursor', event.transform.k > 1 ? 'grab' : 'grab')
      })

    svg.call(zoomBehavior as any)
    zoomRef.current = zoomBehavior
    svg.node().__zoom_svg__ = svg
    svg.node().__zoom_behavior__ = zoomBehavior
  }

  async function handleReset() {
    if (!svgRef.current || !zoomRef.current) return
    const { zoomIdentity } = await import('d3-zoom')
    svgRef.current
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, zoomIdentity)
  }

  const topCountries = data.slice(0, 10)

  return (
    <div className="bg-[#1c2228] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#99aabb]">production countries</p>
        {geoData && (
          <button
            onClick={handleReset}
            className="text-xs text-[#456] hover:text-[#99aabb] bg-[#14181c] px-2 py-1 rounded transition-colors"
          >
            reset zoom
          </button>
        )}
      </div>

      <div className="relative" ref={containerRef}>
        {!geoData && (
          <div className="h-64 flex items-center justify-center text-[#456] text-sm">
            loading map...
          </div>
        )}
        {tooltip && (
          <div
            className="absolute z-10 bg-[#2c3440] rounded-lg px-3 py-2 text-sm pointer-events-none"
            style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
          >
            <p className="text-white font-medium">{tooltip.country}</p>
            {tooltip.count > 0
              ? <p className="text-[#00c030]">{tooltip.count} films</p>
              : <p className="text-[#456]">no films watched</p>
            }
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        {topCountries.map((c, i) => (
          <div key={c.country} className="text-center">
            <p className="text-[#456] text-xs mb-1">{i + 1}</p>
            <p className="text-white text-sm font-medium truncate">{c.country}</p>
            <p className="text-[#00c030] text-sm">{c.count}</p>
          </div>
        ))}
      </div>
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