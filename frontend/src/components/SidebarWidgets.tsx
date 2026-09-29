import { Users, Video, UserCheck, Activity } from 'lucide-react'
import useSWR from 'swr'
import { supabase } from '../lib/supabase'

export const ActiveNowWidget = () => {
  // Mock active status for bot accounts as requested in FIX 9
  const activeBots = [
    { id: '1', username: 'arjun_rawatt', avatar_url: 'https://picsum.photos/seed/arjun/100/100' },
    { id: '2', username: 'priya_visuals', avatar_url: 'https://picsum.photos/seed/priya/100/100' },
    { id: '3', username: 'rohit_pixel', avatar_url: 'https://picsum.photos/seed/rohit/100/100' }
  ]

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Activity className="w-3 h-3 text-emerald-500" />
        <h3 className="text-[9px] font-syne font-bold text-textPrimary/40 uppercase tracking-[0.2em]">
          ACTIVE NOW
        </h3>
      </div>
      <div className="space-y-3">
        {activeBots.map(bot => (
          <div key={bot.id} className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <img src={bot.avatar_url} className="w-8 h-8 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border border-white/10" alt="" />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <span className="text-[12px] font-syne font-medium text-textPrimary/60 group-hover:text-textPrimary transition-colors">
              {bot.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const UniverseStatsWidget = () => {
  // Fetching real stats from Supabase
  const { data: stats } = useSWR('universe-stats', async () => {
    const { count: posts } = await supabase.from('posts').select('*', { count: 'exact', head: true })
    const { count: creators } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_type', 'creator')
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true })
    return { posts: posts || 0, creators: creators || 0, users: users || 0 }
  })

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
      <h3 className="text-[9px] font-syne font-bold text-textPrimary/40 uppercase tracking-[0.2em] mb-4 px-1">
        DRISHTI UNIVERSE
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Video className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-textPrimary leading-none">{stats?.posts || '...'}</p>
            <p className="text-[9px] text-textPrimary/30 uppercase tracking-widest mt-1">Total Frames</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-textPrimary leading-none">{stats?.creators || '...'}</p>
            <p className="text-[9px] text-textPrimary/30 uppercase tracking-widest mt-1">Founding Creators</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-textPrimary leading-none">{stats?.users || '...'}</p>
            <p className="text-[9px] text-textPrimary/30 uppercase tracking-widest mt-1">Universe Population</p>
          </div>
        </div>
      </div>
    </div>
  )
}
