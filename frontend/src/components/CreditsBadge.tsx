/**
 * CreditsBadge.tsx — Drishti Credits System — Persistent Balance Display
 * Architectural Role: Realtime credits widget in navbar.
 * Uses AuthContext profile (which has Supabase Realtime listener).
 */
import { motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const CreditsBadge = () => {
  const { profile } = useAuth()

  if (!profile) return null

  return (
    <Link to="/credits">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer hover:bg-accent/20 transition-all"
      >
        <Coins className="w-4 h-4" />
        {profile.credits}
      </motion.div>
    </Link>
  )
}
