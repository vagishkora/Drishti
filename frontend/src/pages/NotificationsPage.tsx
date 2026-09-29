import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, Heart, MessageCircle, User, Check, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { Button } from '../components/ui/Button'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'
import { supabase } from '../lib/supabase'

/**
 * NotificationsPage.tsx — Drishti Notification Centre
 * Architectural Role: Realtime notification display with Supabase Realtime.
 * Supports: like, comment, follow, subscription, reply notification types.
 */

const icons: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: User,
  subscription: Sparkles,
  reply: MessageCircle,
}

const messages: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  subscription: 'became a premium subscriber',
  reply: 'replied to your comment',
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    // Initial fetch
    api.getNotifications(user.id).then(setNotifications).finally(() => setLoading(false))

    // Realtime listener
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, (payload) => {
        // Prepend new notification
        setNotifications(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const markAllRead = async () => {
    if (!user) return
    await api.markNotificationsRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-textPrimary flex items-center gap-2">
            <Bell className="w-6 h-6" /> Notifications
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="w-4 h-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-surface rounded-2xl animate-pulse border border-white/5" />)}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 px-12 text-center"
          >
            <div className="w-24 h-24 mb-8 relative">
              <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-full h-full border-2 border-dashed border-white/10 rounded-full flex items-center justify-center">
                 <Bell className="w-8 h-8 text-textPrimary/20" />
              </div>
            </div>
            <h2 className="text-2xl font-syne font-extrabold text-white mb-3 uppercase tracking-widest">Your universe is quiet</h2>
            <p className="text-textPrimary/40 font-dm-sans italic max-w-xs mb-8">No cinematic interactions recorded yet. Why not explore the expanding universe?</p>
            <Link to="/search">
              <Button className="rounded-full px-8 bg-accent text-background font-bold uppercase tracking-widest text-xs">Explore Creators</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const Icon = icons[n.type] || Bell
              const isFollow = n.type === 'follow'
              
              return (
                <motion.div key={n.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ x: 4 }}
                  className={`group flex items-center gap-4 px-5 py-4 rounded-r-[24px] border border-l-4 transition-all duration-500
                    ${n.is_read 
                      ? 'bg-white/[0.01] border-white/5 border-l-transparent opacity-40 grayscale-[0.8]' 
                      : 'bg-accent/5 border-white/10 border-l-accent shadow-[20px_0_40px_rgba(245,200,66,0.03)]'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative transition-all duration-500
                    ${n.is_read ? 'bg-white/5 text-textPrimary/20' : 'bg-accent/20 text-accent scale-110 shadow-[0_0_20px_rgba(245,200,66,0.2)]'}`}>
                    <Icon className={`w-5 h-5 ${!n.is_read && 'animate-pulse'}`} />
                    {!n.is_read && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />}
                  </div>
 
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] leading-tight text-textPrimary">
                      {n.sender ? (
                        <Link to={`/profile/${n.sender.username}`} className="font-syne font-bold hover:text-accent transition-colors">
                          {n.sender.username}
                        </Link>
                      ) : 'Someone'}{' '}
                      <span className="text-textPrimary/60 font-medium">{messages[n.type] || 'interacted with you'}</span>
                    </p>
                    <p className="text-[10px] text-textPrimary/30 font-bold uppercase tracking-widest mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
 
                  {isFollow && (
                    <FollowBackButton followerId={n.sender_id} />
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}

const FollowBackButton: React.FC<{ followerId: string }> = ({ followerId }) => {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      api.isFollowing(user.id, followerId).then(setFollowing).finally(() => setLoading(false))
    }
  }, [user, followerId])

  const handleFollow = async () => {
    if (!user || loading || following) return
    setLoading(true)
    try {
      await api.follow(user.id, followerId)
      setFollowing(true)
      toast.success('Followed back!')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="w-20 h-8 bg-white/5 rounded-full animate-pulse" />
  if (following) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-[11px] font-bold text-textPrimary/30 uppercase tracking-widest">
      <Check className="w-3 h-3" /> Following
    </div>
  )

  return (
    <button
      onClick={handleFollow}
      className="px-4 py-1.5 bg-accent text-background rounded-full text-[11px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-accent/20"
    >
      Follow Back
    </button>
  )
}

export default NotificationsPage
