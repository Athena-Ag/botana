import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Facility, GrowLog, TAG_COLORS, SENTIMENT_COLORS } from '../lib/types'

interface Props {
  facility: Facility
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Home({ facility }: Props) {
  const nav = useNavigate()
  const [tagFilter, setTagFilter] = useState('')

  const { data: rooms } = useQuery({
    queryKey: ['rooms', facility.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('facility_id', facility.id)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs', facility.id, tagFilter],
    queryFn: async () => {
      let q = supabase
        .from('grow_logs')
        .select('*, room:rooms(name, room_type)')
        .eq('facility_id', facility.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(50)
      if (tagFilter) q = q.contains('tags', [tagFilter])
      const { data, error } = await q
      if (error) throw error
      return data as GrowLog[]
    },
  })

  const allTags = [...new Set((logs ?? []).flatMap(l => l.tags ?? []))]

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100dvh', paddingBottom: 100 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="#00AE42">
              <path d="M16 4C9 4 5 11 5 18c0 5 3.5 9 11 11 7.5-2 11-6 11-11 0-7-4-14-11-14zm0 3c3.5 0 7 4.5 7 11 0 3-2 5.5-7 7-5-1.5-7-4-7-7 0-6.5 3.5-11 7-11z"/>
            </svg>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', lineHeight: 1 }}>Botana</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{facility.name}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {rooms?.length ?? 0} room{rooms?.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 2 }}>
            <button
              onClick={() => setTagFilter('')}
              style={{
                ...tagPillStyle,
                background: !tagFilter ? '#00AE42' : '#f3f4f6',
                color: !tagFilter ? '#fff' : '#374151',
                border: 'none',
                flexShrink: 0,
              }}
            >All</button>
            {allTags.map(tag => {
              const c = TAG_COLORS[tag] ?? { bg: '#f3f4f6', text: '#374151' }
              const active = tagFilter === tag
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                  style={{
                    ...tagPillStyle,
                    background: active ? c.text : c.bg,
                    color: active ? '#fff' : c.text,
                    border: 'none',
                    flexShrink: 0,
                  }}
                >{tag.replace(/_/g, ' ')}</button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '16px 16px 0' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading logs…</div>
        )}

        {!isLoading && (logs ?? []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
            <p style={{ color: '#9ca3af', fontSize: 16, fontWeight: 500, margin: 0 }}>Tap the mic to log your first observation</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(logs ?? []).map(log => (
            <LogCard key={log.id} log={log} onClick={() => nav(`/log/${log.id}`)} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => nav('/log/new')}
        style={{
          position: 'fixed',
          bottom: 28,
          right: '50%',
          transform: 'translateX(50%)',
          background: '#00AE42',
          color: '#fff',
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,174,66,0.4)',
          zIndex: 20,
        }}
        aria-label="New log"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
        </svg>
      </button>
    </div>
  )
}

function LogCard({ log, onClick }: { log: GrowLog; onClick: () => void }) {
  const sentiment = log.structured_data?.sentiment
  const sentimentColor = sentiment ? SENTIMENT_COLORS[sentiment] : '#9ca3af'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        border: '1px solid #f3f4f6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {(log.room as { name?: string })?.name ?? 'Unknown Room'}
          </span>
          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
            {formatDate(log.created_at)}
          </span>
        </div>
        {sentiment && (
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: sentimentColor, flexShrink: 0, marginTop: 3 }} />
        )}
      </div>

      {log.summary && (
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#111827', lineHeight: 1.5 }}>
          {log.summary}
        </p>
      )}

      {(log.tags ?? []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(log.tags ?? []).slice(0, 5).map(tag => {
            const c = TAG_COLORS[tag] ?? { bg: '#f3f4f6', text: '#374151' }
            return (
              <span key={tag} style={{ ...tagPillStyle, background: c.bg, color: c.text, cursor: 'default' }}>
                {tag.replace(/_/g, ' ')}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

const tagPillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 9px',
  borderRadius: 9999,
  lineHeight: 1.6,
}
