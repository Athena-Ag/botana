import { useState } from 'react'
import InlineEdit from './InlineEdit'

/**
 * StructuredDataEditor
 *
 * Renders the full grow_logs.structured_data object with inline editing.
 *
 * Props:
 *   data            – structured_data object (may be null/undefined)
 *   onSave(path, v) – called with dot-path and new value, e.g. ('feed.ec', 2.1)
 *                     For array fields, v is the full new array.
 */
export default function StructuredDataEditor({ data = {}, onSave }) {
  const d = data || {}

  return (
    <>
      {/* Growth Stage */}
      <Section title="Growth Stage" accent="#00AE42" bg="#f0fdf4" border="#bbf7d0" titleColor="#15803d">
        <FieldRow label="Phase">
          <InlineEdit
            value={d.growth_stage?.phase}
            type="select"
            options={['veg', 'flower', 'propagation', 'clone', 'mother', 'dry', 'cure', 'other']}
            onSave={(v) => onSave('growth_stage.phase', v)}
            style={{ fontSize: 16, fontWeight: 600, textTransform: 'capitalize' }}
          />
        </FieldRow>
        <FieldRow label="Week">
          <InlineEdit
            value={d.growth_stage?.week}
            type="number"
            onSave={(v) => onSave('growth_stage.week', v)}
            style={{ fontSize: 16, fontWeight: 600 }}
          />
        </FieldRow>
        <FieldRow label="Day">
          <InlineEdit
            value={d.growth_stage?.day}
            type="number"
            onSave={(v) => onSave('growth_stage.day', v)}
            style={{ fontSize: 16, fontWeight: 600 }}
          />
        </FieldRow>
      </Section>

      {/* Environment */}
      <Section title="Environment">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'temp_f', label: 'Temp °F', type: 'number' },
            { key: 'rh', label: 'RH %', type: 'number' },
            { key: 'vpd', label: 'VPD', type: 'number' },
            { key: 'co2', label: 'CO₂ ppm', type: 'number' },
            { key: 'light_ppfd', label: 'PPFD', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
              <div style={miniLabel}>{label}</div>
              <InlineEdit
                value={d.environment?.[key]}
                type={type}
                onSave={(v) => onSave(`environment.${key}`, v)}
                style={{ fontSize: 16, fontWeight: 600 }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Feed */}
      <Section title="Feed Program" border="3px solid #00AE42" titleColor="#15803d">
        <FieldRow label="EC">
          <InlineEdit value={d.feed?.ec} type="number" onSave={(v) => onSave('feed.ec', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
        <FieldRow label="PPM">
          <InlineEdit value={d.feed?.ppm} type="number" onSave={(v) => onSave('feed.ppm', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
        <FieldRow label="pH">
          <InlineEdit value={d.feed?.ph} type="number" onSave={(v) => onSave('feed.ph', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
        <FieldRow label="Vol (gal)">
          <InlineEdit value={d.feed?.feed_volume_gal} type="number" onSave={(v) => onSave('feed.feed_volume_gal', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
        <FieldRow label="Dilution rate">
          <InlineEdit value={d.feed?.dilution_rate} type="text" onSave={(v) => onSave('feed.dilution_rate', v)} />
        </FieldRow>
        <FieldRow label="Notes">
          <InlineEdit value={d.feed?.notes} type="text" onSave={(v) => onSave('feed.notes', v)} />
        </FieldRow>
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>Products</div>
          <ArrayChipEditor
            items={d.feed?.products ?? []}
            onSave={(arr) => onSave('feed.products', arr)}
            chipColor={{ bg: '#dcfce7', text: '#166534' }}
          />
        </div>
      </Section>

      {/* Water */}
      <Section title="Water">
        <FieldRow label="Usage (gal)">
          <InlineEdit value={d.water?.usage_gal} type="number" onSave={(v) => onSave('water.usage_gal', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
        <FieldRow label="Runoff %">
          <InlineEdit value={d.water?.runoff_pct} type="number" onSave={(v) => onSave('water.runoff_pct', v)} style={{ fontSize: 16, fontWeight: 600 }} />
        </FieldRow>
      </Section>

      {/* Plant Health */}
      <Section title="Plant Health">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={miniLabel}>Turgor</div>
            <InlineEdit
              value={d.plant_health?.turgor}
              type="select"
              options={['praying', 'wilting', 'normal', 'drooping']}
              onSave={(v) => onSave('plant_health.turgor', v)}
              style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}
            />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={miniLabel}>Canopy</div>
            <InlineEdit
              value={d.plant_health?.canopy_uniformity}
              type="select"
              options={['even', 'uneven', 'mixed']}
              onSave={(v) => onSave('plant_health.canopy_uniformity', v)}
              style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}
            />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={miniLabel}>Pest Pressure</div>
            <InlineEdit
              value={d.plant_health?.pest_pressure}
              type="select"
              options={['none', 'low', 'moderate', 'high']}
              onSave={(v) => onSave('plant_health.pest_pressure', v)}
              style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}
            />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={miniLabel}>Color</div>
            <InlineEdit
              value={d.plant_health?.color}
              type="text"
              onSave={(v) => onSave('plant_health.color', v)}
              style={{ fontSize: 14, fontWeight: 600 }}
            />
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={miniLabel}>Root Health</div>
            <InlineEdit
              value={d.plant_health?.root_health}
              type="text"
              onSave={(v) => onSave('plant_health.root_health', v)}
              style={{ fontSize: 14, fontWeight: 600 }}
            />
          </div>
        </div>
        <div>
          <div style={miniLabel}>Notes</div>
          <ArrayChipEditor
            items={d.plant_health?.notes ?? []}
            onSave={(arr) => onSave('plant_health.notes', arr)}
          />
        </div>
      </Section>

      {/* Trial */}
      <Section title="Trial / Side-by-Side" border="3px solid #8b5cf6" titleColor="#7c3aed">
        <FieldRow label="Is trial">
          <InlineEdit value={d.trial?.is_trial} type="checkbox" onSave={(v) => onSave('trial.is_trial', v)} />
        </FieldRow>
        <FieldRow label="Description">
          <InlineEdit value={d.trial?.description} type="text" onSave={(v) => onSave('trial.description', v)} />
        </FieldRow>
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>Groups</div>
          <ArrayChipEditor
            items={d.trial?.groups ?? []}
            onSave={(arr) => onSave('trial.groups', arr)}
            chipColor={{ bg: '#f5f3ff', text: '#7c3aed' }}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={miniLabel}>Observations</div>
          <ArrayChipEditor
            items={d.trial?.observations ?? []}
            onSave={(arr) => onSave('trial.observations', arr)}
          />
        </div>
      </Section>

      {/* Observations */}
      <Section title="Observations">
        <ArrayChipEditor
          items={d.observations ?? []}
          onSave={(arr) => onSave('observations', arr)}
        />
      </Section>

      {/* Tasks Completed */}
      <Section title="Tasks Completed">
        <ArrayChipEditor
          items={d.tasks_completed ?? []}
          onSave={(arr) => onSave('tasks_completed', arr)}
          chipColor={{ bg: '#dcfce7', text: '#166534' }}
        />
      </Section>

      {/* Issues */}
      <Section title="Issues" border="3px solid #ef4444" titleColor="#b91c1c">
        <ArrayChipEditor
          items={d.issues ?? []}
          onSave={(arr) => onSave('issues', arr)}
          chipColor={{ bg: '#fee2e2', text: '#b91c1c' }}
        />
      </Section>

      {/* Strains */}
      <Section title="Strains Mentioned">
        <ArrayChipEditor
          items={d.strains_mentioned ?? []}
          onSave={(arr) => onSave('strains_mentioned', arr)}
          chipColor={{ bg: '#fef9c3', text: '#854d0e' }}
        />
      </Section>

      {/* Sentiment */}
      <Section title="Sentiment">
        <InlineEdit
          value={d.sentiment}
          type="select"
          options={['positive', 'neutral', 'negative', 'mixed']}
          onSave={(v) => onSave('sentiment', v)}
          style={{ fontSize: 14, fontWeight: 600 }}
        />
      </Section>
    </>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children, accent, bg, border, titleColor }) {
  return (
    <div style={{
      background: bg || '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      ...(border ? { border } : {}),
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: titleColor || '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
      <span style={{ fontSize: 12, color: '#6b7280', minWidth: 100 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

/** Chip list with ✕ remove + inline "add item" input */
function ArrayChipEditor({ items = [], onSave, chipColor = { bg: '#f3f4f6', text: '#374151' } }) {
  const [addInput, setAddInput] = useState('')
  const [saved, setSaved] = useState(false)

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const remove = (i) => {
    onSave(items.filter((_, idx) => idx !== i))
    flashSaved()
  }

  const add = () => {
    const trimmed = addInput.trim()
    if (!trimmed) { setAddInput(''); return }
    onSave([...items, trimmed])
    setAddInput('')
    flashSaved()
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: chipColor.bg,
            color: chipColor.text,
            padding: '4px 8px 4px 10px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {item}
          <button
            onClick={() => remove(i)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0 0 2px',
              cursor: 'pointer',
              color: chipColor.text,
              fontSize: 13,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              opacity: 0.7,
            }}
            title="Remove"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={addInput}
        onChange={(e) => setAddInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add() }
          if (e.key === 'Escape') setAddInput('')
        }}
        onBlur={add}
        placeholder="+ add item"
        style={{
          fontSize: 12,
          color: '#374151',
          background: '#f3f4f6',
          border: '1px dashed #d1d5db',
          borderRadius: 9999,
          padding: '4px 10px',
          outline: 'none',
          width: 90,
        }}
      />
      {saved && <span style={{ fontSize: 11, color: '#00AE42', fontWeight: 600 }}>Saved ✓</span>}
    </div>
  )
}

const miniLabel = {
  fontSize: 11,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
