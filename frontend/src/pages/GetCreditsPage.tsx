import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, Zap, History, Star, Loader2, Crown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'
import { toast } from '../lib/toast'
import { CREDIT_PACKS, createOrder, openCheckout, verifyPayment } from '../lib/razorpay'
import * as api from '../lib/supabaseApi'

/**
 * GetCreditsPage.tsx — Drishti Credits System + Razorpay Integration
 * Architectural Role: Two-layer payment interface.
 * Layer 1: Razorpay handles real money (INR)
 * Layer 2: Credits mapped from INR and stored in Supabase
 *
 * Credit packs: ₹49 = 500, ₹99 = 1200, ₹199 = 2500
 * Test card: 4111 1111 1111 1111
 */
const GetCreditsPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [txLoading, setTxLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.getTransactionHistory(user.id).then(setTransactions).finally(() => setTxLoading(false))
  }, [user, profile?.credits])

  const handleBuy = async (packIndex: number) => {
    if (!user || !profile) return
    const pack = CREDIT_PACKS[packIndex]
    setLoading(pack.name)

    try {
      // 1. Create Razorpay order via Edge Function
      const order = await createOrder(pack, user.id)

      // 2. Open Razorpay checkout popup
      openCheckout(
        order.order_id,
        order.amount,
        profile.full_name || profile.username,
        user.email || '',
        async (response) => {
          try {
            // 3. Verify payment via Edge Function
            await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              pack.credits,
              user.id
            )
            toast.success(`${pack.credits} Credits Added! 🎉`)
            await refreshProfile()
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed')
          } finally {
            setLoading(null)
          }
        },
        (err) => {
          toast.error(err?.description || err?.message || 'Payment failed')
          setLoading(null)
        }
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order')
      setLoading(null)
    }
  }

  return (
    <PageWrapper className="min-h-[70vh]">
      <div className="max-w-3xl mx-auto">
        {/* Header + Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10">
          <div className="w-20 h-20 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coins className="w-9 h-9 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-textPrimary mb-1">Drishti Credits</h1>
          <p className="text-textPrimary/50 text-sm mb-6">Use credits to subscribe to creators and unlock premium content</p>

          <div className="bg-surface border border-white/5 rounded-2xl p-6 inline-block min-w-[200px]">
            <p className="text-sm text-textPrimary/50 mb-1">Current Balance</p>
            <p className="text-5xl font-display font-bold text-accent">{profile?.credits ?? '...'}</p>
            <p className="text-xs text-textPrimary/30 mt-1">credits</p>
          </div>
        </motion.div>

        {/* Credit Packs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {CREDIT_PACKS.map((pack, i) => (
            <div key={pack.name} className={`relative bg-surface border rounded-2xl p-6 text-center transition-all hover:border-primary/40 ${pack.popular ? 'border-primary/30 ring-1 ring-primary/20' : 'border-white/5'}`}>
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                  <Star className="w-3 h-3" /> POPULAR
                </span>
              )}
              <h3 className="text-sm font-semibold text-textPrimary mb-2">{pack.name}</h3>
              <p className="text-3xl font-display font-bold text-accent mb-1">{pack.credits}</p>
              <p className="text-xs text-textPrimary/40 mb-4">credits</p>
              <p className="text-lg font-bold text-textPrimary mb-4">{pack.displayPrice}</p>
              <Button
                onClick={() => handleBuy(i)}
                disabled={!!loading}
                className={`w-full ${pack.popular ? 'shadow-lg shadow-primary/20' : ''}`}
              >
                {loading === pack.name
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-4 h-4 mr-1.5" /> Buy Now</>
                }
              </Button>
            </div>
          ))}
        </motion.div>

        {/* Subscription info */}
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-8 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-textPrimary/60">Subscribe to a creator</span>
            <span className="text-primary font-semibold">100 credits / month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-textPrimary/60">Test card</span>
            <span className="text-textPrimary/40 font-mono text-xs">4111 1111 1111 1111</span>
          </div>
        </div>

        {/* Transaction History */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="flex items-center gap-2 text-lg font-display font-bold text-textPrimary mb-4">
            <History className="w-5 h-5 text-textPrimary/50" /> Transaction History
          </h2>

          {txLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-textPrimary/30 text-sm">No transactions yet. Buy credits to get started!</div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => {
                const isPositive = tx.amount > 0
                let Icon = Zap
                if (tx.type === 'gift' || tx.type === 'gift_income') Icon = Star
                if (tx.type === 'subscription' || tx.type === 'subscription_income') Icon = Crown
                
                return (
                  <div key={tx.id} className="group flex items-center justify-between bg-surface/40 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-syne font-bold text-textPrimary leading-tight">
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1).replace('_', ' ')}
                        </p>
                        <p className="text-[10px] text-textPrimary/40 font-bold uppercase tracking-widest mt-1">
                          {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-syne font-extrabold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-[10px] text-textPrimary/20 font-bold uppercase tracking-widest">credits</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  )
}

export default GetCreditsPage
