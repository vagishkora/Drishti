/**
 * SuggestedCreators.tsx — Drishti Ecosystem
 * Architectural Role: Shows bot creator accounts to new users.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './Avatar'
import { FollowButton } from './FollowButton'
import * as api from '../lib/supabaseApi'

import useSWR from 'swr'

export const SuggestedCreators = React.memo(() => {
  const { user } = useAuth()

  const { data: creators } = useSWR(
    user ? [`suggested-creators`, user.id] : null,
    ([, userId]) => api.getSuggestedCreators(userId)
  )

  if (!creators || creators.length === 0) return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center">
      <p className="text-[12px] font-syne font-bold text-accent uppercase tracking-widest mb-2">You're all caught up!</p>
      <p className="text-[11px] font-dm-sans text-textPrimary/30 italic mb-4">You followed everyone in the local universe.</p>
      <Link to="/search" className="text-[10px] font-bold text-white/40 hover:text-accent uppercase tracking-widest transition-colors">Explore more →</Link>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-syne font-bold text-textPrimary/40 uppercase tracking-wider">
          Suggested Creators
        </h3>
        <button className="text-[11px] font-bold text-accent hover:underline">See All</button>
      </div>

      <div className="space-y-3">
        {creators.map((creator, i) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Avatar 
                src={creator.avatar_url} 
                username={creator.username} 
                size="md" 
                isVerified={creator.is_verified}
                className="w-11 h-11 ring-1 ring-white/5 group-hover:ring-accent/40 transition-all"
              />
              <div className="flex flex-col">
                <span className="text-[13px] font-syne font-semibold text-textPrimary group-hover:text-accent transition-colors">
                  {creator.username}
                </span>
                <span className="text-[9px] text-accent font-bold uppercase tracking-wider bg-accent/5 px-2 py-0.5 rounded-full w-fit mt-0.5">
                  {creator.account_type}
                </span>
              </div>
            </div>

            <FollowButton userId={creator.id} compact />
          </motion.div>
        ))}
      </div>
    </div>
  )
})
