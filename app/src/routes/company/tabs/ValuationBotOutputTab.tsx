import { useCallback, useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Eyebrow } from '../../../components/ui/Eyebrow'
import type { Company } from '../../../lib/types'
import { calculateFinancing, loadFinancingInputs, normalizeRoundStage } from '../financingRoundData'
import { PublicCompsSection, seedComps, type CompRow, type CompsSelection } from './PublicCompsSection'
import { RequiredFundReturnSection, type OwnershipPath, type Scenario } from './RequiredFundReturnSection'

type ScheduleRow = {
  stage: string
  year: number
  roundSize: number
  preMoney: number
  followOn: number
  current?: boolean
  exit?: boolean
}

function seriesIndex(stage: string): number | null {
  const match = stage.match(/^Series ([A-Z]+)$/i)
  if (!match) return null
  return [...match[1].toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

function seriesLabel(index: number): string {
  let value = Math.max(index, 0) + 1
  let letters = ''
  while (value > 0) {
    value -= 1
    letters = String.fromCharCode(65 + (value % 26)) + letters
    value = Math.floor(value / 26)
  }
  return `Series ${letters}`
}

function reletterModeledRounds(rows: ScheduleRow[]): ScheduleRow[] {
  const currentSeries = rows.find((row) => row.current)
  let nextIndex = (currentSeries ? seriesIndex(currentSeries.stage) : null) ?? -1
  nextIndex += 1
  return rows.map((row) => {
    if (row.current || row.exit) return row
    const stage = seriesLabel(nextIndex)
    nextIndex += 1
    return { ...row, stage }
  })
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const fullMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function buildSchedule(company: Company): ScheduleRow[] {
  const inputs = loadFinancingInputs(company)
  const financing = calculateFinancing(inputs)
  const currentYear = new Date().getFullYear()
  const startingRound = inputs.roundSize || Math.max(inputs.matterInvestment * 4, 5_000_000)
  const startingPreMoney = financing.preMoneyValuation || company.model?.valuation || 25_000_000
  const currentStage = normalizeRoundStage(inputs.roundStage)
  const currentSeriesIndex = seriesIndex(currentStage)
  const firstFutureSeries = currentSeriesIndex == null ? 0 : currentSeriesIndex + 1
  const futureStages = [0, 1, 2].map((offset) => seriesLabel(firstFutureSeries + offset))

  const rows: ScheduleRow[] = [{
    stage: currentStage,
    year: currentYear,
    roundSize: startingRound,
    preMoney: startingPreMoney,
    followOn: inputs.matterInvestment,
    current: true,
  }]

  let priorPostMoney = startingPreMoney + startingRound
  futureStages.forEach((stage, index) => {
    const roundSize = startingRound * [2, 4.5, 9][index]
    const preMoney = priorPostMoney * [2, 2.1, 2.2][index]
    rows.push({
      stage,
      year: currentYear + (index + 1) * 2,
      roundSize,
      preMoney,
      followOn: index < 2 ? inputs.matterInvestment : 0,
    })
    priorPostMoney = preMoney + roundSize
  })
  rows.push({
    stage: 'Exit',
    year: currentYear + 8,
    roundSize: 0,
    preMoney: 0,
    followOn: 0,
    exit: true,
  })
  return rows
}

function EditableMoney({
  value,
  label,
  onChange,
}: {
  value: number
  label: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex min-w-[126px] items-center border-2 border-hairline-strong bg-card focus-within:outline-2 focus-within:outline-ring-focus">
      <span className="code-sm border-r border-hairline-strong bg-bone px-2 py-2 text-charcoal">$</span>
      <input
        type="number"
        min="0"
        step="1000000"
        value={Math.round(value)}
        aria-label={label}
        onChange={(event) => onChange(Math.max(Number(event.target.value), 0))}
        className="code-sm h-9 w-full min-w-0 bg-transparent px-2 text-right text-ink outline-none"
      />
    </div>
  )
}

export function ValuationBotOutputTab({ company }: { company: Company }) {
  const inputs = useMemo(() => loadFinancingInputs(company), [company])
  const current = useMemo(() => calculateFinancing(inputs), [inputs])
  const [schedule, setSchedule] = useState<ScheduleRow[]>(() => buildSchedule(company))
  const [compsSelection, setCompsSelection] = useState<CompsSelection>({
    method: 'revenue',
    selectedMultiple: 8,
    revenueMultiple: 8,
    ebitdaMultiple: 24,
  })
  const initialReserve = inputs.matterInvestment * 3
  const [compsRows, setCompsRows] = useState<CompRow[]>(() => seedComps(company))
  const [ownershipPath, setOwnershipPath] = useState<OwnershipPath>('benchmark')
  const [scenario, setScenario] = useState<Scenario>('Base')
  const [fundReturnTarget, setFundReturnTarget] = useState(60_000_000)
  const [netDebt, setNetDebt] = useState(0)
  const [exitYearTam, setExitYearTam] = useState(12_000_000_000)
  const [operatingDriver, setOperatingDriver] = useState('Customers')
  const [revenuePerUnit, setRevenuePerUnit] = useState(2_500_000)
  const [holdingPeriod, setHoldingPeriod] = useState(8)

  function updateRow(index: number, patch: Partial<ScheduleRow>) {
    setSchedule((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  }

  function addStageAfter(index: number) {
    setSchedule((rows) => {
      const clickedRow = rows[index]
      const insertionIndex = clickedRow?.exit ? index : index + 1
      const prior = [...rows].slice(0, insertionIndex).reverse().find((row) => !row.exit) ?? rows[0]
      const next: ScheduleRow = {
        stage: 'Series A',
        year: (prior?.year ?? new Date().getFullYear()) + 2,
        roundSize: Math.max((prior?.roundSize ?? 5_000_000) * 1.5, 5_000_000),
        preMoney: Math.max(((prior?.preMoney ?? 25_000_000) + (prior?.roundSize ?? 0)) * 2, 25_000_000),
        followOn: 0,
      }
      return reletterModeledRounds([...rows.slice(0, insertionIndex), next, ...rows.slice(insertionIndex)])
    })
  }

  function removeStage(index: number) {
    setSchedule((rows) => reletterModeledRounds(rows.filter((row, rowIndex) => rowIndex !== index || row.current)))
  }

  let reserveRemaining = initialReserve
  let ownership = current.proFormaMatterOwnershipPct
  const modeledRows = schedule.map((row, index) => {
    const postMoney = row.preMoney + row.roundSize
    const priorPostMoney = index > 0
      ? schedule[index - 1].preMoney + schedule[index - 1].roundSize
      : 0
    const stepUp = priorPostMoney > 0 && row.preMoney > 0 ? row.preMoney / priorPostMoney : 0
    const dilution = postMoney > 0 ? row.roundSize / postMoney : 0
    if (index > 0 && !row.exit) {
      ownership = ownership * (1 - dilution) + (postMoney > 0 ? row.followOn / postMoney * 100 : 0)
    }
    reserveRemaining = Math.max(reserveRemaining - (row.current ? 0 : row.followOn), 0)
    return { ...row, postMoney, stepUp, dilution, ownership, reserveRemaining }
  })

  const targetMatterProceeds = Math.max(inputs.matterInvestment * 10, 50_000_000)
  const modeledExitOwnershipPct = [...modeledRows].reverse().find((row) => !row.exit)?.ownership
    ?? current.proFormaMatterOwnershipPct
  const pathFactor = ownershipPath === 'pro-rata' ? 1.15 : ownershipPath === 'no-follow-on' ? 0.8 : 1
  const scenarioFactor = scenario === 'Upside' ? 1.1 : scenario === 'Conservative' ? 0.9 : 1
  const exitOwnershipPct = Math.max(modeledExitOwnershipPct * pathFactor * scenarioFactor, 0.1)
  const requiredFundReturnExitValue = fundReturnTarget / (exitOwnershipPct / 100)
  const requiredEquityValue = targetMatterProceeds / (exitOwnershipPct / 100)
  const requiredEnterpriseValue = requiredEquityValue + netDebt
  const requiredRevenue = compsSelection.method === 'revenue' && compsSelection.selectedMultiple > 0
    ? requiredEnterpriseValue / compsSelection.selectedMultiple
    : 0
  const requiredEbitda = compsSelection.method === 'ebitda' && compsSelection.selectedMultiple > 0
    ? requiredEnterpriseValue / compsSelection.selectedMultiple
    : 0
  const requiredMarketShare = exitYearTam > 0 && requiredRevenue > 0 ? requiredRevenue / exitYearTam : 0
  const requiredUnits = revenuePerUnit > 0 && requiredRevenue > 0 ? requiredRevenue / revenuePerUnit : 0
  const displayUnits = Number.isFinite(requiredUnits) && requiredUnits > 0 ? Math.ceil(requiredUnits).toLocaleString() : 'Insufficient information'
  const selectedLabel = compsSelection.method === 'revenue' ? 'revenue' : 'EBITDA'
  const operatingLabel = operatingDriver.toLowerCase().replace(/s$/, '') || 'unit'
  const totalMatterInvestment = schedule
    .filter((row) => !row.exit)
    .reduce((total, row) => total + row.followOn, 0)
  const summaryParagraph1 = `Matter invests ${fullMoney.format(inputs.matterInvestment)} in ${company.name} at a ${fullMoney.format(current.postMoneyValuation)} post-money valuation, resulting in ${current.proFormaMatterOwnershipPct.toFixed(1)}% initial ownership. Under the ${ownershipPath === 'pro-rata' ? 'pro rata' : ownershipPath === 'no-follow-on' ? 'no follow-on' : 'benchmark follow-on'} case, Matter invests an additional ${fullMoney.format(totalMatterInvestment - inputs.matterInvestment)} and owns approximately ${exitOwnershipPct.toFixed(1)}% at exit. A ${money.format(targetMatterProceeds)} return requires ${fullMoney.format(requiredEquityValue)} of proceeds and a ${fullMoney.format(requiredEquityValue)} exit equity value. Returning Matter’s entire ${fullMoney.format(fundReturnTarget)} fund requires a ${fullMoney.format(requiredFundReturnExitValue)} exit equity value.`
  const summaryParagraph2 = `At the selected ${compsSelection.selectedMultiple.toFixed(1)}× ${selectedLabel} multiple, ${company.name} must generate approximately ${fullMoney.format(compsSelection.method === 'revenue' ? requiredRevenue : requiredEbitda)} in the exit year. This represents ${(requiredMarketShare * 100).toFixed(1)}% of the estimated market and approximately ${displayUnits} ${operatingLabel}. The required outcome ${requiredRevenue > 0 && requiredMarketShare < 0.2 ? 'appears achievable but aggressive' : 'requires further support from management and market evidence'}.`
  const summaryText = [summaryParagraph1, summaryParagraph2].join('\n\n')
  const compMetrics = useMemo(() => {
    const included = compsRows.filter((row) => row.included)
    return {
      revenue: included.map((row) => row.evRevenue),
      ebitda: included.map((row) => row.evEbitda),
      growth: included.map((row) => row.revenueGrowth),
      grossMargin: included.map((row) => row.grossMargin),
      ebitdaMargin: included.map((row) => row.ebitdaMargin),
    }
  }, [compsRows])
  const q25Revenue = useMemo(() => {
    const values = compMetrics.revenue
    if (!values.length) return 0
    return values.sort((a, b) => a - b)[Math.floor((values.length - 1) * 0.25)]
  }, [compMetrics.revenue])
  const q75Revenue = useMemo(() => {
    const values = [...compMetrics.revenue].sort((a, b) => a - b)
    if (!values.length) return 0
    return values[Math.floor((values.length - 1) * 0.75)]
  }, [compMetrics.revenue])
  const growthRate = company.model?.growthPct ?? 0
  const grossMargin = company.model?.grossMarginPct ?? 0
  const ebitdaMargin = company.model?.grossMarginPct ?? 0
  const feasibilityRows = [
    {
      area: 'Revenue requirement',
      assessment: compsSelection.selectedMultiple >= q75Revenue ? 'Aggressive' : compsSelection.selectedMultiple >= q25Revenue ? 'Supported' : 'Insufficient information',
      explanation: compsSelection.selectedMultiple >= q75Revenue
        ? `The required exit multiple exceeds the public-comp 75th percentile for included comps.`
        : compsSelection.selectedMultiple >= q25Revenue
          ? `The selected multiple sits within the public-comp range used for the underwriting case.`
          : 'The selected multiple could not be benchmarked because the peer set is incomplete.',
    },
    {
      area: 'Growth rate',
      assessment: growthRate > 0 ? (growthRate >= Math.max(...compMetrics.growth) / 2 ? 'Supported' : 'Aggressive') : 'Insufficient information',
      explanation: growthRate > 0
        ? `Management’s projected growth is ${growthRate.toFixed(1)}%, versus the included-comp range of ${Math.min(...compMetrics.growth).toFixed(1)}%–${Math.max(...compMetrics.growth).toFixed(1)}%.`
        : 'Management growth evidence was not provided.',
    },
    {
      area: 'Gross margin',
      assessment: grossMargin > 0 ? (grossMargin >= Math.min(...compMetrics.grossMargin) ? 'Supported' : 'Aggressive') : 'Insufficient information',
      explanation: grossMargin > 0
        ? `The margin assumption of ${grossMargin.toFixed(1)}% is at or above the included-comp gross margin floor.`
        : 'No gross-margin evidence was provided to benchmark the required outcome.',
    },
    {
      area: 'EBITDA margin',
      assessment: ebitdaMargin > 0 ? (ebitdaMargin >= Math.min(...compMetrics.ebitdaMargin) ? 'Supported' : 'Aggressive') : 'Insufficient information',
      explanation: ebitdaMargin > 0
        ? `The EBITDA-margin assumption of ${ebitdaMargin.toFixed(1)}% is at or above the included-comp EBITDA margin floor.`
        : 'No EBITDA-margin evidence was provided to benchmark the required outcome.',
    },
    {
      area: 'Operating scale',
      assessment: requiredUnits > 0 ? (requiredUnits <= 1_000_000 ? 'Supported' : 'Aggressive') : 'Insufficient information',
      explanation: requiredUnits > 0
        ? `The implied operating scale is ${displayUnits} ${operatingLabel} for the selected exit case.`
        : 'The required operating scale could not be supported because the driver input or revenue-per-unit assumption is missing.',
    },
    {
      area: 'Market share',
      assessment: requiredMarketShare > 0 ? (requiredMarketShare <= 0.1 ? 'Supported' : requiredMarketShare <= 0.2 ? 'Aggressive' : 'Highly aggressive') : 'Insufficient information',
      explanation: requiredMarketShare > 0
        ? `The required market share is ${(requiredMarketShare * 100).toFixed(1)}% of the exit-year TAM assumption.`
        : 'The TAM input is missing, so the market-share requirement cannot be validated.',
    },
    {
      area: 'Capital requirement',
      assessment: totalMatterInvestment > 0 ? 'Aggressive' : 'Insufficient information',
      explanation: totalMatterInvestment > 0
        ? 'The financing plan requires a meaningful follow-on commitment and should be tested against funding capacity.'
        : 'A complete capital plan was not provided.',
    },
    {
      area: 'Commercial milestones',
      assessment: company.summary ? 'Supported' : 'Insufficient information',
      explanation: company.summary ? 'The company summary provides a baseline narrative for the required operating milestones.' : 'No commercial milestone evidence was supplied for the required outcome.',
    },
  ]
  const overallAssessment = requiredRevenue > 0 && requiredMarketShare > 0.2
    ? 'Highly aggressive'
    : requiredRevenue > 0 && requiredMarketShare > 0.1
      ? 'Achievable but aggressive'
      : requiredRevenue > 0
        ? 'Achievable'
        : 'Insufficient information'
  const overallExplanation = requiredRevenue > 0 && requiredMarketShare > 0.2
    ? 'The revenue and operating-scale requirements materially exceed the current peer and management benchmarks, so the case is only supportable with a very strong execution outcome.'
    : requiredRevenue > 0 && requiredMarketShare > 0.1
      ? 'The required revenue and operating scale are above the current benchmark range, but the case remains supportable with a stronger go-to-market and margin outcome.'
      : requiredRevenue > 0
        ? 'The required outcome is broadly supportable under the selected assumptions.'
        : 'The required outcome cannot be assessed because the valuation, TAM, or operating inputs are missing.'
  const handleCopySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
    } catch {
      // Ignore clipboard failures and keep the UI responsive.
    }
  }, [summaryText])
  const updateSelectedExitMultiple = useCallback((selection: CompsSelection) => {
    setCompsSelection(selection)
  }, [])
  const sensitivities = [
    [5, 'Low ownership case'],
    [7.5, 'Mid-low ownership case'],
    [10, 'Base sensitivity point'],
    [12.5, 'Higher ownership case'],
    [15, 'High ownership case'],
  ] as const

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border-2 border-hairline-strong bg-dark text-on-dark shadow-brutal">
        <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-primary" />
              <Eyebrow className="text-hero-glow">Valuation Bot Output</Eyebrow>
            </div>
            <h2 className="display-md mt-3">Financing schedule</h2>
            <p className="mt-3 max-w-[650px] text-sm text-on-dark-mute">
              A forward view of dilution, reserves, and ownership. The current round comes directly from Deal Terms; blue cells are editable future-round assumptions.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px border border-divider-dark bg-divider-dark">
            <div className="bg-deep p-3">
              <span className="code-sm text-on-dark-mute">Current post-money</span>
              <strong className="code-md mt-1 block">{money.format(current.postMoneyValuation)}</strong>
            </div>
            <div className="bg-deep p-3">
              <span className="code-sm text-on-dark-mute">Matter check</span>
              <strong className="code-md mt-1 block">{money.format(inputs.matterInvestment)}</strong>
            </div>
            <div className="bg-deep p-3">
              <span className="code-sm text-on-dark-mute">Initial ownership</span>
              <strong className="code-md mt-1 block">{current.proFormaMatterOwnershipPct.toFixed(1)}%</strong>
            </div>
            <div className="bg-deep p-3">
              <span className="code-sm text-on-dark-mute">Modeled reserve</span>
              <strong className="code-md mt-1 block">{money.format(initialReserve)}</strong>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-hairline-strong bg-bone p-5">
          <div>
            <Eyebrow>Future financing assumptions</Eyebrow>
            <p className="mt-1 text-sm text-body">Edit the future rounds to test a different financing path.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="code-sm border-2 border-hairline-strong bg-primary/15 px-2.5 py-1.5 text-ink">Current terms</span>
            <span className="code-sm border-2 border-hairline-strong bg-secondary px-2.5 py-1.5 text-ink">Editable assumption</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] border-collapse text-left">
            <thead>
              <tr className="bg-dark text-on-dark">
                {['Stage', 'Year', 'Round size', 'Pre-money', 'Post-money', 'Step-up', 'New dilution', 'Matter follow-on', 'Reserve remaining', 'Ownership after', ''].map((label, index) => (
                  <th key={`${label}-${index}`} className="caption-tight border-r border-divider-dark px-3 py-3 last:border-r-0">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modeledRows.map((row, index) => (
                <tr key={index} className={`group transition-colors hover:bg-secondary hover:-outline-offset-2 hover:outline-2 hover:outline-charcoal ${row.current ? 'bg-primary/10' : index % 2 ? 'bg-card' : 'bg-bone'}`}>
                  <td className="border-r border-t border-hairline-strong px-3 py-3 transition-colors group-hover:border-charcoal">
                    <input
                      value={row.stage}
                      readOnly
                      className={`code-sm h-9 w-32 cursor-default border-2 border-hairline-strong px-2 font-semibold text-ink outline-none transition-colors group-hover:border-charcoal ${row.current ? 'bg-primary/15' : 'bg-secondary'}`}
                      aria-label={`Stage for row ${index + 1}`}
                    />
                  </td>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3">
                    {row.current || row.exit ? row.year : (
                      <input type="number" value={row.year} onChange={(event) => updateRow(index, { year: Number(event.target.value) })} className="h-9 w-20 border-2 border-hairline-strong bg-secondary px-2 text-right outline-none focus:outline-2 focus:outline-ring-focus" aria-label={`Year for ${row.stage}`} />
                    )}
                  </td>
                  <td className="border-r border-t border-hairline-strong px-3 py-3">{row.exit ? '—' : row.current ? <span className="code-sm text-ink">{money.format(row.roundSize)}</span> : <EditableMoney label={`${row.stage} round size`} value={row.roundSize} onChange={(roundSize) => updateRow(index, { roundSize })} />}</td>
                  <td className="border-r border-t border-hairline-strong px-3 py-3">{row.exit ? '—' : row.current ? <span className="code-sm text-ink">{money.format(row.preMoney)}</span> : <EditableMoney label={`${row.stage} pre-money valuation`} value={row.preMoney} onChange={(preMoney) => updateRow(index, { preMoney })} />}</td>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3 text-right">{row.exit ? '—' : money.format(row.postMoney)}</td>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3 text-right">{row.stepUp ? `${row.stepUp.toFixed(1)}×` : '—'}</td>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3 text-right">{row.exit ? '—' : `${(row.dilution * 100).toFixed(1)}%`}</td>
                  <td className="border-r border-t border-hairline-strong px-3 py-3">{row.current ? <span className="code-sm text-ink">{money.format(row.followOn)}</span> : row.exit ? '—' : <EditableMoney label={`${row.stage} Matter follow-on`} value={row.followOn} onChange={(followOn) => updateRow(index, { followOn })} />}</td>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3 text-right">{money.format(row.reserveRemaining)}</td>
                  <td className="code-sm border-t border-hairline-strong px-3 py-3 text-right font-semibold">{row.ownership.toFixed(1)}%</td>
                  <td className="border-t border-l border-hairline-strong px-3 py-3 transition-colors group-hover:border-charcoal">
                    {!row.exit && (
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addStageAfter(index)}
                          className="h-8 w-8 border-2 border-hairline-strong bg-primary text-lg font-semibold leading-none text-on-primary hover:bg-primary-deep"
                          aria-label={`Add round after ${row.stage}`}
                          title="Add next round"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStage(index)}
                          disabled={row.current}
                          className="h-8 w-8 border-2 border-hairline-strong bg-card text-lg font-semibold leading-none text-ink hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Remove ${row.stage}`}
                          title={row.current ? 'Current round cannot be removed' : 'Remove round'}
                        >
                          −
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-4 border-b-2 border-hairline-strong bg-bone p-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Eyebrow>Exit ownership sensitivity</Eyebrow>
            <h3 className="heading-md mt-2">What must the company become?</h3>
            <p className="mt-1 text-sm text-body">Required outcomes to generate {money.format(targetMatterProceeds)} of proceeds using the selected {compsSelection.selectedMultiple.toFixed(1)}× {compsSelection.method === 'revenue' ? 'revenue' : 'EBITDA'} multiple.</p>
          </div>
          <div className="code-sm border-2 border-hairline-strong bg-card px-3 py-2 text-charcoal">
            Target Matter proceeds <strong className="ml-2 text-ink">{fullMoney.format(targetMatterProceeds)}</strong>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="bg-dark text-on-dark">
                <th className="caption-tight border-r border-divider-dark px-5 py-3">Exit ownership</th>
                <th className="caption-tight border-r border-divider-dark px-5 py-3 text-right">Required equity value</th>
                <th className="caption-tight border-r border-divider-dark px-5 py-3 text-right">Required {compsSelection.method === 'revenue' ? 'revenue' : 'EBITDA'}</th>
                <th className="caption-tight px-5 py-3">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {sensitivities.map(([ownershipPct, note], index) => {
                const equityValue = targetMatterProceeds / (ownershipPct / 100)
                return (
                  <tr key={ownershipPct} className={ownershipPct === 10 ? 'bg-primary/10' : index % 2 ? 'bg-bone' : 'bg-card'}>
                    <td className="code-md border-r border-t border-hairline-strong px-5 py-3">{ownershipPct.toFixed(1)}%</td>
                    <td className="code-md border-r border-t border-hairline-strong px-5 py-3 text-right">{money.format(equityValue)}</td>
                    <td className="code-md border-r border-t border-hairline-strong px-5 py-3 text-right">{money.format(compsSelection.selectedMultiple > 0 ? equityValue / compsSelection.selectedMultiple : 0)}</td>
                    <td className="caption border-t border-hairline-strong px-5 py-3 text-charcoal">{note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <PublicCompsSection company={company} targetMatterProceeds={targetMatterProceeds} onSelectedMultipleChange={updateSelectedExitMultiple} comps={compsRows} onCompsChange={setCompsRows} />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-hairline-strong bg-bone p-5">
          <div>
            <Eyebrow>Highlights summary</Eyebrow>
            <h3 className="heading-md mt-2">Reverse-underwriting memo</h3>
            <p className="mt-1 max-w-[760px] text-sm text-body">Dynamic narrative built from the financing schedule, selected comps, and required-return outputs.</p>
          </div>
          <button type="button" onClick={handleCopySummary} className="code-sm border-2 border-hairline-strong bg-primary px-3 py-2 font-semibold text-on-primary shadow-brutal-sm hover:bg-primary-deep">Copy Memo Text</button>
        </div>
        <div className="space-y-4 bg-card p-5">
          <p className="text-sm leading-7 text-ink">{summaryParagraph1}</p>
          <p className="text-sm leading-7 text-ink">{summaryParagraph2}</p>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-hairline-strong bg-bone p-5">
          <Eyebrow>Feasibility flags</Eyebrow>
          <h3 className="heading-md mt-2">Area-by-area underwriting view</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-dark text-on-dark">
                <th className="caption-tight border-r border-divider-dark px-3 py-3">Area</th>
                <th className="caption-tight border-r border-divider-dark px-3 py-3">Assessment</th>
                <th className="caption-tight px-3 py-3">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {feasibilityRows.map((row) => (
                <tr key={row.area} className="bg-card">
                  <th className="caption-tight border-r border-t border-hairline-strong px-3 py-3">{row.area}</th>
                  <td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{row.assessment}</td>
                  <td className="caption border-t border-hairline-strong px-3 py-3 text-charcoal">{row.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-hairline-strong bg-bone p-5">
          <Eyebrow>Overall assessment</Eyebrow>
          <h3 className="heading-md mt-2">{overallAssessment}</h3>
          <p className="mt-2 text-sm text-body">{overallExplanation}</p>
        </div>
      </Card>

      <RequiredFundReturnSection
        company={company}
        financingInputs={inputs}
        compsSelection={compsSelection}
        modeledExitOwnershipPct={modeledExitOwnershipPct}
        totalMatterInvestment={totalMatterInvestment}
        ownershipPath={ownershipPath}
        onOwnershipPathChange={setOwnershipPath}
        scenario={scenario}
        onScenarioChange={setScenario}
        fundReturnTarget={fundReturnTarget}
        onFundReturnTargetChange={setFundReturnTarget}
        netDebt={netDebt}
        onNetDebtChange={setNetDebt}
        exitYearTam={exitYearTam}
        onExitYearTamChange={setExitYearTam}
        operatingDriver={operatingDriver}
        onOperatingDriverChange={setOperatingDriver}
        revenuePerUnit={revenuePerUnit}
        onRevenuePerUnitChange={setRevenuePerUnit}
        holdingPeriod={holdingPeriod}
        onHoldingPeriodChange={setHoldingPeriod}
      />
    </div>
  )
}
