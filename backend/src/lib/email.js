// lib/email.js — app-triggered email (welcome + promotional), on Resend's
// free tier (3,000 emails/month, 100/day — plenty for Level 1 scale).
//
// This is deliberately separate from Supabase Auth's own mail: signup
// confirmation, password-reset, and MFA emails are sent BY Supabase Auth
// itself (see routes/auth.js's comments), and whether those actually
// arrive depends on the Supabase dashboard's Auth → Emails → SMTP
// Settings, which no amount of code here can reach into. This file only
// covers mail *this backend* decides to send — a welcome note after
// signup, and opt-in promotional sends — using Resend's plain HTTP API
// (no SMTP client needed, which Workers can't run anyway).
//
// See docs/EMAIL_SETUP.md for the one-time Resend + domain setup this
// depends on, and for why Supabase's own OTP/confirmation mail is a
// dashboard step, not a code one.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Every call fails soft: a missing key or a Resend outage should never
// break signup, a like, or anything else that happens to trigger mail.
// Callers already treat this as fire-and-forget (see routes/auth.js).
async function sendViaResend(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send (see docs/EMAIL_SETUP.md)')
    return { skipped: true }
  }
  if (!env.EMAIL_FROM_ADDRESS) {
    console.warn('[email] EMAIL_FROM_ADDRESS not set — skipping send (see docs/EMAIL_SETUP.md)')
    return { skipped: true }
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM_ADDRESS, // e.g. "BharatSpace <hello@yourdomain.com>" — must be on a domain verified in Resend
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend send failed (${res.status}): ${detail}`)
  }
  return res.json()
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

// Called once, right after a successful signup (routes/auth.js). Purely a
// nice-to-have — never awaited in a way that can fail the signup itself.
export async function sendWelcomeEmail(env, { to, displayName }) {
  const name = escapeHtml(displayName || 'there')
  return sendViaResend(env, {
    to,
    subject: 'Welcome to BharatSpace',
    html: `
      <p>Hi ${name},</p>
      <p>Welcome to BharatSpace — glad to have you here.</p>
      <p>If you haven't confirmed your email yet, check your inbox (and spam
      folder) for a message from Supabase with a confirmation link before
      signing in.</p>
      <p>— The BharatSpace team</p>
    `.trim(),
  })
}

// Sends one promotional email to a batch of recipients. Callers (see
// routes/campaigns.js or a future routes/admin.js) are responsible for
// only ever passing addresses that already opted in — see
// consent_preferences.marketing in the schema — this function does not
// re-check consent itself, so it must never be called directly with an
// unfiltered user list.
//
// Resend's HTTP API takes one request per send; this deliberately sends
// in small sequential batches rather than Promise.all-ing hundreds of
// fetches at once, which is both kinder to Resend's rate limit and to the
// Worker's own concurrent-connection budget.
export async function sendPromotionalEmailBatch(env, { recipients, subject, html }, { batchSize = 20 } = {}) {
  const results = { sent: 0, failed: 0, skipped: false }
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM_ADDRESS) {
    results.skipped = true
    return results
  }

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)
    const outcomes = await Promise.allSettled(batch.map((to) => sendViaResend(env, { to, subject, html })))
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') results.sent += 1
      else {
        results.failed += 1
        console.error('[email] promotional send failed for one recipient', outcome.reason)
      }
    }
  }
  return results
}
