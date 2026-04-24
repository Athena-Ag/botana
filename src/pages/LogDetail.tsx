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

        {/* Growth Stage */}
        {log.structured_data?.growth_stage && (log.structured_data.growth_stage.phase || log.structured_data.growth_stage.week) && (
          <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <label style={{ ...labelStyle, color: '#15803d' }}>Growth Stage</label>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#166534' }}>
              {log.structured_data.growth_stage.phase && (
                <span style={{ textTransform: 'capitalize' }}>{log.structured_data.growth_stage.phase}</span>
              )}
              {log.structured_data.growth_stage.week && (
                <span> — Week {log.structured_data.growth_stage.week}</span>
              )}
              {log.structured_data.growth_stage.day && (
                <span>, Day {log.structured_data.growth_stage.day}</span>
              )}
            </div>
          </div>
        )}

        {/* Environment */}
        {log.structured_data?.environment && Object.keys(log.structured_data.environment).length > 0 && (
          <div style={card}>
            <label style={labelStyle}>Environment</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(log.structured_data.environment).map(([k, v]) => v !== undefined && v !== null && (
                <div key={k} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{v}{k === 'temp_f' ? '°F' : k === 'rh' ? '%' : k === 'co2' ? ' ppm' : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feed / Fertilizer */}
        {log.structured_data?.feed && (log.structured_data.feed.products?.length || log.structured_data.feed.ec || log.structured_data.feed.ph) && (
          <div style={{ ...card, borderLeft: '3px solid #00AE42' }}>
            <label style={{ ...labelStyle, color: '#15803d' }}>Feed Program</label>
            {(log.structured_data.feed.products ?? []).length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Products</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {log.structured_data.feed.products!.map(p => (
                    <span key={p} style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600 }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {log.structured_data.feed.ec != null && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>EC</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{log.structured_data.feed.ec}</div>
                </div>
              )}
              {log.structured_data.feed.ppm != null && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>PPM</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{log.structured_data.feed.ppm}</div>
                </div>
              )}
              {log.structured_data.feed.ph != null && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>pH</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{log.structured_data.feed.ph}</div>
                </div>
              )}
            </div>
            {log.structured_data.feed.dilution_rate && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>Rate: {log.structured_data.feed.dilution_rate}</div>
            )}
            {log.structured_data.feed.notes && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{log.structured_data.feed.notes}</div>
            )}
          </div>
        )}

        {/* Trial */}
        {log.structured_data?.trial?.is_trial && (
          <div style={{ ...card, borderLeft: '3px solid #8b5cf6' }}>
            <label style={{ ...labelStyle, color: '#7c3aed' }}>Trial / Side-by-Side</label>
            {log.structured_data.trial.description && (
              <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{log.structured_data.trial.description}</p>
            )}
            {(log.structured_data.trial.groups ?? []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {log.structured_data.trial.groups!.map((g, i) => (
                  <div key={i} style={{ background: '#f5f3ff', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#374151' }}>{g}</div>
                ))}
              </div>
            )}
            {(log.structured_data.trial.observations ?? []).length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {log.structured_data.trial.observations!.map((o, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Plant Health */}
        {log.structured_data?.plant_health && (log.structured_data.plant_health.turgor || log.structured_data.plant_health.pest_pressure || (log.structured_data.plant_health.notes ?? []).length > 0) && (
          <div style={card}>
            <label style={labelStyle}>Plant Health</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: (log.structured_data.plant_health.notes ?? []).length > 0 ? 10 : 0 }}>
              {log.structured_data.plant_health.turgor && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Turgor</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: log.structured_data.plant_health.turgor === 'praying' ? '#15803d' : log.structured_data.plant_health.turgor === 'wilting' ? '#b91c1c' : '#111827', textTransform: 'capitalize' }}>{log.structured_data.plant_health.turgor}</div>
                </div>
              )}
              {log.structured_data.plant_health.canopy_uniformity && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Canopy</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{log.structured_data.plant_health.canopy_uniformity}</div>
                </div>
              )}
              {log.structured_data.plant_health.pest_pressure && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Pest Pressure</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: log.structured_data.plant_health.pest_pressure === 'none' ? '#15803d' : log.structured_data.plant_health.pest_pressure === 'high' ? '#b91c1c' : '#111827', textTransform: 'capitalize' }}>{log.structured_data.plant_health.pest_pressure}</div>
                </div>
              )}
              {log.structured_data.plant_health.color && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>Color</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{log.structured_data.plant_health.color}</div>
                </div>
              )}
            </div>
            {(log.structured_data.plant_health.notes ?? []).length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {log.structured_data.plant_health.notes!.map((n, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{n}</li>
                ))}
              </ul>
            )}
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
