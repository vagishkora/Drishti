import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Lock, ShieldCheck, AlertCircle } from 'lucide-react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { SimulatedPaymentGateway } from '../lib/paymentGateway'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface PaymentFormProps {
  creatorId: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ creatorId, amount, onSuccess, onCancel }) => {
  const { user } = useAuth()
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111')
  const [expiry, setExpiry] = useState('12/25')
  const [cvv, setCvv] = useState('123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
        setError('Must be logged in to subscribe')
        return
    }
    setError('')
    setLoading(true)

    try {
      // 1. Process via Pluggable Gateway
      const result = await SimulatedPaymentGateway.processPayment(
        { amount, currency: 'INR', creatorId },
        cardNumber,
        cvv,
        expiry
      )

      if (!result.success || !result.transactionId) {
        throw new Error(result.error || "Remote gateway flagged transaction anomaly.")
      }

      // 2. Propagate to transactions log
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: amount,
        currency: 'INR',
        status: 'succeeded',
        payment_method: "test_card_4111_simulation"
      })

      if (txError) throw new Error(`Database Integrity Issue: ${txError.message}`)

      // 3. Provision Access
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30) // Rolling 30 day sub

      const { error: subError } = await supabase.from('subscriptions').upsert({
        subscriber_id: user.id,
        creator_id: creatorId,
        status: 'active',
        current_period_end: currentPeriodEnd.toISOString()
      }, { onConflict: 'subscriber_id,creator_id' })

      if (subError) throw new Error(`Subscription Provisioning Failed: ${subError.message}`)

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-surface border border-white/5 rounded-2xl w-full max-w-sm mx-auto shadow-2xl relative"
    >
      <div className="absolute -top-4 -right-4 bg-accent text-background px-3 py-1 font-premium italic text-sm rounded-bl-xl rounded-tr-xl font-bold">
        Secure Paywall
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-textPrimary">Checkout</h2>
          <p className="text-xs text-textPrimary/50 font-body">Powered by Simulated Abstraction</p>
        </div>
      </div>

      <div className="bg-background/80 p-5 rounded-xl mb-6 border border-white/5 flex items-center justify-between">
        <p className="text-sm text-textPrimary/70">Total Due</p>
        <p className="text-3xl font-display text-textPrimary font-bold">₹{amount}</p>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex gap-2.5 items-start font-medium">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <CreditCard className="absolute left-3 top-[14px] w-4 h-4 text-textPrimary/40" />
            <Input 
              required
              className="pl-10 font-mono tracking-widest text-sm"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
            />
          </div>
          <div className="flex gap-3">
            <Input 
              required
              className="w-1/2 text-center"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/YY"
            />
            <Input 
              required
              type="password"
              className="w-1/2 text-center tracking-widest"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              placeholder="CVV"
            />
          </div>
        </div>
        
        <p className="text-[10px] text-textPrimary/40 text-center flex items-center justify-center gap-1.5 mt-2 uppercase tracking-wider">
          <Lock className="w-2.5 h-2.5" /> Research Test Environment
        </p>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : `Pay ₹${amount}`}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
