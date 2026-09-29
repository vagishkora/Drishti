/**
 * UserCard.tsx — Drishti User Discovery Card
 * Architectural Role: Search and Discovery — user result card.
 * FIX 11: Shows verified gold badge for is_verified users.
 */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { FollowButton } from './FollowButton'

interface UserCardProps {
  id?: string
  username?: string
  full_name?: string
  avatar_url?: string | null
  account_type?: 'viewer' | 'creator'
  bio?: string
  is_verified?: boolean
  compact?: boolean
}

export const UserCard = ({ id, username, full_name, avatar_url, account_type, bio, is_verified, compact }: UserCardProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group">
         <Avatar src={avatar_url} username={username} size="sm" isVerified={is_verified} />
         <div className="flex-1 min-w-0">
            <p className="text-[13px] font-syne font-bold text-textPrimary truncate">{username}</p>
            <p className="text-[10px] text-textPrimary/40 truncate">{full_name || 'Creator'}</p>
         </div>
         <Link to={`/profile/${username}`} className="text-[10px] font-syne font-bold text-accent uppercase tracking-widest px-3 py-1.5 bg-accent/10 rounded-lg hover:bg-accent hover:text-background transition-all">
           View
         </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-surface border border-white/5 rounded-2xl hover:border-white/10 transition-all"
    >
      <Link to={`/profile/${username}`}>
        <Avatar src={avatar_url} username={username} size="md" isVerified={is_verified} />
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/profile/${username}`}>
          <div className="flex items-center gap-1">
            <p className="font-syne font-bold text-textPrimary truncate hover:text-accent transition-colors">
              {full_name || username}
            </p>
            {is_verified && <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_#F5C842]" />}
          </div>
          <p className="text-xs text-textPrimary/50 truncate font-medium">@{username}</p>
          {bio && <p className="text-xs text-textPrimary/40 truncate mt-0.5">{bio}</p>}
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {account_type === 'creator' && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/15 px-2 py-0.5 rounded-full uppercase tracking-tighter">
            <Crown className="w-3 h-3" /> Creator
          </span>
        )}
        {id && <FollowButton userId={id} />}
      </div>
    </motion.div>
  )
}

// Helper to use Avatar component
import { Avatar } from './Avatar'
