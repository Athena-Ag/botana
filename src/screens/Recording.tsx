import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { transcribeAudio, structureTranscript } from '../lib/api'
import { enqueue, saveDraft } from '../lib/offline'
import { useApp } from '../context/AppContext'
import type { ApiStructureResponse } from '../types'

const G = '#00AE42'

type Stage = 'room-select' | 'recording' | 'processing' | 'review'

const WAVEFORM_BARS = 40

function WaveformBar({ active, height }: { active: boolean; height: number }) {
  return (
    <div style={{
      width: 4, height, borderRadius: 2,
      background: active ? G : `${G}40`,
      transition: 'height 0.1s ease',
    }} />
  )
}

export function Recording() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { rooms, facility, refreshLogs } = useApp()

  const [stage, setStage] = useState<Stage>(params.get('mode') === 'camera' ? 'room-select' : 'room-select')
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>(Array(WAVEFORM_BARS).fill(12))
  const [processingMsg, setProcessingMsg] = useState('Transcribing audio...')
  const [photos, setPhotos] = useState<File[]>([])
  const [result, setResult] = useState<ApiStructureResponse | null>(null)
  const [transcript, setTranscript] = useState('')
  const [editableTags, setEditableTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<Blob | null>(null)

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) setSelectedRoom(rooms[0].id)
  }, [rooms])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)
      setIsRecording(true)

      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
      waveTimerRef.current = setInterval(() => {
        setWaveformData(prev => {
          const next = [...prev.slice(1), Math.random() * 36 + 8]
          return next
        })
      }, 80)
    } catch {
      alert('Microphone access required')
    }
  }, [])

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveTimerRef.current) clearInterval(waveTimerRef.current)
    setIsRecording(false)
    setWaveformData(Array(WAVEFORM_BARS).fill(12))

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      audioRef.current = blob
      setStage('processing')
      await processRecording(blob)
    }
  }, [])

  async function processRecording(blob: Blob) {
    try {
      setProcessingMsg('Transcribing audio...')
      const { transcript: tx } = await transcribeAudio(blob)
      setTranscript(tx)

      setProcessingMsg('Structuring observations...')
      const structured = await structureTranscript(tx)
      setResult(structured)
      setEditableTags(structured.tags)
      setStage('review')
    } catch (err) {
      alert('Processing failed. Your recording is saved as draft.')
      handleSaveDraft()
    }
  }

  async function handleSaveDraft() {
    const draftId = crypto.randomUUID()
    await saveDraft({
      id: draftId,
      room_id: selectedRoom,
      facility_id: facility?.id,
      transcript,
      status: 'draft',
      created_at: new Date().toISOString(),
    })
    navigate('/')
  }

  async function handleConfirm() {
    if (!facility || !selectedRoom) return
    setSaving(true)

    try {
      const logData = {
        room_id: selectedRoom,
        facility_id: facility.id,
        transcript,
        summary: result?.summary,
        structured_data: { ...result?.structured_data, sentiment: result?.sentiment },
        tags: editableTags,
        status: 'confirmed' as const,
        media_count: photos.length,
        clip_count: audioRef.current ? 1 : 0,
        confirmed_at: new Date().toISOString(),
      }

      const { data: log, error } = await supabase.from('grow_logs').insert(logData).select().single()

      if (error) {
        // offline fallback
        await enqueue('save_log', logData)
        alert('Saved offline — will sync when connected.')
        navigate('/')
        return
      }

      // Handle strain recommendations
      if (result?.strains_mentioned?.length && log) {
        const recData = result.strains_mentioned.map(name => ({
          log_id: log.id,
          detected_name: name,
          status: 'pending' as const,
        }))
        await supabase.from('strain_recommendations').insert(recData)
      }

      await refreshLogs()
      navigate(`/logs/${log.id}`)
    } catch {
      await enqueue('save_log', {
        room_id: selectedRoom,
        facility_id: facility.id,
        transcript,
        summary: result?.summary,
        structured_data: result?.structured_data,
        tags: editableTags,
        status: 'confirmed',
      })
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function removeTag(tag: string) {
    setEditableTags(t => t.filter(x => x !== tag))
  }

  function addTag(tag: string) {
    if (tag && !editableTags.includes(tag)) setEditableTags(t => [...t, tag])
  }

  // ── Room select ──────────────────────────────────────────────────────────────
  if (stage === 'room-select') {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back</button>
        <h2 style={{ margin: '12px 0 20px', fontWeight: 700, fontSize: 22 }}>Select Room</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => { setSelectedRoom(room.id); setStage('recording') }}
              style={{
                padding: '16px 20px', borderRadius: 12, border: selectedRoom === room.id ? `2px solid ${G}` : '1px solid #EFEFEF',
                background: selectedRoom === room.id ? `${G}08` : '#F9F9F9', textAlign: 'left', cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{room.name}</div>
              <div style={{ fontSize: 13, color: '#888', textTransform: 'capitalize', marginTop: 2 }}>{room.room_type}</div>
            </button>
          ))}
        </div>
        {rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
            <p>No rooms set up. Add rooms in Facility settings first.</p>
            <button onClick={() => navigate('/facility')} style={{ background: G, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Go to Facility
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Recording ────────────────────────────────────────────────────────────────
  if (stage === 'recording') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#fff' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back</button>
          <span style={{ fontWeight: 600, color: '#444' }}>{rooms.find(r => r.id === selectedRoom)?.name}</span>
          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: '#F5F5F5', border: 'none', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
          >
            📷 {photos.length > 0 ? `${photos.length}` : ''}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files) setPhotos(p => [...p, ...Array.from(e.target.files!)]) }} />

        {/* Waveform area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: 2, color: isRecording ? '#222' : '#CCC', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(recordingTime)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 80 }}>
            {waveformData.map((h, i) => (
              <WaveformBar key={i} active={isRecording} height={isRecording ? h : 12} />
            ))}
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px', maxWidth: '100%' }}>
              {photos.map((p, i) => (
                <img key={i} src={URL.createObjectURL(p)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} alt="" />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '32px 20px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              style={{ width: 72, height: 72, borderRadius: 36, background: G, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${G}50` }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2a4 4 0 014 4v6a4 4 0 01-8 0V6a4 4 0 014-4z" fill="#fff" />
                <path d="M5 11a7 7 0 0014 0M12 19v3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{ width: 72, height: 72, borderRadius: 36, background: '#E74C3C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(231,76,60,0.4)' }}
            >
              <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }} />
            </button>
          )}
          <span style={{ fontSize: 13, color: '#888' }}>{isRecording ? 'Tap to stop' : 'Tap to record'}</span>
        </div>
      </div>
    )
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 20 }}>
        <div style={{ width: 48, height: 48, border: `4px solid ${G}30`, borderTop: `4px solid ${G}`, borderRadius: 24, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ margin: 0, fontSize: 16, color: '#444', fontWeight: 500 }}>{processingMsg}</p>
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>AI is analyzing your log entry</p>
      </div>
    )
  }

  // ── Review ───────────────────────────────────────────────────────────────────
  if (stage === 'review' && result) {
    const sd = result.structured_data
    const sdEntries = Object.entries(sd).filter(([, v]) => v !== undefined && v !== null && !Array.isArray(v))
    const sdArrays = Object.entries(sd).filter(([, v]) => Array.isArray(v)) as [string, string[]][]

    return (
      <div style={{ minHeight: '100dvh', background: '#F8F8F8' }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setStage('recording')} style={backBtnStyle}>← Re-record</button>
          <span style={{ fontWeight: 600 }}>Review Entry</span>
          <div />
        </div>

        {/* Photo banner */}
        {photos.length > 0 && (
          <div style={{ overflowX: 'auto', display: 'flex', gap: 4, padding: '0', height: 180 }}>
            {photos.map((p, i) => (
              <img key={i} src={URL.createObjectURL(p)} style={{ height: '100%', width: 'auto', objectFit: 'cover', flexShrink: 0 }} alt="" />
            ))}
          </div>
        )}

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* AI Summary card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Summary</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: sentimentBg(result.sentiment), color: sentimentColor(result.sentiment), fontWeight: 600 }}>
                {result.sentiment}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#222' }}>{result.summary}</p>
          </div>

          {/* Structured data grid */}
          {sdEntries.length > 0 && (
            <div style={cardStyle}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Measurements</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {sdEntries.map(([key, val]) => (
                  <div key={key} style={{ background: '#F8F8F8', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3 }}>{formatKey(key)}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#222', marginTop: 2 }}>{String(val)}</div>
                  </div>
                ))}
              </div>
              {sdArrays.map(([key, arr]) => (
                <div key={key} style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>{formatKey(key)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {arr.map(item => (
                      <span key={item} style={{ background: '#F0F0F0', color: '#444', fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div style={cardStyle}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>Tags</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {editableTags.map(tag => (
                <button key={tag} onClick={() => removeTag(tag)}
                  style={{ background: `${G}15`, color: G, border: 'none', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {tag} <span style={{ opacity: 0.6 }}>×</span>
                </button>
              ))}
              <AddTagInput onAdd={addTag} />
            </div>
          </div>

          {/* Strain recommendations */}
          {result.strains_mentioned.length > 0 && (
            <div style={{ ...cardStyle, borderLeft: `3px solid ${G}` }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: G, display: 'block', marginBottom: 6 }}>🌿 Strains Detected</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.strains_mentioned.map(s => (
                  <span key={s} style={{ background: `${G}15`, color: G, fontSize: 13, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>{s}</span>
                ))}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>Review in Strain Library after saving</p>
            </div>
          )}

          {/* Transcript */}
          <details style={cardStyle}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Transcript</summary>
            <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: '#555' }}>{transcript}</p>
          </details>

          {/* Save button */}
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ background: saving ? '#ccc' : G, color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4, width: '100%' }}
          >
            {saving ? 'Saving...' : 'Save Log Entry'}
          </button>

          <button onClick={handleSaveDraft} style={{ background: 'transparent', color: '#888', border: 'none', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
            Save as Draft
          </button>
        </div>
      </div>
    )
  }

  return null
}

function AddTagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
      placeholder="+ add tag"
      style={{ background: '#F5F5F5', border: '1px dashed #DDD', borderRadius: 20, padding: '4px 12px', fontSize: 12, width: 80, outline: 'none', color: '#666' }}
    />
  )
}

function formatKey(key: string) {
  return key.replace(/_/g, ' ')
}

function sentimentBg(s: string) {
  if (s === 'positive') return '#E8F8EF'
  if (s === 'negative') return '#FEECEC'
  return '#FFF8E7'
}
function sentimentColor(s: string) {
  if (s === 'positive') return G
  if (s === 'negative') return '#E74C3C'
  return '#F0A500'
}

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 14, padding: '4px 0',
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #F0F0F0',
}
