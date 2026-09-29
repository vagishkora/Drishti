import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pause, Play, Send, MoreHorizontal } from 'lucide-react'
import type { StoryGroup } from './StoriesTray'
import * as api from '../lib/supabaseApi'

interface StoryViewerProps {
  feed: StoryGroup[]
  initialGroupIdx: number
  initialStoryIdx: number
  onClose: () => void
}

const STORY_DURATION = 5000 // 5 seconds per photo

export const StoryViewer = ({ feed, initialGroupIdx, initialStoryIdx, onClose }: StoryViewerProps) => {
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx)
  const [storyIdx, setStoryIdx] = useState(initialStoryIdx)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [comment, setComment] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentGroup = feed[groupIdx]
  const currentStory = currentGroup?.stories[storyIdx]

  useEffect(() => {
    if (!currentStory) return onClose()

    // Increment view count when story changes
    api.incrementStoryView(currentStory.id)

    if (currentStory.media_type === 'video') {
      setProgress(0)
      return
    }

    setProgress(0)
    let startTime = Date.now()
    let animationFrame: number

    const animate = () => {
      if (paused) {
        startTime += 16 
      } else {
        const elapsed = Date.now() - startTime
        const pct = (elapsed / STORY_DURATION) * 100
        setProgress(pct)
        if (pct >= 100) return nextStory()
      }
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [currentStory, paused])

  const nextStory = () => {
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx(s => s + 1)
    } else if (groupIdx < feed.length - 1) {
      let nextG = groupIdx + 1
      while (nextG < feed.length && (!feed[nextG].stories || feed[nextG].stories.length === 0)) nextG++

      if (nextG < feed.length) {
        setGroupIdx(nextG)
        setStoryIdx(0)
      } else {
        onClose()
      }
    } else {
      onClose()
    }
  }

  const prevStory = () => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1)
    } else if (groupIdx > 0) {
      let prevG = groupIdx - 1
      while (prevG >= 0 && (!feed[prevG].stories || feed[prevG].stories.length === 0)) prevG--

      if (prevG >= 0) {
        setGroupIdx(prevG)
        setStoryIdx(feed[prevG].stories.length - 1)
      }
    }
  }

  if (!currentStory) return null

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Immersive Background */}
        <div
          className="absolute inset-0 opacity-30 blur-[100px] bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${currentStory.media_url})` }}
        />

        <div className="w-full max-w-md h-full sm:h-[92vh] relative bg-black sm:rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col border border-white/5">
          {/* Progress Bars */}
          <div className="absolute top-0 inset-x-0 z-20 px-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 to-transparent pb-10">
            {currentGroup.stories.map((s: any, i: number) => (
              <div key={s.id} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_8px_white]"
                  style={{ width: `${i < storyIdx ? 100 : i === storyIdx ? progress : 0}%` }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 inset-x-0 z-20 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-tr from-accent to-accent/50 overflow-hidden">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {currentGroup.user.avatar_url ? (
                  <img src={currentGroup.user.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs">{(currentGroup.user.username || 'U')[0].toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-syne font-bold text-sm drop-shadow-lg">{currentGroup.user.username}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                {(() => {
                  const diff = Date.now() - new Date(currentStory.created_at).getTime()
                  const hours = Math.floor(diff / 3600000)
                  return hours < 1 ? 'Just Now' : `${hours}h ago`
                })()}
              </span>
            </div>

            <div className="flex-1" />
            <button onClick={() => setPaused(!paused)} className="p-2 text-white/60 hover:text-white transition-colors">
              {paused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
            </button>
            <button className="p-2 text-white/60 hover:text-white transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Media Content */}
          <div
            className="flex-1 relative bg-black flex items-center justify-center cursor-default"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
          >
            {currentStory.media_type === 'video' ? (
              <video
                ref={videoRef}
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted={paused}
                onEnded={nextStory}
                onTimeUpdate={(e) => {
                  const vid = e.currentTarget
                  if (!paused) setProgress((vid.currentTime / vid.duration) * 100)
                }}
              />
            ) : (
              <img
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                alt="Story"
              />
            )}

            {/* Tap Zones */}
            <div className="absolute inset-y-0 left-0 w-1/4 z-30" onClick={(e) => { e.stopPropagation(); prevStory() }} />
            <div className="absolute inset-y-0 right-0 w-3/4 z-30" onClick={(e) => { e.stopPropagation(); nextStory() }} />
          </div>

          {/* Bottom Bar — Reply */}
          <div className="p-4 pt-2 bg-gradient-to-t from-black/90 to-transparent z-20">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/5 rounded-full h-12 flex items-center px-5 group focus-within:border-accent/30 transition-all">
                <input 
                  type="text" 
                  placeholder={`Reply to ${currentGroup.user.username}...`}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="bg-transparent flex-1 text-sm outline-none text-white placeholder:text-white/30"
                />
                <button className={`p-1 transition-all ${comment ? 'text-accent scale-110' : 'text-white/20'}`}>
                   <Send className="w-5 h-5" />
                </button>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/5 flex items-center justify-center text-white/60 hover:text-white"
              >
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>❤️</motion.span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default StoryViewer
