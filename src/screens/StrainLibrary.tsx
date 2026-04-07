import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import type { Strain, StrainRecommendation } from '../types'

const G = '#00AE42'

export function StrainLibrary() {
  const { strains, facility, refreshStrains } = useApp()
  const [recs, setRecs] = useState<StrainRecommendation[]>([])
  const [tab, setTab] = useState<'strains' | 'pending'>('strains')
  const [editingStrain, setEditingStrain] = useState<Strain | null>(null)
  const [newStrainName, setNewStrainName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (!facility) return
    loadRecs()
  }, [facility])

  async function loadRecs() {
    const { data } = await supabase
      .from('strain_recommendations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (data) setRecs(data as StrainRecommendation[])
  }

  async function approveRec(rec: StrainRecommendation) {
    if (!facility) return

    // Upsert strain
    const { data: strain } = await supabase
      .from('strains')
      .upsert({ name: rec.detected_name, facility_id: facility.id }, { onConflict: 'facility_id,name' })
      .select()
      .single()

    await supabase.from('strain_recommendations').update({
      status: 'approved',
      matched_strain_id: strain?.id,
    }).eq('id', rec.id)

    await refreshStrains()
    setRecs(r => r.filter(x => x.id !== rec.id))
  }

  async function rejectRec(rec: StrainRecommendation) {
    await supabase.from('strain_recommendations').update({ status: 'rejected' }).eq('id', rec.id)
    setRecs(r => r.filter(x => x.id !== rec.id))
  }

  async function editRec(rec: StrainRecommendation, newName: string) {
    if (!facility || !newName.trim()) return
    const { data: strain } = await supabase
      .from('strains')
      .upsert({ name: newName.trim(), facility_id: facility.id }, { onConflict: 'facility_id,name' })
      .select()
      .single()
    await supabase.from('strain_recommendations').update({
      status: 'approved',
      detected_name: newName.trim(),
      matched_strain_id: strain?.id,
    }).eq('id', rec.id)
    await refreshStrains()
    setRecs(r => r.filter(x => x.id !== rec.id))
  }

  async function addStrain() {
    if (!facility || !newStrainName.trim()) return
    await supabase.from('strains').insert({ name: newStrainName.trim(), facility_id: facility.id })
    setNewStrainName('')
    setShowAddForm(false)
    await refreshStrains()
  }

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', background: '#fff' }}>
        {(['strains', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? G : '#888', borderBottom: tab === t ? `2px solid ${G}` : '2px solid transparent' }}
          >
            {t === 'strains' ? 'Library' : `Pending (${recs.length})`}
          </button>
        ))}
      </div>

      {tab === 'strains' && (
        <div style={{ padding: '16px' }}>
          {/* Add strain */}
          {showAddForm ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                autoFocus
                value={newStrainName}
                onChange={e => setNewStrainName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStrain()}
                placeholder="Strain name..."
                style={{ flex: 1, padding: '10px 14px', border: '1px solid #DDD', borderRadius: 10, fontSize: 14, outline: 'none' }}
              />
              <button onClick={addStrain} style={{ background: G, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddForm(false)} style={{ background: '#F5F5F5', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', color: '#666' }}>×</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{ width: '100%', padding: '12px', border: `1px dashed ${G}`, borderRadius: 12, background: `${G}08`, color: G, fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}
            >
              + Add Strain
            </button>
          )}

          {strains.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🌿</p>
              <p style={{ margin: 0 }}>No strains yet. Approve recommendations or add manually.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {strains.map(strain => (
                <StrainCard key={strain.id} strain={strain} onEdit={setEditingStrain} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div style={{ padding: '16px' }}>
          {recs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>✅</p>
              <p style={{ margin: 0 }}>No pending strain recommendations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recs.map(rec => (
                <RecCard key={rec.id} rec={rec} onApprove={approveRec} onReject={rejectRec} onEdit={editRec} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingStrain && (
        <EditStrainModal strain={editingStrain} onClose={() => { setEditingStrain(null); refreshStrains() }} />
      )}
    </div>
  )
}

function StrainCard({ strain, onEdit }: { strain: Strain; onEdit: (s: Strain) => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{strain.name}</div>
        {strain.notes && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{strain.notes}</div>}
      </div>
      <button onClick={() => onEdit(strain)} style={{ background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#666', fontSize: 13 }}>
        Edit
      </button>
    </div>
  )
}

function RecCard({ rec, onApprove, onReject, onEdit }: {
  rec: StrainRecommendation
  onApprove: (r: StrainRecommendation) => void
  onReject: (r: StrainRecommendation) => void
  onEdit: (r: StrainRecommendation, name: string) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [editVal, setEditVal] = useState(rec.detected_name)

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #F0F0F0' }}>
      {editMode ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            autoFocus
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #DDD', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <button onClick={() => onEdit(rec, editVal)} style={{ background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Save</button>
          <button onClick={() => setEditMode(false)} style={{ background: '#F5F5F5', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#666' }}>×</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{rec.detected_name}</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>detected by AI</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onApprove(rec)} style={{ flex: 1, background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              Confirm
            </button>
            <button onClick={() => setEditMode(true)} style={{ flex: 1, background: '#F5F5F5', color: '#444', border: 'none', borderRadius: 8, padding: '8px', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
              Edit Name
            </button>
            <button onClick={() => onReject(rec)} style={{ flex: 1, background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 8, padding: '8px', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EditStrainModal({ strain, onClose }: { strain: Strain; onClose: () => void }) {
  const [name, setName] = useState(strain.name)
  const [notes, setNotes] = useState(strain.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('strains').update({ name, notes }).eq('id', strain.id)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Edit Strain</h3>
        <label style={labelStyle}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, background: G, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: '#F5F5F5', color: '#444', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }
