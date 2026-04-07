import type { ApiTranscribeResponse, ApiStructureResponse } from '../types'

const API_URL = import.meta.env.VITE_BOTANA_API_URL as string

const USE_MOCK = true // Set to false when botana-api.athenaag.com is live

// ── Mock data helpers ──────────────────────────────────────────────────────────

const MOCK_SUMMARIES = [
  'Plants in week 4 of flower looking healthy. Fed with Athena Pro Bloom at 3.2 EC. Temp 77°F, RH 52%. Minor yellowing on lower fan leaves — stripped bottom third.',
  'Veg room inspection. Two Blue Dream clones showing root development. Transplanted 4 into 5-gal fabric pots. Temps steady at 74°F, RH 62%.',
  'Week 6 flush started. Running RO only at 6.1 pH. Trichomes mostly cloudy, 10% amber. Harvest estimate 10–14 days.',
  'Night temp drop issue observed — 68°F at lights-off. Increased min temp set-point on controller. Also adjusted CO2 to 1200 ppm during peak light hours.',
  'Defoliation completed on canopy. Removed 25% of fan leaves to improve light penetration. Plants looking vigorous in week 3.',
]

const MOCK_TAGS = [
  ['week-4', 'flower', 'feeding', 'defoliation'],
  ['veg', 'clones', 'transplant', 'root-development'],
  ['flush', 'harvest-prep', 'trichomes'],
  ['environment', 'temperature', 'co2', 'lights'],
  ['defoliation', 'canopy', 'training', 'week-3'],
]

const MOCK_STRAINS = [
  ['Blue Dream', 'Wedding Cake'],
  ['OG Kush'],
  ['Zkittlez', 'Gelato'],
  [],
  ['Blue Dream'],
]

const MOCK_SENTIMENTS: Array<'positive' | 'neutral' | 'negative'> = [
  'positive', 'positive', 'neutral', 'negative', 'positive',
]

const MOCK_STRUCTURED: ApiStructureResponse['structured_data'][] = [
  { temp_f: 77, rh_pct: 52, ec: 3.2, week: 4, actions: ['fed with Athena Pro Bloom', 'stripped lower fan leaves'] },
  { temp_f: 74, rh_pct: 62, week: 2, actions: ['transplanted 4 clones to 5-gal'] },
  { ph: 6.1, week: 6, observations: ['mostly cloudy trichomes', '10% amber'], actions: ['started RO flush'] },
  { temp_f: 68, co2_ppm: 1200, actions: ['raised min temp set-point', 'adjusted CO2'] },
  { week: 3, actions: ['removed 25% fan leaves', 'defoliation completed'] },
]

let mockIdx = 0
function nextMock() {
  const i = mockIdx % MOCK_SUMMARIES.length
  mockIdx++
  return i
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function transcribeAudio(audioBlob: Blob): Promise<ApiTranscribeResponse> {
  if (USE_MOCK) {
    await delay(1200)
    const transcripts = [
      "Alright checking in on the flower room, week four of flower. Fed today with Athena Pro Bloom at three point two EC. Temps are sitting at seventy seven, RH at fifty two. Noticed some yellowing on the lower fan leaves so I stripped the bottom third of all plants.",
      "Checking in on the veg room. The two Blue Dream clones have good root development now. Went ahead and transplanted four plants into the five-gallon fabric pots. Temperatures are steady at seventy four, RH sixty two.",
      "Starting the flush today on the flower room. Week six. Running straight RO water at six point one pH. Trichomes are looking mostly cloudy with about ten percent amber. Expecting harvest in ten to fourteen days.",
      "Had a night temp drop issue last night, down to sixty eight degrees at lights off. Raised the minimum temp set-point on the controller. Also bumped CO2 to twelve hundred ppm during the peak light hours.",
      "Defoliation day in the flower room. Removed about twenty-five percent of the fan leaves to open up the canopy. Plants are looking really vigorous going into week three.",
    ]
    return { transcript: transcripts[nextMock() % transcripts.length] }
  }

  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Transcription failed')
  return res.json()
}

export async function structureTranscript(transcript: string): Promise<ApiStructureResponse> {
  if (USE_MOCK) {
    await delay(900)
    const i = (mockIdx - 1) % MOCK_SUMMARIES.length
    return {
      summary: MOCK_SUMMARIES[i],
      structured_data: MOCK_STRUCTURED[i],
      tags: MOCK_TAGS[i],
      strains_mentioned: MOCK_STRAINS[i],
      sentiment: MOCK_SENTIMENTS[i],
    }
  }

  const res = await fetch(`${API_URL}/structure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })
  if (!res.ok) throw new Error('Structure failed')
  return res.json()
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
