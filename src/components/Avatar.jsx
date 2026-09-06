import React from 'react'
import { BadgeCheck } from 'lucide-react'

const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export default function Avatar({ user, size = 'md', showVerified = true, className = '' }) {
  if (!user) return null
  const sizeClass = SIZES[size] || SIZES.md
  return (
    <div className={`relative shrink-0 ${className}`}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name || 'Avatar'}
          className={`${sizeClass} rounded-full object-cover ring-2 ring-white shadow-sm select-none`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-display font-semibold text-white ring-2 ring-white shadow-sm select-none`}
        >
          {user.initials}
        </div>
      )}
      {showVerified && user.verified && (
        <BadgeCheck
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-white bg-blue-500 rounded-full p-0.5"
          strokeWidth={3}
        />
      )}
    </div>
  )
}
