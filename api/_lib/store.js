import { Redis } from '@upstash/redis'

let redis = null

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'Redis is not configured. In Vercel go to Storage → Create Database → Upstash Redis/KV → link to this project.'
    )
  }

  return { url, token }
}

function getRedis() {
  if (!redis) {
    const { url, token } = getRedisConfig()
    redis = new Redis({ url, token })
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
