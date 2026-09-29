/**
 * AdminGuard.tsx — Drishti Admin Route Guard
 * Architectural Role: Protects admin-only routes.
 * Redirects non-admin users with a warning toast.
 */
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../lib/toast'

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-primary">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-display text-textPrimary">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile?.is_admin) {
    toast.warning('Access denied — admin privileges required')
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
