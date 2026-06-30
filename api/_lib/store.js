import { Redis } from '@upstash/redis'

let redis = null

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
  return redis
}

export async function saveEnquiry(enquiry) {
  const client = getRedis()
  await client.set(`enquiry:${enquiry.id}`, enquiry)
  return enquiry
}

export async function getEnquiry(id) {
  const client = getRedis()
  return client.get(`enquiry:${id}`)
}

export async function updateEnquiry(id, updates) {
  const existing = await getEnquiry(id)
  if (!existing) return null

  const updated = { ...existing, ...updates }
  await saveEnquiry(updated)
  return updated
}
