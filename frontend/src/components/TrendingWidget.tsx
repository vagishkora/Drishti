import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import * as api from '../lib/supabaseApi'

export const TrendingWidget = () => {
  const { data: posts, isLoading } = useSWR('trending-posts', api.getTrendingPosts)

  if (isLoading) return <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
  
  if (!posts || posts.length === 0) return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center">
      <h3 className="text-[10px] font-syne font-bold text-textPrimary/20 uppercase tracking-[0.2em] mb-4">Trending</h3>
      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
         <Sparkles className="w-5 h-5 text-textPrimary/10" />
      </div>
      <p className="text-[11px] font-dm-sans text-textPrimary/30 italic">Be the first to trend. Upload a cinematic frame!</p>
    </div>
  )

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[9px] font-syne font-bold text-accent uppercase tracking-[0.2em]">
          TRENDING
        </h3>
        <span className="text-[9px] font-dm-sans text-textPrimary/20 uppercase tracking-widest">This Week</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {posts.map((post: any, i: number) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-lg overflow-hidden group cursor-pointer ${i === 4 ? 'col-span-2 h-[56px]' : 'w-[56px] h-[56px]'}`}
            onClick={() => window.location.href = `/watch/${post.id}`}
          >
            <img 
              src={post.media_url} 
              alt="" 
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-white text-[10px] font-dm-sans bg-black/40 backdrop-blur-sm px-1 rounded">
              <span>{api.formatNumber(post.views || 0)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
