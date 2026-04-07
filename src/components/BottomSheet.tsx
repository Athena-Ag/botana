import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      />
      <div
        style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: '0 0 env(safe-area-inset-bottom)', maxWidth: 480, margin: '0 auto', width: '100%', animation: 'slideUp 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: '#E0E0E0', borderRadius: 4, margin: '12px auto 0' }} />
        {title && (
          <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #F0F0F0' }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          </div>
        )}
        {children}
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}
