import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Eyebrow } from '../../../components/ui/Eyebrow'
import type { Company } from '../../../lib/types'

export type CompRow = {
  id: string
  company: string
  ticker: string
  rationale: string
  evRevenue: number
  evEbitda: number
  revenueGrowth: number
  grossMargin: number
  ebitdaMargin: number
  included: boolean
}

export type CompsSelection = {
  method: 'revenue' | 'ebitda'
  selectedMultiple: number
  revenueMultiple: number
  ebitdaMultiple: number
}

const SAMPLE_COMPS = [
  ['Cloudflare', 'NET', 18.2, 78, 29, 77, 14],
  ['Datadog', 'DDOG', 15.1, 68, 25, 80, 18],
  ['MongoDB', 'MDB', 8.7, 54, 22, 74, 10],
  ['Snowflake', 'SNOW', 12.5, 62, 28, 69, 8],
  ['GitLab', 'GTLB', 7.4, 48, 24, 89, 16],
] as const

export function seedComps(company: Company): CompRow[] {
  const competitorNames = company.competitors.map((competitor) => competitor.name)
  const names = [...new Set([...competitorNames, ...SAMPLE_COMPS.map(([name]) => name)])].slice(0, 6)
  return names.map((name, index) => {
    const sample = SAMPLE_COMPS[index % SAMPLE_COMPS.length]
    return {
      id: `comp-${index}`,
      company: name,
      ticker: competitorNames.includes(name) ? '—' : sample[1],
      rationale: competitorNames.includes(name)
        ? `Identified in ${company.name}'s competitive set`
        : `Illustrative public benchmark for ${company.sector}`,
      evRevenue: sample[2],
      evEbitda: sample[3],
      revenueGrowth: sample[4],
      grossMargin: sample[5],
      ebitdaMargin: sample[6],
      included: true,
    }
  })
}

function percentile(values: number[], percentileValue: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * percentileValue
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function NumberCell({
  value,
  suffix,
  label,
  onChange,
}: {
  value: number
  suffix: string
  label: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex min-w-[82px] items-center border-2 border-hairline-strong bg-card focus-within:outline-2 focus-within:outline-ring-focus">
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Math.max(Number(event.target.value), 0))}
        className="code-sm h-8 w-full min-w-0 bg-transparent px-2 text-right text-ink outline-none"
      />
      <span className="code-sm border-l border-hairline-strong bg-bone px-1.5 py-1.5 text-charcoal">{suffix}</span>
    </div>
  )
}

