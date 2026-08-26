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
          className="animate-toastIn pointer-events-auto flex items-center gap-2 rounded-full bg-navy-950 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-saffron-400" />
          {t.message}
        </div>
      ))}
    </div>
  )
}
