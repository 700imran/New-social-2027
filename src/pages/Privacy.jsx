import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/Logo.jsx'

// Publicly accessible, no auth required — this is the exact URL Play
// Console's "Privacy policy" field points to, and it must work for
// someone who has never opened the app (Google's reviewers check this).
//
// NOTE FOR THE DEVELOPER: replace SUPPORT_EMAIL below with your real
// contact address before publishing anywhere. This document describes
// what the app actually does as of this build — if you add analytics,
// ads, or a new data-sharing integration later, update this page in the
// same change, not as an afterthought.
const SUPPORT_EMAIL = 'privacy@bharatspace.app'
const LAST_UPDATED = 'August 2026'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-base font-bold text-navy-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div className="app-shell mx-auto min-h-dvh max-w-2xl bg-white px-5 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo size={24} />
      </div>

      <h1 className="font-display text-2xl font-bold text-navy-900">Privacy Policy</h1>
      <p className="mt-1 mb-6 text-xs text-ink-500">Last updated: {LAST_UPDATED}</p>

      <p className="mb-6 text-sm leading-relaxed text-ink-700">
        This policy explains what information BharatSpace collects, why, and what choices you have. We've written it
        to describe what this app actually does — not a generic template.
      </p>

      <Section title="Who this covers">
        <p>
          BharatSpace ("we," "us") operates the BharatSpace app and website. This policy applies to anyone who uses
          them, whether on Android, iOS, or the web.
        </p>
      </Section>

      <Section title="Information we collect">
        <p><strong>Account information:</strong> the email address or phone number you sign up with, and your password (we never see or store this in readable form — it's handled and salted/hashed by our authentication provider, Supabase).</p>
        <p><strong>Profile information you provide:</strong> display name, bio, location (a free-text field you type — we don't collect precise GPS location), and a profile photo if you upload one.</p>
        <p><strong>Content you create:</strong> posts, comments, photos and videos you upload, likes, follows, and the topics you select during onboarding.</p>
        <p><strong>Information about your device and usage:</strong> IP address, browser/device type, and request timing — collected automatically by our infrastructure providers (Cloudflare) as part of operating and securing the service, including detecting abuse.</p>
        <p>We do not collect precise location, contacts, or health data, and we don't currently run advertising or third-party analytics in the app.</p>
      </Section>

      <Section title="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account, and let you sign in</li>
          <li>To operate the core features: your feed, posts, comments, follows, and notifications</li>
          <li>To detect and prevent abuse — spam, fake accounts, and attempts to overwhelm the service — including automated rate limiting and, if enabled, a bot-check (Cloudflare Turnstile) on sign-up</li>
          <li>To respond to support requests and enforce our Terms of Service</li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <p>We don't sell your data, and we don't share it with advertisers. It's processed by the infrastructure providers that run the service on our behalf, under their own security and privacy commitments:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — our database and authentication provider</li>
          <li><strong>Cloudflare</strong> — our hosting, file storage (photos/videos), and security provider, including Turnstile if bot-protection is enabled</li>
        </ul>
        <p>We may disclose information if required by law, or to protect the safety of our users or the public.</p>
      </Section>

      <Section title="Public content">
        <p>
          Posts, comments, your profile name/photo/bio, and your follower/following lists are visible to other users
          of the app by design — this is a public social platform, not a private messaging tool. Don't post anything
          you don't want to be public.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Edit or correct</strong> your profile information any time from Edit Profile</li>
          <li><strong>Block</strong> another account to stop seeing their content and prevent them from following you</li>
          <li><strong>Report</strong> content or accounts that violate our policies</li>
          <li><strong>Delete your account</strong> — permanently removes your profile, posts, comments, photos, and account data. Do this from Edit Profile → Danger Zone while signed in, or see our{' '}
            <Link to="/delete-account-request" className="underline">account deletion page</Link> if you can't sign in.
          </li>
        </ul>
      </Section>

      <Section title="Data retention">
        <p>
          We keep your information for as long as your account is active. If you delete your account, your profile,
          posts, comments, and uploaded photos/videos are permanently deleted, typically within a few minutes.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p>
          BharatSpace is not directed at children, and we don't knowingly collect information from anyone under 13
          (or the minimum age required in your country). If you believe a child has created an account, contact us
          and we'll remove it.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use industry-standard practices to protect your information, including encrypted connections (HTTPS),
          database-level access controls, rate limiting to prevent abuse, and secure session handling. No system is
          perfectly secure, and we can't guarantee absolute security.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make material changes, we'll update the date at the top of this page and, where required, notify you
          in the app.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          Questions about this policy, or a privacy request of any kind: <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>

      <p className="mt-8 text-[11px] text-ink-400">
        This document is provided as a starting point and does not constitute legal advice. Depending on where your
        users are located (e.g. the EU's GDPR, India's DPDP Act, California's CCPA), you may have additional legal
        obligations — have this reviewed by a lawyer before relying on it for a real launch.
      </p>
    </div>
  )
}
