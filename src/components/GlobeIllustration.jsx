import React from 'react'

// A stylized, original "connected world" mark for the welcome screen —
// a globe with latitude/longitude lines, a few glowing nodes, and thin
// great-circle arcs between them. Same hand-drawn-SVG approach as
// ArchIllustration.jsx (gradients + defs, no external images/photos).
export default function GlobeIllustration({ className = '' }) {
  const nodes = [
    { x: 96, y: 92 },
    { x: 210, y: 60 },
    { x: 300, y: 110 },
    { x: 150, y: 150 },
    { x: 250, y: 170 },
    { x: 60, y: 160 },
  ]
  const arcs = [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
    [0, 3],
    [3, 5],
  ]

  return (
    <svg viewBox="0 0 360 220" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">
      <defs>
        <radialGradient id="globeGlow" cx="50%" cy="15%" r="75%">
          <stop offset="0%" stopColor="#FFD9A0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFD9A0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="globeBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C4A6FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="arcStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9933" />
          <stop offset="100%" stopColor="#C4A6FF" />
        </linearGradient>
      </defs>

      <circle cx="180" cy="140" r="150" fill="url(#globeGlow)" />

      {/* globe body + graticule, cropped by the viewBox like a horizon */}
      <circle cx="180" cy="150" r="140" fill="url(#globeBody)" stroke="#C4A6FF" strokeOpacity="0.4" />
      {[-90, -45, 0, 45, 90].map((dx) => (
        <ellipse key={dx} cx="180" cy="150" rx={Math.abs(dx) === 90 ? 4 : 140 * Math.cos((dx * Math.PI) / 180)} ry="140" fill="none" stroke="#F3EEFF" strokeOpacity="0.25" strokeWidth="1" />
      ))}
      {[40, 90, 140, 190].map((y) => (
        <ellipse key={y} cx="180" cy={y} rx="140" ry={22} fill="none" stroke="#F3EEFF" strokeOpacity="0.2" strokeWidth="1" />
      ))}

      {/* connection arcs between nodes */}
      <g fill="none" stroke="url(#arcStroke)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        {arcs.map(([a, b], i) => {
          const p1 = nodes[a]
          const p2 = nodes[b]
          const mx = (p1.x + p2.x) / 2
          const my = Math.min(p1.y, p2.y) - 26
          return <path key={i} d={`M${p1.x} ${p1.y} Q${mx} ${my} ${p2.x} ${p2.y}`} />
        })}
      </g>

      {/* glowing nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="7" fill="#FFC069" opacity="0.35" />
          <circle cx={n.x} cy={n.y} r="3" fill="#FFF4E6" />
        </g>
      ))}
    </svg>
  )
}
