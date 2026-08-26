import React from 'react'

export default function Logo({ size = 32, withWordmark = false, wordmarkClass = '' }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC069" />
            <stop offset="55%" stopColor="#FF9933" />
            <stop offset="100%" stopColor="#E85D04" />
          </linearGradient>
        </defs>
        <path
          d="M20 2C20 2 27 10 27 18C27 24 23 28 20 28C17 28 13 24 13 18C13 10 20 2 20 2Z"
          fill="url(#logoGrad)"
        />
        <path
          d="M20 14C20 14 25 19 25 24C25 29 22.5 33 20 38C17.5 33 15 29 15 24C15 19 20 14 20 14Z"
          fill="url(#logoGrad)"
          opacity="0.9"
        />
        <rect x="15" y="34.5" width="10" height="1.6" rx="0.8" fill="#FF9933" />
        <rect x="15" y="36.4" width="10" height="1.6" rx="0.8" fill="#FFFFFF" />
        <rect x="15" y="38.3" width="10" height="1.3" rx="0.65" fill="#0F9D58" />
      </svg>
      {withWordmark && (
        <span className={`font-display font-extrabold tracking-tight ${wordmarkClass}`}>
          BharatSpace
        </span>
      )}
    </div>
  )
}
