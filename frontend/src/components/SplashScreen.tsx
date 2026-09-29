/**
 * SplashScreen.tsx — Drishti Loading Experience
 * Pulsing eye logo + "See Beyond" while app initializes.
 */
import { motion } from 'framer-motion'

import { DrishtiLogo } from './DrishtiLogo'

export const SplashScreen = () => (
  <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Premium Logo Mark */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <DrishtiLogo showText scale={1.5} />
      </motion.div>

      {/* Loading Bar */}
      <div className="w-32 h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
        <motion.div
          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#F5C842] rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  </div>
)
