import { useState } from 'react'
import { useStore } from '../lib/store'
import { Badge, Bar, GlassCard, SectionTitle } from './ui'

const TYPES = ['FACT', 'EXPERIENCE', 'SOLUTION', 'FAILURE', 'STRATEGY', 'EXPERIMENT', 'RESEARCH', 'USER_PREFERENCE']
const TYPE_COLORS: Record<string, string> = {
  FACT: '#3dd6ff', EXPERIENCE: '#8b5cf6', SOLUTION: '#34d399', FAILURE: '#fb7185',
  STRATEGY: '#f472b6', EXPERIMENT: '#22d3ee', RESEARCH: '#a78bfa', USER_PREFERENCE: '#fbbf24',
}

export default function MemoryPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<string>('')
  const memoryResults = useStore((s) => s.memoryResults)
  const searchMemory = useStore((s) => s.searchMemory)
  const systemStatus = useStore((s) => s.systemStatus)

  const run = () => {
    if (!q.trim()) return
    searchMemory(q.trim(), type || undefined)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <GlassCard className="p-5 page-enter">
        <SectionTitle hint={`${systemStatus?.memoryCount ?? 0} stored memories`} icon="✦">
          Long-term memory
        </SectionTitle>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Search memory… e.g. 'accident prediction approach'"
            className="field flex-1 min-w-[220px] px-4 py-2.5 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="glass rounded-xl px-3 py-2.5 text-sm outline-none"
            aria-label="Memory type"
          >
            <option value="" className="bg-[#0a0f1c]">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#0a0f1c]">{t}</option>
            ))}
          </select>
          <button onClick={run} className="btn-primary !py-2.5 text-sm">Search</button>
        </div>
      </GlassCard>

      {memoryResults.length > 0 && (
        <div className="space-y-2 stagger">
          {memoryResults.map((m) => (
            <GlassCard key={m.id} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge color={TYPE_COLORS[m.type] ?? '#3dd6ff'}>{m.type}</Badge>
                {m.score != null && <span className="text-[10px] font-mono text-faint">rel {m.score.toFixed(2)}</span>}
              </div>
              <div className="text-sm text-[#dbe8ff] leading-relaxed">{m.content}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 max-w-[180px]">
                  <Bar value={(m.score ?? 0) * 100} color={TYPE_COLORS[m.type] ?? '#3dd6ff'} height={4} />
                </div>
                <div className="text-[10px] text-faint font-mono">
                  source: {m.source || '—'} · importance {m.importance.toFixed(2)}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      {q && memoryResults.length === 0 && (
        <GlassCard className="p-6 text-center text-dim text-sm">No matches.</GlassCard>
      )}
    </div>
  )
}
