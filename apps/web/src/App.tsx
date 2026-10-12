import { useEffect, useRef } from 'react'
import { useStore } from './lib/store'
import { sound } from './lib/sound'
import { lazy, Suspense } from 'react'
const Site = lazy(() => import('./components/site/Site'))
import ConnectionBanner from './components/ConnectionBanner'
import Sidebar from './components/Sidebar'
import CommandCenter from './components/CommandCenter'
import MissionView from './components/MissionView'
import LabPage from './components/LabPage'
import AgentsPage from './components/AgentsPage'
import ExperimentsPage from './components/ExperimentsPage'
import MemoryPage from './components/MemoryPage'
import AnalyticsPage from './components/AnalyticsPage'
import SettingsPage from './components/SettingsPage'
import { HostedCommand, HostedResults, HostedSettings, HostedUnavailable } from './components/HostedPages'

export default function App() {
  const view = useStore((s) => s.view)
  const page = useStore((s) => s.page)
  const boot = useStore((s) => s.boot)
  const performanceMode = useStore((s) => s.performanceMode)
  const timeline = useStore((s) => s.timeline)
  const hosted = useStore((s) => s.systemStatus?.hosted)

  useEffect(() => {
    void boot()
    return () => useStore.getState().stop()
  }, [boot])

  // Synthesized audio cues on live events (only when the user has enabled sound).
  const lastHeard = useRef<string | null>(null)
  useEffect(() => {
    const ev = timeline[timeline.length - 1]
    if (!ev || ev.eventId === lastHeard.current) return
    lastHeard.current = ev.eventId
    sound.cueForEvent(ev.type, ev.payload as Record<string, unknown> | undefined)
  }, [timeline])

  if (view === 'site') {
    return <Suspense fallback={<div className="p-8">Loading TejaX…</div>}><Site /></Suspense>
  }

  return (
    <div className="app-shell app-bg h-screen w-screen flex overflow-hidden text-[15px]">
      {/* ambient aurora */}
      <div className="aurora" aria-hidden>
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      <Sidebar />
      <ConnectionBanner />

      <main className={`relative flex-1 min-w-0 h-full ${page === 'lab' ? 'overflow-hidden' : 'overflow-y-auto scroll-thin'}`}>
        <div key={page} className={`page-enter relative z-10 ${page === 'lab' ? 'h-full w-full' : 'min-h-full'}`}>
          {page === 'command' && (hosted ? <HostedCommand /> : <CommandCenter />)}
          {page === 'missions' && (hosted ? <HostedResults /> : <MissionView />)}
          {page === 'lab' && <LabPage />}
          {page === 'agents' && <AgentsPage />}
          {page === 'experiments' && (hosted ? <HostedUnavailable /> : <ExperimentsPage />)}
          {page === 'memory' && (hosted ? <HostedUnavailable /> : <MemoryPage />)}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'settings' && (hosted ? <HostedSettings /> : <SettingsPage />)}
        </div>
        {performanceMode && (
          <div className="fixed bottom-3 right-3 z-50 rounded-md px-2 py-1 text-[10px] font-mono glass text-faint">
            PERFORMANCE MODE
          </div>
        )}
      </main>
    </div>
  )
}
