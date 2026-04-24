export interface Facility {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Room {
  id: string
  facility_id: string
  name: string
  room_type: 'flowering' | 'vegetation' | 'propagation' | 'clone' | 'mother' | 'other'
  canopy_sqft?: number
  created_at: string
}

export interface GrowLog {
  id: string
  run_id?: string
  room_id: string
  facility_id: string
  audio_url?: string
  transcript?: string
  summary?: string
  structured_data?: StructuredData
  tags?: string[]
  status: 'draft' | 'confirmed'
  created_at: string
  confirmed_at?: string
  // joined
  room?: Room
}

export interface StructuredData {
  environment?: {
    temp_f?: number
    rh?: number
    vpd?: number
    co2?: number
    light_ppfd?: number
  }
  growth_stage?: {
    phase?: 'veg' | 'flower' | 'propagation' | 'clone' | 'mother' | 'dry' | 'cure' | 'other'
    week?: number
    day?: number
  }
  feed?: {
    products?: string[]
    ec?: number
    ppm?: number
    ph?: number
    feed_volume_gal?: number
    dilution_rate?: string
    notes?: string
  }
  trial?: {
    is_trial?: boolean
    description?: string
    groups?: string[]
    observations?: string[]
  }
  water?: {
    usage_gal?: number
    runoff_pct?: number
  }
  plant_health?: {
    turgor?: 'praying' | 'wilting' | 'normal' | 'drooping'
    color?: string
    canopy_uniformity?: 'even' | 'uneven' | 'mixed'
    root_health?: string
    pest_pressure?: 'none' | 'low' | 'moderate' | 'high'
    notes?: string[]
  }
  observations?: string[]
  tasks_completed?: string[]
  issues?: string[]
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed'
  esoteric_notes?: string
  strains_mentioned?: string[]
}

export type TagType =
  | 'pest_management'
  | 'defoliation'
  | 'harvest'
  | 'irrigation'
  | 'plumbing'
  | 'observation'
  | 'training'
  | 'transplant'
  | 'feeding'
  | 'scouting'
  | 'environmental_adjustment'

export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  pest_management: { bg: '#fee2e2', text: '#b91c1c' },
  defoliation: { bg: '#ede9fe', text: '#7c3aed' },
  training: { bg: '#ede9fe', text: '#7c3aed' },
  harvest: { bg: '#fef3c7', text: '#b45309' },
  irrigation: { bg: '#dbeafe', text: '#1d4ed8' },
  feeding: { bg: '#dbeafe', text: '#1d4ed8' },
  plumbing: { bg: '#ffedd5', text: '#c2410c' },
  observation: { bg: '#f3f4f6', text: '#374151' },
  scouting: { bg: '#f3f4f6', text: '#374151' },
  transplant: { bg: '#dcfce7', text: '#15803d' },
  environmental_adjustment: { bg: '#ccfbf1', text: '#0f766e' },
}

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#00AE42',
  neutral: '#9ca3af',
  negative: '#ef4444',
  mixed: '#f59e0b',
}
