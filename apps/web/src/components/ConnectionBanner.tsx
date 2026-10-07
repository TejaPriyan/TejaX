import { useStore } from '../lib/store'

export default function ConnectionBanner() {
  const error = useStore(s => s.connectionError)
  const loading = useStore(s => s.loading)
  if (!error && !loading) return null
  return <section role={error ? 'alert' : 'status'} className="connection-banner">
    <strong>{error ? 'Lab connection needs attention' : 'Connecting to your laboratory…'}</strong>
    <p>{error || 'Loading missions and agent workstations from the backend.'}</p>
    {error && <button onClick={() => void useStore.getState().refreshSystem()}>Retry connection</button>}
  </section>
}
