import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import type { GrowLog, LogMedia, EnvironmentReading } from '../types'

const G = '#00AE42'

export function LogDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshLogs } = useApp()
  const [log, setLog] = useState<GrowLog | null>(null)
  const [media, setMedia] = useState<LogMedia[]>([])
  const [env, setEnv] = useState<EnvironmentReading | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [editTags, setEditTags] = useState<string[]>([])
  const [editSummary, setEditSummary] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data } = await supabase
        .from('grow_logs')
        .select('*, room:rooms(name, room_type)')
        .eq('id', id)
        .single()
      if (data) {
        setLog(data as GrowLog)
        setEditTags((data as GrowLog).tags ?? [])
        setEditSummary((data as GrowLog).summary ?? '')
      }

      const { data: m } = await supabase
        .from('log_media')
        .select('*')
        .eq('log_id', id)
        .order('clip_order')
      if (m) setMedia(m as LogMedia[])

      const { data: e } = await supabase
        .from('environment_readings')
        .select('*')
        .eq('log_id', id)
        .single()
      if (e) setEnv(e as EnvironmentReading)

      setLoading(false)
    }
    load()
  }, [id])

  async function saveChanges() {
    if (!log || !isDirty) return
    setSaving(true)
    await supabase.from('grow_logs').update({ summary: editSummary, tags: editTags }).eq('id', log.id)
    setLog(l => l ? { ...l, summary: editSummary, tags: editTags } : l)
    setIsDirty(false)
    setSaving(false)
    await refreshLogs()
  }

  const images = media.filter(m => m.media_type === 'image')
  const audios = media.filter(m => m.media_type === 'audio')

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${G}30`, borderTop: `3px solid ${G}`, borderRadius: 16, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!log) return <div style={{ padding: 20, color: '#888' }}>Log not found.</div>

  const room = log.room as { name: string; room_type: string } | undefined
  const sd = log.structured_data as Record<string, unknown>
  const sentiment = sd?.sentiment as string | undefined

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 14 }}>← Back</button>
        <div style={{ flex: 1 }}>
          {room && <span style={{ fontSize: 13, color: '#888' }}>{room.name} · {room.room_type}</span>}
          <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>{new Date(log.created_at).toLocaleString()}</div>
        </div>
        {isDirty && (
          <button onClick={saveChanges} disabled={saving}
            style={{ background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div style={{ overflowX: 'auto', display: 'flex', gap: 4 }}>
          {images.map((img, i) => (
            <div key={img.id} onClick={() => setLightboxIdx(i)} style={{ flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ width: 180, height: 180, background: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#888', fontSize: 13 }}>Photo {i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Audio player */}
        {audios.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setPlayingAudio(!playingAudio)}
                style={{ width: 44, height: 44, borderRadius: 22, background: G, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {playingAudio ? (
                  <div style={{ display: 'flex', gap: 3 }}>
                    <div style={{ width: 3, height: 14, background: '#fff', borderRadius: 2 }} />
                    <div style={{ width: 3, height: 14, background: '#fff', borderRadius: 2 }} />
                  </div>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 12 14" fill="#fff"><path d="M0 0v14l12-7z" /></svg>
                )}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ height: 4, background: '#F0F0F0', borderRadius: 2, position: 'relative' }}>
                  <div style={{ height: '100%', width: playingAudio ? '35%' : '0%', background: G, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{audios.length} clip{audios.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Summary</span>
            {sentiment && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: sentimentBg(sentiment), color: sentimentColor(sentiment), fontWeight: 600 }}>
                {sentiment}
              </span>
            )}
          </div>
          <textarea
            value={editSummary}
            onChange={e => { setEditSummary(e.target.value); setIsDirty(true) }}
            style={{ width: '100%', border: 'none', resize: 'none', fontSize: 15, lineHeight: 1.6, color: '#222', outline: 'none', background: 'transparent', boxSizing: 'border-box', minHeight: 80 }}
          />
        </div>

        {/* Structured data */}
        {Object.keys(sd).filter(k => k !== 'sentiment').length > 0 && (
          <div style={cardStyle}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Data</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(sd).filter(([k, v]) => k !== 'sentiment' && !Array.isArray(v) && v != null).map(([k, v]) => (
                <div key={k} style={{ background: '#F8F8F8', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#AAA', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginTop: 2 }}>{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Environment */}
        {env && (
          <div style={cardStyle}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Environment</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['Temp', `${env.temp_f}°F`], ['RH', `${env.rh_pct}%`], ['VPD', `${env.vpd_kpa} kPa`], ['CO₂', `${env.co2_ppm} ppm`], ['pH', env.ph], ['EC', env.ec]] as [string, unknown][])
                .filter(([, v]) => v != null)
                .map(([label, val]) => (
                  <div key={label} style={{ background: '#F8F8F8', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#AAA' }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginTop: 2 }}>{String(val)}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div style={cardStyle}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Tags</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {editTags.map(tag => (
              <button key={tag}
                onClick={() => { setEditTags(t => t.filter(x => x !== tag)); setIsDirty(true) }}
                style={{ background: `${G}15`, color: G, border: 'none', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, cursor: 'pointer' }}
              >
                {tag} ×
              </button>
            ))}
          </div>
        </div>

        {/* Transcript */}
        {log.transcript && (
          <details style={cardStyle}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Transcript</summary>
            <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: '#555' }}>{log.transcript}</p>
          </details>
        )}

        {/* Add Note button */}
        <button
          onClick={() => navigate(`/record?append=${log.id}&room=${log.room_id}`)}
          style={{ background: '#F5F5F5', border: `1px dashed ${G}`, borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, color: G, cursor: 'pointer', width: '100%' }}
        >
          + Add Note / Clip
        </button>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: '90%', height: '70vh', background: '#333', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#888' }}>Photo {lightboxIdx + 1}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function sentimentBg(s: string) {
  if (s === 'positive') return '#E8F8EF'; if (s === 'negative') return '#FEECEC'; return '#FFF8E7'
}
function sentimentColor(s: string) {
  if (s === 'positive') return G; if (s === 'negative') return '#E74C3C'; return '#F0A500'
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #F0F0F0',
}
