/**
 * Navbar.tsx — Drishti Navigation
 * Architectural Role: Desktop sidebar + mobile top bar.
 */
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Upload, Bell, User, Settings, LogOut, BarChart3, Coins, MessageSquare, LayoutDashboard, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { CreditsBadge } from './CreditsBadge'
import { NotificationBell } from './NotificationBell'
import { Avatar } from './Avatar'
import { DrishtiLogo } from './DrishtiLogo'

export const Navbar = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Explore' },
    {to: '/upload', icon: Upload, label: 'Create' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
    ...(profile?.account_type === 'creator' ? [{ to: '/studio', icon: BarChart3, label: 'Studio' }] : []),
    ...(profile?.is_admin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
    { to: '/credits', icon: Coins, label: 'Credits' },
  ]

  return (
    <>
      {/* Desktop Sidebar — Fixed 240px Cinematic Glass */}
      <aside className="hidden md:flex flex-col w-[240px] h-screen shrink-0 sticky top-0 border-r border-white/5 bg-gradient-to-b from-[#0D0B1A] to-[#07070E] z-50">
        <div className="absolute inset-0 bg-[#0D0B1A]/40 backdrop-blur-2xl -z-10" />
        
        {/* Logo Section */}
        <Link to="/" className="p-8 pb-8 flex flex-col items-start group">
          <DrishtiLogo showText scale={1} className="pl-1" />
          <div className="w-full h-px bg-white/[0.03] mt-8" />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                h-11 flex items-center gap-4 px-4 rounded-xl text-[15px] font-medium transition-all duration-200 group relative
                ${isActive 
                  ? 'text-[#A78BFA] bg-[#7C3AED]/15' 
                  : 'text-textPrimary/50 hover:text-textPrimary hover:bg-white/5 hover:scale-[1.02]'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'fill-[#7C3AED]/20 stroke-[#A78BFA]' : 'stroke-current'}`} />
                  <span className="font-syne">{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute left-0 w-[3px] h-6 bg-[#7C3AED] rounded-r-full shadow-[0_0_15px_rgba(124,58,237,0.8)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info & persistent Footer Actions */}
        <div className="mt-auto flex flex-col">
          <div className="mx-4 h-px bg-white/5 mb-4" />
          
          <Link to="/profile" className="mx-4 flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group mb-2">
            <Avatar 
              src={profile?.avatar_url} 
              username={profile?.full_name || profile?.username || user?.email} 
              size="md" 
              className="w-11 h-11 ring-2 ring-white/5 ring-offset-2 ring-offset-[#07070E] group-hover:ring-accent/40 transition-all"
              isVerified={profile?.is_verified}
              isPremium={profile?.account_type === 'creator'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold font-syne text-textPrimary truncate">{profile?.username || 'User'}</p>
              <p className="text-[11px] text-textPrimary/30 truncate">View Profile</p>
            </div>
          </Link>

          <div className="px-4 pb-6 space-y-1">
            <Link to="/settings" className="h-10 flex items-center gap-3 px-4 rounded-xl text-sm text-textPrimary/50 hover:text-textPrimary hover:bg-white/5 transition-all group">
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" /> <span className="font-syne">Settings</span>
            </Link>
            <button onClick={handleLogout} className="h-10 flex items-center gap-3 px-4 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-all w-full text-left group">
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> <span className="font-syne text-red-400/80">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header (Top) — Glass Mode */}
      <header className="fixed top-0 left-0 right-0 z-40 md:hidden bg-[#07070E]/80 backdrop-blur-2xl border-b border-white/5 px-4 h-14 flex items-center">
        <div className="w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <DrishtiLogo scale={0.8} />
            <span className="text-xl font-syne font-bold text-textPrimary tracking-tight">Drishti</span>
          </Link>
          <div className="flex items-center gap-2">
            <CreditsBadge />
            <NotificationBell />
            <Link to="/settings" className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-full border border-white/5">
              <Settings className="w-4 h-4 text-textPrimary/60" />
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

export default Navbar
