import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { GrowLog, TAG_COLORS, SENTIMENT_COLORS } from '../lib/types'

export default function LogDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const qc = useQueryClient()

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
          <div style={{ width: 48 }} />
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

        {/* Tags */}
        {(log.tags ?? []).length > 0 && (
          <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(log.tags ?? []).map(tag => {
              const c = TAG_COLORS[tag] ?? { bg: '#f3f4f6', text: '#374151' }
              return (
                <span key={tag} style={{ background: c.bg, color: c.text, padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>
                  {tag.replace(/_/g, ' ')}
                </span>
              )
            })}
          </div>
        )}

        {/* Environment */}
        {log.structured_data?.environment && Object.keys(log.structured_data.environment).length > 0 && (
          <div style={card}>
            <label style={labelStyle}>Environment</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(log.structured_data.environment).map(([k, v]) => v !== undefined && (
                <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {(log.structured_data?.observations ?? []).length > 0 && (
          <div style={card}>
            <label style={labelStyle}>Observations</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {log.structured_data!.observations!.map((o, i) => (
                <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{o}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {(log.structured_data?.issues ?? []).length > 0 && (
          <div style={{ ...card, borderLeft: '3px solid #ef4444' }}>
            <label style={{ ...labelStyle, color: '#b91c1c' }}>Issues</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {log.structured_data!.issues!.map((o, i) => (
                <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{o}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tasks */}
        {(log.structured_data?.tasks_completed ?? []).length > 0 && (
          <div style={card}>
            <label style={labelStyle}>Tasks Completed</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {log.structured_data!.tasks_completed!.map((o, i) => (
                <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{o}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Audio */}
        {log.audio_url && (
          <div style={card}>
            <label style={labelStyle}>Audio</label>
            <audio controls src={log.audio_url} style={{ width: '100%' }} />
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
