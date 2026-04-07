import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { getPendingCount } from '../lib/offline'
import type { Facility, Room, GrowLog, Strain, Run } from '../types'

interface AppState {
  facility: Facility | null
  rooms: Room[]
  logs: GrowLog[]
  strains: Strain[]
  runs: Run[]
  pendingSync: number
  isOnline: boolean
  loading: boolean
}

interface AppContextValue extends AppState {
  refreshLogs: () => Promise<void>
  refreshStrains: () => Promise<void>
  refreshRooms: () => Promise<void>
  refreshRuns: () => Promise<void>
  setFacility: (f: Facility | null) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    facility: null,
    rooms: [],
    logs: [],
    strains: [],
    runs: [],
    pendingSync: 0,
    isOnline: navigator.onLine,
    loading: true,
  })

  const setFacility = useCallback((f: Facility | null) => {
    setState(s => ({ ...s, facility: f }))
  }, [])

  const refreshLogs = useCallback(async () => {
    if (!state.facility) return
    const { data } = await supabase
      .from('grow_logs')
      .select('*, room:rooms(name, room_type)')
      .eq('facility_id', state.facility.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setState(s => ({ ...s, logs: data as GrowLog[] }))
  }, [state.facility])

  const refreshStrains = useCallback(async () => {
    if (!state.facility) return
    const { data } = await supabase
      .from('strains')
      .select('*')
      .eq('facility_id', state.facility.id)
      .order('name')
    if (data) setState(s => ({ ...s, strains: data as Strain[] }))
  }, [state.facility])

  const refreshRooms = useCallback(async () => {
    if (!state.facility) return
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('facility_id', state.facility.id)
      .order('name')
    if (data) setState(s => ({ ...s, rooms: data as Room[] }))
  }, [state.facility])

  const refreshRuns = useCallback(async () => {
    if (!state.facility) return
    const { data } = await supabase
      .from('runs')
      .select('*, room:rooms(name, room_type), strain:strains(name)')
      .in('room_id', state.rooms.map(r => r.id))
      .order('created_at', { ascending: false })
    if (data) setState(s => ({ ...s, runs: data as Run[] }))
  }, [state.facility, state.rooms])

  // Load initial facility
  useEffect(() => {
    async function loadFacility() {
      const { data } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at')
        .limit(1)
        .single()
      if (data) setState(s => ({ ...s, facility: data as Facility, loading: false }))
      else setState(s => ({ ...s, loading: false }))
    }
    loadFacility()
  }, [])

  // Load rooms + logs + strains when facility changes
  useEffect(() => {
    if (!state.facility) return
    async function loadAll() {
      if (!state.facility) return
      const [roomsRes, logsRes, strainsRes, runsRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('facility_id', state.facility.id).order('name'),
        supabase.from('grow_logs').select('*, room:rooms(name, room_type)').eq('facility_id', state.facility.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('strains').select('*').eq('facility_id', state.facility.id).order('name'),
        supabase.from('runs').select('*, room:rooms(name, room_type), strain:strains(name)').order('created_at', { ascending: false }).limit(20),
      ])
      setState(s => ({
        ...s,
        rooms: (roomsRes.data ?? []) as Room[],
        logs: (logsRes.data ?? []) as GrowLog[],
        strains: (strainsRes.data ?? []) as Strain[],
        runs: (runsRes.data ?? []) as Run[],
      }))
    }
    loadAll()
  }, [state.facility?.id])

  // Pending sync count
  useEffect(() => {
    async function checkPending() {
      const count = await getPendingCount()
      setState(s => ({ ...s, pendingSync: count }))
    }
    checkPending()
    const t = setInterval(checkPending, 10000)
    return () => clearInterval(t)
  }, [])

  // Online/offline
  useEffect(() => {
    const onOnline = () => setState(s => ({ ...s, isOnline: true }))
    const onOffline = () => setState(s => ({ ...s, isOnline: false }))
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <AppContext.Provider value={{ ...state, refreshLogs, refreshStrains, refreshRooms, refreshRuns, setFacility }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
