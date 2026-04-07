import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { FAB } from '../components/FAB'
import { BottomSheet } from '../components/BottomSheet'
import type { GrowLog } from '../types'

const G = '#00AE42'

const ROOM_TYPE_COLORS: Record<string, string> = {
  flowering: '#9B59B6',
  vegetation: '#27AE60',
  propagation: '#3498DB',
  clone: '#1ABC9C',
  mother: '#E67E22',
  other: '#95A5A6',
}

const SENTIMENT_COLORS = { positive: '#00AE42', neutral: '#F0A500', negative: '#E74C3C' }

function LogCard({ log, onClick }: { log: GrowLog; onClick: () => void }) {
  const room = log.room as { name: string; room_type: string } | undefined
  const roomColor = room ? ROOM_TYPE_COLORS[room.room_type] ?? '#95A5A6' : '#95A5A6'
  const sentiment = (log.structured_data as Record<string, string>)?.sentiment as keyof typeof SENTIMENT_COLORS | undefined

  const date = new Date(log.created_at)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div
      onClick={onClick}
      style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', border: '1px solid #F0F0F0', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {room && (
            <span style={{ background: roomColor + '18', color: roomColor, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
              {room.name}
            </span>
          )}
          {log.status === 'draft' && (
            <span style={{ background: '#FFF3E0', color: '#F57C00', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>draft</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sentiment && <div style={{ width: 8, height: 8, borderRadius: 4, background: SENTIMENT_COLORS[sentiment] }} title={sentiment} />}
          <span style={{ fontSize: 12, color: '#888' }}>{dateStr} {timeStr}</span>
        </div>
      </div>

      {/* Summary */}
      {log.summary && (
        <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.5, color: '#222', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {log.summary}
        </p>
      )}

      {/* Tags */}
      {log.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: log.media_count > 0 ? 10 : 0 }}>
          {log.tags.slice(0, 5).map(tag => (
            <span key={tag} style={{ background: G + '12', color: G, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>
              {tag}
            </span>
          ))}
          {log.tags.length > 5 && <span style={{ color: '#888', fontSize: 11 }}>+{log.tags.length - 5}</span>}
        </div>
      )}

      {/* Image strip */}
      {log.media_count > 0 && (
        <div style={{ height: 64, background: '#F5F5F5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden' }}>
          {Array.from({ length: Math.min(log.media_count, 4) }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: '100%', background: '#E8E8E8', borderRadius: 4 }} />
          ))}
          {log.media_count > 4 && (
            <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 6px' }}>
              <span style={{ color: '#fff', fontSize: 12 }}>+{log.media_count - 4}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const FILTERS = ['All', 'Today', 'This Week', 'Drafts', 'Confirmed']

export function Timeline() {
  const { logs, facility, loading } = useApp()
  const navigate = useNavigate()
  const [fabOpen, setFabOpen] = useState(false)
  const [filter, setFilter] = useState('All')

  const filteredLogs = logs.filter(log => {
    if (filter === 'Today') {
      const today = new Date().toDateString()
      return new Date(log.created_at).toDateString() === today
    }
    if (filter === 'This Week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(log.created_at) >= weekAgo
    }
    if (filter === 'Drafts') return log.status === 'draft'
    if (filter === 'Confirmed') return log.status === 'confirmed'
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${G}30`, borderTop: `3px solid ${G}`, borderRadius: 16, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!facility) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🌱</span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Welcome to Botana</h2>
        <p style={{ margin: 0, color: '#666', fontSize: 15 }}>Set up your facility to start logging your grows</p>
        <button
          onClick={() => navigate('/facility')}
          style={{ background: G, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
        >
          Set up Facility
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ padding: '12px 16px 0', overflowX: 'auto', display: 'flex', gap: 8 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, background: filter === f ? G : '#F5F5F5', color: filter === f ? '#fff' : '#444',
              border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
            <p style={{ margin: 0, fontSize: 15 }}>No logs yet. Tap + to start recording.</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogCard key={log.id} log={log} onClick={() => navigate(`/logs/${log.id}`)} />
          ))
        )}
      </div>

      <FAB onClick={() => setFabOpen(true)} />

      <BottomSheet open={fabOpen} onClose={() => setFabOpen(false)} title="New Log Entry">
        <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => { setFabOpen(false); navigate('/record?mode=voice') }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#F9F9F9', border: '1px solid #EFEFEF', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 32 }}>🎙</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>Voice Recording</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Speak your observations, AI will structure them</div>
            </div>
          </button>
          <button
            onClick={() => { setFabOpen(false); navigate('/record?mode=camera') }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: '#F9F9F9', border: '1px solid #EFEFEF', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 32 }}>📷</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>Camera Only</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Photo log with optional notes</div>
            </div>
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
