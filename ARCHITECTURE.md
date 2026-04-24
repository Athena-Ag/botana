# ARCHITECTURE.md — Botana
> Owner: Axiom | Document enforced per APP-ONBOARDING-PROTOCOL.md
> **All agents: read this before modifying the app. Update it when you change anything below.**

---

## Overview

**Botana** is a voice-first cultivation log platform for cannabis growers. Growers walk through their rooms, record spoken observations, and the app transcribes + structures the data automatically.

- **Owner:** Athena Ag / Jay
- **Status:** Active / MVP
- **Primary user:** Facility growers (mobile, in-room logging)

---

## Deployment

| Property | Value |
|---|---|
| **Platform** | Cloudflare Pages (frontend) + Cloudflare Workers (API) |
| **Frontend URL** | https://botana.athenaag.com |
| **Frontend CF Project** | botana (botana-3td.pages.dev) |
| **API URL** | https://botana-api.athenaag.com |
| **API Worker name** | botana-api |
| **CF Account** | Athena (3e73a2ebc2f28bdb77840dd57bd43a22) |
| **Frontend Repo** | https://github.com/Athena-Ag/botana |
| **API Worker Repo** | /tmp/botana-api-worker (local only — needs permanent home) |
| **Default branch** | main (CF Pages auto-deploys on push) |
| **CF Access** | Enabled on botana.athenaag.com |

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| Language | TypeScript |
| Routing | react-router-dom v6 |
| Data fetching | @tanstack/react-query |
| Database client | @supabase/supabase-js |
| Styling | Inline styles only (mobile-first, no CSS framework) |
| Primary color | #00AE42 (Botana green) |

### API Worker
| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (ES module) |
| Transcription | Groq Whisper (whisper-large-v3) |
| Extraction / LLM | Groq Llama 3.3 70B Versatile (JSON mode) |

### Database
| Layer | Technology |
|---|---|
| Provider | Supabase (PostgreSQL) |
| Project URL | https://knbglybsigcgxbrnydnu.supabase.co |
| Auth | Anon key (public, RLS enforced) |

---

## Database Schema

### `facilities`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Facility name |
| description | text | |
| created_at | timestamptz | |

**Active facility:** Verde Gardens (`8a3b7fc7-77cb-40c0-93b8-5ae87c64161a`)
> Note: 3 duplicate facility records exist from seeding — app uses first result.

---

### `rooms`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| facility_id | uuid | FK → facilities.id |
| name | text | Room display name |
| room_type | text | flowering / vegetation / propagation / clone / mother / dry / cure |
| canopy_sqft | integer | |
| setup_data | jsonb | Structured setup data from voice recording (added 2026-04-23) |
| setup_transcript | text | Raw transcript from room setup recording (added 2026-04-23) |
| setup_audio_url | text | URL to setup audio file if stored (added 2026-04-23) |
| created_at | timestamptz | |

**Active rooms (facility 8a3b7fc7):**
- `a3134f4c` — Flower Room A (flowering, 2400 sqft)
- `c93f34cf` — Veg Room 1 (vegetation, 1200 sqft)

---

### `cycles` *(pending migration — not yet created)*
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| room_id | uuid | FK → rooms.id |
| facility_id | uuid | FK → facilities.id |
| name | text | Cycle display name |
| strain | text | Strain name(s) |
| start_date | date | Cycle start (used to calculate Day X) |
| estimated_days | integer | Total expected cycle length |
| phase | text | veg / flower / propagation / clone / mother / dry / cure / other |
| status | text | active / completed / abandoned |
| trial_description | text | Description of any side-by-side trial |
| setup_transcript | text | Raw transcript from cycle setup voice recording |
| setup_structured_data | jsonb | Extracted cycle setup data |
| setup_audio_url | text | URL to setup audio |
| notes | text | |
| created_at | timestamptz | |

