/**
 * StoriesTray.tsx — Drishti Stories Hub
 */
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'

export interface StoryGroup {
  user: { id: string; username: string; full_name: string; avatar_url: string | null }
  stories: any[]
}

interface StoriesTrayProps {
  onStoryClick: (groups: StoryGroup[], startIndex: number) => void
}

import useSWR from 'swr'

export const StoriesTray = React.memo(({ onStoryClick }: StoriesTrayProps) => {
  const { user, profile } = useAuth()
  const [uploading, setUploading] = useState(false)

  const { data: groups, mutate, isLoading } = useSWR(
    user ? [`stories-feed`, user.id] : null,
    async ([, userId]) => {
      const feed = await api.getStoriesFeed(userId)
      let finalFeed = feed || []
      const hasOwn = finalFeed.find((g: StoryGroup) => g.user.id === userId)
      if (!hasOwn) {
        finalFeed = [{ 
          user: { 
            id: userId, 
            username: 'You', 
            full_name: 'You', 
            avatar_url: profile?.avatar_url || null 
          }, 
          stories: [] 
        }, ...finalFeed]
      }
      return finalFeed
    }
  )

  const handleAddStory = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.onchange = async () => {
      if (!input.files?.[0] || !user) return
      setUploading(true)
      try {
        let file = input.files[0]
        
        // Compress if image
        if (file.type.startsWith('image')) {
          const options = {
            maxSizeMB: 0.5, // Stories are small
            maxWidthOrHeight: 1080,
            useWebWorker: true,
          }
          try {
            const imageCompression = (await import('browser-image-compression')).default
            file = await imageCompression(file, options)
          } catch (compErr) {
            console.error('Compression failed:', compErr)
          }
        }
        
        await api.createStory(file)
        toast.success('Story posted!')
        mutate() // Re-fetch feed
      } catch { toast.error('Failed to upload story') }
      finally { setUploading(false) }
    }
    input.click()
  }

  if (isLoading || !groups) {
    return (
      <div className="flex gap-4 px-8 overflow-hidden h-[110px] items-start pt-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex flex-col items-center gap-2 animate-pulse min-w-[64px]">
            <div className="w-[64px] h-[64px] rounded-full bg-surface/50 border border-white/5" />
            <div className="w-8 h-2.5 bg-surface/50 rounded" />
          </div>
        ))}
      </div>
    )
  }
 
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full h-[110px] overflow-hidden overflow-x-auto scrollbar-hide pt-2 snap-x snap-mandatory"
    >
      <div className="flex gap-4 px-8 min-w-max items-start">
        {groups.map((group, i) => {
          const isOwn = group.user.id === user?.id
          const hasStories = group.stories.length > 0
          const initial = (group.user.full_name || group.user.username || '?').charAt(0).toUpperCase()
          
          return (
            <motion.button key={group.user.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => isOwn && !hasStories ? handleAddStory() : onStoryClick(groups, i)}
              className="group flex flex-col items-center gap-2 w-[64px] snap-start"
            >
              <div className="relative w-[64px] h-[64px] flex items-center justify-center">
                {/* FIX 1 — Exact precision structure */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: hasStories ? 'linear-gradient(135deg, #7C3AED, #F5C842)' : 'rgba(255,255,255,0.1)',
                  padding: '2.5px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: '#07070E', padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {group.user.avatar_url ? (
                      <img src={group.user.avatar_url} style={{
                        width: '100%', height: '100%',
                        borderRadius: '50%', objectFit: 'cover'
                      }} />
                    ) : (
                      <div className="w-full h-full rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-accent font-syne font-bold text-xl">{initial}</span>
                      </div>
                    )}
                  </div>
                </div>
 
                {uploading && isOwn && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-full">
                    <Loader2 className="w-6 h-6 text-accent animate-pulse" />
                  </div>
                )}
 
                {/* Gold Plus Button — Exactly 20px */}
                {isOwn && (
                  <div className="absolute bottom-0 right-0 z-20 w-5 h-5 bg-[#F5C842] text-background rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                    <Plus className="w-3.5 h-3.5 font-bold stroke-[4]" />
                  </div>
                )}
              </div>
 
              <span className="text-[11px] font-dm-sans text-[#EDE9F8]/60 text-center truncate w-full tracking-tight">
                {isOwn ? 'You' : group.user.username}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
})
