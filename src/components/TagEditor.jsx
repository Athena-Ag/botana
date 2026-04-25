import { useState } from 'react'

/**
 * TagEditor — chip list with remove + add-tag input.
 *
 * Props:
 *   tags         – string[]
 *   onSave(tags) – called with new full array on any change
 *   chipStyle    – optional override for chip appearance
 */
export default function TagEditor({ tags = [], onSave, chipStyle = {} }) {
  const [addInput, setAddInput] = useState('')
  const [saved, setSaved] = useState(false)

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const removeTag = (tag) => {
    const next = tags.filter((t) => t !== tag)
    onSave(next)
    flashSaved()
  }

  const addTag = () => {
    const trimmed = addInput.trim()
    if (!trimmed || tags.includes(trimmed)) {
      setAddInput('')
      return
    }
    const next = [...tags, trimmed]
    onSave(next)
    setAddInput('')
    flashSaved()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Escape') setAddInput('')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#dcfce7',
            color: '#166534',
            padding: '4px 8px 4px 10px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 600,
            ...chipStyle,
          }}
        >
          {tag.replace(/_/g, ' ')}
          <button
            onClick={() => removeTag(tag)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0 0 2px',
              cursor: 'pointer',
              color: '#166534',
              fontSize: 14,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            title={`Remove "${tag}"`}
          >
            ✕
          </button>
        </span>
      ))}

      {/* Add-tag input */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <input
          value={addInput}
          onChange={(e) => setAddInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="+ add tag"
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
        {saved && (
          <span style={{ fontSize: 11, color: '#00AE42', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Saved ✓
          </span>
        )}
      </div>
    </div>
  )
}
