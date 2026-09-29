import React from 'react'
import { motion } from 'framer-motion'
import { Play, Lock } from 'lucide-react'

interface VideoCardProps {
  title: string
  thumbnailUrl?: string
  views: number
  isPremium: boolean
  onClick?: () => void
}

export const VideoCard: React.FC<VideoCardProps> = ({ title, thumbnailUrl, views, isPremium, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group cursor-pointer flex flex-col gap-3 rounded-xl p-3 bg-surface border border-white/5 hover:border-primary/50 transition-colors"
    >
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-background">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-background/50 group-hover:bg-background transition-colors">
            <Play className="w-12 h-12 text-white/20 group-hover:text-primary transition-colors" />
          </div>
        )}
        
        {isPremium && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-accent/20">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-premium text-accent pt-px">Premium</span>
          </div>
        )}
        
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium text-white/90">
          {views} views
        </div>
      </div>
      
      <div className="flex flex-col px-1 pb-1">
        <h3 className="font-display font-semibold text-textPrimary leading-tight line-clamp-2">
          {title}
        </h3>
      </div>
    </motion.div>
  )
}
