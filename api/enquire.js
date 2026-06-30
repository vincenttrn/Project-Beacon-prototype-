import crypto from 'crypto'
import { saveEnquiry } from './_lib/store.js'
import { sendTeamNotification } from './_lib/email.js'
import { postEnquiryToDiscord } from './_lib/discord.js'

const REQUIRED_FIELDS = ['school_name', 'name', 'email', 'year_level', 'students']

function validateEnquiry(body) {
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]?.toString().trim()) {
      errors.push(`${field} is required`)
    }
  }

  const email = body.email?.toString().trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email is invalid')
  }

  return errors
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
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

    await saveEnquiry(enquiry)
    await sendTeamNotification(enquiry)

    const discordMessage = await postEnquiryToDiscord(enquiry)
    enquiry.discordMessageId = discordMessage.id
    enquiry.discordChannelId = discordMessage.channel_id
    await saveEnquiry(enquiry)

    return res.status(200).json({ success: true, id: enquiry.id })
  } catch (err) {
    console.error('Enquiry submission failed:', err)
    return res.status(500).json({ error: 'Failed to submit enquiry' })
  }
}
