import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Crown, CheckCircle } from 'lucide-react'
import { PaymentForm } from '../components/PaymentForm'
import { PageWrapper } from '../components/PageWrapper'

/**
 * Subscribe Page
 * Renders the PaymentForm for the Simulated Payment Gateway Module.
 * Accepts ?creator=<uuid> query param to identify the target creator.
 */
const SubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const creatorId = searchParams.get('creator') || ''
  const [subscribed, setSubscribed] = useState(false)

  if (subscribed) {
    return (
      <PageWrapper className="min-h-[70vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-textPrimary mb-2">Subscribed!</h2>
          <p className="text-textPrimary/50 mb-6">You now have access to all premium content.</p>
          <button onClick={() => navigate('/')} className="text-primary hover:text-primary/80 font-medium transition-colors">
            ← Back to Feed
          </button>
        </motion.div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-textPrimary">Go Premium</h1>
          <p className="text-textPrimary/50 mt-1">Unlock exclusive creator content</p>
        </div>
        <PaymentForm
          creatorId={creatorId}
          amount={149}
          onSuccess={() => setSubscribed(true)}
          onCancel={() => navigate(-1)}
        />
      </div>
    </PageWrapper>
  )
}

export default SubscribePage
