import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Coins, Zap } from 'lucide-react'
import { Button } from './ui/Button'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'
import { useAuth } from '../contexts/AuthContext'

/**
 * GiftingModal.tsx
 * Architectural Role: Monetization bridge. Allows sending credits to creators.
 * Features: Multi-amount selection, real-time balance check, success animation.
 */

interface GiftingModalProps {
  isOpen: boolean
  onClose: () => void
  creatorId: string
  creatorUsername: string
}

const GIFT_AMOUNTS = [10, 50, 100, 500]

export const GiftingModal: React.FC<GiftingModalProps> = ({ isOpen, onClose, creatorId, creatorUsername }) => {
  const { user, profile, refreshProfile } = useAuth()
  const [selectedAmount, setSelectedAmount] = useState<number>(50)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSendGift = async () => {
    if (!user || !profile) return
    if (profile.credits < selectedAmount) {
      toast.error('Insufficient credits. Top up in Get Credits.')
      return
    }

    setLoading(true)
    try {
      await api.sendGift(user.id, creatorId, selectedAmount)
      await refreshProfile()
      setSuccess(true)
      toast.success(`Sent ${selectedAmount} credits to @${creatorUsername}!`)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 2000)
    } catch (err: any) {
      toast.error(err.message || 'Gifting failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-surface/50 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            {/* Success state overlay */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-10 bg-accent flex flex-col items-center justify-center text-background p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                    className="w-20 h-20 bg-background/20 rounded-full flex items-center justify-center mb-4"
                  >
                    <Star className="w-10 h-10 fill-current" />
                  </motion.div>
                  <h2 className="text-2xl font-syne font-extrabold uppercase mb-2">Gift Sent!</h2>
                  <p className="text-sm font-bold opacity-80">You're fueling the universe.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-syne font-extrabold text-white tracking-tight">Send Support</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-accent" />
              </div>
              <p className="text-textPrimary/60 text-sm font-dm-sans italic mb-1">Supporting</p>
              <p className="text-lg font-syne font-bold text-white uppercase tracking-wider">@{creatorUsername}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {GIFT_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1
                    ${selectedAmount === amount 
                      ? 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(245,200,66,0.1)]' 
                      : 'bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  <span className={`text-xl font-syne font-extrabold ${selectedAmount === amount ? 'text-accent' : 'text-white'}`}>
                    {amount}
                  </span>
                  <span className="text-[10px] font-bold text-textPrimary/40 uppercase tracking-widest">Credits</span>
                </button>
              ))}
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-8 flex items-center justify-between border border-white/5">
              <span className="text-xs text-textPrimary/40 font-bold uppercase tracking-widest">Your Balance</span>
              <div className="flex items-center gap-2">
                <span className="text-accent font-syne font-bold">{profile?.credits || 0}</span>
                <Coins className="w-4 h-4 text-accent" />
              </div>
            </div>

            <Button
              onClick={handleSendGift}
              disabled={loading || (profile?.credits || 0) < selectedAmount}
              className="w-full py-6 rounded-2xl text-xs font-syne font-bold uppercase tracking-widest bg-accent text-background shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform active:scale-95"
            >
              {loading ? <Zap className="w-5 h-5 animate-pulse" /> : `Send ${selectedAmount} Credits`}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
