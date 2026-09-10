import React from 'react'

export default function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3.5">
      <p className="text-xl font-display font-bold text-navy-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500">{label}</p>
    </div>
  )
}
