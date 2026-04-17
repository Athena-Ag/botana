const API_BASE = import.meta.env.VITE_BOTANA_API_URL || 'https://botana-api.athenaag.com'

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')
  const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`)
  return res.json()
}

export async function extractStructuredData(transcript: string): Promise<{
  summary: string
  tags: string[]
  structured_data: object
}> {
  const res = await fetch(`${API_BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })
  if (!res.ok) throw new Error(`Extract failed: ${res.status}`)
  return res.json()
}
