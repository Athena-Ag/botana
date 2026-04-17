import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import NewLog from './pages/NewLog'
import LogDetail from './pages/LogDetail'
import FacilitySetup from './pages/FacilitySetup'

function App() {
  const { data: facility, isLoading } = useQuery({
    queryKey: ['facility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        background: '#fff',
        flexDirection: 'column',
        gap: 16,
      }}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="#00AE42">
          <path d="M16 4C9 4 5 11 5 18c0 5 3.5 9 11 11 7.5-2 11-6 11-11 0-7-4-14-11-14zm0 3c3.5 0 7 4.5 7 11 0 3-2 5.5-7 7-5-1.5-7-4-7-7 0-6.5 3.5-11 7-11z"/>
        </svg>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading Botana…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={facility ? <Home facility={facility} /> : <Navigate to="/setup" replace />}
      />
      <Route
        path="/setup"
        element={facility ? <Navigate to="/" replace /> : <FacilitySetup />}
      />
      <Route path="/log/new" element={<NewLog />} />
      <Route path="/log/:id" element={<LogDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
