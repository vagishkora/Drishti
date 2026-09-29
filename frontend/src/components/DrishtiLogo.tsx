/**
 * DrishtiLogo.tsx — Premium Brand Asset
 * Architectural Role: Unified brand logo with SVG mark and text lockup.
 * Features: Play-button iris, gold lash lines, drop-shadow glow, and hover animations.
 */
import { motion } from 'framer-motion'

interface DrishtiLogoProps {
  showText?: boolean
  className?: string
  scale?: number
}

export const DrishtiLogo = ({ showText = false, className = '', scale = 1 }: DrishtiLogoProps) => {
  return (
    <div className={`flex items-center gap-[10px] ${className}`} style={{ transform: `scale(${scale})` }}>
      <motion.div
        className="relative flex items-center justify-center shrink-0"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.7))' }}
        >
          {/* Eye Outer Shape - Vesica Piscis */}
          <path
            d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z"
            stroke="#7C3AED"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Iris */}
          <motion.circle
            cx="24"
            cy="24"
            r="8"
            fill="#7C3AED"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Play Button Iris Center */}
          <path
            d="M22 20L28 24L22 28V20Z"
            fill="#F5C842"
          />

          {/* Pupil Highlight */}
          <circle cx="27" cy="21" r="1.5" fill="white" fillOpacity="0.8" />
        </svg>
      </motion.div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-[20px] font-syne font-extrabold text-white tracking-tight">
            Drishti
          </span>
          <span className="text-[11px] font-playfair italic text-[#F5C842] tracking-wider -mt-0.5">
            See Beyond
          </span>
        </div>
      )}
    </div>
  )
}
