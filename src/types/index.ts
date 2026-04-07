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

export interface Strain {
  id: string
  facility_id: string
  name: string
  characteristics: Record<string, unknown>
  notes?: string
  created_at: string
}

export interface Run {
  id: string
  room_id: string
  strain_id?: string
  name?: string
  start_date?: string
  end_date?: string
  status: 'active' | 'completed' | 'abandoned'
  ai_summary?: string
  week_number?: number
  created_at: string
  room?: Room
  strain?: Strain
}

export interface GrowLog {
  id: string
  run_id?: string
  room_id: string
  facility_id: string
  user_id?: string
  transcript?: string
  summary?: string
  structured_data: Record<string, unknown>
  tags: string[]
  status: 'draft' | 'confirmed'
  media_count: number
  clip_count: number
  created_at: string
  confirmed_at?: string
  room?: Room
  media?: LogMedia[]
  env?: EnvironmentReading
}

export interface LogMedia {
  id: string
  log_id: string
  media_type: 'image' | 'audio'
  storage_path: string
  clip_order: number
  duration_seconds?: number
  created_at: string
  url?: string
}

export interface EnvironmentReading {
  id: string
  log_id: string
  temp_f?: number
  rh_pct?: number
  vpd_kpa?: number
  co2_ppm?: number
  light_intensity_ppfd?: number
  spectrum?: string
  water_usage_gal?: number
  ph?: number
  ec?: number
  recorded_at: string
}

export interface StrainRecommendation {
  id: string
  log_id: string
  detected_name: string
  matched_strain_id?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface StructuredData {
  temp_f?: number
  rh_pct?: number
  vpd_kpa?: number
  co2_ppm?: number
  ph?: number
  ec?: number
  water_usage_gal?: number
  light_ppfd?: number
  week?: number
  day?: number
  nutrients?: string[]
  observations?: string[]
  issues?: string[]
  actions?: string[]
}

export interface ApiTranscribeResponse {
  transcript: string
}

export interface ApiStructureResponse {
  summary: string
  structured_data: StructuredData
  tags: string[]
  strains_mentioned: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface OfflineQueueItem {
  id: string
  type: 'save_log' | 'confirm_log' | 'save_media'
  payload: unknown
  created_at: string
  retries: number
}
