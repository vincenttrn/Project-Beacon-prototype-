# Project Beacon — Vercel Deployment Setup

This guide walks you through deploying Project Beacon to Vercel with Discord enquiry notifications and in-Discord reply via email.

**Test email:** `vincenttrn02@gmail.com`

---

## Phase A — Create accounts (before Vercel deploy)

### A1. EmailJS (team notification)

1. Go to [emailjs.com](https://www.emailjs.com/) and create an account.
2. **Email Services** → Add Service → Gmail → connect `vincenttrn02@gmail.com`.
3. **Email Templates** → Create a template with these variables (must match form field names):
   - `{{school_name}}`, `{{name}}`, `{{email}}`, `{{phone}}`, `{{year_level}}`, `{{students}}`, `{{preferred_date}}`, `{{message}}`
4. Set **To Email** to `{{to_email}}` or hardcode `vincenttrn02@gmail.com` for testing.
5. Copy these values:
   - Service ID
   - Template ID
   - Public Key (Account → API Keys)
   - Private Key (Account → API Keys → create private key for server-side use)

### A2. Resend (Discord reply emails)

1. Go to [resend.com](https://resend.com/) and sign up with `vincenttrn02@gmail.com`.
2. For testing, use `onboarding@resend.dev` as the sender — no domain verification needed.
3. Resend free tier only delivers to your verified email during test.
4. Copy your **API Key**.

### A3. Discord

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** (e.g. `Project Beacon Enquiries`).
2. **Bot** tab → **Add Bot** → copy the **Bot Token**.
3. **OAuth2 → URL Generator** → scopes: `bot`, `applications.commands` → bot permissions: `Send Messages`, `Use Application Commands` → copy invite URL → add the bot to your server.
4. Create a `#enquiries` channel → right-click → **Copy Channel ID** (enable Developer Mode in Discord settings first).
5. **General Information** → copy the **Public Key**.
6. Leave **Interactions Endpoint URL** blank until after your first Vercel deploy (Phase D).

### A4. Upstash Redis (enquiry storage)

1. After importing the project in Vercel (Phase B), go to **Storage** → **Create Database** → **KV / Upstash Redis**.
2. Link it to your project — this auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

---

## Phase B — GitHub + Vercel import

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import `vincenttrn/Project-Beacon-prototype-`.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build` | Output directory: `dist`.
5. **Do not deploy yet** — add environment variables first (Phase C).

---

## Phase C — Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add all of these for Production, Preview, and Development:

| Variable | Test value | Notes |
|----------|-----------|-------|
| `VITE_SITE_URL` | `https://YOUR-PROJECT.vercel.app` | Set after first deploy, then redeploy |
| `EMAILJS_SERVICE_ID` | from A1 | |
| `EMAILJS_TEMPLATE_ID` | from A1 | |
| `EMAILJS_PUBLIC_KEY` | from A1 | |
| `EMAILJS_PRIVATE_KEY` | from A1 | Server-side only |
| `ENQUIRY_NOTIFY_EMAIL` | `vincenttrn02@gmail.com` | Where EmailJS sends team alerts |
| `RESEND_API_KEY` | from A2 | |
| `ENQUIRY_FROM_EMAIL` | `onboarding@resend.dev` | Test sender |
| `DISCORD_BOT_TOKEN` | from A3 | |
| `DISCORD_CHANNEL_ID` | from A3 | `#enquiries` channel ID |
| `DISCORD_PUBLIC_KEY` | from A3 | |
| `KV_REST_API_URL` | auto from Upstash | Via Vercel Storage link |
| `KV_REST_API_TOKEN` | auto from Upstash | Via Vercel Storage link |

Then click **Deploy**.

---

## Phase D — Wire Discord interactions endpoint

1. After deploy, copy your Vercel URL: `https://YOUR-PROJECT.vercel.app`.
2. Update `VITE_SITE_URL` to that URL in Vercel env vars → **Redeploy**.
3. In Discord Developer Portal → **Interactions Endpoint URL**, set:
   ```
   https://YOUR-PROJECT.vercel.app/api/discord/interactions
   ```
4. Discord sends a PING — the endpoint responds with PONG and verification should pass.

---

## Phase E — Test end-to-end

1. Visit `https://YOUR-PROJECT.vercel.app/enquire`.
2. Submit a test enquiry with email `vincenttrn02@gmail.com`.
3. **Expect:**
   - Form shows a success message.
   - Email arrives at `vincenttrn02@gmail.com` (EmailJS team notification).
   - Discord `#enquiries` shows a new message with **Reply** and **Mark handled** buttons.
4. Click **Reply** → type a message in the modal → submit.
5. **Expect:**
   - Email arrives at `vincenttrn02@gmail.com` from `onboarding@resend.dev`.
   - Discord message updates with a reply confirmation.
6. Click **Mark handled** on another test enquiry → message updates.

### Local testing (optional)

```bash
cp .env.example .env
# Fill in all values, then:
npm run dev:vercel
```

Discord interactions require HTTPS — use your Vercel preview URL or a tunnel like ngrok for local Discord testing.

---

## Phase F — Production migration (later)

When ready to move off test:

1. Verify `projectbeacon.org.au` on Resend → set `ENQUIRY_FROM_EMAIL` to `support@projectbeacon.org.au`.
2. Update `VITE_SITE_URL` to `https://projectbeacon.org.au`.
3. Point DNS to Vercel.
4. Update `ENQUIRY_NOTIFY_EMAIL` to your team inbox.
5. Update the Discord Interactions Endpoint URL if the domain changes.

---

## Architecture

```
Form submit → POST /api/enquire
  → Store enquiry in Upstash Redis
  → EmailJS notifies team
  → Discord posts message with Reply + Mark handled buttons

Staff clicks Reply in Discord
  → POST /api/discord/interactions (modal opens)
  → Staff submits reply
  → Resend emails the enquirer
  → Discord message updated
```

No 24/7 bot process required — Discord interactions are plain HTTP requests handled by Vercel serverless functions.
