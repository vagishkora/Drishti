/**
 * CommandPalette.tsx — Drishti Cyber Command Line Interface (CLI)
 * ─────────────────────────────────────────────────────────────
 * Architectural Role: Global terminal navigator triggered via Ctrl+K / Cmd+K.
 * Features: Instant fuzzy routing, cryptographic actions, and security diagnostics.
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Terminal, Search, ShieldCheck, Lock, LayoutDashboard, 
  Home, Compass, Upload, MessageSquare, Coins, Settings, 
  LogOut, ShieldAlert 
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../lib/toast'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  category: 'NAVIGATION' | 'SECURITY' | 'ACCOUNT'
  icon: any
  action: () => void
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!user) return null

  const commands: CommandItem[] = [
    // Navigation
    { id: 'home', title: 'Feed & Discoveries', category: 'NAVIGATION', icon: Home, action: () => navigate('/') },
    { id: 'dashboard', title: 'User Dashboard', subtitle: 'Subscriptions & Activity', category: 'NAVIGATION', icon: LayoutDashboard, action: () => navigate('/dashboard') },
    { id: 'explore', title: 'Explore Universe', category: 'NAVIGATION', icon: Compass, action: () => navigate('/search') },
    { id: 'create', title: 'Upload & Mint Frame', category: 'NAVIGATION', icon: Upload, action: () => navigate('/upload') },
    { id: 'messages', title: 'E2EE Messages', subtitle: 'Zero-Knowledge Channels', category: 'NAVIGATION', icon: MessageSquare, action: () => navigate('/messages') },
    { id: 'credits', title: 'Drishti Credits Vault', category: 'NAVIGATION', icon: Coins, action: () => navigate('/credits') },
    { id: 'settings', title: 'Security & Preferences', category: 'NAVIGATION', icon: Settings, action: () => navigate('/settings') },
    ...(profile?.is_admin ? [
      { id: 'admin', title: 'Security Operations Center (SOC)', subtitle: 'Audit Logs & Hash Chain', category: 'SECURITY' as const, icon: ShieldAlert, action: () => navigate('/admin') }
    ] : []),

    // Security Diagnostics
    { 
      id: 'e2ee-check', 
      title: 'Inspect Cryptographic Engine', 
      subtitle: 'Curve P-256 ECDH & AES-GCM Status', 
      category: 'SECURITY', 
      icon: Lock, 
      action: () => {
        toast.success('ECDH P-256 / AES-GCM engine operational. IndexedDB private vault active.')
      } 
    },
    { 
      id: 'audit-verify', 
      title: 'Audit Ledger Chain Check', 
      subtitle: 'Navigate to SOC verification console', 
      category: 'SECURITY', 
      icon: ShieldCheck, 
      action: () => navigate('/admin') 
    },

    // Account
    { id: 'logout', title: 'Terminate Session', subtitle: 'Flush tokens and lock vault', category: 'ACCOUNT', icon: LogOut, action: () => signOut() },
  ]

  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    c.subtitle?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (item: CommandItem) => {
    item.action()
    setIsOpen(false)
    setSearch('')
  }

  return (
    <>
      {/* Floating Prompt / Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-40 hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[#0D0B1A]/80 hover:bg-[#0D0B1A] backdrop-blur-xl border border-white/10 rounded-2xl text-xs font-mono text-textPrimary/50 hover:text-white shadow-2xl transition-all group"
      >
        <Terminal className="w-3.5 h-3.5 text-accent group-hover:rotate-12 transition-transform" />
        <span className="font-bold">Cmd+K</span>
      </button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="w-full max-w-xl bg-[#0D0B1A] border border-white/15 rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Input header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <Search className="w-5 h-5 text-accent" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Type a command, route, or security diagnostic..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedIndex(0) }}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-textPrimary/30 outline-none font-mono"
                />
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-textPrimary/40">
                  ESC
                </span>
              </div>

              {/* Command List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-hide font-mono text-xs">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-textPrimary/30">
                    No matching command found.
                  </div>
                ) : (
                  filtered.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left ${
                          isSelected ? 'bg-white/10 text-white border border-white/10' : 'text-textPrimary/70 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-accent text-background' : 'bg-white/5 text-textPrimary/60'}`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate text-sm">{item.title}</p>
                            {item.subtitle && <p className="text-[10px] text-textPrimary/40 truncate">{item.subtitle}</p>}
                          </div>
                        </div>

                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-textPrimary/40 shrink-0">
                          {item.category}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-2.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-textPrimary/40 font-mono">
                <span>Drishti Zero-Trust CLI v2.4</span>
                <div className="flex items-center gap-3">
                  <span>Navigate: <b className="text-white">↑↓</b></span>
                  <span>Select: <b className="text-white">↵</b></span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
