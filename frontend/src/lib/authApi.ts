/**
 * authApi.ts — Drishti Backend Authentication API Client
 * ──────────────────────────────────────────────────────
 * Architectural Role:
 * Client-side interface to Express/Neon authentication service.
 * Manages JWT tokens, session persistence, and profile fetching.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'drishti_jwt_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Login failed. Please check your credentials.')
  }

  if (data.access_token) {
    setStoredToken(data.access_token)
  }

  return data
}

export async function signupUser(email: string, password: string, username: string, fullName?: string) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, fullName }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Registration failed.')
  }

  if (data.access_token) {
    setStoredToken(data.access_token)
  }

  return data
}

export async function fetchCurrentProfile() {
  const token = getStoredToken()
  if (!token) return null

  const res = await fetch(`${API_BASE}/api/users/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredToken()
    }
    return null
  }

  const data = await res.json()
  return data.profile
}

export async function logoutUser() {
  const token = getStoredToken()
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  } catch (_) {
    // Non-fatal
  } finally {
    clearStoredToken()
  }
}
