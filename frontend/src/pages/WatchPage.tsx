import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Crown, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'

/**
 * Watch Page
 * Shows individual video player with premium content gating.
 * Premium videos require an active subscription to view.
 */
const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [video, setVideo] = useState<any>(null)
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPremiumLocked, setIsPremiumLocked] = useState(false)

  const fetchVideo = useCallback(async () => {
    if (!id) return

    try {
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Video not found')
        setLoading(false)
        return
      }

      setVideo(data)

      // Try to get playback URL
      if (session?.access_token) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/videos/play/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          const result = await res.json()

          if (res.ok) {
            setPlayUrl(result.play_url)
          } else if (res.status === 403) {
            setIsPremiumLocked(true)
          } else {
            setError(result.error || 'Failed to load video')
          }
        } catch {
          setError('Failed to connect to server')
        }
      } else if (data.is_premium) {
        setIsPremiumLocked(true)
      } else {
        // Non-premium, generate client-side signed URL
        const { data: urlData } = await supabase.storage
          .from('videos')
          .createSignedUrl(data.video_url, 3600)
        if (urlData) setPlayUrl(urlData.signedUrl)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [id, session])

  useEffect(() => {
    fetchVideo()
  }, [fetchVideo])

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-4 animate-pulse">
          <div className="aspect-video bg-surface rounded-2xl" />
          <div className="h-8 bg-surface rounded-lg w-2/3" />
          <div className="h-4 bg-surface rounded-lg w-1/3" />
        </div>
      </PageWrapper>
    )
  }

  if (error) {
    return (
      <PageWrapper className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-textPrimary mb-2">{error}</h2>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-textPrimary/60 hover:text-textPrimary transition-colors mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Video Player */}
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-8 ring-1 ring-white/5">
        {isPremiumLocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/95 backdrop-blur-lg z-10">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-5 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-display font-bold text-textPrimary mb-2">Premium Content</h3>
              <p className="text-textPrimary/50 mb-6 max-w-sm">Subscribe to this creator to unlock this and all their premium videos.</p>
              <Button onClick={() => navigate(`/subscribe?creator=${video?.creator_id}`)} className="shadow-lg shadow-primary/20">
                <Crown className="w-4 h-4 mr-2" /> Subscribe Now
              </Button>
            </motion.div>
          </div>
        ) : playUrl ? (
          <video ref={videoRef} src={playUrl} controls autoPlay className="w-full h-full object-contain" />
        ) : null}
      </div>

      {/* Video Info */}
      {video && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-textPrimary leading-tight">{video.title}</h1>
            {video.is_premium && (
              <span className="shrink-0 flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent px-3 py-1 rounded-full text-xs font-premium italic">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
          </div>
          <p className="text-textPrimary/50 text-sm mb-2">{video.views_count || 0} views</p>
          {video.description && <p className="text-textPrimary/70 font-body leading-relaxed mt-4">{video.description}</p>}
        </motion.div>
      )}
    </PageWrapper>
  )
}

export default WatchPage
