import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { Grid, Globe, Lock, Film, Bookmark, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { FollowButton } from '../components/FollowButton'
import { Button } from '../components/ui/Button'
import * as api from '../lib/supabaseApi'
import { Avatar } from '../components/Avatar'

/**
 * ProfilePage.tsx — Drishti User Profile
 * Architectural Role: User identity and content showcase.
 * Supports own profile, other users, AND bot/seeded accounts.
 * Detects UUID vs username in URL param and queries accordingly.
 */

// UUID regex for detecting if param is a UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Stat formatter (e.g. 112400 -> 112k)
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return num.toString()
}

import useSWR from 'swr'

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser, profile: myProfile } = useAuth()
  const [tab, setTab] = useState<'all' | 'videos' | 'photos' | 'saved'>('all')

  // Fetch Profile data
  const { data: profile, isLoading: profileLoading } = useSWR(
    userId || currentUser?.id ? [`profile`, userId || currentUser?.id] : null,
    async ([, id]) => {
      let p: any
      if (UUID_REGEX.test(id)) {
        p = await api.getProfile(id)
      } else {
        p = await api.getProfileByUsername(id)
        if (p) p = await api.getProfile(p.id)
      }
      return p
    }
  )

  // Fetch User Posts
  const { data: posts } = useSWR(
    profile?.id ? [`user-posts`, profile.id] : null,
    ([, id]) => api.getUserPosts(id)
  )

  // Fetch Saved Posts
  const isOwn = !userId || userId === currentUser?.id || userId === myProfile?.username
  const { data: savedPosts } = useSWR(
    isOwn && currentUser?.id ? [`saved-posts`, currentUser.id] : null,
    ([, id]) => api.getSavedPosts(id)
  )

  // Check Subscription
  // Subscription logic removed from here as it's handled in GiftingModal/processSubscription

  const filteredPosts = tab === 'all' ? (posts || [])
    : tab === 'videos' ? (posts || []).filter((p: any) => p.media_type === 'video')
    : tab === 'photos' ? (posts || []).filter((p: any) => p.media_type === 'image')
    : (savedPosts || [])

  if (profileLoading) {
    return (
      <PageWrapper noPadding>
        <div className="max-w-4xl mx-auto pb-20 animate-pulse">
          {/* Cover Skeleton */}
          <div className="h-48 md:h-64 bg-surface" />
          
          <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface border-[6px] border-background" />
              <div className="pb-2 space-y-3">
                <div className="h-10 bg-surface rounded-xl w-48" />
                <div className="h-4 bg-surface rounded-lg w-24" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-surface rounded-lg w-full max-w-lg" />
              <div className="h-4 bg-surface rounded-lg w-2/3" />
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="aspect-square bg-surface rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  if (!profile) return <PageWrapper><div className="text-center text-textPrimary/50 py-20">Profile not found.</div></PageWrapper>

  return (
    <PageWrapper noPadding>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Cinematic Header — Cover Photo */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-[#0D0B1A] to-[#07070E]" />
          <div className="absolute inset-0 bg-cover bg-center opacity-40 grayscale-[0.5]" style={{ backgroundImage: `url(https://picsum.photos/seed/${profile.id}/1200/400)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Profile Info Overlay */}
        <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="relative group">
                <Avatar 
                  src={profile.avatar_url} 
                  username={profile.username} 
                  size="2xl" 
                  isVerified={profile.is_verified} 
                  className="w-32 h-32 md:w-40 md:h-40 ring-[6px] ring-background shadow-2xl transition-transform group-hover:scale-105" 
                />
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-syne font-extrabold text-textPrimary tracking-tight">
                    {profile.full_name || profile.username}
                  </h1>
                  {profile.is_verified && <CheckCircle2 className="w-6 h-6 text-accent fill-accent/10" />}
                </div>
                <p className="text-accent font-bold text-sm mb-4">@{profile.username}</p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-xl font-syne font-bold text-textPrimary leading-none">{formatNumber(profile.stats?.followers || 0)}</span>
                    <span className="text-[10px] font-dm-sans font-bold text-textPrimary/30 uppercase tracking-widest mt-1">Followers</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-syne font-bold text-textPrimary leading-none">{formatNumber(profile.stats?.following || 0)}</span>
                    <span className="text-[10px] font-dm-sans font-bold text-textPrimary/30 uppercase tracking-widest mt-1">Following</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-2">
              {isOwn
                ? <Link to="/settings">
                    <Button variant="outline" className="rounded-full px-6 border-white/10 hover:bg-white/5 font-syne font-bold uppercase tracking-widest text-[10px]">
                      Edit Profile
                    </Button>
                  </Link>
                : <div className="flex items-center gap-3">
                    <FollowButton userId={profile.id} />
                    <Button variant="ghost" className="w-10 h-10 p-0 rounded-full border border-white/5 bg-white/5">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
              }
            </div>
          </div>

          <div className="max-w-2xl mb-12">
            {profile.bio && <p className="text-textPrimary/60 text-sm leading-relaxed mb-4 font-dm-sans">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent text-[11px] font-bold uppercase tracking-widest hover:underline transition-all">
                <Globe className="w-3 h-3" /> {profile.website.replace(/https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Tabs Section */}
          <div className="border-t border-white/5 pt-1">
            <div className="flex justify-center gap-12 sm:gap-20 mb-8 h-px bg-white/5 relative">
               <div className="absolute top-0 left-0 w-full flex justify-center gap-12 sm:gap-20 -translate-y-px">
                  {(['all', 'videos', 'photos', ...(isOwn ? ['saved'] : [])] as const).map(t => (
                    <button 
                      key={t} 
                      onClick={() => setTab(t as any)}
                      className={`relative py-4 text-[10px] font-syne font-bold uppercase tracking-[0.2em] transition-all
                        ${tab === t ? 'text-accent' : 'text-textPrimary/30 hover:text-textPrimary/60'}`}
                    >
                      {t}
                      {tab === t && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent shadow-[0_0_10px_#f5c842]" />}
                    </button>
                  ))}
               </div>
            </div>

            {/* Content Grid — High Density */}
            {(!filteredPosts || filteredPosts.length === 0)
              ? <div className="py-24 text-center">
                  <div className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Grid className="w-6 h-6 text-textPrimary/10" />
                  </div>
                  <p className="text-sm font-dm-sans text-textPrimary/20 italic">The universe here is currently empty.</p>
                </div>
              : <div className="grid grid-cols-3 gap-[2px] md:gap-1 bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                  {filteredPosts.map((p: any, i: number) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="aspect-square relative group cursor-pointer overflow-hidden bg-surface"
                    >
                      <img 
                        src={p.media_url} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-4 text-white font-bold text-sm">
                           {p.media_type === 'video' && <Film className="w-5 h-5 fill-white" />}
                           {p.is_premium && <Lock className="w-4 h-4 text-accent" />}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}

export default ProfilePage
