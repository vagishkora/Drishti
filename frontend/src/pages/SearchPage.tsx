import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Compass } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { UserCard } from '../components/UserCard'
import { PostCard } from '../components/PostCard'
import { Input } from '../components/ui/Input'
import * as api from '../lib/supabaseApi'
import useSWR from 'swr'

/**
 * SearchPage.tsx — Drishti Discovery Surface
 * Architectural Role: User discovery + content exploration.
 * Uses Supabase SDK for search, explore, and suggestions.
 */
const SearchPage: React.FC = () => {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'search' | 'explore'>('explore')
  const [filter, setFilter] = useState<'all' | 'video' | 'photo' | 'premium' | 'free'>('all')
  const [users, setUsers] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Suggested Users
  const { data: suggested } = useSWR(
    user ? [`suggested-users`, user.id] : null,
    ([, userId]) => api.getSuggestedCreators(userId)
  )

  // Trending Posts Carousel
  const { data: trendingPosts } = useSWR(
    tab === 'explore' ? 'trending-posts' : null,
    api.getTrendingPosts
  )

  // Explore Posts
  const { data: explorePosts, isLoading: loadingExplore } = useSWR(
    tab === 'explore' ? 'explore-posts' : null,
    () => api.getExplorePosts()
  )

  const filteredPosts = useMemo(() => {
    if (!explorePosts) return []
    return explorePosts.filter((p: any) => {
      if (filter === 'all') return true
      if (filter === 'video') return p.media_type === 'video'
      if (filter === 'photo') return p.media_type === 'photo' || p.media_type === 'image'
      if (filter === 'premium') return p.is_premium === true
      if (filter === 'free') return p.is_premium === false
      return true
    })
  }, [explorePosts, filter])

  const doSearch = useCallback(async (q: string) => {
    if (!q) { setUsers([]); return }
    setLoadingSearch(true)
    const results = await api.searchUsers(q)
    setUsers(results)
    setLoadingSearch(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400)
    return () => clearTimeout(t)
  }, [query, doSearch])

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-syne font-extrabold text-textPrimary tracking-tight mb-2">
              Explore <span className="text-accent">Universe</span>
            </h1>
            <p className="text-textPrimary/40 font-dm-sans italic">Discover hidden visual treasures and brilliant creators.</p>
          </div>

          <div className="flex items-center p-1 bg-surface/50 backdrop-blur-xl border border-white/5 rounded-2xl">
            {(['explore', 'search'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-syne font-bold uppercase tracking-widest transition-all
                  ${tab === t ? 'bg-accent text-background shadow-lg shadow-accent/20' : 'text-textPrimary/40 hover:text-textPrimary hover:bg-white/5'}`}
              >
                {t === 'explore' ? <Compass className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'search' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Input
                placeholder="Search by name or @username..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="relative bg-surface/50 backdrop-blur-xl border-white/5 h-16 px-6 text-lg rounded-2xl focus:ring-accent/50 focus:border-accent"
              />
            </div>

            {loadingSearch ? (
              <div className="flex flex-col gap-1 p-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-24" />
                      <div className="h-3 bg-white/5 rounded w-full opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {query && !loadingSearch && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.length === 0 ? (
                      <div className="col-span-full py-20 text-center">
                        <p className="text-textPrimary/40 font-syne text-xl">No universes found for "{query}"</p>
                      </div>
                    ) : (
                      users.map(u => <UserCard key={u.id} {...u} />)
                    )}
                  </div>
                )}

                {!query && suggested && suggested.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-syne font-bold text-textPrimary">Rising Stars</h2>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suggested.map((u: any) => <UserCard key={u.id} {...u} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {tab === 'explore' && (
          <div className="space-y-10 min-h-[60vh]">
            {/* Trending Section */}
            {trendingPosts && trendingPosts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-syne font-bold uppercase tracking-[0.2em] text-accent">Trending Now</h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-accent/20 to-transparent" />
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {trendingPosts.map((p: any) => (
                    <motion.div 
                      key={p.id} 
                      whileHover={{ scale: 1.02 }}
                      className="min-w-[280px] h-[160px] rounded-2xl overflow-hidden relative group cursor-pointer border border-white/5"
                    >
                      <img src={p.media_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                        <div className="flex items-center gap-2">
                           <img src={p.users?.avatar_url} className="w-5 h-5 rounded-full border border-white/20" />
                           <span className="text-white text-[10px] font-bold tracking-wider uppercase">@{p.users?.username}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {(['all', 'video', 'photo', 'premium', 'free'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2 rounded-full text-[10px] font-syne font-bold uppercase tracking-widest transition-all border
                    ${filter === f 
                      ? 'bg-accent text-background border-accent shadow-[0_0_20px_rgba(245,200,66,0.3)]' 
                      : 'bg-surface/30 text-textPrimary/40 border-white/5 hover:border-white/20 hover:text-textPrimary'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loadingExplore ? (
              <div className="columns-2 md:columns-3 xl:columns-4 gap-4">
                {[1, 1.5, 1.2, 1.8, 1.3, 1.6, 1.1, 1.4, 1.7, 1.2, 1.5, 1.3].map((ratio, i) => (
                  <div 
                    key={i} 
                    className="mb-4 bg-surface/30 rounded-2xl animate-pulse border border-white/5" 
                    style={{ aspectRatio: `1 / ${ratio}` }}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                }}
                className="columns-2 md:columns-3 xl:columns-4 gap-4"
              >
                {filteredPosts.map((p: any) => (
                  <motion.div
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="mb-4 break-inside-avoid"
                  >
                    <PostCard
                      id={p.id}
                      type={p.media_type === 'video' ? 'video' : 'photo'}
                      title={p.caption || 'Untitled'}
                      signedUrl={p.media_url}
                      creator={p.users}
                      isPremium={p.is_premium}
                      isDemo
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!loadingExplore && (!filteredPosts || filteredPosts.length === 0) && (
              <div className="flex flex-col items-center justify-center py-40 opacity-30">
                 <Compass className="w-16 h-16 mb-6 stroke-1" />
                 <p className="text-xl font-syne font-bold uppercase tracking-widest text-center">Nothing found in this sector. <br/><span className="text-base font-dm-sans italic tracking-normal">Try a different filter.</span></p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}


export default SearchPage
