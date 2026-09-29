import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { Button } from './ui/Button'

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Delay showing to not overwhelm immediate page load retention metrics
      setTimeout(() => setShowPrompt(true), 3500)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 p-4 bg-surface border border-white/10 rounded-2xl shadow-[0_20px_40px_-15px_rgba(124,58,237,0.3)] flex flex-col gap-3"
        >
          <button 
            onClick={() => setShowPrompt(false)}
            className="absolute top-3 right-3 text-textPrimary/40 hover:text-textPrimary bg-black/20 rounded-md p-1 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Close Install Prompt"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0 border border-primary/20 shadow-inner">
              <Download className="w-6 h-6" />
            </div>
            <div className="pr-4">
              <h3 className="font-display font-semibold text-textPrimary tracking-tight">Install Drishti App</h3>
              <p className="text-sm text-textPrimary/60 font-body leading-tight mt-0.5">Experience offline support & native playback capabilities designed for scale.</p>
            </div>
          </div>
          
          <Button onClick={handleInstallClick} className="w-full mt-2 font-semibold tracking-wide shadow-primary/30">
            Add to Home Screen
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
