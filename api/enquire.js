import crypto from 'crypto'
import { parseJsonBody } from './_lib/body.js'
import { saveEnquiry } from './_lib/store.js'
import { sendTeamNotification } from './_lib/email.js'
import { postEnquiryToDiscord } from './_lib/discord.js'

const REQUIRED_FIELDS = ['school_name', 'name', 'email', 'year_level', 'students']

function validateEnquiry(body) {
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    if (!body?.[field]?.toString().trim()) {
      errors.push(`${field} is required`)
    }
  }

  const email = body?.email?.toString().trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email is invalid')
  }

  return errors
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = await parseJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const errors = validateEnquiry(body)
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') })
  }

  const enquiry = {
    id: crypto.randomUUID(),
    school_name: body.school_name.toString().trim(),
    name: body.name.toString().trim(),
    email: body.email.toString().trim(),
    phone: body.phone?.toString().trim() || '',
    year_level: body.year_level.toString().trim(),
    students: body.students.toString().trim(),
    preferred_date: body.preferred_date?.toString().trim() || '',
    message: body.message?.toString().trim() || '',
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  try {
    await saveEnquiry(enquiry)
  } catch (err) {
    console.error('Enquiry storage failed:', err)
    return res.status(503).json({
      error: err.message || 'Enquiry storage is not configured',
    })
  }

  const [emailResult, discordResult] = await Promise.allSettled([
    sendTeamNotification(enquiry),
    postEnquiryToDiscord(enquiry),
  ])

  if (emailResult.status === 'rejected') {
    console.error('EmailJS notification failed:', emailResult.reason)
  }

  if (discordResult.status === 'fulfilled') {
    enquiry.discordMessageId = discordResult.value.id
    enquiry.discordChannelId = discordResult.value.channel_id
    try {
      await saveEnquiry(enquiry)
    } catch (err) {
      console.error('Failed to update enquiry with Discord message ID:', err)
    }
  } else {
    console.error('Discord notification failed:', discordResult.reason)
  }

  const warnings = []
  if (emailResult.status === 'rejected') warnings.push('email')
  if (discordResult.status === 'rejected') warnings.push('discord')

  return res.status(200).json({
    success: true,
    id: enquiry.id,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}
