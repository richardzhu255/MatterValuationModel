import { useMemo } from 'react'
import { Card } from '../../../components/ui/Card'
import { Eyebrow } from '../../../components/ui/Eyebrow'
import type { Company } from '../../../lib/types'
import type { FinancingInputs } from '../financingRoundData'
import type { CompsSelection } from './PublicCompsSection'

const compactMoney = new Intl.NumberFormat('en-US', {
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

const HEAT = ['bg-[#ffd9d4]', 'bg-[#ffe6ca]', 'bg-[#fff0b8]', 'bg-[#e5f2bd]', 'bg-[#d5f2d7]']

export type OwnershipPath = 'benchmark' | 'pro-rata' | 'no-follow-on'
export type Scenario = 'Base' | 'Upside' | 'Conservative'

function MoneyControl({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="mt-2 flex border-2 border-hairline-strong bg-card focus-within:outline-2 focus-within:outline-ring-focus">
      <span className="code-md border-r border-hairline-strong bg-bone px-3 py-2.5">$</span>
      <input type="number" min="0" step="1000000" value={value} onChange={(event) => onChange(Math.max(Number(event.target.value), 0))} aria-label={label} className="code-md h-11 min-w-0 flex-1 bg-transparent px-3 text-right outline-none" />
    </div>
  )
}

function SensitivityGrid({
  title,
  subtitle,
  rows,
  columns,
  values,
  format,
}: {
  title: string
  subtitle: string
  rows: { label: string; featured: boolean }[]
  columns: string[]
  values: number[][]
  format: (value: number) => string
}) {
  return (
    <section className="overflow-hidden border-2 border-hairline-strong bg-card">
      <div className="border-b-2 border-hairline-strong bg-bone p-4">
        <Eyebrow>{title}</Eyebrow>
        <p className="mt-1 text-sm text-body">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-dark text-on-dark">
              <th className="caption-tight border-r border-divider-dark px-3 py-3">Entry post-money</th>
              {columns.map((column) => <th key={column} className="caption-tight border-r border-divider-dark px-3 py-3 text-right last:border-r-0">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.label} className={row.featured ? 'outline-2 -outline-offset-2 outline-primary' : ''}>
                <th className={`code-sm border-r border-t border-hairline-strong px-3 py-3 ${row.featured ? 'bg-primary/15' : 'bg-card'}`}>{row.label}</th>
                {values[rowIndex].map((value, columnIndex) => (
                  <td key={columnIndex} className={`code-sm border-r border-t border-hairline-strong px-3 py-3 text-right font-semibold last:border-r-0 ${HEAT[columnIndex] ?? 'bg-card'}`}>{format(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RequiredFundReturnSection({
  company,
  financingInputs,
  compsSelection,
  modeledExitOwnershipPct,
  totalMatterInvestment,
  ownershipPath,
  onOwnershipPathChange,
  scenario,
  onScenarioChange,
  fundReturnTarget,
  onFundReturnTargetChange,
  netDebt,
  onNetDebtChange,
  exitYearTam,
  onExitYearTamChange,
  operatingDriver,
  onOperatingDriverChange,
  revenuePerUnit,
  onRevenuePerUnitChange,
  holdingPeriod,
  onHoldingPeriodChange,
}: {
  company: Company
  financingInputs: FinancingInputs
  compsSelection: CompsSelection
  modeledExitOwnershipPct: number
  totalMatterInvestment: number
  ownershipPath: OwnershipPath
  onOwnershipPathChange: (value: OwnershipPath) => void
  scenario: Scenario
  onScenarioChange: (value: Scenario) => void
  fundReturnTarget: number
  onFundReturnTargetChange: (value: number) => void
  netDebt: number
  onNetDebtChange: (value: number) => void
  exitYearTam: number
  onExitYearTamChange: (value: number) => void
  operatingDriver: string
  onOperatingDriverChange: (value: string) => void
  revenuePerUnit: number
  onRevenuePerUnitChange: (value: number) => void
  holdingPeriod: number
  onHoldingPeriodChange: (value: number) => void
}) {

  const pathFactor = ownershipPath === 'pro-rata' ? 1.15 : ownershipPath === 'no-follow-on' ? 0.8 : 1
  const scenarioFactor = scenario === 'Upside' ? 1.1 : scenario === 'Conservative' ? 0.9 : 1
  const exitOwnershipPct = Math.max(modeledExitOwnershipPct * pathFactor * scenarioFactor, 0.1)
  const requiredProceeds = fundReturnTarget
  const requiredEquityValue = requiredProceeds / (exitOwnershipPct / 100)
  const requiredEnterpriseValue = requiredEquityValue + netDebt
  const requiredRevenue = compsSelection.revenueMultiple > 0 ? requiredEnterpriseValue / compsSelection.revenueMultiple : 0
  const requiredEbitda = compsSelection.ebitdaMultiple > 0 ? requiredEnterpriseValue / compsSelection.ebitdaMultiple : 0
  const marketShare = exitYearTam > 0 ? requiredRevenue / exitYearTam : 0
  const requiredUnits = revenuePerUnit > 0 ? requiredRevenue / revenuePerUnit : 0
  const moic = totalMatterInvestment > 0 ? requiredProceeds / totalMatterInvestment : 0
  const irr = holdingPeriod > 0 && moic > 0 ? Math.pow(moic, 1 / holdingPeriod) - 1 : 0

  const enteredPostMoney = financingInputs.valuationBasis === 'post-money'
    ? financingInputs.enteredValuation
    : financingInputs.enteredValuation + financingInputs.roundSize
  const entryFactors = [0.75, 0.875, 1, 1.125, 1.25]
  const entryValues = entryFactors.map((factor) => Math.max(enteredPostMoney * factor, 1))
  const initialOwnershipAtEntered = enteredPostMoney > 0 ? financingInputs.matterInvestment / enteredPostMoney * 100 : 0
  const ownershipRetention = initialOwnershipAtEntered > 0 ? exitOwnershipPct / initialOwnershipAtEntered : 1
  const entryCases = entryValues.map((entryValue, index) => {
    const initialOwnership = financingInputs.matterInvestment / entryValue * 100
    const exitOwnership = Math.max(initialOwnership * ownershipRetention, 0.1)
    const equityValue = requiredProceeds / (exitOwnership / 100)
    const enterpriseValue = equityValue + netDebt
    return {
      label: compactMoney.format(entryValue),
      featured: index === 2,
      initialOwnership,
      exitOwnership,
      equityValue,
      enterpriseValue,
    }
  })

  const revenueMultiples = useMemo(() => [0.61, 0.82, 1, 1.34, 1.66].map((factor) => Math.max(compsSelection.revenueMultiple * factor, 0.1)), [compsSelection.revenueMultiple])
  const ebitdaMultiples = useMemo(() => [0.64, 0.81, 1, 1.19, 1.35].map((factor) => Math.max(compsSelection.ebitdaMultiple * factor, 0.1)), [compsSelection.ebitdaMultiple])
  const percentileLabels = ['10th', '25th', 'Median', '75th', '90th']
  const revenueGrid = entryCases.map((entry) => revenueMultiples.map((multiple) => entry.enterpriseValue / multiple))
  const ebitdaGrid = entryCases.map((entry) => ebitdaMultiples.map((multiple) => entry.enterpriseValue / multiple))
  const shareGrid = revenueGrid.map((row) => row.map((revenue) => exitYearTam > 0 ? revenue / exitYearTam : 0))
  const unitsGrid = revenueGrid.map((row) => row.map((revenue) => revenuePerUnit > 0 ? revenue / revenuePerUnit : 0))
  const gridRows = entryCases.map((entry) => ({ label: entry.label, featured: entry.featured }))

  const baseRows = [
    ['Matter exit ownership', `${exitOwnershipPct.toFixed(2)}%`, 'Selected ownership path carried through financing'],
    ['Total Matter investment', compactMoney.format(totalMatterInvestment), 'Initial investment plus modeled follow-ons'],
    ['Required Matter proceeds', compactMoney.format(requiredProceeds), 'Fund return target × 100%'],
    ['Required exit equity value', compactMoney.format(requiredEquityValue), 'Required proceeds ÷ exit ownership'],
    ['Required exit enterprise value', compactMoney.format(requiredEnterpriseValue), 'Equity value + net debt'],
    ['Required revenue', compactMoney.format(requiredRevenue), `Enterprise value ÷ ${compsSelection.revenueMultiple.toFixed(1)}× revenue`],
    ['Required EBITDA', compactMoney.format(requiredEbitda), `Enterprise value ÷ ${compsSelection.ebitdaMultiple.toFixed(1)}× EBITDA`],
    ['Required market share', `${(marketShare * 100).toFixed(1)}%`, 'Required revenue ÷ exit-year TAM'],
    [`Required ${operatingDriver}`, Math.ceil(requiredUnits).toLocaleString(), 'Required revenue ÷ revenue per unit'],
    ['Expected MOIC', `${moic.toFixed(1)}×`, 'Required proceeds ÷ total Matter investment'],
    ['Expected IRR', `${(irr * 100).toFixed(1)}%`, `MOIC over ${holdingPeriod} years`],
  ] as const

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border-2 border-hairline-strong bg-dark text-on-dark shadow-brutal">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-primary" /><Eyebrow className="text-hero-glow">Required outcomes</Eyebrow></div>
          <h2 className="display-md mt-3">What must {company.name} become to return the fund?</h2>
          <p className="mt-3 max-w-[780px] text-sm text-on-dark-mute">Reverse underwriting from Matter’s ownership, investment, and selected public-comp multiples to the operating outcome required at exit.</p>
        </div>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-hairline-strong bg-bone p-5"><Eyebrow>Underwriting controls</Eyebrow></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <label><span className="code-sm uppercase text-mute">Ownership path</span><select value={ownershipPath} onChange={(event) => onOwnershipPathChange(event.target.value as OwnershipPath)} className="mt-2 h-11 w-full border-2 border-hairline-strong bg-card px-3 text-sm font-semibold"><option value="benchmark">Benchmark follow-on</option><option value="pro-rata">Maintain pro rata</option><option value="no-follow-on">No future follow-ons</option></select></label>
          <label><span className="code-sm uppercase text-mute">Financing scenario</span><select value={scenario} onChange={(event) => onScenarioChange(event.target.value as Scenario)} className="mt-2 h-11 w-full border-2 border-hairline-strong bg-card px-3 text-sm font-semibold"><option>Base</option><option>Upside</option><option>Conservative</option></select></label>
          <label><span className="code-sm uppercase text-mute">Fund return target</span><MoneyControl label="Fund return target" value={fundReturnTarget} onChange={onFundReturnTargetChange} /></label>
          <label><span className="code-sm uppercase text-mute">Net debt at exit</span><MoneyControl label="Net debt at exit" value={netDebt} onChange={onNetDebtChange} /></label>
          <label><span className="code-sm uppercase text-mute">Exit-year TAM</span><MoneyControl label="Exit-year TAM" value={exitYearTam} onChange={onExitYearTamChange} /></label>
          <label><span className="code-sm uppercase text-mute">Operating driver</span><input value={operatingDriver} onChange={(event) => onOperatingDriverChange(event.target.value)} className="mt-2 h-11 w-full border-2 border-hairline-strong bg-card px-3 text-sm font-semibold outline-none focus:outline-2 focus:outline-ring-focus" /></label>
          <label><span className="code-sm uppercase text-mute">Revenue per driver unit</span><MoneyControl label="Revenue per driver unit" value={revenuePerUnit} onChange={onRevenuePerUnitChange} /></label>
          <label><span className="code-sm uppercase text-mute">Holding period</span><div className="mt-2 flex border-2 border-hairline-strong bg-card"><input type="number" min="1" max="20" value={holdingPeriod} onChange={(event) => onHoldingPeriodChange(Math.max(Number(event.target.value), 1))} className="code-md h-11 min-w-0 flex-1 px-3 text-right outline-none" /><span className="code-sm border-l border-hairline-strong bg-bone px-3 py-3">years</span></div></label>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-hairline-strong bg-bone p-5"><Eyebrow>Base case · required outcomes at entered valuation</Eyebrow></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead><tr className="bg-dark text-on-dark"><th className="caption-tight border-r border-divider-dark px-4 py-3">Output</th><th className="caption-tight border-r border-divider-dark px-4 py-3 text-right">Value</th><th className="caption-tight px-4 py-3">Formula</th></tr></thead>
            <tbody>{baseRows.map(([label, value, formula], index) => <tr key={label} className={label.includes('Required Matter') || label === 'Required revenue' ? 'bg-primary/15' : index % 2 ? 'bg-bone' : 'bg-card'}><th className="caption-tight border-r border-t border-hairline-strong px-4 py-3">{label}</th><td className="code-md border-r border-t border-hairline-strong px-4 py-3 text-right">{value}</td><td className="caption border-t border-hairline-strong px-4 py-3 text-charcoal">{formula}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <section className="overflow-hidden border-2 border-hairline-strong bg-card">
        <div className="border-b-2 border-hairline-strong bg-bone p-4"><Eyebrow>Required exit equity value by entry valuation</Eyebrow><p className="mt-1 text-sm text-body">Entry-price sensitivity centered on the entered post-money valuation.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead><tr className="bg-dark text-on-dark">{['Entry post-money', 'Initial ownership', 'Exit ownership', 'Required proceeds', 'Required equity value', 'Required enterprise value', 'Case'].map((label) => <th key={label} className="caption-tight border-r border-divider-dark px-3 py-3 last:border-r-0">{label}</th>)}</tr></thead>
            <tbody>{entryCases.map((entry, index) => <tr key={entry.label} className={entry.featured ? 'bg-primary/15 outline-2 -outline-offset-2 outline-primary' : index % 2 ? 'bg-bone' : 'bg-card'}><td className="code-md border-r border-t border-hairline-strong px-3 py-3">{entry.label}</td><td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{entry.initialOwnership.toFixed(2)}%</td><td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{entry.exitOwnership.toFixed(2)}%</td><td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{compactMoney.format(requiredProceeds)}</td><td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{compactMoney.format(entry.equityValue)}</td><td className="code-sm border-r border-t border-hairline-strong px-3 py-3">{compactMoney.format(entry.enterpriseValue)}</td><td className="caption border-t border-hairline-strong px-3 py-3 text-charcoal">{index === 2 ? 'Entered valuation' : `${Math.round(entryFactors[index] * 100)}% case`}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <SensitivityGrid title="Required revenue to return the fund" subtitle="Rows vary entry valuation; columns vary the included-comp revenue multiple." rows={gridRows} columns={percentileLabels.map((label, index) => `${label} · ${revenueMultiples[index].toFixed(1)}×`)} values={revenueGrid} format={(value) => compactMoney.format(value)} />
      <SensitivityGrid title="Required EBITDA to return the fund" subtitle="The same entry cases tested across the included-comp EBITDA multiple range." rows={gridRows} columns={percentileLabels.map((label, index) => `${label} · ${ebitdaMultiples[index].toFixed(1)}×`)} values={ebitdaGrid} format={(value) => compactMoney.format(value)} />
      <SensitivityGrid title="Required market share to return the fund" subtitle={`Required revenue divided by the ${compactMoney.format(exitYearTam)} exit-year TAM assumption.`} rows={gridRows} columns={percentileLabels.map((label, index) => `${label} · ${revenueMultiples[index].toFixed(1)}×`)} values={shareGrid} format={(value) => `${(value * 100).toFixed(1)}%`} />
      <SensitivityGrid title={`Required ${operatingDriver} to return the fund`} subtitle={`Operating scale at ${fullMoney.format(revenuePerUnit)} of annual revenue per ${operatingDriver.toLowerCase().replace(/s$/, '') || 'unit'}.`} rows={gridRows} columns={percentileLabels.map((label, index) => `${label} · ${revenueMultiples[index].toFixed(1)}×`)} values={unitsGrid} format={(value) => Math.ceil(value).toLocaleString()} />
    </div>
  )
}