**SQL to create:**
```sql
create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  facility_id uuid references facilities(id) on delete cascade not null,
  name text,
  strain text,
  start_date date not null,
  estimated_days integer,
  phase text default 'veg' check (phase in ('veg','flower','propagation','clone','mother','dry','cure','other')),
  status text default 'active' check (status in ('active','completed','abandoned')),
  trial_description text,
  setup_transcript text,
  setup_structured_data jsonb,
  setup_audio_url text,
  notes text,
  created_at timestamptz default now()
);
alter table cycles enable row level security;
create policy "Allow all on cycles" on cycles for all using (true) with check (true);
```

---

### `grow_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| run_id | uuid | FK → cycles.id (nullable — not yet enforced) |
| room_id | uuid | FK → rooms.id |
| facility_id | uuid | FK → facilities.id |
| user_id | uuid | |
| transcript | text | Raw voice transcript |
| summary | text | AI-generated 2-3 sentence summary |
| structured_data | jsonb | Extracted cultivation data (see Structured Data Schema) |
| tags | text[] | Array of tag strings |
| status | text | |
| media_count | integer | |
| clip_count | integer | |
| created_at | timestamptz | |
| confirmed_at | timestamptz | |

---

## Structured Data Schema (grow_logs.structured_data)

```typescript
{
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
    products?: string[]       // exact product names as spoken
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
  strains_mentioned?: string[]
}
```

---

## API Endpoints

### `botana-api.athenaag.com`

| Method | Endpoint | Description |
|---|---|---|
| GET | /health | Health check → `{ status, ts }` |
| POST | /transcribe | Audio → transcript. Body: FormData with `audio` blob. Returns `{ transcript }` |
| POST | /extract | Transcript → structured data. Body: `{ transcript, context? }`. Returns `{ summary, tags, structured_data }` |

**Extract context values:**
- `grow_log` (default) — cultivation log extraction
- `room_setup` — extracts dimensions, lighting, irrigation, equipment
- `cycle_setup` — extracts strain, trial info, feed program, goals

---

## Environment Variables / Secrets

### Frontend (CF Pages env vars)
| Key | Purpose |
|---|---|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Supabase public anon key |
| VITE_BOTANA_API_URL | API worker base URL |

### API Worker (CF Worker secrets)
| Key | Purpose |
|---|---|
| GROQ_API_KEY | Groq API authentication |
| GROQ_WHISPER_MODEL | Model override (default: whisper-large-v3) |
| GROQ_LLM_MODEL | LLM model override (default: llama-3.3-70b-versatile) |

---

## Application Pages / Routes

| Route | Page | Description |
|---|---|---|
| / | Home | Log feed, room selector, recent logs |
| /log/new | NewLog | Voice recording → review → save flow |
| /log/:id | LogDetail | Full log detail with all structured data |
| /facility/setup | FacilitySetup | Initial facility + room setup |
| /room/new | RoomNew | *(planned)* Create room with voice setup |
| /cycle/new | CycleNew | *(planned)* Create cycle with voice setup |

---

## Key Design Decisions

1. **Voice-first:** Every data entry starts with audio recording. Text inputs are supplementary.
2. **Groq for everything:** Whisper for transcription, Llama 3.3 70B for extraction. Fast, cheap, no OpenAI dependency.
3. **Inline styles:** No CSS framework. Mobile-first, max-width 480px. Avoids build complexity.
4. **Supabase anon key:** RLS enforced. No auth yet — single-facility MVP.
5. **Context-aware extraction:** `/extract` accepts a `context` field to switch prompts per object type (log, room, cycle).
6. **Widget serving:** Follows Flo pattern — fetch from GitHub raw if a widget is ever needed.

---

## Change Log

| Date | What Changed | Agent |
|---|---|---|
| 2026-04-17 | Initial app built — React/Vite/TS, CF Pages deploy, Supabase schema | Sol |
| 2026-04-23 | Built `botana-api` CF Worker (Groq Whisper + Llama), custom domain | Sol |
| 2026-04-23 | Added growth_stage, feed, trial, plant_health to extraction schema | Sol |
| 2026-04-23 | ARCHITECTURE.md created (retroactively) | Sol |
| 2026-04-23 | rooms.setup_data/setup_transcript/setup_audio_url columns planned (migration pending) | Sol |
| 2026-04-23 | cycles table designed (migration pending — Robert to run SQL) | Sol |
