import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type RoomRow = { name: string; room_type: string; canopy_sqft: string }

const ROOM_TYPES = ['flowering', 'vegetation', 'propagation', 'clone', 'mother', 'other']

export default function FacilitySetup() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [facilityName, setFacilityName] = useState('')
  const [facilityDesc, setFacilityDesc] = useState('')
  const [rooms, setRooms] = useState<RoomRow[]>([
    { name: '', room_type: 'flowering', canopy_sqft: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addRoom = () =>
    setRooms(r => [...r, { name: '', room_type: 'flowering', canopy_sqft: '' }])

  const removeRoom = (i: number) =>
    setRooms(r => r.filter((_, idx) => idx !== i))

  const updateRoom = (i: number, field: keyof RoomRow, val: string) =>
    setRooms(r => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!facilityName.trim()) { setError('Facility name is required'); return }
    const validRooms = rooms.filter(r => r.name.trim())
    if (validRooms.length === 0) { setError('Add at least one room'); return }
    setSaving(true)
    setError('')
    try {
      const { data: fac, error: facErr } = await supabase
        .from('facilities')
        .insert({ name: facilityName.trim(), description: facilityDesc.trim() || null })
        .select()
        .single()
      if (facErr) throw facErr
      if (validRooms.length > 0) {
        const { error: roomErr } = await supabase.from('rooms').insert(
          validRooms.map(r => ({
            facility_id: fac.id,
            name: r.name.trim(),
            room_type: r.room_type,
            canopy_sqft: r.canopy_sqft ? parseFloat(r.canopy_sqft) : null,
          }))
        )
        if (roomErr) throw roomErr
      }
      await qc.invalidateQueries({ queryKey: ['facility'] })
      nav('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '32px 20px 80px', flex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="#00AE42" style={{ marginBottom: 16 }}>
            <path d="M16 4C9 4 5 11 5 18c0 5 3.5 9 11 11 7.5-2 11-6 11-11 0-7-4-14-11-14zm0 3c3.5 0 7 4.5 7 11 0 3-2 5.5-7 7-5-1.5-7-4-7-7 0-6.5 3.5-11 7-11z"/>
          </svg>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>Welcome to Botana</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 15 }}>Set up your facility to get started</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Facility */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#374151' }}>Facility</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                placeholder="Facility name *"
                value={facilityName}
                onChange={e => setFacilityName(e.target.value)}
                style={inputStyle}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={facilityDesc}
                onChange={e => setFacilityDesc(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </section>

          {/* Rooms */}
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#374151' }}>Rooms</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rooms.map((room, i) => (
                <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: 14, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      placeholder="Room name *"
                      value={room.name}
                      onChange={e => updateRoom(i, 'name', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {rooms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRoom(i)}
                        style={{ background: 'none', color: '#9ca3af', fontSize: 20, padding: '0 8px' }}
                      >×</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={room.room_type}
                      onChange={e => updateRoom(i, 'room_type', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      {ROOM_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Sqft"
                      type="number"
                      value={room.canopy_sqft}
                      onChange={e => updateRoom(i, 'canopy_sqft', e.target.value)}
                      style={{ ...inputStyle, width: 90 }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoom}
                style={{
                  background: 'none',
                  color: '#00AE42',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '10px 0',
                  border: '1.5px dashed #00AE42',
                  borderRadius: 10,
                }}
              >+ Add Room</button>
            </div>
          </section>

          {error && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? '#9ca3af' : '#00AE42',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              padding: '16px 0',
              borderRadius: 12,
              width: '100%',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Setting up…' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 15,
  color: '#111827',
  width: '100%',
}
