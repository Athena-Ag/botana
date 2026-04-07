import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { ReactNode } from 'react'

const G = '#00AE42'
const GRAY = '#8A8F98'

function Icon({ name, active }: { name: string; active: boolean }) {
  const color = active ? G : GRAY
  if (name === 'home') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={active ? `${G}20` : 'none'} />
      <path d="M9 21V12h6v9" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
  if (name === 'leaf') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M6 21C6 21 12 19 15 14C18 9 17 3 17 3C17 3 11 4 8 9C5 14 6 21 6 21Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={active ? `${G}20` : 'none'} />
      <path d="M6 21L12 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  if (name === 'facility') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="1" stroke={color} strokeWidth="2" fill={active ? `${G}20` : 'none'} />
      <path d="M8 7V5a4 4 0 018 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 12v4M10 14h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  if (name === 'run') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill={active ? `${G}20` : 'none'} />
      <path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return null
}

export function Layout({ children }: { children: ReactNode }) {
  const { pendingSync, isOnline } = useApp()
  const location = useLocation()

  const hideNav = location.pathname.startsWith('/record') || location.pathname.startsWith('/logs/')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', maxWidth: 480, margin: '0 auto', background: '#fff', position: 'relative' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: G, letterSpacing: '-0.5px' }}>botana</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pendingSync > 0 && (
            <span style={{ background: '#FF8C00', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 8px', lineHeight: 1.4 }}>
              {pendingSync} pending
            </span>
          )}
          {!isOnline && (
            <span style={{ background: '#FF4444', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 8px', lineHeight: 1.4 }}>
              offline
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', paddingBottom: hideNav ? 0 : 80 }}>
        {children}
      </main>

      {/* Bottom nav */}
      {!hideNav && (
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px', zIndex: 50 }}>
          {[
            { to: '/', icon: 'home', label: 'Timeline' },
            { to: '/strains', icon: 'leaf', label: 'Strains' },
            { to: '/runs', icon: 'run', label: 'Runs' },
            { to: '/facility', icon: 'facility', label: 'Facility' },
          ].map(({ to, icon, label }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <NavLink key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                <Icon name={icon} active={active} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? G : GRAY }}>{label}</span>
              </NavLink>
            )
          })}
        </nav>
      )}
    </div>
  )
}
