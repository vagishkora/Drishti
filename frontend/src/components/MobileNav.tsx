/**
 * MobileNav.tsx — Drishti Bottom Bar
 * Architectural Role: Core navigation for small screens.
 */
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Plus, User, LayoutDashboard } from 'lucide-react'

export const MobileNav = () => {
  const items = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Explore' },
    { to: '/upload', icon: Plus, label: 'Create', isSpecial: true },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Cinematic Glass Background */}
      <div className="absolute inset-0 bg-[#07070E]/95 backdrop-blur-2xl border-t border-white/5" />
      
      <nav className="relative flex items-center justify-around h-[72px] px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `
              flex flex-col items-center justify-center relative w-12 h-12 transition-all
              ${isActive ? 'text-[#7C3AED]' : 'text-textPrimary/40'}
            `}
          >
            {({ isActive }) => (
              <>
                {item.isSpecial ? (
                  <div className="w-12 h-12 bg-[#7C3AED] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] transform active:scale-90 transition-transform -mt-2 border-4 border-[#07070E]">
                    <Plus className="w-6 h-6 text-white stroke-[3px]" />
                  </div>
                ) : (
                  <item.icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : 'hover:scale-110'}`} />
                )}
                
                {isActive && !item.isSpecial && (
                  <motion.div 
                    layoutId="mobileActiveDot"
                    className="absolute -bottom-1 w-1 h-1 bg-[#7C3AED] rounded-full shadow-[0_0_8px_#7C3AED]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      
      {/* Safe Area Spacer (for modern phones) */}
      <div className="h-[env(safe-area-inset-bottom)] bg-[#07070E]/95" />
    </div>
  )
}
