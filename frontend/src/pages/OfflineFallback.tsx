import React from 'react'
import { motion } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'

export const OfflineFallback: React.FC = () => {
  return (
    <PageWrapper className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-xl w-full text-center space-y-6 bg-surface/50 p-10 rounded-3xl border border-white/5 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 mx-auto bg-surface border border-white/5 rounded-full flex items-center justify-center relative shadow-[0_0_30px_rgba(255,255,255,0.03)]"
        >
          <WifiOff className="w-10 h-10 text-textPrimary/50" />
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl -z-10" />
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold text-textPrimary tracking-tight">Connectivity Lost</h1>
          <p className="text-[15px] font-body text-textPrimary/60 px-4 leading-relaxed">
            Drishti mandates an active pipeline to continuously validate premium Row Level Security provisions. Please restore your connection to resume uninterrupted playback.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <Button 
            variant="primary" 
            onClick={() => window.location.reload()} 
            className="group shadow-lg shadow-primary/20 w-full sm:w-[250px] hover:scale-105 active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-[transform] duration-700 ease-out" /> 
            Re-establish Link
          </Button>
        </div>
      </div>
    </PageWrapper>
  )
}
