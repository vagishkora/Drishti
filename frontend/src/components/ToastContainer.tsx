import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

/**
 * ToastContainer.tsx — Drishti Global Toast System
 * Listens for 'drishti-toast' custom events from toast.ts
 * and renders stacked notifications at the bottom-right.
 */
interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

const configs = {
  success: { icon: CheckCircle, bg: 'bg-emerald-500/15 border-emerald-500/30', icon_c: 'text-emerald-400' },
  error:   { icon: XCircle,      bg: 'bg-red-500/15 border-red-500/30',         icon_c: 'text-red-400'     },
  info:    { icon: Info,         bg: 'bg-primary/10 border-primary/20',          icon_c: 'text-primary'     },
  warning: { icon: AlertTriangle,bg: 'bg-amber-500/10 border-amber-500/25',      icon_c: 'text-amber-400'   },
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const { id, type, message } = (e as CustomEvent<Toast>).detail
      setToasts(prev => [...prev, { id, type, message }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 4000)
    }
    window.addEventListener('drishti-toast', handler)
    return () => window.removeEventListener('drishti-toast', handler)
  }, [])

  return (
    <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const cfg = configs[t.type]
          const Icon = cfg.icon
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl pointer-events-auto ${cfg.bg}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.icon_c}`} />
              <p className="text-sm text-textPrimary flex-1">{t.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-textPrimary/40 hover:text-textPrimary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
