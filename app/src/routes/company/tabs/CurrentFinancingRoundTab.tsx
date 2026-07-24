import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Eyebrow } from '../../../components/ui/Eyebrow'
import type { Company } from '../../../lib/types'
import {
  calculateFinancing,
  FINANCING_STAGES,
  loadFinancingInputs,
  saveFinancingInputs,
  type FinancingInputs,
} from '../financingRoundData'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center">
      <span className="code-md border-2 border-r-0 border-hairline-strong bg-bone px-3 py-2.5 text-charcoal">$</span>
      <input
        type="number"
        min="0"
        step="100000"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Math.max(Number(event.target.value), 0))}
        className="code-md h-11 min-w-0 flex-1 rounded-none border-2 border-hairline-strong bg-card px-3 text-right text-ink focus:z-10 focus:outline-3 focus:outline-ring-focus"
      />
    </div>
  )
}

export function CurrentFinancingRoundTab({
  company,
  onLaunchValuationBot,
}: {
  company: Company
  onLaunchValuationBot: () => void
}) {
  const [inputs, setInputs] = useState<FinancingInputs>(() => loadFinancingInputs(company))

  useEffect(() => {
    saveFinancingInputs(company.id, inputs)
  }, [company.id, inputs])

  function update(patch: Partial<FinancingInputs>) {
    setInputs((current) => ({ ...current, ...patch }))
  }

  const {
    preMoneyValuation,
    postMoneyValuation,
    roundDilutionPct,
    matterNewOwnershipPct,
    proFormaMatterOwnershipPct,
  } = calculateFinancing(inputs)
  const checkExceedsRound = inputs.matterInvestment > inputs.roundSize && inputs.roundSize > 0

  const outputRows = [
    ['Calculated pre-money valuation', currency.format(preMoneyValuation), 'Post-money less the total round'],
    ['Calculated post-money valuation', currency.format(postMoneyValuation), 'Pre-money plus the total round'],
    ['Round dilution', `${roundDilutionPct.toFixed(1)}%`, 'Ownership sold to all investors in this round'],
    ['Matter ownership from new check', `${matterNewOwnershipPct.toFixed(1)}%`, 'Matter check divided by post-money valuation'],
    ['Matter pro-forma ownership', `${proFormaMatterOwnershipPct.toFixed(1)}%`, 'Diluted existing stake plus new ownership'],
  ] as const

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-hairline-strong bg-bone p-5 md:p-6">
          <div>
            <Eyebrow>Deal terms</Eyebrow>
            <h2 className="heading-md mt-2">Current financing round</h2>
            <p className="mt-1 text-sm text-body">Enter the terms from the financing process. Deal math updates automatically.</p>
          </div>
          <div className="code-sm border-2 border-hairline-strong bg-card px-3 py-2 text-charcoal">
            Matter check: <strong className="text-ink">{currency.format(inputs.matterInvestment)}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-dark text-on-dark">
                <th className="caption-tight w-[34%] border-r border-divider-dark px-5 py-3">Deal input</th>
                <th className="caption-tight w-[38%] border-r border-divider-dark px-5 py-3">Value</th>
                <th className="caption-tight px-5 py-3">How it is used</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-card">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">Financing round</th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <select
                    value={inputs.roundStage}
                    onChange={(event) => update({ roundStage: event.target.value })}
                    aria-label="Financing round"
                    className="h-11 w-full rounded-none border-2 border-hairline-strong bg-card px-3 text-base font-semibold text-ink focus:outline-3 focus:outline-ring-focus"
                  >
                    {FINANCING_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                  </select>
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">The financing stage currently being evaluated.</td>
              </tr>
              <tr className="bg-bone">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">Total round size</th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <MoneyInput label="Total round size" value={inputs.roundSize} onChange={(roundSize) => update({ roundSize })} />
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">All primary capital expected to close in the round.</td>
              </tr>
              <tr className="bg-card">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">Quoted valuation</th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <MoneyInput label="Quoted valuation" value={inputs.enteredValuation} onChange={(enteredValuation) => update({ enteredValuation })} />
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">The valuation stated in the term sheet or financing discussion.</td>
              </tr>
              <tr className="bg-bone">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">Valuation basis</th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <div className="grid grid-cols-2 border-2 border-hairline-strong">
                    {(['pre-money', 'post-money'] as const).map((basis) => (
                      <button
                        key={basis}
                        type="button"
                        aria-pressed={inputs.valuationBasis === basis}
                        onClick={() => update({ valuationBasis: basis })}
                        className={`h-10 text-sm font-semibold capitalize ${basis === 'post-money' ? 'border-l-2 border-hairline-strong' : ''} ${inputs.valuationBasis === basis ? 'bg-dark text-on-dark' : 'bg-card text-ink hover:bg-bone'}`}
                      >
                        {basis}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">Whether the quoted valuation is before or after the new capital.</td>
              </tr>
              <tr className="bg-card">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">Matter investment amount</th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <MoneyInput label="Matter investment amount" value={inputs.matterInvestment} onChange={(matterInvestment) => update({ matterInvestment })} />
                  {checkExceedsRound && <p className="code-sm mt-2 text-red-700">Matter’s check exceeds the total round size.</p>}
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">Matter’s proposed primary investment in this round.</td>
              </tr>
              <tr className="bg-bone">
                <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">
                  Existing Matter ownership <span className="font-normal text-mute">(optional)</span>
                </th>
                <td className="border-r border-t border-hairline-strong px-5 py-3">
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={inputs.existingOwnershipPct}
                      aria-label="Existing Matter ownership"
                      onChange={(event) => update({ existingOwnershipPct: Math.min(Math.max(Number(event.target.value), 0), 100) })}
                      className="code-md h-11 min-w-0 flex-1 rounded-none border-2 border-hairline-strong bg-card px-3 text-right text-ink focus:z-10 focus:outline-3 focus:outline-ring-focus"
                    />
                    <span className="code-md border-2 border-l-0 border-hairline-strong bg-bone px-3 py-2.5 text-charcoal">%</span>
                  </div>
                </td>
                <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">Matter’s fully diluted ownership immediately before this round.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-hairline-strong bg-bone p-5 md:px-6">
          <Eyebrow>Calculated deal math</Eyebrow>
          <p className="mt-1 text-sm text-body">Read-only outputs derived from the deal inputs above.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="bg-dark text-on-dark">
                <th className="caption-tight w-[42%] border-r border-divider-dark px-5 py-3">Output</th>
                <th className="caption-tight w-[24%] border-r border-divider-dark px-5 py-3 text-right">Calculated value</th>
                <th className="caption-tight px-5 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {outputRows.map(([label, value, note], index) => (
                <tr key={label} className={index % 2 ? 'bg-bone' : 'bg-card'}>
                  <th className="caption-tight border-r border-t border-hairline-strong px-5 py-4">{label}</th>
                  <td className="code-md border-r border-t border-hairline-strong px-5 py-4 text-right text-ink">{value}</td>
                  <td className="caption border-t border-hairline-strong px-5 py-4 text-charcoal">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onLaunchValuationBot}
          className="h-12 border-2 border-hairline-strong bg-primary px-6 text-sm font-semibold text-on-primary shadow-brutal-sm transition-colors hover:bg-primary-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring-focus"
        >
          Launch Valuation Bot
        </button>
      </div>
    </div>
  )
}
