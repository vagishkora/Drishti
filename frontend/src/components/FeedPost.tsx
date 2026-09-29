/**
 * FeedPost.tsx — Drishti Premium Cinematic Card
 */
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Bookmark, Share2, Lock, Trash2, MoreHorizontal, Pin, Edit3, Flag, EyeOff, Link2, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CommentSection } from './CommentSection'
import { FollowButton } from './FollowButton'
import { GiftingModal } from './GiftingModal'
import * as api from '../lib/supabaseApi'
import { toast } from '../lib/toast'
import { Avatar } from './Avatar'

interface Creator {
  id?: string
  username?: string
  full_name?: string
  avatar_url?: string | null
  account_type?: string
  is_verified?: boolean
}

interface FeedPostProps {
  id: string
  mediaUrl: string
  mediaType: 'image' | 'video'
  caption?: string
  creator?: Creator
  isPremium?: boolean
  isDemo?: boolean
  likesCount?: number
  viewsCount?: number
  index?: number
}

export const FeedPost = React.memo(({ id, mediaUrl, mediaType, caption, creator, isPremium, isDemo, likesCount, index = 0 }: FeedPostProps) => {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likes, setLikes] = useState(likesCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [showGifting, setShowGifting] = useState(false)

  useEffect(() => {
    if (mediaType !== 'video' || !videoRef.current || !containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else {
          videoRef.current?.pause()
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [mediaType])

  useEffect(() => {
    if (isPremium && user && creator?.id && !isDemo) {
      api.checkSubscription(user.id, creator.id).then(sub => {
        setIsSubscribed(sub)
      })
    }
  }, [isPremium, user?.id, creator?.id])

  const handleLike = async () => {
    if (!user || isDemo) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(prev => wasLiked ? prev - 1 : prev + 1)
    try {
      await api.likePost(user.id, id)
    } catch {
      setLiked(wasLiked)
      setLikes(prev => wasLiked ? prev + 1 : prev - 1)
    }
  }

  const handleSave = async () => {
    if (!user || isDemo) return
    const wasSaved = saved
    setSaved(!wasSaved)
    try {
      await api.savePost(user.id, id)
      toast.info(wasSaved ? 'Removed from saved' : 'Saved!')
    } catch {
      setSaved(wasSaved)
    }
  }

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || !creator?.id) return
    try {
      await api.subscribe(user.id, creator.id)
      setIsSubscribed(true)
      toast.success(`Subscribed to ${creator.username}!`)
    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_CREDITS') toast.error('Check credits!')
      else toast.error(err.message || 'Subscription failed')
    }
  }

  const handleDelete = async () => {
    try {
      await api.deletePost(id)
      toast.success('Post deleted')
      setIsDeleted(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    } finally {
      setShowDeleteConfirm(false)
    }
  }

  if (isDeleted) return null
  const isLocked = isPremium && !isSubscribed && !isDemo && user?.id !== creator?.id

  return (
    <motion.div ref={containerRef}
      initial={{ opacity: 0, y: 20 }} 
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.1, 0.4) }}
      className="bg-surface border border-white/5 rounded-[20px] overflow-hidden mb-12 max-w-[600px] mx-auto shadow-2xl relative group/card transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(124,58,237,0.2),0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {/* Post Header — Sophisticated */}
      <div className="flex items-center justify-between px-4 py-3.5 relative z-10">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${creator?.username}`} className="relative">
            <Avatar 
              src={creator?.avatar_url} 
              username={creator?.username} 
              size="md" 
              isVerified={creator?.is_verified}
              className="w-10 h-10 ring-1 ring-white/10"
            />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${creator?.username}`} className="text-[15px] font-syne font-semibold text-textPrimary hover:text-accent transition-colors">
                {creator?.username || 'unknown'}
              </Link>
              {creator?.is_verified && (
                <div className="flex items-center justify-center w-[14px] h-[14px] bg-accent rounded-full">
                   <div className="w-[10px] h-[10px] bg-accent flex items-center justify-center text-[8px] font-bold text-background leading-none">✓</div>
                </div>
              )}
            </div>
            <p className="text-[12px] text-textPrimary/50 font-medium font-dm-sans lowercase capitalize">
              {creator?.full_name?.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 relative">
          {user && creator?.id && user.id !== creator.id && (
            <FollowButton userId={creator.id} compact />
          )}
          
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/5 rounded-full text-textPrimary/40 hover:text-textPrimary transition-all relative z-20"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-surface/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                >
                  <div className="py-1.5">
                    {user?.id === creator?.id ? (
                      <>
                        <button onClick={() => { setShowMenu(false); /* Edit logic */ }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-textPrimary/70 hover:text-textPrimary hover:bg-white/5 transition-all text-left font-syne">
                          <Edit3 className="w-4 h-4" /> Edit Caption
                        </button>
                        <button onClick={() => { setShowMenu(false); /* Pin logic */ }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-textPrimary/70 hover:text-textPrimary hover:bg-white/5 transition-all text-left font-syne">
                          <Pin className="w-4 h-4" /> {creator?.account_type === 'creator' ? 'Pin to Profile' : 'Highlight'}
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button 
                          onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }} 
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500/80 hover:text-red-500 hover:bg-red-500/5 transition-all text-left font-syne"
                        >
                          <Trash2 className="w-4 h-4" /> Erase Post
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setShowMenu(false); toast.info('Link copied!') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-textPrimary/70 hover:text-textPrimary hover:bg-white/5 transition-all text-left font-syne">
                          <Link2 className="w-4 h-4" /> Copy Link
                        </button>
                        <button onClick={() => { setShowMenu(false); /* Not interested logic */ }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-textPrimary/70 hover:text-textPrimary hover:bg-white/5 transition-all text-left font-syne">
                          <EyeOff className="w-4 h-4" /> Not Interested
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={() => { setShowMenu(false); /* Report logic */ }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500/80 hover:text-red-500 hover:bg-red-500/5 transition-all text-left font-syne">
                          <Flag className="w-4 h-4" /> Report Post
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Media — Reels Style Overlay */}
      <div className="aspect-[4/5] bg-black relative overflow-hidden group">
        {mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${isLocked ? 'blur-[40px] scale-125' : 'group-hover:scale-105'}`}
            muted={true}
            loop
            playsInline
            onClick={() => {
              if (isLocked) return
              if (videoRef.current?.paused) { videoRef.current.play() }
              else { videoRef.current?.pause() }
            }}
          />
        ) : (
          <img 
            src={mediaUrl} 
            alt={caption || ''} 
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${isLocked ? 'blur-[40px] scale-125' : 'group-hover:scale-105'}`} 
            loading="lazy" 
          />
        )}

        {/* Protection Gradient Top */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
 
        {/* FIX 8 — Cinematic Caption Overlay */}
        {!isLocked && (
          <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/85 to-transparent flex flex-col justify-end p-4 pb-3 pointer-events-none">
            <span className="text-white font-syne font-bold text-[13px]">{creator?.username}</span>
            <p className="text-white/90 font-dm-sans text-[12px] line-clamp-1">{caption}</p>
          </div>
        )}
 
        {/* Premium Gating */}
        {isLocked && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm bg-black/30">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-accent/40 shadow-[0_0_40px_rgba(245,200,66,0.3)]">
              <Lock className="w-8 h-8 text-accent animate-pulse" />
            </div>
            <h3 className="text-xl font-syne font-bold text-white mb-2 uppercase tracking-widest">Premium Universe</h3>
            <button onClick={handleSubscribe} className="px-8 py-3 bg-accent text-background font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider">
               Unlock Access (100)
            </button>
          </div>
        )}
      </div>
 
      {/* FIX 5 — Post Card Action Bar (ALWAYS Visible) */}
      <div className="h-[48px] px-4 flex items-center justify-between border-b border-white/5 bg-background shadow-inner">
        <div className="flex items-center gap-5">
          {/* Like */}
          <div className="flex items-center gap-2">
            <motion.button 
              whileTap={{ scale: 1.3 }}
              onClick={handleLike}
              className="transition-colors"
            >
              <Heart className={`w-[22px] h-[22px] ${liked ? 'fill-red-500 stroke-red-500' : 'text-[#EDE9F8]/70'}`} />
            </motion.button>
            <span className="text-[13px] font-dm-sans text-[#EDE9F8]/60">{likes.toLocaleString()}</span>
          </div>
 
          {/* Comment */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowComments(!showComments)} className="transition-colors">
              <MessageCircle className="w-[22px] h-[22px] text-[#EDE9F8]/70" />
            </button>
            <span className="text-[13px] font-dm-sans text-[#EDE9F8]/60">0</span>
          </div>
 
          {/* Share */}
          <button onClick={() => toast.info('Link copied!')} className="p-1">
            <Share2 className="w-[22px] h-[22px] text-[#EDE9F8]/70" />
          </button>
 
          {/* Gift */}
          {user && creator?.id && user.id !== creator.id && !isDemo && (
            <button 
              onClick={() => setShowGifting(true)}
              className="text-[#EDE9F8]/70 hover:text-accent transition-colors"
            >
              <Star className="w-[22px] h-[22px]" />
            </button>
          )}
        </div>
 
        {/* Bookmark */}
        <button onClick={handleSave} className="p-1">
          <Bookmark className={`w-[22px] h-[22px] ${saved ? 'fill-accent text-accent' : 'text-[#EDE9F8]/70'}`} />
        </button>
      </div>
 
      {/* Caption Content Area */}
      <div className="px-4 py-3.5 space-y-1">
        <div className="flex gap-2 text-[13px]">
          <span className="font-syne font-bold text-textPrimary">{creator?.username}</span>
          <span className="text-textPrimary/80 font-dm-sans font-normal">{caption}</span>
        </div>
        <p className="text-[10px] font-syne font-bold text-textPrimary/20 uppercase tracking-widest mt-1">
          Just Now • Cinematic Universe
        </p>
      </div>
 
      {/* Gift Modal Overlay */}
      {user && creator?.id && (
        <GiftingModal 
          isOpen={showGifting} 
          onClose={() => setShowGifting(false)} 
          creatorId={creator.id} 
          creatorUsername={creator.username || 'creator'} 
        />
      )}

      {/* Comments Sidebar Animation */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-[#0D0B1A]/50 px-5 py-4"
          >
            <CommentSection postId={id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-surface border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-syne font-bold text-white mb-4">Erase Post?</h2>
                <div className="flex gap-4">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-2xl bg-white/5 font-bold">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white shadow-xl shadow-red-500/20">Delete</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})
