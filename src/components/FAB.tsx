const G = '#00AE42'

interface Props {
  onClick: () => void
}

export function FAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 96,
        right: 'max(20px, calc(50% - 240px + 20px))',
        width: 56,
        height: 56,
        borderRadius: 28,
        background: G,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,174,66,0.4)',
        zIndex: 40,
        transition: 'transform 0.15s',
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}
