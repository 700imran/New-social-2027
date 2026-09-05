import React, { useState } from 'react'

// Post/reel media is often the largest, slowest-loading thing on a card —
// this shows a shimmering placeholder while it loads and a plain fallback
// if the R2 URL 404s, instead of a blank gap or a broken-image icon.
export default function MediaImage({ src, alt = '', className = '' }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !errored && <div className="skeleton absolute inset-0" />}
      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
          Unable to load
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover select-none transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
