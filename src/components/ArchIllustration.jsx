import React from 'react'

// A single distinctive, original illustrated mark reused across the app:
// an abstracted monument arch under a tricolor sunset, standing in for
// "India Gate" without reproducing any real photograph or artwork.
export default function ArchIllustration({ className = '', showCrowd = true, showFlags = true }) {
  return (
    <svg viewBox="0 0 400 260" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B2260" />
          <stop offset="35%" stopColor="#93395C" />
          <stop offset="62%" stopColor="#E2673E" />
          <stop offset="82%" stopColor="#F5A94A" />
          <stop offset="100%" stopColor="#0B1330" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="46%" r="42%">
          <stop offset="0%" stopColor="#FFE8B8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFE8B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="archFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B1030" />
          <stop offset="100%" stopColor="#0B1330" />
        </linearGradient>
      </defs>

      <rect width="400" height="260" fill="url(#skyGrad)" />
      <circle cx="200" cy="118" r="90" fill="url(#sunGlow)" />

      {/* monument arch silhouette */}
      <path
        d="M140 260 V150 C140 105 165 78 200 78 C235 78 260 105 260 150 V260 H232 V152 C232 122 218 104 200 104 C182 104 168 122 168 152 V260 Z"
        fill="url(#archFade)"
      />
      <rect x="120" y="248" width="160" height="12" fill="url(#archFade)" />

      {showFlags && (
        <g opacity="0.95">
          <path d="M150 96 L150 70 L172 82 Z" fill="#FF9933" />
          <path d="M150 70 L150 96" stroke="#F8F9FB" strokeWidth="1.4" />
          <path d="M250 96 L250 70 L228 82 Z" fill="#0F9D58" />
          <path d="M250 70 L250 96" stroke="#F8F9FB" strokeWidth="1.4" />
        </g>
      )}

      {showCrowd && (
        <g fill="#0B1330" opacity="0.85">
          {Array.from({ length: 22 }).map((_, i) => {
            const x = 8 + i * 18 + ((i % 3) * 4)
            const h = 14 + ((i * 7) % 10)
            return <rect key={i} x={x} y={260 - h} width="8" height={h} rx="3" />
          })}
        </g>
      )}
    </svg>
  )
}
