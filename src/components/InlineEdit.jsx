import { useState, useRef, useEffect } from 'react'

/**
 * InlineEdit — click-to-edit a single scalar value.
 *
 * Props:
 *   value      – current value (string | number | boolean | null | undefined)
 *   type       – 'text' | 'number' | 'select' | 'checkbox'
 *   options    – required when type='select'; array of string values
 *   placeholder– shown when value is empty
 *   onSave(v)  – called with the new value on blur / Enter / select change
 *   style      – extra style on the read-only span
 */
export default function InlineEdit({
  value,
  type = 'text',
  options = [],
  placeholder = '—',
  onSave,
  style = {},
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef(null)

  // Sync draft when value changes externally
  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (type !== 'checkbox') inputRef.current.select?.()
    }
  }, [editing, type])

  const commit = (v) => {
    const coerced = type === 'number' ? (v === '' ? null : Number(v)) : v
    setEditing(false)
    if (coerced !== (value ?? '')) {
      onSave(coerced)
      flashSaved()
    }
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit(draft)
    if (e.key === 'Escape') {
      setDraft(value ?? '')
      setEditing(false)
    }
  }

  // ── checkbox ──────────────────────────────────────────────
  if (type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            onSave(e.target.checked)
            flashSaved()
          }}
          style={{ width: 16, height: 16, accentColor: '#00AE42', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 14, color: '#374151' }}>{value ? 'Yes' : 'No'}</span>
        {saved && <span style={savedFlash}>Saved ✓</span>}
      </label>
    )
  }

  // ── select ────────────────────────────────────────────────
  if (type === 'select' && editing) {
    return (
      <select
        ref={inputRef}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => commit(draft)}
        onKeyDown={handleKeyDown}
        style={inputStyle}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  // ── text / number (editing) ───────────────────────────────
  if ((type === 'text' || type === 'number') && editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={handleKeyDown}
        style={inputStyle}
      />
    )
  }

  // ── read-only span ────────────────────────────────────────
  const display = (value !== undefined && value !== null && value !== '') ? String(value) : null
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        onClick={() => { setDraft(value ?? ''); setEditing(true) }}
        title="Click to edit"
        style={{
          cursor: 'text',
          color: display ? '#111827' : '#d1d5db',
          fontStyle: display ? 'normal' : 'italic',
          borderBottom: '1px dashed #d1d5db',
          paddingBottom: 1,
          ...style,
        }}
      >
        {display ?? placeholder}
      </span>
      {saved && <span style={savedFlash}>Saved ✓</span>}
    </span>
  )
}

const inputStyle = {
  fontSize: 14,
  color: '#111827',
  background: '#f9fafb',
  border: '1.5px solid #00AE42',
  borderRadius: 6,
  padding: '4px 8px',
  outline: 'none',
  minWidth: 80,
}

const savedFlash = {
  fontSize: 11,
  color: '#00AE42',
  fontWeight: 600,
  opacity: 1,
  animation: 'none',
  whiteSpace: 'nowrap',
}
