import type { Company } from '../../lib/types'

export const FINANCING_STAGES = [
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Series D+',
  'Growth',
  'Bridge',
  'Extension',
  'Other',
] as const

export function normalizeRoundStage(value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const canonical = FINANCING_STAGES.find((stage) => stage.toLowerCase().replace(/[^a-z0-9]/g, '') === token)
  if (canonical) return canonical
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || 'Other'
}

export type FinancingInputs = {
  roundStage: string
  roundSize: number
  matterInvestment: number
  valuationBasis: 'pre-money' | 'post-money'
  enteredValuation: number
  existingOwnershipPct: number
}

const STORAGE_PREFIX = 'matter-financing-round-v1:'

export function initialFinancingInputs(company: Company): FinancingInputs {
  return {
    roundStage: normalizeRoundStage(company.stage),
    roundSize: 0,
    matterInvestment: company.model?.checkSize ?? 0,
    valuationBasis: 'post-money',
    enteredValuation: company.model?.valuation ?? 0,
    existingOwnershipPct: 0,
  }
}

export function loadFinancingInputs(company: Company): FinancingInputs {
  const fallback = initialFinancingInputs(company)
  try {
    const saved = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${company.id}`) ?? '{}') as Partial<FinancingInputs>
    return {
      roundStage: normalizeRoundStage(saved.roundStage ?? fallback.roundStage),
      roundSize: saved.roundSize ?? fallback.roundSize,
      matterInvestment: saved.matterInvestment ?? fallback.matterInvestment,
      valuationBasis: saved.valuationBasis === 'pre-money' ? 'pre-money' : 'post-money',
      enteredValuation: saved.enteredValuation ?? fallback.enteredValuation,
      existingOwnershipPct: saved.existingOwnershipPct ?? fallback.existingOwnershipPct,
    }
  } catch {
    return fallback
  }
}

export function saveFinancingInputs(companyId: string, inputs: FinancingInputs) {
  localStorage.setItem(`${STORAGE_PREFIX}${companyId}`, JSON.stringify(inputs))
}

export function calculateFinancing(inputs: FinancingInputs) {
  const preMoneyValuation = inputs.valuationBasis === 'pre-money'
    ? inputs.enteredValuation
    : Math.max(inputs.enteredValuation - inputs.roundSize, 0)
  const postMoneyValuation = inputs.valuationBasis === 'post-money'
    ? inputs.enteredValuation
    : inputs.enteredValuation + inputs.roundSize
  const roundDilutionPct = postMoneyValuation > 0 ? (inputs.roundSize / postMoneyValuation) * 100 : 0
  const matterNewOwnershipPct = postMoneyValuation > 0 ? (inputs.matterInvestment / postMoneyValuation) * 100 : 0
  const retainedExistingOwnershipPct = inputs.existingOwnershipPct * (1 - roundDilutionPct / 100)
  const proFormaMatterOwnershipPct = retainedExistingOwnershipPct + matterNewOwnershipPct

  return {
    preMoneyValuation,
    postMoneyValuation,
    roundDilutionPct,
    matterNewOwnershipPct,
    retainedExistingOwnershipPct,
    proFormaMatterOwnershipPct,
  }
}
