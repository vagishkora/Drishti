import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Video as VideoIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { VideoCard } from './VideoCard'

interface Stats {
  totalViews: number
  subscribers: number
  revenue: number
}

export const CreatorDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ totalViews: 0, subscribers: 0, revenue: 0 })
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadDashboard = async () => {
      // 1. Fetch Creator's Videos
      const { data: vids } = await supabase
        .from('videos')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
      
      const views = (vids || []).reduce((acc, v) => acc + (v.views_count || 0), 0)
      
      // 2. Fetch Active Subscriptions bridging natively from Auth user
      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())

      setVideos(vids || [])
      setStats({
        totalViews: views,
        subscribers: subCount || 0,
        // Mock revenue simulation: ₹149 per sub mapped for Indian emerging market logic
        revenue: (subCount || 0) * 149
      })
      setLoading(false)
    }

    loadDashboard()
  }, [user])

  const StatCard = ({ title, value, icon: Icon, trend }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-surface border border-white/5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-colors shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl text-primary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        {trend && <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">{trend}</span>}
      </div>
      <div>
        <p className="text-textPrimary/60 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-display font-bold text-textPrimary tracking-tight">{value}</h3>
      </div>
      
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    </motion.div>
  )

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="h-12 w-64 bg-surface rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-surface rounded-2xl shadow-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div>
        <h1 className="text-4xl font-display font-bold mb-2 text-textPrimary">Creator Hub</h1>
        <p className="text-textPrimary/60 font-body text-lg">Manage your premium content and audience metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Subscribers" value={stats.subscribers} icon={Users} trend="+12% this month" />
        <StatCard title="Total Views" value={stats.totalViews.toLocaleString()} icon={TrendingUp} trend="+4.3K" />
        <StatCard title="Estimated Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={DollarSign} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-semibold">Your Library</h2>
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium flex items-center gap-2 border border-primary/20">
            <VideoIcon size={16} />
            {videos.length} Videos Available
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-textPrimary/40 border-2 border-dashed border-white/5 rounded-3xl bg-surface/30">
              <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-display text-textPrimary/60 mb-2">No Content Yet</h3>
              <p className="text-sm">Head to the studio to record your first premium video!</p>
            </div>
          ) : (
            videos.map(v => (
              <VideoCard 
                key={v.id} 
                title={v.title} 
                views={v.views_count} 
                thumbnailUrl={v.thumbnail_url} 
                isPremium={v.is_premium} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
