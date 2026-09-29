import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { AdminGuard } from './components/AdminGuard'
import { Navbar } from './components/Navbar'
import { InstallPrompt } from './components/InstallPrompt'
import { ToastContainer } from './components/ToastContainer'
import { useEffect, lazy, Suspense } from 'react'
import { checkBotActivity } from './lib/botScheduler'
import { SplashScreen } from './components/SplashScreen'
import { botCrossInteract } from './utils/botInteractions'
import { CommandPalette } from './components/CommandPalette'

/**
 * App.tsx — Drishti Application Root
 * Architectural Role: Route orchestrator, auth provider, layout shell.
 * PERF: All pages are lazy-loaded for code splitting.
 */

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const WatchPage = lazy(() => import('./pages/WatchPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const GetCreditsPage = lazy(() => import('./pages/GetCreditsPage'))
const StudioPage = lazy(() => import('./pages/StudioPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

/**
 * Mobile Bottom Navigation Bar (visible on md and below, only when logged in)
 */
import { MobileNav } from './components/MobileNav'

const AnimatedRoutes = () => {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth pages — always accessible */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />

        {/* All other pages require auth */}
        <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
        <Route path="/watch/:id" element={<AuthGuard><WatchPage /></AuthGuard>} />
        <Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
        <Route path="/profile/:userId?" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/upload" element={<AuthGuard><UploadPage /></AuthGuard>} />
        <Route path="/messages/:conversationId?" element={<AuthGuard><MessagesPage /></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><NotificationsPage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="/credits" element={<AuthGuard><GetCreditsPage /></AuthGuard>} />
        <Route path="/studio" element={<AuthGuard><StudioPage /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />

        {/* Catch-all → login if not auth'd, home if auth'd */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  useEffect(() => {
    // Check bot activity on load
    checkBotActivity()
    botCrossInteract()
  }, [])

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-background text-textPrimary selection:bg-accent/30 font-sans flex relative">
          <ToastContainer />
          <Navbar />
          <main className="flex-1 w-full relative">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
              <Suspense fallback={<SplashScreen />}>
                <AnimatedRoutes />
              </Suspense>
            </div>
          </main>
          <MobileNav />
          <InstallPrompt />
          <CommandPalette />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
