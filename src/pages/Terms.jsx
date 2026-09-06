import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/Logo.jsx'

const SUPPORT_EMAIL = 'support@bharatspace.app'
const LAST_UPDATED = 'August 2026'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-display text-base font-bold text-navy-900">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-700">{children}</div>
    </section>
  )
}

export default function Terms() {
  return (
    <div className="app-shell mx-auto min-h-dvh max-w-2xl bg-white px-5 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo size={24} />
      </div>

      <h1 className="font-display text-2xl font-bold text-navy-900">Terms of Service</h1>
      <p className="mt-1 mb-6 text-xs text-ink-500">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Agreement">
        <p>By creating an account or using BharatSpace, you agree to these terms. If you don't agree, please don't use the service.</p>
      </Section>

      <Section title="2. Who can use BharatSpace">
        <p>You must be at least 13 years old (or the minimum age in your country) to create an account. You're responsible for keeping your password secure and for all activity under your account.</p>
      </Section>

      <Section title="3. Your content">
        <p>You keep ownership of what you post. By posting, you give BharatSpace a license to host, display, and distribute that content within the app so the service can function (e.g. showing your posts to your followers).</p>
        <p>Don't post anything you don't have the right to share.</p>
      </Section>

      <Section title="4. Community standards">
        <p>To keep BharatSpace safe, you agree not to post or send content that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Is illegal, or promotes illegal activity</li>
          <li>Harasses, bullies, threatens, or incites violence against any person or group</li>
          <li>Is hate speech, or attacks people based on race, religion, gender, nationality, disability, sexual orientation, or similar characteristics</li>
          <li>Contains sexually explicit content involving minors, or non-consensual intimate content</li>
          <li>Is spam, a scam, or impersonates another person or organization</li>
          <li>Infringes someone else's intellectual property</li>
        </ul>
        <p>
          Use the Report option on any post, comment, or profile to flag content that violates these standards. We
          review reports and may remove content or suspend accounts that violate this policy. You can also Block any
          account to immediately stop seeing their content and prevent them from following you.
        </p>
      </Section>

      <Section title="5. Enforcement">
        <p>
          We may remove content, suspend, or permanently terminate accounts that violate these terms, at our
          discretion, with or without notice — particularly for illegal content, which we act on as a priority.
        </p>
      </Section>

      <Section title="6. Account deletion">
        <p>
          You can permanently delete your account at any time from Edit Profile → Danger Zone, or via our{' '}
          <Link to="/delete-account-request" className="underline">account deletion page</Link> if you can't sign in.
          This is permanent and cannot be undone.
        </p>
      </Section>

      <Section title="7. Service availability">
        <p>
          BharatSpace is provided "as is." We aim for reliable service but don't guarantee uninterrupted availability,
          and we may modify or discontinue features at any time.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, BharatSpace is not liable for indirect, incidental, or consequential
          damages arising from your use of the service, including content posted by other users.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>If we make material changes, we'll update the date at the top of this page.</p>
      </Section>

      <Section title="10. Contact">
        <p>Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.</p>
      </Section>

      <p className="mt-8 text-[11px] text-ink-400">
        This document is provided as a starting point and does not constitute legal advice — have it reviewed by a
        lawyer before relying on it for a real launch, particularly around content liability and user disputes in
        your specific jurisdiction(s).
      </p>
    </div>
  )
}
