import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

export default function ToastStack() {
  const { toasts } = useApp()
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex w-full max-w-[440px] -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toastIn pointer-events-auto flex items-center gap-2 rounded-full bg-navy-950 pl-4 pr-2 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-saffron-400" />
          <span className="pr-1">{t.message}</span>
          {t.action && (
            <button
              onClick={t.action.onAction}
              className="focus-ring shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
