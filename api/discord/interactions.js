import {
  verifyDiscordRequest,
  editDiscordMessage,
  followUpInteraction,
} from '../_lib/discord.js'
import { getEnquiry, updateEnquiry } from '../_lib/store.js'
import { sendReplyToEnquirer } from '../_lib/email.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function jsonResponse(res, status, data) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' })
  }

  const rawBody = await readRawBody(req)

  if (!verifyDiscordRequest(req, rawBody)) {
    return jsonResponse(res, 401, { error: 'Invalid request signature' })
  }

  const interaction = JSON.parse(rawBody)

  if (interaction.type === 1) {
    return jsonResponse(res, 200, { type: 1 })
  }

  if (interaction.type === 3) {
    const customId = interaction.data.custom_id

    if (customId.startsWith('reply:')) {
      const enquiryId = customId.replace('reply:', '')

      return jsonResponse(res, 200, {
        type: 9,
        data: {
          custom_id: `reply_modal:${enquiryId}`,
          title: 'Reply to enquiry',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'reply_message',
                  label: 'Your reply',
                  style: 2,
                  min_length: 1,
                  max_length: 2000,
                  placeholder: 'Type your response to the enquirer...',
                  required: true,
                },
              ],
            },
          ],
        },
      })
    }

    if (customId.startsWith('handled:')) {
      const enquiryId = customId.replace('handled:', '')
      const enquiry = await getEnquiry(enquiryId)

      if (!enquiry) {
        return jsonResponse(res, 200, {
          type: 4,
          data: { content: 'Enquiry not found.', flags: 64 },
        })
      }

      const updated = await updateEnquiry(enquiryId, { status: 'handled', handledAt: new Date().toISOString() })

      await editDiscordMessage(
        interaction.channel_id,
        interaction.message.id,
        updated,
        'Marked as handled'
      )

      return jsonResponse(res, 200, {
        type: 4,
        data: { content: 'Enquiry marked as handled.', flags: 64 },
      })
    }
  }

  if (interaction.type === 5) {
    const customId = interaction.data.custom_id

    if (customId.startsWith('reply_modal:')) {
      const enquiryId = customId.replace('reply_modal:', '')
      const replyMessage = interaction.data.components[0].components[0].value

      jsonResponse(res, 200, { type: 5, data: { flags: 64 } })

      try {
        const enquiry = await getEnquiry(enquiryId)

        if (!enquiry) {
          await followUpInteraction(
            interaction.application_id,
            interaction.token,
            'Enquiry not found.'
          )
          return
        }

        await sendReplyToEnquirer(enquiry, replyMessage)

        const updated = await updateEnquiry(enquiryId, {
          status: 'replied',
          repliedAt: new Date().toISOString(),
          lastReply: replyMessage,
        })

        await editDiscordMessage(
          interaction.channel_id,
          interaction.message.id,
          updated,
          `Replied to ${enquiry.email}`
        )

        await followUpInteraction(
          interaction.application_id,
          interaction.token,
          `Reply sent to ${enquiry.email}.`
        )
      } catch (err) {
        console.error('Discord reply failed:', err)
        await followUpInteraction(
          interaction.application_id,
          interaction.token,
          'Failed to send reply. Check server logs.'
        )
      }

      return
    }
  }

  return jsonResponse(res, 400, { error: 'Unknown interaction type' })
}
