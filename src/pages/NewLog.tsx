import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { transcribeAudio, extractStructuredData } from '../lib/api'
import { TAG_COLORS, StructuredData } from '../lib/types'

type Phase = 'select-room' | 'recording' | 'processing' | 'review' | 'error'

export default function NewLog() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('select-room')
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [processStep, setProcessStep] = useState<'transcribing' | 'extracting'>('transcribing')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [structuredData, setStructuredData] = useState<StructuredData>({})
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  const { data: facilityData } = useQuery({
    queryKey: ['facility'],
    queryFn: async () => {
      const { data } = await supabase.from('facilities').select('*').limit(1).maybeSingle()
      return data
    },
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms', facilityData?.id],
    enabled: !!facilityData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('rooms')
        .select('id, name, room_type')
        .eq('facility_id', facilityData!.id)
        .order('name')
      return data
    },
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        audioBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' })
        processRecording()
      }

      mr.start(250)
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }, [])

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setPhase('processing')
  }

  const processRecording = async () => {
    const blob = audioBlobRef.current
    if (!blob) return

    try {
      setProcessStep('transcribing')
      const { transcript: tx } = await transcribeAudio(blob)
      setTranscript(tx)

      setProcessStep('extracting')
      const result = await extractStructuredData(tx)
      setSummary(result.summary)
      setTags(result.tags ?? [])
      setStructuredData(result.structured_data as StructuredData ?? {})
      setPhase('review')
    } catch {
      setErrorMsg('Processing failed. You can still save the raw recording.')
      setPhase('error')
    }
  }

  const saveLog = async () => {
    if (!selectedRoom || !facilityData) return
    setSaving(true)
    try {
      // Upload audio if we have it
      let audioUrl: string | undefined
      if (audioBlobRef.current) {
        const filename = `${facilityData.id}/${Date.now()}.webm`
        const { error: upErr } = await supabase.storage
          .from('grow-audio')
          .upload(filename, audioBlobRef.current, { contentType: 'audio/webm' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('grow-audio').getPublicUrl(filename)
          audioUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('grow_logs').insert({
        facility_id: facilityData.id,
        room_id: selectedRoom.id,
        transcript,
        summary,
        tags,
        structured_data: structuredData,
        audio_url: audioUrl,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      if (error) throw error

      await qc.invalidateQueries({ queryKey: ['logs'] })
      nav('/', { replace: true })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // PHASE: Select room
  if (phase === 'select-room') {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <button onClick={() => nav(-1)} style={backBtnStyle}>← Back</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>New Log</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Select a room, then start recording</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(rooms ?? []).map(room => (
              <button
                key={room.id}
                onClick={() => { setSelectedRoom(room); startRecording() }}
                style={{
                  background: selectedRoom?.id === room.id ? '#00AE42' : '#f9fafb',
                  color: selectedRoom?.id === room.id ? '#fff' : '#111827',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {room.name}
                <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>{room.room_type}</span>
              </button>
            ))}
            {(!rooms || rooms.length === 0) && (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No rooms found. Set up your facility first.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // PHASE: Recording
  if (phase === 'recording') {
    return (
      <div style={{ ...pageStyle, background: '#0f172a', color: '#fff' }}>
        <div style={{ ...containerStyle, alignItems: 'center', paddingTop: 80 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#94a3b8' }}>
            {selectedRoom?.name}
          </div>
          {/* Waveform animation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 60, marginBottom: 32 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  borderRadius: 2,
                  background: '#00AE42',
                  animation: `wave 0.8s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`,
                  height: `${20 + Math.random() * 40}px`,
                }}
              />
            ))}
          </div>
          <style>{`@keyframes wave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.3)} }`}</style>
          <div style={{ fontSize: 36, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: 16 }}>
            {fmtTime(elapsed)}
          </div>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 48 }}>Recording… speak naturally</p>
          <button
            onClick={stopRecording}
            style={{
              background: '#ef4444',
              color: '#fff',
              padding: '16px 48px',
              borderRadius: 50,
              fontSize: 16,
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            }}
          >Stop & Process</button>
        </div>
      </div>
    )
  }

  // PHASE: Processing
  if (phase === 'processing') {
    return (
      <div style={{ ...pageStyle, background: '#0f172a', color: '#fff' }}>
        <div style={{ ...containerStyle, alignItems: 'center', paddingTop: 120 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: '4px solid #1e293b',
            borderTop: '4px solid #00AE42',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 24,
          }} />
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
            {processStep === 'transcribing' ? 'Transcribing…' : 'Structuring your log…'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            {processStep === 'transcribing' ? 'Converting speech to text' : 'AI is extracting cultivation data'}
          </p>
        </div>
      </div>
    )
  }

  // PHASE: Error
  if (phase === 'error') {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 16, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
            {errorMsg}
          </div>
          <button onClick={() => nav('/')} style={btnSecondary}>Go Home</button>
        </div>
      </div>
    )
  }

  // PHASE: Review
  return (
    <div style={pageStyle}>
      <div style={{ ...containerStyle, paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Review Log</h2>
          <button
            onClick={() => nav('/')}
            style={{ background: 'none', color: '#9ca3af', fontSize: 14 }}
          >Discard</button>
        </div>

        {/* Summary */}
        <section style={cardStyle}>
          <label style={labelStyle}>Summary</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </section>

        {/* Tags */}
        {tags.length > 0 && (
          <section style={cardStyle}>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const c = TAG_COLORS[tag] ?? { bg: '#f3f4f6', text: '#374151' }
                return (
                  <span key={tag} style={{
                    background: c.bg,
                    color: c.text,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>{tag.replace(/_/g, ' ')}</span>
                )
              })}
            </div>
          </section>
        )}

        {/* Structured data */}
        {structuredData.environment && Object.keys(structuredData.environment).length > 0 && (
          <section style={cardStyle}>
            <label style={labelStyle}>Environment</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(structuredData.environment).map(([k, v]) => v !== undefined && (
                <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{v}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {structuredData.observations && structuredData.observations.length > 0 && (
          <section style={cardStyle}>
            <label style={labelStyle}>Observations</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {structuredData.observations.map((o, i) => (
                <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{o}</li>
              ))}
            </ul>
          </section>
        )}

        {structuredData.issues && structuredData.issues.length > 0 && (
          <section style={{ ...cardStyle, borderLeft: '3px solid #ef4444' }}>
            <label style={{ ...labelStyle, color: '#b91c1c' }}>Issues</label>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {structuredData.issues.map((o, i) => (
                <li key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>{o}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Transcript */}
        {transcript && (
          <section style={cardStyle}>
            <label style={labelStyle}>Transcript</label>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{transcript}</p>
          </section>
        )}

        {errorMsg && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Fixed save bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e5e7eb',
        padding: '16px 20px',
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={saveLog}
          disabled={saving}
          style={{
            background: saving ? '#9ca3af' : '#00AE42',
            color: '#fff',
            padding: '16px 0',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            width: '100%',
            maxWidth: 440,
          }}
        >
          {saving ? 'Saving…' : 'Looks Good — Save Log'}
        </button>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  background: '#f3f4f6',
  minHeight: '100dvh',
}

const containerStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  padding: '20px 20px 0',
  display: 'flex',
  flexDirection: 'column',
}

const cardStyle: React.CSSProperties = {
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

const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#111827',
  width: '100%',
  lineHeight: 1.5,
}

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  color: '#6b7280',
  fontSize: 14,
  padding: '0 0 16px',
  textAlign: 'left',
}

const btnSecondary: React.CSSProperties = {
  background: '#f3f4f6',
  color: '#374151',
  padding: '14px 0',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  width: '100%',
}
