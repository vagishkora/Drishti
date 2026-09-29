import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, Eye as EyeIcon, Coins, Pin, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { Button } from '../components/ui/Button'
import { PostCard } from '../components/PostCard'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'

/**
 * StudioPage.tsx — Drishti Creator Studio
 * Architectural Role: Creator analytics and content management dashboard.
 * Only accessible by users with account_type === 'creator'.
 */
const StudioPage: React.FC = () => {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.getCreatorStats(user.id),
      api.getUserPosts(user.id),
    ]).then(([s, p]) => {
      setStats(s)
      setPosts(p)
    }).finally(() => setLoading(false))
  }, [user])

  const handlePin = async (postId: string, pinned: boolean) => {
    await api.pinPost(postId, !pinned)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: !pinned } : p))
    toast.info(pinned ? 'Unpinned' : 'Pinned to top!')
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post permanently?')) return
    await api.deletePost(postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post deleted')
  }

  if (profile?.account_type !== 'creator') {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-textPrimary/20 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-textPrimary mb-2">Creator Studio</h2>
          <p className="text-textPrimary/40 mb-4">Switch to a Creator account in Settings to access the Studio.</p>
          <Button onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
        </div>
      </PageWrapper>
    )
  }

  if (loading) {
    return (
      <PageWrapper noPadding>
        <div className="animate-pulse space-y-8">
          <div className="h-48 md:h-64 bg-surface" />
          <div className="max-w-4xl mx-auto px-8">
            <div className="w-40 h-40 rounded-full bg-surface border-8 border-background -mt-20 mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface rounded-3xl" />)}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper noPadding>
      <div className="max-w-4xl mx-auto pb-24">
        {/* Cinematic Header — Studio Edition */}
        <div className="relative h-48 md:h-64 overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-[#0D0B1A] to-[#07070E]" />
          <div className="absolute inset-0 bg-cover bg-center opacity-40 grayscale-[0.8]" style={{ backgroundImage: `url(https://picsum.photos/seed/${user.id}/1200/400)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          <div className="absolute bottom-6 left-8 flex items-center gap-4">
            <div className="p-3 bg-accent/20 backdrop-blur-md rounded-2xl border border-accent/20">
               <BarChart3 className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-syne font-extrabold text-white tracking-tight">Creator Studio</h1>
              <p className="text-accent text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Command Centre</p>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8">
          {/* Main Info Overlap */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-24 relative z-10 mb-12">
            <div className="relative group">
              <Avatar 
                src={profile?.avatar_url} 
                username={profile?.username || 'C'} 
                size="2xl" 
                isVerified={profile?.is_verified} 
                className="w-32 h-32 md:w-40 md:h-40 ring-[8px] ring-background shadow-2xl transition-transform" 
              />
            </div>
            <div className="pb-2 text-center md:text-left">
              <h2 className="text-2xl font-syne font-bold text-white mb-1">Welcome, {profile?.full_name?.split(' ')[0] || profile?.username}</h2>
              <p className="text-textPrimary/40 text-sm font-dm-sans">Your universe is expanding at a steady pace.</p>
            </div>
          </div>

          {/* High-Density Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {[
              { icon: EyeIcon, label: 'Visual Reach', value: stats?.totalViews || 0, color: 'text-blue-400', accent: 'bg-blue-400/20' },
              { icon: Users, label: 'Universe Size', value: stats?.totalSubscribers || 0, color: 'text-primary', accent: 'bg-primary/20' },
              { icon: Coins, label: 'Lifetime Earnings', value: stats?.creditsEarned || 0, color: 'text-accent', accent: 'bg-accent/20', isCurrency: true },
              { icon: BarChart3, label: 'Total Frames', value: stats?.totalPosts || 0, color: 'text-emerald-400', accent: 'bg-emerald-400/20' },
            ].map((s, i) => (
              <motion.div 
                key={s.label} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 text-center hover:border-white/10 transition-all hover:bg-surface/50 overflow-hidden"
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-${s.color.split('-')[1]}-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className={`w-12 h-12 ${s.accent} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                
                <p className={`text-3xl font-syne font-extrabold tracking-tighter ${s.isCurrency ? 'text-accent' : 'text-white'}`}>
                  {s.isCurrency && '✨'}{api.formatNumber(s.value)}
                </p>
                <p className="text-[10px] font-bold text-textPrimary/40 uppercase tracking-[0.2em] mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Content Management Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-syne font-extrabold text-white tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-6 bg-accent rounded-full" />
                Your Visual Frames
              </h3>
              <div className="h-px flex-1 bg-white/5 mx-6 hidden sm:block" />
              <button className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline transition-all">
                Publish New Frame
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="py-24 text-center rounded-[32px] border-2 border-dashed border-white/5 bg-surface/10">
                <p className="text-textPrimary/30 italic font-dm-sans">Your universe is currently empty. Start creating!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4">
                {posts.map((p: any, i: number) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group aspect-square rounded-2xl overflow-hidden"
                  >
                    <PostCard
                      id={p.id}
                      type={p.media_type === 'video' ? 'video' : 'photo'}
                      title={p.caption || 'Untitled'}
                      signedUrl={p.media_url}
                      isPremium={p.is_premium}
                    />
                    
                    {/* Management Overlay */}
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                      <button onClick={() => handlePin(p.id, p.is_pinned)}
                        className={`p-2 rounded-xl backdrop-blur-xl border border-white/20 transition-all shadow-xl
                        ${p.is_pinned ? 'bg-accent text-background' : 'bg-black/40 text-white/70 hover:bg-accent hover:text-background'}`}>
                        <Pin className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-xl bg-black/40 text-white/70 hover:bg-red-500 hover:text-white backdrop-blur-xl border border-white/20 transition-all shadow-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

import { Avatar } from '../components/Avatar'

export default StudioPage
