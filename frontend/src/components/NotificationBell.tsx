/**
 * NotificationBell.tsx — Drishti Notification Indicator
 * Architectural Role: Navbar notification badge with realtime updates.
 */
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as api from '../lib/supabaseApi'

export const NotificationBell = () => {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return
    api.getUnreadCount(user.id).then(setCount)

    const channel = supabase
      .channel('notif-bell-count')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => setCount(c => c + 1))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return (
    <Link to="/notifications" className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
      <Bell className="w-5 h-5 text-textPrimary/70" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
