import { motion } from 'framer-motion'
import { Play, Crown, Image } from 'lucide-react'

/**
 * PostCard.tsx
 * Architectural Role: Unified content card for profile grids, explore pages.
 * FIX 11: Verified gold badge for is_verified creators.
 */
interface PostCardProps {
  id?: string
  type: 'video' | 'photo'
  title: string
  signedUrl?: string | null
  creator?: { username?: string; full_name?: string; avatar_url?: string; is_verified?: boolean }
  isPremium?: boolean
  isDemo?: boolean
  likesCount?: number
  onClick?: () => void
}

export const PostCard = ({ type, title, signedUrl, creator, isPremium, isDemo, onClick }: PostCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative bg-surface/50 backdrop-blur-sm border border-white/5 rounded-[20px] overflow-hidden cursor-pointer hover:border-accent/30 hover:shadow-[0_20px_40px_-15px_rgba(124,58,237,0.15)] transition-all break-inside-avoid mb-4"
      onClick={onClick}
    >
      {/* Media Frame */}
      <div className="relative aspect-[4/5] overflow-hidden">
        {signedUrl && type === 'photo' && (
          <img 
            src={signedUrl} 
            alt={title} 
            loading="lazy"
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
          />
        )}
        {signedUrl && type === 'video' && (
          <video src={signedUrl} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0" muted />
        )}
        {!signedUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-all">
                {type === 'video' ? <Play className="w-5 h-5 text-accent fill-accent" /> : <Image className="w-5 h-5 text-accent" />}
             </div>
          </div>
        )}

        {/* Cinematic Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isPremium && (
            <div className="flex items-center gap-1.5 bg-accent text-background px-2.5 py-1 rounded-lg text-[10px] font-syne font-extrabold uppercase tracking-widest shadow-lg shadow-accent/20">
              <Crown className="w-3 h-3" /> Premium
            </div>
          )}
          {isDemo && (
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-syne font-bold uppercase tracking-widest border border-white/10">
              Explore
            </div>
          )}
        </div>

        {/* Bottom Overlay (Gradient + Info) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070E] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
           <p className="text-white font-syne font-bold text-sm mb-3 drop-shadow-md line-clamp-2">{title}</p>
           {creator && (
             <div className="flex items-center gap-2">
                <Avatar src={creator.avatar_url} username={creator.username} size="sm" isVerified={creator.is_verified} />
                <span className="text-xs text-white/70 font-medium">@{creator.username}</span>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  )
}

import { Avatar } from './Avatar'
