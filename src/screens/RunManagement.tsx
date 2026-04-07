import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { BottomSheet } from '../components/BottomSheet'
import type { Run } from '../types'

const G = '#00AE42'

const STATUS_COLORS = { active: G, completed: '#3498DB', abandoned: '#E74C3C' }
const STATUS_BG = { active: `${G}15`, completed: '#3498DB15', abandoned: '#E74C3C15' }

export function RunManagement() {
  const { runs, rooms, strains, facility, refreshRuns } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [showEnd, setShowEnd] = useState<Run | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')

  const filtered = runs.filter(r => filter === 'all' || r.status === filter)

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Filter bar */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
        {(['active', 'completed', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? G : '#F5F5F5', color: filter === f ? '#fff' : '#444', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setShowCreate(true)}
          style={{ marginLeft: 'auto', background: G, color: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Run
        </button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🔄</p>
            <p style={{ margin: 0 }}>No {filter === 'all' ? '' : filter} runs. Start a new crop cycle.</p>
          </div>
        ) : (
          filtered.map(run => (
            <RunCard key={run.id} run={run} onEnd={() => setShowEnd(run)} onRefresh={refreshRuns} />
          ))
        )}
      </div>

      {/* Create run sheet */}
      <CreateRunSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        rooms={rooms}
        strains={strains}
        facilityId={facility?.id}
        onCreated={refreshRuns}
      />

      {/* End run sheet */}
      {showEnd && (
        <EndRunSheet
          run={showEnd}
          onClose={() => setShowEnd(null)}
          onEnded={refreshRuns}
        />
      )}
    </div>
  )
}

function RunCard({ run, onEnd, onRefresh }: { run: Run; onEnd: () => void; onRefresh: () => void }) {
  const room = run.room as { name: string; room_type: string } | undefined
  const strain = run.strain as { name: string } | undefined

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #F0F0F0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{run.name || `Run ${run.id.slice(0, 6)}`}</div>
          {room && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{room.name}</div>}
        </div>
        <span style={{
          background: STATUS_BG[run.status], color: STATUS_COLORS[run.status],
          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize',
        }}>
          {run.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {strain && (
          <span style={{ background: `${G}12`, color: G, fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>
            🌿 {strain.name}
          </span>
        )}
        {run.week_number != null && (
          <span style={{ background: '#F0F0F0', color: '#666', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>
            Week {run.week_number}
          </span>
        )}
        {run.start_date && (
          <span style={{ background: '#F0F0F0', color: '#666', fontSize: 12, padding: '3px 10px', borderRadius: 20 }}>
            Started {new Date(run.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {run.ai_summary && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>{run.ai_summary}</p>
      )}

      {run.status === 'active' && (
        <button
          onClick={onEnd}
          style={{ width: '100%', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          End Run
        </button>
      )}
    </div>
  )
}

function CreateRunSheet({ open, onClose, rooms, strains, facilityId, onCreated }: {
  open: boolean
  onClose: () => void
  rooms: import('../types').Room[]
  strains: import('../types').Strain[]
  facilityId?: string
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '')
  const [strainId, setStrainId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [weekNum, setWeekNum] = useState('1')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!roomId) return
    setSaving(true)
    await supabase.from('runs').insert({
      room_id: roomId,
      strain_id: strainId || null,
      name: name.trim() || null,
      start_date: startDate,
      week_number: weekNum ? parseInt(weekNum) : null,
      status: 'active',
    })
    await onCreated()
    setSaving(false)
    onClose()
    setName(''); setStrainId(''); setWeekNum('1')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="New Crop Run">
      <div style={{ padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Run Name (optional)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blue Dream Batch 3" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Room *</label>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} style={inputStyle}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Strain</label>
          <select value={strainId} onChange={e => setStrainId(e.target.value)} style={inputStyle}>
            <option value="">None / TBD</option>
            {strains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Starting Week</label>
            <input type="number" value={weekNum} onChange={e => setWeekNum(e.target.value)} min="1" style={inputStyle} />
          </div>
        </div>
        <button
          onClick={create}
          disabled={saving || !roomId}
          style={{ background: saving || !roomId ? '#CCC' : G, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
        >
          {saving ? 'Creating...' : 'Start Run'}
        </button>
      </div>
    </BottomSheet>
  )
}

function EndRunSheet({ run, onClose, onEnded }: { run: Run; onClose: () => void; onEnded: () => void }) {
  const [status, setStatus] = useState<'completed' | 'abandoned'>('completed')
  const [endDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  async function end() {
    setSaving(true)
    await supabase.from('runs').update({
      status,
      end_date: endDate,
      ai_summary: summary.trim() || null,
    }).eq('id', run.id)
    await onEnded()
    setSaving(false)
    onClose()
  }

  return (
    <BottomSheet open={true} onClose={onClose} title="End Run">
      <div style={{ padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 15, color: '#444' }}>Ending: <strong>{run.name || `Run ${run.id.slice(0, 6)}`}</strong></p>
        <div>
          <label style={labelStyle}>Outcome</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['completed', 'abandoned'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                style={{ flex: 1, padding: '10px', border: `2px solid ${status === s ? STATUS_COLORS[s] : '#DDD'}`, borderRadius: 10, background: status === s ? STATUS_BG[s] : '#fff', color: status === s ? STATUS_COLORS[s] : '#666', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', fontSize: 14 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Final Notes (optional)</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Yield, observations, issues..." style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
        </div>
        <button
          onClick={end}
          disabled={saving}
          style={{ background: saving ? '#CCC' : STATUS_COLORS[status], color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          {saving ? 'Saving...' : `Mark as ${status}`}
        </button>
      </div>
    </BottomSheet>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' }
