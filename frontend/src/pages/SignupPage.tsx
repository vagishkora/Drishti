import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, AlertCircle, Loader2, Crown, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'
import { toast } from '../lib/toast'

/**
 * SignupPage.tsx — Drishti Account Creation
 * Architectural Role: New user registration with email+password.
 * Collects username, account type, email, and password.
 * DB trigger auto-creates user row + 500 credits on signup.
 */
const SignupPage: React.FC = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    fullName: '',
    accountType: 'viewer' as 'viewer' | 'creator',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.username) return
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      await signUp(form.email, form.password, form.username, form.fullName)
      toast.success('Welcome to Drishti! 🎉 You received 500 credits!')
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper className="min-h-screen flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-textPrimary">Join Drishti</h1>
          <p className="text-textPrimary/40 text-sm mt-1">Create your account • 500 credits free</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@email.com" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          <Input label="Username" type="text" placeholder="@username" value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') }))} required />
          <Input label="Full Name" type="text" placeholder="Your name (optional)" value={form.fullName}
            onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />

          {/* Account Type Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-textPrimary/80">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'viewer' as const, icon: User, label: 'Viewer', desc: 'Browse & subscribe' },
                { type: 'creator' as const, icon: Crown, label: 'Creator', desc: 'Upload & earn' },
              ].map(opt => (
                <button key={opt.type} type="button" onClick={() => setForm(p => ({ ...p, accountType: opt.type }))}
                  className={`p-4 rounded-xl border text-left transition-all
                    ${form.accountType === opt.type
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-white/5 bg-surface hover:border-white/10'}`}>
                  <opt.icon className={`w-5 h-5 mb-2 ${form.accountType === opt.type ? 'text-primary' : 'text-textPrimary/40'}`} />
                  <p className="text-sm font-semibold text-textPrimary">{opt.label}</p>
                  <p className="text-[10px] text-textPrimary/40">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </Button>
          <p className="text-center text-textPrimary/40 text-xs">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </form>
      </motion.div>
    </PageWrapper>
  )
}

export default SignupPage
