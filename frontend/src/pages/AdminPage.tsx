/**
 * AdminPage.tsx — Drishti Admin Dashboard
 * Architectural Role: Admin-only control panel for platform management.
 * Features: Stats overview, user management, reports/moderation.
 * Premium glassmorphism aesthetic with staggered Framer Motion animations.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Crown, Image, CreditCard, AlertTriangle, Coins,
  Search, Shield, ShieldCheck, Key, Gift, X, Check,
  ChevronLeft, ChevronRight, FileWarning,
  BadgeCheck, UserX, Terminal, Activity, RefreshCw
} from 'lucide-react'
import { PageWrapper } from '../components/PageWrapper'
import { Avatar } from '../components/Avatar'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'

type Tab = 'overview' | 'users' | 'reports' | 'soc'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Management' },
  { id: 'reports', label: 'Reports & Moderation' },
  { id: 'soc', label: 'SOC & Cryptographic Ledger' },
]

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [usersMeta, setUsersMeta] = useState<any>({})
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [page, setPage] = useState(1)
  const [creditModal, setCreditModal] = useState<{ userId: string; username: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDesc, setCreditDesc] = useState('')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditResult, setAuditResult] = useState<any>(null)
  const [verifyingAudit, setVerifyingAudit] = useState(false)

  // Load data based on active tab
  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        if (activeTab === 'overview') {
          const s = await api.getAdminStats()
          setStats(s)
        } else if (activeTab === 'users') {
          const res = await api.getAdminUsers(page, 20, searchQuery, filterType)
          setUsers(res.users || [])
          setUsersMeta(res.meta || {})
        } else if (activeTab === 'reports') {
          const r = await api.getAdminReports()
          setReports(r.reports || r || [])
        } else if (activeTab === 'soc') {
          const logs = await api.getSecurityAuditLogs(40)
          setAuditLogs(logs)
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeTab, page, searchQuery, filterType])

  const handleVerifyChain = async () => {
    setVerifyingAudit(true)
    try {
      const res = await api.verifyAuditLogIntegrity()
      setAuditResult(res)
      if (res?.verified) {
        toast.success(`Audit trail verified: ${res.total_records} chained records intact.`)
      } else {
        toast.error(`Integrity issue: ${res.error}`)
      }
    } catch (err: any) {
      toast.error('Verification error: ' + err.message)
    } finally {
      setVerifyingAudit(false)
    }
  }

  const handleVerifyToggle = async (userId: string) => {
    try {
      await api.toggleUserVerify(userId)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !u.is_verified } : u))
      toast.success('Verification status updated')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleAdminToggle = async (userId: string) => {
    try {
      await api.toggleUserAdmin(userId)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !u.is_admin } : u))
      toast.success('Admin status updated')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleGrantCredits = async () => {
    if (!creditModal || !creditAmount) return
    try {
      await api.grantUserCredits(creditModal.userId, Number(creditAmount), creditDesc || 'Admin grant')
      toast.success(`Granted ${creditAmount} credits to @${creditModal.username}`)
      setCreditModal(null)
      setCreditAmount('')
      setCreditDesc('')
      // Refresh user list
      const res = await api.getAdminUsers(page, 20, searchQuery, filterType)
      setUsers(res.users || [])
    } catch (err: any) { toast.error(err.message) }
  }

  const handleResolve = async (reportId: string, action: 'dismiss' | 'delete_post' | 'delete_user') => {
    try {
      await api.resolveAdminReport(reportId, action)
      setReports(prev => prev.filter(r => r.id !== reportId))
      toast.success(`Report ${action === 'dismiss' ? 'dismissed' : 'resolved'} successfully`)
    } catch (err: any) { toast.error(err.message) }
  }

  // ── Stat card definitions ──
  const statCards = [
    { icon: Users, label: 'Total Users', value: stats?.totalUsers ?? '—', color: 'blue', gradient: 'from-blue-500/20 to-blue-600/5', border: 'hover:border-blue-500/30', text: 'text-blue-400', shadow: 'hover:shadow-blue-500/10' },
    { icon: Crown, label: 'Creators', value: stats?.totalCreators ?? '—', color: 'purple', gradient: 'from-purple-500/20 to-purple-600/5', border: 'hover:border-purple-500/30', text: 'text-purple-400', shadow: 'hover:shadow-purple-500/10' },
    { icon: Image, label: 'Posts', value: stats?.totalPosts ?? '—', color: 'emerald', gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'hover:border-emerald-500/30', text: 'text-emerald-400', shadow: 'hover:shadow-emerald-500/10' },
    { icon: CreditCard, label: 'Active Subs', value: stats?.activeSubscriptions ?? '—', color: 'amber', gradient: 'from-amber-500/20 to-amber-600/5', border: 'hover:border-amber-500/30', text: 'text-amber-400', shadow: 'hover:shadow-amber-500/10' },
    { icon: AlertTriangle, label: 'Pending Reports', value: stats?.pendingReports ?? '—', color: 'red', gradient: 'from-red-500/20 to-red-600/5', border: 'hover:border-red-500/30', text: 'text-red-400', shadow: 'hover:shadow-red-500/10' },
    { icon: Coins, label: 'Credits in Circulation', value: stats?.creditsInCirculation ?? '—', color: 'yellow', gradient: 'from-yellow-500/20 to-yellow-600/5', border: 'hover:border-yellow-500/30', text: 'text-yellow-400', shadow: 'hover:shadow-yellow-500/10' },
  ]

  return (
    <PageWrapper noPadding>
      <div className="max-w-6xl mx-auto pb-24">
        {/* ── Cinematic Header ── */}
        <div className="relative h-48 md:h-56 overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-[#0D0B1A] to-[#07070E]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+Cjwvc3ZnPg==')] opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="absolute bottom-6 left-6 md:left-8 flex items-center gap-4">
            <div className="p-3 bg-red-500/20 backdrop-blur-md rounded-2xl border border-red-500/20">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-syne font-extrabold text-white tracking-tight">Admin Panel</h1>
              <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-[0.2em]">Platform Control Centre</p>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-8">
          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 mb-8 bg-white/[0.03] backdrop-blur-xl rounded-2xl p-1.5 border border-white/5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1) }}
                className={`relative flex-1 py-3 px-4 text-sm font-syne font-bold rounded-xl transition-all duration-300 ${
                  activeTab === tab.id ? 'text-white' : 'text-textPrimary/40 hover:text-textPrimary/70'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="adminTabBg"
                    className="absolute inset-0 bg-white/[0.08] backdrop-blur-sm rounded-xl border border-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <AnimatePresence mode="wait">
            {/* ──────── OVERVIEW TAB ──────── */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-40 bg-white/[0.03] rounded-3xl animate-pulse border border-white/5" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statCards.map((card, i) => (
                      <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                        className={`group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl p-6 transition-all duration-500 hover:scale-[1.02] ${card.border} ${card.shadow} hover:shadow-2xl cursor-default overflow-hidden`}
                      >
                        {/* Gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />
                        {/* Top glow line */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-${card.color}-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                        <div className="relative z-10">
                          <div className={`w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                            <card.icon className={`w-6 h-6 ${card.text}`} />
                          </div>
                          <p className="text-3xl font-syne font-extrabold text-white tracking-tight mb-1">
                            {typeof card.value === 'number' ? api.formatNumber(card.value) : card.value}
                          </p>
                          <p className="text-[11px] font-bold text-textPrimary/40 uppercase tracking-[0.15em]">{card.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ──────── USERS TAB ──────── */}
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textPrimary/30" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-2xl text-sm text-textPrimary placeholder:text-textPrimary/25 focus:outline-none focus:border-primary/40 transition-colors font-dm-sans"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'viewer', 'creator'].map((t) => (
                      <button
                        key={t}
                        onClick={() => { setFilterType(t); setPage(1) }}
                        className={`px-4 py-2.5 text-xs font-syne font-bold uppercase tracking-wider rounded-xl border transition-all duration-300 ${
                          filterType === t
                            ? 'bg-primary/20 border-primary/30 text-primary'
                            : 'bg-white/[0.03] border-white/[0.06] text-textPrimary/40 hover:text-textPrimary/70 hover:border-white/10'
                        }`}
                      >
                        {t === 'all' ? 'All' : t === 'viewer' ? 'Viewers' : 'Creators'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Table */}
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse border border-white/5" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-12 h-12 text-textPrimary/15 mx-auto mb-4" />
                    <p className="text-textPrimary/30 font-dm-sans">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u: any, i: number) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                      >
                        {/* User Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar
                            src={u.avatar_url}
                            username={u.username || 'U'}
                            size="md"
                            isVerified={u.is_verified}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-syne font-bold text-white truncate">@{u.username}</p>
                              {u.is_verified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
                              {u.is_admin && <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            </div>
                            <p className="text-xs text-textPrimary/35 truncate font-dm-sans">{u.full_name || '—'}</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${
                            u.account_type === 'creator'
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              : 'bg-white/5 border-white/10 text-textPrimary/50'
                          }`}>
                            {u.account_type}
                          </span>
                          <span className="text-xs text-amber-400/70 font-mono font-bold">✨{u.credits ?? 0}</span>
                          <span className="text-[10px] text-textPrimary/25 font-dm-sans hidden md:inline">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleVerifyToggle(u.id)}
                            title={u.is_verified ? 'Remove verification' : 'Verify user'}
                            className={`p-2 rounded-xl border transition-all duration-200 ${
                              u.is_verified
                                ? 'bg-blue-500/15 border-blue-500/25 text-blue-400 hover:bg-blue-500/25'
                                : 'bg-white/[0.04] border-white/[0.08] text-textPrimary/30 hover:text-blue-400 hover:border-blue-500/25'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdminToggle(u.id)}
                            title={u.is_admin ? 'Remove admin' : 'Make admin'}
                            className={`p-2 rounded-xl border transition-all duration-200 ${
                              u.is_admin
                                ? 'bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/25'
                                : 'bg-white/[0.04] border-white/[0.08] text-textPrimary/30 hover:text-red-400 hover:border-red-500/25'
                            }`}
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCreditModal({ userId: u.id, username: u.username })}
                            title="Grant credits"
                            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-textPrimary/30 hover:text-amber-400 hover:border-amber-500/25 transition-all duration-200"
                          >
                            <Gift className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {usersMeta.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-textPrimary/50 hover:text-white hover:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-dm-sans text-textPrimary/50">
                      Page <span className="text-white font-bold">{page}</span> of {usersMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(usersMeta.totalPages, p + 1))}
                      disabled={page >= usersMeta.totalPages}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-textPrimary/50 hover:text-white hover:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Credit Grant Modal */}
                <AnimatePresence>
                  {creditModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                      onClick={() => setCreditModal(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#0D0B1A] border border-white/10 rounded-3xl p-6 shadow-2xl"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-syne font-bold text-white">Grant Credits</h3>
                          <button onClick={() => setCreditModal(null)} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4 text-textPrimary/50" />
                          </button>
                        </div>
                        <p className="text-sm text-textPrimary/50 mb-4 font-dm-sans">
                          Grant credits to <span className="text-primary font-bold">@{creditModal.username}</span>
                        </p>
                        <div className="space-y-3 mb-6">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl text-sm text-textPrimary placeholder:text-textPrimary/25 focus:outline-none focus:border-primary/40 font-dm-sans"
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={creditDesc}
                            onChange={(e) => setCreditDesc(e.target.value)}
                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl text-sm text-textPrimary placeholder:text-textPrimary/25 focus:outline-none focus:border-primary/40 font-dm-sans"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setCreditModal(null)}
                            className="flex-1 py-3 rounded-2xl bg-white/[0.05] text-textPrimary/60 text-sm font-syne font-bold hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleGrantCredits}
                            disabled={!creditAmount || Number(creditAmount) <= 0}
                            className="flex-1 py-3 rounded-2xl bg-primary/20 text-primary text-sm font-syne font-bold hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-primary/20"
                          >
                            Grant ✨{creditAmount || 0}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ──────── REPORTS TAB ──────── */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse border border-white/5" />
                    ))}
                  </div>
                ) : reports.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-24"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-5">
                      <Check className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-syne font-bold text-white mb-2">All Clear</h3>
                    <p className="text-textPrimary/30 font-dm-sans text-sm max-w-xs mx-auto">
                      No pending reports. The community is in harmony.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((r: any, i: number) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-5 bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl hover:bg-white/[0.05] transition-all duration-300"
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Report Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-1.5 bg-red-500/10 rounded-lg">
                                <FileWarning className="w-4 h-4 text-red-400" />
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-textPrimary/40 font-dm-sans">By</span>
                                <div className="flex items-center gap-1.5">
                                  <Avatar src={r.reporter?.avatar_url} username={r.reporter?.username || '?'} size="xs" />
                                  <span className="text-white font-syne font-bold text-xs">@{r.reporter?.username || 'unknown'}</span>
                                </div>
                                {r.reported_user && (
                                  <>
                                    <span className="text-textPrimary/20">→</span>
                                    <div className="flex items-center gap-1.5">
                                      <Avatar src={r.reported_user?.avatar_url} username={r.reported_user?.username || '?'} size="xs" />
                                      <span className="text-red-400/80 font-syne font-bold text-xs">@{r.reported_user?.username || 'unknown'}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-textPrimary/60 font-dm-sans mb-2 line-clamp-2">
                              {r.reason || 'No reason provided'}
                            </p>
                            <p className="text-[10px] text-textPrimary/25 font-dm-sans">
                              {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-start gap-2 shrink-0">
                            <button
                              onClick={() => handleResolve(r.id, 'dismiss')}
                              title="Dismiss"
                              className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-textPrimary/40 text-xs font-syne font-bold hover:bg-white/10 hover:text-textPrimary transition-all"
                            >
                              Dismiss
                            </button>
                            {r.reported_post_id && (
                              <button
                                onClick={() => handleResolve(r.id, 'delete_post')}
                                title="Delete Post"
                                className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-syne font-bold hover:bg-amber-500/20 transition-all"
                              >
                                Delete Post
                              </button>
                            )}
                            <button
                              onClick={() => handleResolve(r.id, 'delete_user')}
                              title="Delete User"
                              className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-syne font-bold hover:bg-red-500/20 transition-all"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ──────── SOC & CRYPTOGRAPHIC LEDGER TAB ──────── */}
            {activeTab === 'soc' && (
              <motion.div
                key="soc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* 1. Cryptographic Ledger Integrity Engine Card */}
                <div className="p-6 bg-white/[0.04] backdrop-blur-xl border border-emerald-500/20 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest">
                        <Terminal className="w-4 h-4" />
                        <span>Tamper-Evident SHA-256 Ledger</span>
                      </div>
                      <h2 className="text-xl font-syne font-bold text-white">Cryptographic Audit Chain</h2>
                      <p className="text-xs text-textPrimary/50 max-w-xl font-dm-sans">
                        Every security event and financial ledger adjustment is cryptographically chained to its predecessor using SHA-256. Any direct tampering in the PostgreSQL database breaks the hash chain mathematically.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={handleVerifyChain}
                        disabled={verifyingAudit}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-syne font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${verifyingAudit ? 'animate-spin' : ''}`} />
                        <span>{verifyingAudit ? 'Verifying Hashes...' : 'Run Integrity Audit'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Results Panel */}
                  {auditResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-6 p-4 rounded-2xl border ${
                        auditResult.verified 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      } flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs`}
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="font-bold text-sm">
                            {auditResult.verified ? 'CHAIN INTEGRITY 100% INTACT' : 'SECURITY ALERT: TAMPERING DETECTED'}
                          </p>
                          <p className="text-[11px] opacity-75">
                            {auditResult.verified 
                              ? `All ${auditResult.total_records} cryptographic blocks verified sequentially from Genesis root.`
                              : auditResult.error}
                          </p>
                        </div>
                      </div>
                      {auditResult.chain_head && (
                        <div className="text-[10px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 truncate max-w-xs">
                          HEAD: {auditResult.chain_head.slice(0, 20)}...
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 2. Defensive Security Posture Overview (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-mono font-bold text-textPrimary/40 uppercase">Authorization</span>
                    <p className="text-sm font-syne font-bold text-white mt-1">Zero-Trust RLS</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Enforced by Trigger
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-mono font-bold text-textPrimary/40 uppercase">Confidentiality</span>
                    <p className="text-sm font-syne font-bold text-white mt-1">E2EE Messaging</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      ECDH P-256 / AES-GCM
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-mono font-bold text-textPrimary/40 uppercase">Identity Security</span>
                    <p className="text-sm font-syne font-bold text-white mt-1">MFA at Rest</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      AES-256 Encrypted TOTP
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-mono font-bold text-textPrimary/40 uppercase">Auditability</span>
                    <p className="text-sm font-syne font-bold text-white mt-1">Hash Chaining</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      SHA-256 Ledger
                    </span>
                  </div>
                </div>

                {/* 3. Real-Time Threat & Security Audit Log Stream */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent" />
                      <h3 className="text-base font-syne font-bold text-white">Live SIEM Audit Stream</h3>
                    </div>
                    <span className="text-xs font-mono text-textPrimary/40">Latest {auditLogs.length} events</span>
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-white/[0.02] rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-textPrimary/30 font-dm-sans text-sm">
                      No security audit events recorded yet. Run database master schema migration to begin telemetry collection.
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono text-xs overflow-x-auto">
                      {auditLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-2xl gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                              log.severity === 'CRITICAL' 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : log.severity === 'WARNING'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {log.severity}
                            </span>
                            <span className="text-white font-bold truncate">{log.event_type}</span>
                            {log.actor && (
                              <span className="text-textPrimary/50 text-[11px] truncate">
                                @{log.actor.username}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-textPrimary/40 text-[11px]">
                            {log.ip_address && <span className="hidden sm:inline">{log.ip_address}</span>}
                            <span className="text-[10px] text-accent/60 bg-accent/5 px-2 py-0.5 rounded-md border border-accent/10">
                              #{log.id} • {log.entry_hash ? log.entry_hash.slice(0, 10) + '...' : ''}
                            </span>
                            <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  )
}

export default AdminPage
