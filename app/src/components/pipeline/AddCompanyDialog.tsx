import { useState } from 'react'
import type { Company } from '../../lib/types'

export type NewCompany = Pick<Company, 'name' | 'oneLiner' | 'sector' | 'stage' | 'location'>

type AddCompanyDialogProps = {
  onClose: () => void
  onAdd: (company: NewCompany) => void
}

const INPUT_CLASS =
  'mt-2 h-11 w-full rounded-none border-2 border-hairline-strong bg-card px-3 text-base text-ink focus:outline-3 focus:outline-ring-focus'

export function AddCompanyDialog({ onClose, onAdd }: AddCompanyDialogProps) {
  const [name, setName] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [sector, setSector] = useState('')
  const [stage, setStage] = useState('Seed')
  const [location, setLocation] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !oneLiner.trim()) return
    onAdd({
      name: name.trim(),
      oneLiner: oneLiner.trim(),
      sector: sector.trim() || 'Other',
      stage,
      location: location.trim() || 'Unknown',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-deep/45 p-4 py-16" role="dialog" aria-modal="true" aria-labelledby="add-company-title">
      <form onSubmit={submit} className="w-full max-w-[640px] border-2 border-hairline-strong bg-card shadow-[8px_8px_0_0_#000]">
        <header className="flex items-start justify-between gap-4 border-b-2 border-hairline-strong bg-bone px-6 py-5">
          <div>
            <p className="code-sm uppercase text-mute">Pipeline</p>
            <h2 id="add-company-title" className="heading-md mt-1">Add a company</h2>
            <p className="mt-1 text-sm text-body">Create a deal record manually and add it to the sourced stage.</p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 border-2 border-hairline-strong bg-card text-xl leading-none hover:bg-bone" aria-label="Close add company dialog">×</button>
        </header>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="code-sm block uppercase text-mute">Company name</span>
            <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} placeholder="Company name" />
          </label>
          <label className="block sm:col-span-2">
            <span className="code-sm block uppercase text-mute">One-line description</span>
            <input required value={oneLiner} onChange={(event) => setOneLiner(event.target.value)} className={INPUT_CLASS} placeholder="What does the company do?" />
          </label>
          <label className="block">
            <span className="code-sm block uppercase text-mute">Sector</span>
            <input value={sector} onChange={(event) => setSector(event.target.value)} className={INPUT_CLASS} placeholder="Fintech infrastructure" />
          </label>
          <label className="block">
            <span className="code-sm block uppercase text-mute">Company stage</span>
            <select value={stage} onChange={(event) => setStage(event.target.value)} className={INPUT_CLASS}>
              <option>Pre-seed</option>
              <option>Seed</option>
              <option>Series A</option>
              <option>Series B</option>
              <option>Series C+</option>
              <option>Growth</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="code-sm block uppercase text-mute">Location</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} className={INPUT_CLASS} placeholder="San Francisco, CA" />
          </label>
        </div>

        <footer className="flex justify-end gap-3 border-t-2 border-hairline-strong bg-bone px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 border-2 border-hairline-strong bg-card px-5 text-sm font-semibold text-ink hover:bg-bone">Cancel</button>
          <button type="submit" disabled={!name.trim() || !oneLiner.trim()} className="h-11 border-2 border-hairline-strong bg-primary px-5 text-sm font-semibold text-on-primary shadow-brutal-sm hover:bg-primary-deep disabled:cursor-not-allowed disabled:bg-stone">Add to pipeline →</button>
        </footer>
      </form>
    </div>
  )
}
