import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router'
import { api } from '../../lib/api/client'
import type { Company, Founder } from '../../lib/types'
import { useAppStore } from '../../state/store'
import { Card } from '../../components/ui/Card'
import { Eyebrow } from '../../components/ui/Eyebrow'
import { Pill } from '../../components/ui/Pill'
import { ModelTab } from './tabs/ModelTab'
import { MarketTab } from './tabs/MarketTab'
import { FilesTab } from './tabs/FilesTab'
import { OverviewTab } from './tabs/OverviewTab'
import { CurrentFinancingRoundTab } from './tabs/CurrentFinancingRoundTab'
import { ValuationBotOutputTab } from './tabs/ValuationBotOutputTab'

const BASE_TABS = ['Overview', 'Market map', 'Model', 'Current Financing Round', 'Files'] as const
type Tab = (typeof BASE_TABS)[number] | 'Valuation Bot Output'
type ValuationBotStatus = 'idle' | 'loading' | 'ready'

function ValuationBotLoading({ companyName }: { companyName: string }) {
  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center overflow-hidden bg-canvas p-8">
      <div className="w-full max-w-[720px] border-2 border-hairline-strong bg-card p-8 text-center shadow-[8px_8px_0_0_#000] md:p-12">
        <Eyebrow>Valuation bot</Eyebrow>
        <h1 className="display-md mt-3">Valuing {companyName}</h1>
        <p className="mt-2 text-sm text-body">Reading round terms and preparing the output tab.</p>

        <div className="relative mt-10 h-36 overflow-hidden border-2 border-hairline-strong bg-bone">
          <div className="absolute inset-x-0 bottom-7 border-t-2 border-dashed border-hairline-strong" />
          <motion.div
            className="absolute bottom-8 left-1/2 -ml-8"
            animate={{ x: [-100, 100, -100] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              className="relative h-14 w-16 border-2 border-hairline-strong bg-primary shadow-brutal-sm"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.34, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute top-4 left-3 h-2 w-2 bg-dark" />
              <div className="absolute top-4 right-3 h-2 w-2 bg-dark" />
              <div className="absolute right-4 bottom-3 left-4 border-t-2 border-dark" />
              <div className="absolute -top-4 left-1/2 h-4 border-l-2 border-dark">
                <span className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-dark bg-primary" />
              </div>
            </motion.div>
            <motion.div
              className="absolute -bottom-4 left-2 h-5 border-l-[5px] border-dark"
              animate={{ rotate: [-28, 28, -28] }}
              transition={{ duration: 0.34, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: 'top' }}
            />
            <motion.div
              className="absolute -right-1 -bottom-4 h-5 border-l-[5px] border-dark"
              animate={{ rotate: [28, -28, 28] }}
              transition={{ duration: 0.34, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: 'top' }}
            />
          </motion.div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" aria-live="polite">
          <motion.span
            className="h-2.5 w-2.5 bg-primary"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <span className="code-sm uppercase text-charcoal">Generating valuation output…</span>
        </div>
      </div>
    </div>
  )
}

export function CompanyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [founders, setFounders] = useState<Founder[]>([])
  const [tab, setTab] = useState<Tab>('Overview')
  const [valuationBotStatus, setValuationBotStatus] = useState<ValuationBotStatus>('idle')
  const setWeights = useAppStore((s) => s.setWeights)
  const setLearningNote = useAppStore((s) => s.setLearningNote)

  useEffect(() => {
    if (!id) return
    // ?tab= opens a specific tab (demo/screenshot aid), else reset to Overview
    const param = new URLSearchParams(window.location.search).get('tab')
    setTab(BASE_TABS.find((t) => t.toLowerCase() === param?.toLowerCase()) ?? 'Overview')
    setValuationBotStatus('idle')
    api.getCompany(id).then((c) => setCompany(c ?? null))
    api.getFounders().then((all) => setFounders(all.filter((f) => f.companyId === id)))
  }, [id])

  useEffect(() => {
    if (valuationBotStatus !== 'loading') return
    const timer = window.setTimeout(() => {
      setValuationBotStatus('ready')
      setTab('Valuation Bot Output')
    }, 3_000)
    return () => window.clearTimeout(timer)
  }, [valuationBotStatus])

  if (!company) {
    return (
      <div className="p-8">
        <Eyebrow>Company</Eyebrow>
        <h1 className="display-lg mt-2">Not found</h1>
        <p className="mt-3 text-body">No company with id “{id}”.</p>
      </div>
    )
  }

  if (valuationBotStatus === 'loading') {
    return <ValuationBotLoading companyName={company.name} />
  }

  async function feedback(action: 'investigate' | 'pass') {
    if (!company) return
    const res = await api.postFeedback({ entityId: company.id, action })
    setWeights(res.weights)
    setLearningNote(res.note)
    if (action === 'pass') navigate('/pipeline')
  }

  const tabs: readonly Tab[] = valuationBotStatus === 'ready'
    ? [...BASE_TABS, 'Valuation Bot Output']
    : BASE_TABS

  return (
    <div className="mx-auto max-w-[1280px] p-5 pb-28 md:p-8 md:pb-28 md:pl-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {company.sector} · {company.stage} · {company.location}
          </Eyebrow>
          <h1 className="display-lg mt-2">{company.name}</h1>
          <p className="mt-3 max-w-[640px] text-lg text-body">{company.oneLiner}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <Eyebrow>Fund fit</Eyebrow>
            <div className="display-md text-ink">{company.fitScore}</div>
          </div>
          {company.type === 'sourced' && (
            <>
              <Pill variant="primary" size="md" onClick={() => feedback('investigate')}>
                Advance
              </Pill>
              <Pill size="md" onClick={() => feedback('pass')}>
                Pass
              </Pill>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-hairline pb-3">
        {tabs.map((t) => (
          t === 'Valuation Bot Output' ? (
            <motion.div key={t} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45 }}>
              <Pill variant={tab === t ? 'dark' : 'ghost'} onClick={() => setTab(t)}>
                {t}
              </Pill>
            </motion.div>
          ) : (
            <Pill key={t} variant={tab === t ? 'dark' : 'ghost'} onClick={() => setTab(t)}>
              {t}
            </Pill>
          )
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Overview' && <OverviewTab company={company} founders={founders} />}
        {tab === 'Market map' && <MarketTab company={company} />}
        {tab === 'Model' && <ModelTab company={company} />}
        {tab === 'Current Financing Round' && (
          <CurrentFinancingRoundTab company={company} onLaunchValuationBot={() => setValuationBotStatus('loading')} />
        )}
        {tab === 'Files' && <FilesTab company={company} />}
        {tab === 'Valuation Bot Output' && <ValuationBotOutputTab company={company} />}
      </div>

      {company.raising && (
        <Card className="mt-8 flex items-center justify-between bg-bone">
          <span className="text-sm text-charcoal">Raising</span>
          <span className="code-md text-ink">{company.raising}</span>
        </Card>
      )}
    </div>
  )
}
