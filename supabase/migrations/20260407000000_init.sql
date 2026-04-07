-- Botana database schema
-- Run with: psql postgresql://postgres:[PASSWORD]@db.knbglybsigcgxbrnydnu.supabase.co:5432/postgres -f this_file.sql
-- Or via Supabase dashboard SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_type text CHECK (room_type IN ('flowering','vegetation','propagation','clone','mother','other')),
  canopy_sqft numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strains (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  characteristics jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (facility_id, name)
);

CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  strain_id uuid REFERENCES strains(id) ON DELETE SET NULL,
  name text,
  start_date date,
  end_date date,
  status text CHECK (status IN ('active','completed','abandoned')) DEFAULT 'active',
  ai_summary text,
  week_number int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grow_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id uuid REFERENCES runs(id) ON DELETE SET NULL,
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  user_id text,
  transcript text,
  summary text,
  structured_data jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  status text CHECK (status IN ('draft','confirmed')) DEFAULT 'draft',
  media_count int DEFAULT 0,
  clip_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS log_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id uuid REFERENCES grow_logs(id) ON DELETE CASCADE,
  media_type text CHECK (media_type IN ('image','audio')),
  storage_path text NOT NULL,
  clip_order int DEFAULT 0,
  duration_seconds int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS environment_readings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id uuid REFERENCES grow_logs(id) ON DELETE CASCADE,
  temp_f numeric,
  rh_pct numeric,
  vpd_kpa numeric,
  co2_ppm numeric,
  light_intensity_ppfd numeric,
  spectrum text,
  water_usage_gal numeric,
  ph numeric,
  ec numeric,
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strain_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id uuid REFERENCES grow_logs(id) ON DELETE CASCADE,
  detected_name text NOT NULL,
  matched_strain_id uuid REFERENCES strains(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strain_mentions (
  log_id uuid REFERENCES grow_logs(id) ON DELETE CASCADE,
  strain_id uuid REFERENCES strains(id) ON DELETE CASCADE,
  PRIMARY KEY (log_id, strain_id)
);
