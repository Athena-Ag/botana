import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import type { Room } from '../types'

const G = '#00AE42'

const ROOM_TYPES: Room['room_type'][] = ['flowering', 'vegetation', 'propagation', 'clone', 'mother', 'other']

interface RoomDraft {
  id?: string
  name: string
  room_type: Room['room_type']
  canopy_sqft: string
  isNew?: boolean
}

export function FacilitySetup() {
  const { facility, rooms, setFacility, refreshRooms } = useApp()
  const [facilityName, setFacilityName] = useState(facility?.name ?? '')
  const [facilityDesc, setFacilityDesc] = useState(facility?.description ?? '')
  const [roomDrafts, setRoomDrafts] = useState<RoomDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFacilityName(facility?.name ?? '')
    setFacilityDesc(facility?.description ?? '')
    setRoomDrafts(rooms.map(r => ({
      id: r.id,
      name: r.name,
      room_type: r.room_type,
      canopy_sqft: r.canopy_sqft?.toString() ?? '',
    })))
  }, [facility, rooms])

  function addRoom() {
    setRoomDrafts(r => [...r, { name: '', room_type: 'flowering', canopy_sqft: '', isNew: true }])
  }

  function updateRoom(idx: number, field: keyof RoomDraft, value: string) {
    setRoomDrafts(r => r.map((room, i) => i === idx ? { ...room, [field]: value } : room))
  }

  function removeRoom(idx: number) {
    setRoomDrafts(r => r.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let facilityId = facility?.id

      if (!facilityId) {
        // Create facility
        const { data } = await supabase
          .from('facilities')
          .insert({ name: facilityName.trim(), description: facilityDesc.trim() || null })
          .select()
          .single()
        if (data) {
          facilityId = data.id
          setFacility(data)
        }
      } else {
        // Update facility
        const { data } = await supabase
          .from('facilities')
          .update({ name: facilityName.trim(), description: facilityDesc.trim() || null })
          .eq('id', facilityId)
          .select()
          .single()
        if (data) setFacility(data)
      }

      if (!facilityId) return

      // Upsert rooms
      for (const draft of roomDrafts) {
        if (!draft.name.trim()) continue
        const roomData = {
          facility_id: facilityId,
          name: draft.name.trim(),
          room_type: draft.room_type,
          canopy_sqft: draft.canopy_sqft ? parseFloat(draft.canopy_sqft) : null,
        }

        if (draft.id) {
          await supabase.from('rooms').update(roomData).eq('id', draft.id)
        } else {
          await supabase.from('rooms').insert(roomData)
        }
      }

      // Delete removed rooms
      const existingIds = roomDrafts.filter(r => r.id).map(r => r.id!)
      const removedRooms = rooms.filter(r => !existingIds.includes(r.id))
      for (const room of removedRooms) {
        await supabase.from('rooms').delete().eq('id', room.id)
      }

      await refreshRooms()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px 40px' }}>
      <h2 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: 22 }}>Facility Setup</h2>

      {/* Facility info */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Facility Info</h3>
        <label style={labelStyle}>Name *</label>
        <input
          value={facilityName}
          onChange={e => setFacilityName(e.target.value)}
          placeholder="e.g. Main Grow Facility"
          style={inputStyle}
        />
        <label style={labelStyle}>Description</label>
        <textarea
          value={facilityDesc}
          onChange={e => setFacilityDesc(e.target.value)}
          placeholder="Optional notes about this facility"
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
        />
      </div>

      {/* Rooms */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Rooms</h3>

        {roomDrafts.map((room, idx) => (
          <div key={room.id ?? idx} style={{ background: '#F8F8F8', borderRadius: 12, padding: '14px', marginBottom: 12, border: '1px solid #EFEFEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Room {idx + 1}</span>
              <button onClick={() => removeRoom(idx)} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <label style={labelStyle}>Room Name *</label>
            <input
              value={room.name}
              onChange={e => updateRoom(idx, 'name', e.target.value)}
              placeholder="e.g. Flower Room A"
              style={inputStyle}
            />
            <label style={labelStyle}>Room Type</label>
            <select value={room.room_type} onChange={e => updateRoom(idx, 'room_type', e.target.value)} style={inputStyle}>
              {ROOM_TYPES.map(t => (
                <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <label style={labelStyle}>Canopy (sq ft)</label>
            <input
              type="number"
              value={room.canopy_sqft}
              onChange={e => updateRoom(idx, 'canopy_sqft', e.target.value)}
              placeholder="e.g. 100"
              style={inputStyle}
            />
          </div>
        ))}

        <button
          onClick={addRoom}
          style={{ width: '100%', padding: '12px', border: `1px dashed ${G}`, borderRadius: 12, background: `${G}08`, color: G, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          + Add Room
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !facilityName.trim()}
        style={{
          width: '100%', background: saved ? '#27AE60' : (saving || !facilityName.trim() ? '#CCC' : G),
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600,
          cursor: saving || !facilityName.trim() ? 'not-allowed' : 'pointer', marginTop: 8, transition: 'background 0.3s',
        }}
      >
        {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Facility'}
      </button>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #F0F0F0', marginBottom: 16,
}
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#222' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' }
