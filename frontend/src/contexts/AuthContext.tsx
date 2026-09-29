/**
 * AuthContext.tsx — Drishti Native JWT & Neon Authentication Provider
 * ──────────────────────────────────────────────────────────────────
 * Architectural Role:
 * Global authentication state provider.
 * Interacts directly with the Express backend connected to Neon PostgreSQL.
 * Manages JWT tokens, live profiles, and reactive state updates.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../lib/authApi'

export interface UserProfile {
  id: string
  username: string
  full_name: string
  email: string
  bio: string
  website: string
  avatar_url: string
  account_type: 'viewer' | 'creator'
  credits: number
  is_private: boolean
  is_verified: boolean
  is_admin: boolean
  notification_preferences: Record<string, boolean>
}

interface AuthState {
  user: any | null
  session: any | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, username: string, fullName?: string) => Promise<any>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    try {
      const p = await authApi.fetchCurrentProfile()
      if (p) {
        setProfile(p as UserProfile)
        setUser({ id: p.id, email: p.email, username: p.username })
      } else {
        setProfile(null)
        setUser(null)
      }
    } catch (_) {
      setProfile(null)
      setUser(null)
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    const res = await authApi.loginUser(email, password)
    if (res.user) {
      setUser(res.user)
      await refreshProfile()
    }
    return res
  }

  const handleSignUp = async (email: string, password: string, username: string, fullName?: string) => {
    const res = await authApi.signupUser(email, password, username, fullName)
    if (res.user) {
      setUser(res.user)
      await refreshProfile()
    }
    return res
  }

  const handleSignOut = async () => {
    await authApi.logoutUser()
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshProfile()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user, access_token: authApi.getStoredToken() } : null,
        profile,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        refreshProfile,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
