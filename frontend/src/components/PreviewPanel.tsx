import { useState } from 'react'
import { Play, Square, ExternalLink, Loader2 } from 'lucide-react'
import { API_URL } from '../config'

interface PreviewPanelProps {
  jobId: string
}

export function PreviewPanel({ jobId }: PreviewPanelProps) {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const startPreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/preview/start`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to start preview')
      }

      if (data.status === 'error') {
        setError(data.detail || 'No services found to preview')
        return
      }

      if (data.urls && Object.keys(data.urls).length > 0) {
        setUrls(data.urls)
        setRunning(true)
      } else {
        setError('No services available to preview')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start preview')
    } finally {
      setLoading(false)
    }
  }

  const stopPreview = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/jobs/${jobId}/preview/stop`, { method: 'POST' })
      setRunning(false)
      setUrls({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Preview</h3>
        {!running ? (
          <button
            onClick={startPreview}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run App
          </button>
        ) : (
          <button
            onClick={stopPreview}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
            Stop
          </button>
        )}
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

      {running && Object.keys(urls).length > 0 && (
        <div className="space-y-2">
          {urls.frontend && (
            <a
              href={urls.frontend}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition group"
            >
              <div>
                <div className="text-sm font-medium text-white">Frontend</div>
                <div className="text-xs text-gray-500">{urls.frontend}</div>
              </div>
              <ExternalLink size={16} className="text-gray-500 group-hover:text-cyan-400" />
            </a>
          )}
          {urls.backend && (
            <a
              href={urls.api_docs || urls.backend}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition group"
            >
              <div>
                <div className="text-sm font-medium text-white">Backend API</div>
                <div className="text-xs text-gray-500">{urls.api_docs || urls.backend}</div>
              </div>
              <ExternalLink size={16} className="text-gray-500 group-hover:text-cyan-400" />
            </a>
          )}
        </div>
      )}

      {!running && !loading && (
        <p className="text-sm text-gray-500">Start the app to preview it in your browser</p>
      )}

      {loading && !running && (
        <div className="text-sm text-gray-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Starting services...
        </div>
      )}
    </div>
  )
}
