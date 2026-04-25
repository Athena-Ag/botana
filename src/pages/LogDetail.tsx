import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { GrowLog, SENTIMENT_COLORS } from '../lib/types'
// @ts-ignore — JSX components without type declarations
import StructuredDataEditor from '../components/StructuredDataEditor'
// @ts-ignore
import TagEditor from '../components/TagEditor'

// Deep-merge helper: merges `patch` into `base` one level deep for nested paths.
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base }
  for (const key of Object.keys(patch)) {
    const bv = base[key]
    const pv = patch[key]
    if (
      pv !== null &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      bv !== null &&
      typeof bv === 'object' &&
      !Array.isArray(bv)
    ) {
      result[key] = deepMerge(bv as Record<string, unknown>, pv as Record<string, unknown>)
    } else {
      result[key] = pv
    }
  }
  return result
}

/** Set a dot-path value into an object (e.g. 'feed.ec' → { feed: { ec: val } }) */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  if (parts.length === 1) return { ...obj, [path]: value }
  const [head, ...rest] = parts
  const nested = (obj[head] && typeof obj[head] === 'object' ? obj[head] : {}) as Record<string, unknown>
  return { ...obj, [head]: setPath(nested, rest.join('.'), value) }
}

export default function LogDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const qc = useQueryClient()

  // Track save flash at page level
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const { data: log, isLoading } = useQuery({
    queryKey: ['log', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grow_logs')
        .select('*, room:rooms(name, room_type)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as GrowLog
    },
    enabled: !!id,
  })

  const flashSave = (msg = 'Saved ✓') => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), 1800)
  }

  /** Save a structured_data field by dot-path */
  const handleStructuredSave = useCallback(async (path: string, value: unknown) => {
    if (!log) return
    const current = (log.structured_data || {}) as Record<string, unknown>
    const updated = setPath(current, path, value)
    const merged = deepMerge(current, updated)

    const { error } = await supabase
      .from('grow_logs')
      .update({ structured_data: merged })
      .eq('id', id!)

    if (error) {
      console.error('Structured data save failed:', error)
      setSaveMsg('Save failed ✗')
      setTimeout(() => setSaveMsg(null), 2000)
      return
    }

    // Update query cache optimistically
    qc.setQueryData(['log', id], (old: GrowLog | undefined) =>
      old ? { ...old, structured_data: merged } : old
    )
    flashSave()
  }, [log, id, qc])

  /** Save tags (replace whole array) */
  const handleTagsSave = useCallback(async (newTags: string[]) => {
    if (!id) return
    const { error } = await supabase
      .from('grow_logs')
      .update({ tags: newTags })
      .eq('id', id)

    if (error) {
      console.error('Tags save failed:', error)
      setSaveMsg('Save failed ✗')
      setTimeout(() => setSaveMsg(null), 2000)
      return
    }

    qc.setQueryData(['log', id], (old: GrowLog | undefined) =>
      old ? { ...old, tags: newTags } : old
    )
    flashSave()
  }, [id, qc])

  const handleDelete = async () => {
    if (!confirm('Delete this log? This cannot be undone.')) return
    await supabase.from('grow_logs').delete().eq('id', id!)
    await qc.invalidateQueries({ queryKey: ['logs'] })
    nav('/', { replace: true })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#9ca3af' }}>
        Loading…
      </div>
    )
  }

  if (!log) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Log not found.{' '}
        <button onClick={() => nav('/')} style={{ color: '#00AE42', background: 'none' }}>Go home</button>
      </div>
    )
  }

  const sentiment = log.structured_data?.sentiment
  const sentimentColor = sentiment ? SENTIMENT_COLORS[sentiment] : '#9ca3af'
  const room = log.room as { name?: string; room_type?: string } | undefined

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100dvh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        maxWidth: 480,
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => nav(-1)} style={{ background: 'none', color: '#6b7280', fontSize: 14 }}>
            ← Back
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{room?.name}</span>
          <div style={{ width: 48, display: 'flex', justifyContent: 'flex-end' }}>
            {saveMsg && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: saveMsg.includes('✗') ? '#ef4444' : '#00AE42',
                transition: 'opacity 0.3s',
              }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px' }}>
        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {new Date(log.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
          {sentiment && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sentimentColor }} />
              {sentiment}
            </span>
          )}
        </div>

        {/* Summary */}
        {log.summary && (
          <div style={card}>
            <label style={labelStyle}>Summary</label>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#111827' }}>{log.summary}</p>
          </div>
        )}

        {/* Tags — editable */}
        <div style={card}>
          <label style={labelStyle}>Tags</label>
          <TagEditor
            tags={log.tags ?? []}
            onSave={handleTagsSave}
          />
        </div>

        {/* Structured Data — fully editable */}
        <StructuredDataEditor
          data={log.structured_data}
          onSave={handleStructuredSave}
        />

        {/* Audio */}
        {(log as any).audio_url && (
          <div style={card}>
            <label style={labelStyle}>Audio</label>
            <audio controls src={(log as any).audio_url} style={{ width: '100%' }} />
          </div>
        )}

        {/* Transcript */}
        {log.transcript && (
          <div style={card}>
            <label style={labelStyle}>Transcript</label>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{log.transcript}</p>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          style={{
            background: 'none',
            color: '#ef4444',
            padding: '16px 0',
            width: '100%',
            fontSize: 15,
            fontWeight: 600,
            borderTop: '1px solid #e5e7eb',
            marginTop: 8,
          }}
        >Delete Log</button>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  display: 'block',
  marginBottom: 8,
}
