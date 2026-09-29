import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, AlertCircle, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'
import { toast } from '../lib/toast'

/**
 * LoginPage.tsx — Drishti Cyber-Secured Authentication
 * Architectural Role: Primary authentication entry point.
 * Interacts with Neon PostgreSQL via backend JWT service.
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper className="min-h-screen flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-textPrimary">Drishti</h1>
          <p className="text-textPrimary/40 text-sm mt-1">See Beyond • दृष्टि</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
          </Button>

          <p className="text-center text-textPrimary/40 text-xs">
            Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </form>
      </motion.div>
    </PageWrapper>
  )
}

export default LoginPage
