/**
 * FollowButton.tsx — Drishti Social Follow System
 * Architectural Role: Toggle follow/unfollow with optimistic UI.
 * Uses Supabase client SDK directly (no Express).
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/supabaseApi'
import { toast } from '../lib/toast'

interface FollowButtonProps {
  userId: string
  compact?: boolean
}

export const FollowButton = ({ userId, compact }: FollowButtonProps) => {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.id === userId) { setLoading(false); return }
    api.isFollowing(user.id, userId).then(setFollowing).finally(() => setLoading(false))
  }, [user, userId])

  const toggle = async () => {
    if (!user || loading) return
    setLoading(true)
    try {
      if (following) {
        await api.unfollow(user.id, userId)
        setFollowing(false)
        toast.info('Unfollowed')
      } else {
        await api.follow(user.id, userId)
        setFollowing(true)
        toast.success('Following!')
      }
    } catch { toast.error('Action failed') }
    finally { setLoading(false) }
  }

  if (!user || user.id === userId) return null

  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={toggle} disabled={loading}
      className={`flex items-center justify-center font-bold transition-all px-4 ${
        compact ? 'h-[30px] text-[12px]' : 'h-11 text-[14px]'
      } rounded-full ${
        following 
          ? 'bg-transparent border border-white/15 text-textPrimary/60 hover:bg-white/5' 
          : 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20 hover:bg-[#6D28D9]'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <span>{following ? 'Following' : 'Follow'}</span>
      )}
    </motion.button>
  )
}
