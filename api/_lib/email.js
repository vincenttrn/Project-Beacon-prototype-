import { Resend } from 'resend'

export async function sendTeamNotification(enquiry) {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY
  const notifyEmail = process.env.ENQUIRY_NOTIFY_EMAIL

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error('EmailJS environment variables are not configured')
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: notifyEmail,
        school_name: enquiry.school_name,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone || 'Not provided',
        year_level: enquiry.year_level,
        students: enquiry.students,
        preferred_date: enquiry.preferred_date || 'Not specified',
        message: enquiry.message || 'None',
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`EmailJS failed: ${text}`)
  }
}

export async function sendReplyToEnquirer(enquiry, replyMessage) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.ENQUIRY_FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: `Project Beacon <${fromEmail}>`,
    to: enquiry.email,
    subject: `Re: Your workshop enquiry – ${enquiry.school_name}`,
    text: `Hi ${enquiry.name},\n\n${replyMessage}\n\nBest regards,\nProject Beacon Team`,
    html: `
      <p>Hi ${enquiry.name},</p>
      <p>${replyMessage.replace(/\n/g, '<br>')}</p>
      <p>Best regards,<br>Project Beacon Team</p>
    `,
  })

  if (error) {
    throw new Error(`Resend failed: ${error.message}`)
  }
}
