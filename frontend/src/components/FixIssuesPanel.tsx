import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { API_URL } from '../config'

interface ReviewSummary {
  critical: number
  warnings: number
  suggestions: number
}

interface FixIssuesPanelProps {
  jobId: string
  onRerun: () => void
}

export function FixIssuesPanel({ jobId, onRerun }: FixIssuesPanelProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingReview, setFetchingReview] = useState(true)
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['atlas', 'nova'])
  const [reviewContent, setReviewContent] = useState<string | null>(null)
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Fetch review content on mount
  useEffect(() => {
    async function fetchReview() {
      try {
        const res = await fetch(`${API_URL}/jobs/${jobId}/review`)
        const data = await res.json()
        if (data.found) {
          setReviewContent(data.content)
          setSummary(data.summary)
        }
      } catch (e) {
        console.error('Failed to fetch review:', e)
      } finally {
        setFetchingReview(false)
      }
    }
    fetchReview()
  }, [jobId])

  const handleRerun = async () => {
    if (selectedAgents.length === 0) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/rerun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_ids: selectedAgents,
          feedback: reviewContent,
        }),
      })

      if (!res.ok) {
        throw new Error('Rerun failed')
      }

      onRerun()
    } catch (e) {
      console.error('Rerun failed:', e)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if no review found
  if (fetchingReview) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Checking for review...</span>
        </div>
      </div>
    )
  }

  if (!reviewContent) {
    return null
  }

  const hasIssues = summary && (summary.critical > 0 || summary.warnings > 0)

  return (
    <div
      className={`rounded-xl border p-4 ${
        hasIssues
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-green-500/10 border-green-500/30'
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle
          className={hasIssues ? 'text-yellow-500' : 'text-green-500'}
          size={20}
        />
        <div className="flex-1">
          <h3 className={`font-medium ${hasIssues ? 'text-yellow-400' : 'text-green-400'}`}>
            {hasIssues ? 'Issues Found' : 'Review Complete'}
          </h3>
          {summary && (
            <p className="text-sm text-gray-400 mt-1">
              {summary.critical > 0 && (
                <span className="text-red-400 mr-2">{summary.critical} critical</span>
              )}
              {summary.warnings > 0 && (
                <span className="text-yellow-400 mr-2">{summary.warnings} warnings</span>
              )}
              {summary.suggestions > 0 && (
                <span className="text-blue-400">{summary.suggestions} suggestions</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-white/10 rounded transition"
        >
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* Expandable review content */}
      {expanded && (
        <div className="mb-4 max-h-60 overflow-y-auto bg-black/30 rounded-lg p-3 text-sm text-gray-300 font-mono whitespace-pre-wrap">
          {reviewContent}
        </div>
      )}

      {/* Only show re-run controls if there are issues */}
      {hasIssues && (
        <>
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Re-run agents to fix:</label>
            <div className="flex gap-2 flex-wrap">
              {['atlas', 'nova', 'sentinel', 'forge'].map((agent) => (
                <button
                  key={agent}
                  onClick={() => {
                    setSelectedAgents((prev) =>
                      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
                    )
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                    selectedAgents.includes(agent)
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {agent}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRerun}
            disabled={loading || selectedAgents.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Fix Issues
          </button>
        </>
      )}
    </div>
  )
}
