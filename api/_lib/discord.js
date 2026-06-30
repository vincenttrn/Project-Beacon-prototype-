import nacl from 'tweetnacl'

export function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers['x-signature-ed25519']
  const timestamp = req.headers['x-signature-timestamp']
  const publicKey = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !publicKey) {
    return false
  }

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    )
  } catch {
    return false
  }
}

export function buildEnquiryEmbed(enquiry) {
  return {
    title: `🆕 New enquiry from ${enquiry.school_name}`,
    color: 0x3b82f6,
    fields: [
      { name: 'Contact', value: `${enquiry.name} <${enquiry.email}>`, inline: false },
      { name: 'Phone', value: enquiry.phone || 'Not provided', inline: true },
      { name: 'Year Level', value: enquiry.year_level, inline: true },
      { name: 'Students', value: String(enquiry.students), inline: true },
      { name: 'Preferred Date', value: enquiry.preferred_date || 'Not specified', inline: false },
      { name: 'Message', value: enquiry.message || 'None', inline: false },
    ],
    footer: { text: `Enquiry ID: ${enquiry.id}` },
    timestamp: enquiry.createdAt,
  }
}

export function buildEnquiryComponents(enquiryId, status = 'open') {
  if (status === 'handled') {
    return []
  }

  const buttons = []

  if (status === 'open') {
    buttons.push({
      type: 2,
      style: 1,
      label: 'Reply',
      custom_id: `reply:${enquiryId}`,
    })
  }

  buttons.push({
    type: 2,
    style: 3,
    label: 'Mark handled',
    custom_id: `handled:${enquiryId}`,
  })

  return [{ type: 1, components: buttons }]
}

export async function postEnquiryToDiscord(enquiry) {
  const token = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_CHANNEL_ID

  if (!token || !channelId) {
    throw new Error('Discord environment variables are not configured')
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [buildEnquiryEmbed(enquiry)],
        components: buildEnquiryComponents(enquiry.id),
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Discord post failed: ${text}`)
  }

  return response.json()
}

export async function editDiscordMessage(channelId, messageId, enquiry, extraFooter) {
  const token = process.env.DISCORD_BOT_TOKEN

  const embed = buildEnquiryEmbed(enquiry)
  if (extraFooter) {
    embed.footer = { text: `${embed.footer.text} • ${extraFooter}` }
  }
  embed.color = enquiry.status === 'handled' ? 0x6b7280 : enquiry.repliedAt ? 0x22c55e : 0x3b82f6

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
        components: buildEnquiryComponents(enquiry.id, enquiry.status),
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Discord edit failed: ${text}`)
  }

  return response.json()
}

export async function editOriginalInteraction(applicationId, token, content) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        flags: 64,
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Discord edit original failed: ${text}`)
  }
}

export async function followUpInteraction(applicationId, token, content) {
  const response = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        flags: 64,
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Discord follow-up failed: ${text}`)
  }
}
