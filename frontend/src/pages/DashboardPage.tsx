/**
 * DashboardPage.tsx — Drishti User Dashboard
 * Architectural Role: Unified user dashboard with subscriptions, activity, and creator studio.
 * Features two tabs: My Subscriptions & Activity + Creator Studio (for creators).
 * Premium glassmorphism aesthetic matching the Drishti design language.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Clock, Coins, Users, Eye as EyeIcon, BarChart3,
  Crown, Pin, Trash2, Star, ArrowUpRight, ArrowDownLeft,
  Sparkles, CalendarDays
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { Avatar } from '../components/Avatar'
import { PostCard } from '../components/PostCard'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'

type Tab = 'activity' | 'studio'

const DashboardPage = () => {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('activity')
  const [dashData, setDashData] = useState<any>(null)
  const [studioStats, setStudioStats] = useState<any>(null)
  const [studioPosts, setStudioPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'activity', label: 'Subscriptions & Activity', show: true },
    { id: 'studio', label: 'Creator Studio', show: profile?.account_type === 'creator' },
  ]
  const visibleTabs = tabs.filter(t => t.show)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const load = async () => {
      try {
        if (activeTab === 'activity') {
          const data = await api.getUserDashboardStats(user.id)
          setDashData(data)
        } else if (activeTab === 'studio') {
          const [s, p] = await Promise.all([
            api.getCreatorStats(user.id),
            api.getUserPosts(user.id),
          ])
          setStudioStats(s)
          setStudioPosts(p)
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, activeTab])

  const handlePin = async (postId: string, pinned: boolean) => {
    await api.pinPost(postId, !pinned)
    setStudioPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: !pinned } : p))
    toast.info(pinned ? 'Unpinned' : 'Pinned to top!')
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post permanently?')) return
    await api.deletePost(postId)
    setStudioPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post deleted')
  }

  return (
    <PageWrapper noPadding>
      <div className="max-w-5xl mx-auto pb-24">
        {/* ── Cinematic Header ── */}
        <div className="relative h-44 md:h-52 overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-[#0D0B1A] to-[#07070E]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="absolute bottom-6 left-6 md:left-8 flex items-center gap-4">
            <Avatar
              src={profile?.avatar_url}
              username={profile?.username || 'U'}
              size="lg"
              isVerified={profile?.is_verified}
              isPremium={profile?.account_type === 'creator'}
              className="ring-4 ring-background"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-syne font-extrabold text-white tracking-tight">
                {profile?.full_name || profile?.username || 'Dashboard'}
              </h1>
              <p className="text-primary/80 text-[10px] font-bold uppercase tracking-[0.2em]">Personal Dashboard</p>
            </div>
          </div>

          {/* Credits Badge */}
          <div className="absolute bottom-6 right-6 md:right-8">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-amber-500/20">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-syne font-extrabold text-amber-400">✨{profile?.credits ?? 0}</span>
              <span className="text-[9px] text-textPrimary/30 uppercase tracking-widest hidden sm:inline">Credits</span>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8">
          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 mb-8 bg-white/[0.03] backdrop-blur-xl rounded-2xl p-1.5 border border-white/5">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-3 px-4 text-sm font-syne font-bold rounded-xl transition-all duration-300 ${
                  activeTab === tab.id ? 'text-white' : 'text-textPrimary/40 hover:text-textPrimary/70'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="dashTabBg"
                    className="absolute inset-0 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ──────── ACTIVITY TAB ──────── */}
            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-28 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                      ))}
                    </div>
                    <div className="h-64 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { icon: CreditCard, label: 'Active Subscriptions', value: dashData?.activeSubscriptions ?? 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { icon: Coins, label: 'Credits Balance', value: `✨${profile?.credits ?? 0}`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { icon: Clock, label: 'Recent Transactions', value: dashData?.transactions?.length ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="group bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl p-5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                        >
                          <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <p className="text-2xl font-syne font-extrabold text-white tracking-tight">{stat.value}</p>
                          <p className="text-[10px] font-bold text-textPrimary/35 uppercase tracking-[0.15em] mt-1">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Active Subscriptions Grid */}
                    <div>
                      <div className="flex items-center gap-3 mb-5 px-1">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        <h3 className="text-lg font-syne font-extrabold text-white tracking-tight">Active Subscriptions</h3>
                        <div className="h-px flex-1 bg-white/5 hidden sm:block" />
                      </div>

                      {(!dashData?.subscriptions || dashData.subscriptions.length === 0) ? (
                        <div className="py-16 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                          <Crown className="w-10 h-10 text-textPrimary/15 mx-auto mb-3" />
                          <p className="text-textPrimary/30 text-sm font-dm-sans">No active subscriptions yet</p>
                          <p className="text-textPrimary/20 text-xs font-dm-sans mt-1">Subscribe to creators to see premium content</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dashData.subscriptions.map((sub: any, i: number) => (
                            <motion.div
                              key={sub.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              className="group flex items-center gap-3 p-4 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:bg-white/[0.07] hover:border-primary/20 transition-all duration-300"
                            >
                              <Avatar
                                src={sub.creator?.avatar_url}
                                username={sub.creator?.username || '?'}
                                size="md"
                                isVerified={sub.creator?.is_verified}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-syne font-bold text-white truncate">
                                  {sub.creator?.full_name || sub.creator?.username}
                                </p>
                                <p className="text-[10px] text-textPrimary/30 font-dm-sans">@{sub.creator?.username}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-[10px] text-emerald-400/60">
                                  <CalendarDays className="w-3 h-3" />
                                  <span>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '∞'}</span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Transaction History Timeline */}
                    <div>
                      <div className="flex items-center gap-3 mb-5 px-1">
                        <span className="w-1.5 h-6 bg-amber-400 rounded-full" />
                        <h3 className="text-lg font-syne font-extrabold text-white tracking-tight">Transaction History</h3>
                        <div className="h-px flex-1 bg-white/5 hidden sm:block" />
                      </div>

                      {(!dashData?.transactions || dashData.transactions.length === 0) ? (
                        <div className="py-16 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                          <Sparkles className="w-10 h-10 text-textPrimary/15 mx-auto mb-3" />
                          <p className="text-textPrimary/30 text-sm font-dm-sans">No transactions yet</p>
                        </div>
                      ) : (
                        <div className="relative pl-6">
                          {/* Timeline line */}
                          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-amber-400/20 to-transparent" />

                          <div className="space-y-1">
                            {dashData.transactions.map((tx: any, i: number) => {
                              const isPositive = tx.amount > 0
                              return (
                                <motion.div
                                  key={tx.id || i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="relative flex items-center gap-4 py-3 group"
                                >
                                  {/* Timeline dot */}
                                  <div className={`absolute -left-6 w-[9px] h-[9px] rounded-full border-2 ${
                                    isPositive ? 'border-emerald-400 bg-emerald-400/30' : 'border-red-400 bg-red-400/30'
                                  }`} />

                                  <div className={`p-2 rounded-xl ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                    {isPositive ? (
                                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <ArrowUpRight className="w-4 h-4 text-red-400" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-textPrimary/70 font-dm-sans truncate">{tx.description || tx.type}</p>
                                    <p className="text-[10px] text-textPrimary/25">{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</p>
                                  </div>

                                  <span className={`text-sm font-syne font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isPositive ? '+' : ''}{tx.amount}
                                  </span>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ──────── STUDIO TAB ──────── */}
            {activeTab === 'studio' && profile?.account_type === 'creator' && (
              <motion.div
                key="studio"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                      ))}
                    </div>
                    <div className="h-64 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Creator Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon: EyeIcon, label: 'Visual Reach', value: studioStats?.totalViews || 0, color: 'text-blue-400', accent: 'bg-blue-400/10' },
                        { icon: Users, label: 'Universe Size', value: studioStats?.totalSubscribers || 0, color: 'text-primary', accent: 'bg-primary/10' },
                        { icon: Coins, label: 'Lifetime Earnings', value: studioStats?.creditsEarned || 0, color: 'text-amber-400', accent: 'bg-amber-400/10', isCurrency: true },
                        { icon: BarChart3, label: 'Total Frames', value: studioStats?.totalPosts || 0, color: 'text-emerald-400', accent: 'bg-emerald-400/10' },
                      ].map((s, i) => (
                        <motion.div
                          key={s.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl p-6 text-center hover:bg-white/[0.07] hover:border-white/10 transition-all duration-300 overflow-hidden"
                        >
                          <div className={`w-12 h-12 ${s.accent} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500`}>
                            <s.icon className={`w-6 h-6 ${s.color}`} />
                          </div>
                          <p className={`text-3xl font-syne font-extrabold tracking-tighter ${s.isCurrency ? 'text-amber-400' : 'text-white'}`}>
                            {s.isCurrency && '✨'}{api.formatNumber(s.value)}
                          </p>
                          <p className="text-[10px] font-bold text-textPrimary/40 uppercase tracking-[0.2em] mt-2">{s.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Content Grid */}
                    <div>
                      <div className="flex items-center justify-between px-1 mb-5">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-6 bg-accent rounded-full" />
                          <h3 className="text-lg font-syne font-extrabold text-white tracking-tight">Your Visual Frames</h3>
                        </div>
                        <div className="h-px flex-1 bg-white/5 mx-6 hidden sm:block" />
                        <button
                          onClick={() => window.location.href = '/upload'}
                          className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline transition-all"
                        >
                          Publish New Frame
                        </button>
                      </div>

                      {studioPosts.length === 0 ? (
                        <div className="py-24 text-center rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.01]">
                          <Star className="w-10 h-10 text-textPrimary/15 mx-auto mb-3" />
                          <p className="text-textPrimary/30 italic font-dm-sans">Your universe is currently empty. Start creating!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-4">
                          {studioPosts.map((p: any, i: number) => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.04 }}
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
                                <button
                                  onClick={() => handlePin(p.id, p.is_pinned)}
                                  className={`p-2 rounded-xl backdrop-blur-xl border border-white/20 transition-all shadow-xl ${
                                    p.is_pinned ? 'bg-accent text-background' : 'bg-black/40 text-white/70 hover:bg-accent hover:text-background'
                                  }`}
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="p-2 rounded-xl bg-black/40 text-white/70 hover:bg-red-500 hover:text-white backdrop-blur-xl border border-white/20 transition-all shadow-xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  )
}

export default DashboardPage