export function PublicCompsSection({
  company,
  targetMatterProceeds,
  onSelectedMultipleChange,
  comps,
  onCompsChange,
}: {
  company: Company
  targetMatterProceeds: number
  onSelectedMultipleChange: (selection: CompsSelection) => void
  comps?: CompRow[]
  onCompsChange?: (comps: CompRow[]) => void
}) {
  const [internalComps, setInternalComps] = useState<CompRow[]>(() => comps ?? seedComps(company))
  const activeComps = comps ?? internalComps
  const [method, setMethod] = useState<'revenue' | 'ebitda'>('revenue')
  const [override, setOverride] = useState('')

  function updateComp(id: string, patch: Partial<CompRow>) {
    const next = activeComps.map((row) => row.id === id ? { ...row, ...patch } : row)
    if (onCompsChange) {
      onCompsChange(next)
    } else {
      setInternalComps(next)
    }
  }

  function addComp() {
    const next = [...activeComps, {
      id: `comp-${Date.now()}`,
      company: 'New comparable',
      ticker: '',
      rationale: 'Add selection rationale',
      evRevenue: 5,
      evEbitda: 20,
      revenueGrowth: 20,
      grossMargin: 70,
      ebitdaMargin: 15,
      included: true,
    }]
    if (onCompsChange) {
      onCompsChange(next)
    } else {
      setInternalComps(next)
    }
  }

  const included = activeComps.filter((comp) => comp.included)
  const metrics = useMemo(() => ({
    revenue: included.map((comp) => comp.evRevenue),
    ebitda: included.map((comp) => comp.evEbitda),
    growth: included.map((comp) => comp.revenueGrowth),
    grossMargin: included.map((comp) => comp.grossMargin),
    ebitdaMargin: included.map((comp) => comp.ebitdaMargin),
  }), [included])
  const medianRevenue = percentile(metrics.revenue, 0.5)
  const medianEbitda = percentile(metrics.ebitda, 0.5)
  const peerMedian = method === 'revenue' ? medianRevenue : medianEbitda
  const selectedMultiple = override === '' ? peerMedian : Math.max(Number(override), 0)
  const requiredEnterpriseValue = targetMatterProceeds / 0.1
  const requiredOperatingMetric = selectedMultiple > 0 ? requiredEnterpriseValue / selectedMultiple : 0

  useEffect(() => {
    onSelectedMultipleChange({
      method,
      selectedMultiple,
      revenueMultiple: method === 'revenue' ? selectedMultiple : medianRevenue,
      ebitdaMultiple: method === 'ebitda' ? selectedMultiple : medianEbitda,
    })
  }, [medianEbitda, medianRevenue, method, onSelectedMultipleChange, selectedMultiple])

  const statRows = [
    ['10th percentile', 0.1],
    ['25th percentile', 0.25],
    ['Median', 0.5],
    ['75th percentile', 0.75],
    ['90th percentile', 0.9],
  ] as const

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-hairline-strong bg-bone p-5 md:p-6">
        <div>
          <Eyebrow>Suggested public comps</Eyebrow>
          <h3 className="heading-md mt-2">LTM trading multiples</h3>
          <p className="mt-1 max-w-[760px] text-sm text-body">Select the companies that belong in the peer set, adjust illustrative metrics, and choose the multiple used for the exit case.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="code-sm border-2 border-hairline-strong bg-card px-3 py-2 text-charcoal">{included.length} of {activeComps.length} included</span>
          <button type="button" onClick={addComp} className="code-sm flex h-10 items-center gap-2 border-2 border-hairline-strong bg-primary px-3 font-semibold text-on-primary shadow-brutal-sm hover:bg-primary-deep">
            <span className="text-base">+</span> Add comp
          </button>
        </div>
      </div>

      <div className="border-b-2 border-hairline-strong bg-secondary/40 px-5 py-3">
        <p className="code-sm text-charcoal"><strong className="text-ink">Illustrative frontend values.</strong> No live market-data connection is attached; replace every metric with sourced figures before using the output.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-left">
          <thead>
            <tr className="bg-dark text-on-dark">
              {['Include', 'Company', 'Ticker', 'Selection rationale', 'EV / Revenue', 'EV / EBITDA', 'Revenue growth', 'Gross margin', 'EBITDA margin', ''].map((label, index) => (
                <th key={`${label}-${index}`} className="caption-tight border-r border-divider-dark px-3 py-3 last:border-r-0">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeComps.map((comp, index) => (
              <tr key={comp.id} className={`group transition-colors hover:bg-secondary hover:-outline-offset-2 hover:outline-2 hover:outline-charcoal ${index % 2 ? 'bg-bone' : 'bg-card'}`}>
                <td className="border-r border-t border-hairline-strong px-3 py-3 text-center">
                  <input type="checkbox" checked={comp.included} onChange={(event) => updateComp(comp.id, { included: event.target.checked })} className="h-4 w-4 accent-[#4de088]" aria-label={`Include ${comp.company}`} />
                </td>
                <td className="border-r border-t border-hairline-strong px-3 py-3">
                  <input value={comp.company} onChange={(event) => updateComp(comp.id, { company: event.target.value })} className="code-sm h-8 w-36 border-2 border-hairline-strong bg-card px-2 font-semibold text-ink outline-none focus:outline-2 focus:outline-ring-focus" aria-label={`Company name ${index + 1}`} />
                </td>
                <td className="border-r border-t border-hairline-strong px-3 py-3">
                  <input value={comp.ticker} onChange={(event) => updateComp(comp.id, { ticker: event.target.value.toUpperCase() })} className="code-sm h-8 w-20 border-2 border-hairline-strong bg-card px-2 text-ink outline-none focus:outline-2 focus:outline-ring-focus" aria-label={`Ticker for ${comp.company}`} />
                </td>
                <td className="border-r border-t border-hairline-strong px-3 py-3">
                  <input value={comp.rationale} onChange={(event) => updateComp(comp.id, { rationale: event.target.value })} className="caption h-8 w-72 border-2 border-hairline-strong bg-card px-2 text-charcoal outline-none focus:outline-2 focus:outline-ring-focus" aria-label={`Rationale for ${comp.company}`} />
                </td>
                <td className="border-r border-t border-hairline-strong px-3 py-3"><NumberCell label={`${comp.company} EV revenue`} value={comp.evRevenue} suffix="×" onChange={(evRevenue) => updateComp(comp.id, { evRevenue })} /></td>
                <td className="border-r border-t border-hairline-strong px-3 py-3"><NumberCell label={`${comp.company} EV EBITDA`} value={comp.evEbitda} suffix="×" onChange={(evEbitda) => updateComp(comp.id, { evEbitda })} /></td>
                <td className="border-r border-t border-hairline-strong px-3 py-3"><NumberCell label={`${comp.company} revenue growth`} value={comp.revenueGrowth} suffix="%" onChange={(revenueGrowth) => updateComp(comp.id, { revenueGrowth })} /></td>
                <td className="border-r border-t border-hairline-strong px-3 py-3"><NumberCell label={`${comp.company} gross margin`} value={comp.grossMargin} suffix="%" onChange={(grossMargin) => updateComp(comp.id, { grossMargin })} /></td>
                <td className="border-r border-t border-hairline-strong px-3 py-3"><NumberCell label={`${comp.company} EBITDA margin`} value={comp.ebitdaMargin} suffix="%" onChange={(ebitdaMargin) => updateComp(comp.id, { ebitdaMargin })} /></td>
                <td className="border-t border-hairline-strong px-3 py-3">
                  <button type="button" onClick={() => {
                    const next = activeComps.filter((row) => row.id !== comp.id)
                    if (onCompsChange) {
                      onCompsChange(next)
                    } else {
                      setInternalComps(next)
                    }
                  }} className="h-8 w-8 border-2 border-hairline-strong bg-card text-lg font-semibold leading-none hover:bg-secondary" aria-label={`Remove ${comp.company}`}>−</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid border-t-2 border-hairline-strong xl:grid-cols-[1.25fr_0.75fr]">
        <section className="border-b-2 border-hairline-strong xl:border-r-2 xl:border-b-0">
          <div className="border-b-2 border-hairline-strong bg-bone px-5 py-4">
            <Eyebrow>Comp statistics · included comps only</Eyebrow>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="bg-dark text-on-dark">
                  {['Statistic', 'EV / Revenue', 'EV / EBITDA', 'Revenue growth', 'Gross margin', 'EBITDA margin'].map((label) => <th key={label} className="caption-tight border-r border-divider-dark px-3 py-3 last:border-r-0">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {statRows.map(([label, point]) => (
                  <tr key={label} className={label === 'Median' ? 'bg-primary/15' : 'bg-card'}>
                    <th className="caption-tight border-r border-t border-hairline-strong px-3 py-3">{label}</th>
                    {[metrics.revenue, metrics.ebitda, metrics.growth, metrics.grossMargin, metrics.ebitdaMargin].map((values, index) => (
                      <td key={index} className="code-sm border-r border-t border-hairline-strong px-3 py-3 text-right last:border-r-0">
                        {percentile(values, point).toFixed(1)}{index < 2 ? '×' : '%'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-bone p-5 md:p-6">
          <Eyebrow>Selected exit multiple</Eyebrow>
          <h4 className="heading-md mt-2">Choose the valuation method</h4>
          <div className="mt-4 grid grid-cols-2 border-2 border-hairline-strong">
            {(['revenue', 'ebitda'] as const).map((value) => (
              <button key={value} type="button" onClick={() => { setMethod(value); setOverride('') }} className={`h-11 text-sm font-semibold uppercase ${value === 'ebitda' ? 'border-l-2 border-hairline-strong' : ''} ${method === value ? 'bg-dark text-on-dark' : 'bg-card text-ink hover:bg-secondary'}`}>{value}</button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-2 border-hairline-strong bg-card p-3">
              <span className="code-sm block text-mute">Peer median</span>
              <strong className="code-md mt-1 block">{peerMedian.toFixed(1)}×</strong>
            </div>
            <label className="border-2 border-hairline-strong bg-card p-3">
              <span className="code-sm block text-mute">Override · optional</span>
              <div className="mt-1 flex items-center">
                <input type="number" min="0" step="0.1" value={override} onChange={(event) => setOverride(event.target.value)} placeholder="Use median" className="code-md min-w-0 flex-1 bg-transparent text-right text-ink outline-none" />
                <span className="code-md ml-1">×</span>
              </div>
            </label>
          </div>
          <div className="mt-3 border-2 border-primary bg-primary/15 p-4">
            <span className="code-sm block text-charcoal">Selected {method === 'revenue' ? 'EV / Revenue' : 'EV / EBITDA'}</span>
            <strong className="display-md mt-1 block text-ink">{selectedMultiple.toFixed(1)}×</strong>
          </div>
          <div className="mt-3 space-y-2 border-2 border-hairline-strong bg-card p-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-charcoal">Required enterprise value</span><strong className="code-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(requiredEnterpriseValue)}</strong></div>
            <div className="flex justify-between gap-3"><span className="text-charcoal">Required {method === 'revenue' ? 'revenue' : 'EBITDA'}</span><strong className="code-sm">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(requiredOperatingMetric)}</strong></div>
          </div>
        </section>
      </div>
    </Card>
  )
}
