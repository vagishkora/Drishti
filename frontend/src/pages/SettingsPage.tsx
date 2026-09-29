import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Trash2, 
  CheckCircle, 
  Loader2, 
  ChevronRight, 
  Crown 
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/PageWrapper'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'
import { Avatar } from '../components/Avatar'
import { ImageCropper } from '../components/ImageCropper'

/**
 * SettingsPage.tsx — Drishti Settings Hub
 * Architectural Role: User preferences and account management.
 * All settings persist to Supabase via direct SDK calls.
 */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden mb-4">
    <div className="px-5 py-3 border-b border-white/5">
      <h3 className="text-xs font-semibold text-textPrimary/40 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="divide-y divide-white/5">{children}</div>
  </div>
)

const Row = ({ label, value, onClick, danger }: { label: string; value?: string; onClick?: () => void; danger?: boolean }) => (
  <motion.button whileTap={{ scale: 0.99 }} onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left ${danger ? 'text-red-400' : 'text-textPrimary'}`}>
    <span className="text-sm font-medium">{label}</span>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-textPrimary/40">{value}</span>}
      <ChevronRight className="w-4 h-4 text-textPrimary/30" />
    </div>
  </motion.button>
)

const Toggle = ({ label, description, on, onChange }: { label: string; description?: string; on: boolean; onChange: () => void }) => (
  <div className="flex items-center justify-between px-5 py-4">
    <div>
      <p className="text-sm font-medium text-textPrimary">{label}</p>
      {description && <p className="text-xs text-textPrimary/40 mt-0.5">{description}</p>}
    </div>
    <div className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${on ? 'bg-primary' : 'bg-white/10'}`} onClick={onChange}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </div>
  </div>
)

const SettingsPage: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', bio: '', website: '', account_type: 'viewer' })
  const [notifs, setNotifs] = useState({ follows: true, likes: true, comments: true, subscriptions: true })
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [tempImage, setTempImage] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name || '', bio: profile.bio || '', website: profile.website || '', account_type: profile.account_type || 'viewer' })
      setIsPrivate(profile.is_private || false)
      if (profile.notification_preferences) setNotifs(profile.notification_preferences as any)
    }
  }, [profile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setTempImage(reader.result as string)
      setShowCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = async (croppedBlob: Blob) => {
    if (!user) return
    setShowCropper(false)
    setUploadingAvatar(true)
    try {
      // 1. Upload to storage
      const fileName = `${user.id}/${Date.now()}.jpg`
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      console.log('New Avatar URL:', publicUrl)

      // 3. Update profile
      await api.updateProfile(user.id, { avatar_url: publicUrl })
      await refreshProfile()
      toast.success('Profile picture updated!')
      setTempImage(null)
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await api.updateProfile(user.id, { ...form, is_private: isPrivate, notification_preferences: notifs })
      await refreshProfile()
      setSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const updateToggle = async (key: string, value: any) => {
    if (!user) return
    try {
      if (key === 'is_private') {
        setIsPrivate(value)
        await api.updateProfile(user.id, { is_private: value })
      } else {
        const newNotifs = { ...notifs, [key]: value }
        setNotifs(newNotifs)
        await api.updateProfile(user.id, { notification_preferences: newNotifs })
      }
      await refreshProfile()
      toast.success('Preference saved')
    } catch (e: any) {
      toast.error('Failed to save preference')
    }
  }

  const handleChangeEmail = async () => {
    const newEmail = window.prompt('Enter new email address:')
    if (!newEmail || newEmail === user?.email) return
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) toast.error(error.message)
    else toast.success('Check both emails for confirmation links!')
  }

  const switchAccountType = async () => {
    const newType = form.account_type === 'creator' ? 'viewer' : 'creator'
    setForm(p => ({ ...p, account_type: newType }))
    if (user) {
      await api.updateProfile(user.id, { account_type: newType })
      await refreshProfile()
      toast.info(`Switched to ${newType}`)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE' || !user) return
    try {
      await api.deleteAccount(user.id)
      await signOut()
      navigate('/login')
      toast.success('Account deleted')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete account')
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-display font-bold text-textPrimary mb-6">Settings</h1>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-10 pt-4">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
            <Avatar 
              src={profile?.avatar_url} 
              username={profile?.full_name || profile?.username} 
              size="2xl" 
              className="group-hover:opacity-75 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
            </div>
            <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploadingAvatar} />
          </div>
          <h2 className="mt-4 text-xl font-display font-bold text-textPrimary">{profile?.full_name || `@${profile?.username}`}</h2>
          <p className="text-sm text-textPrimary/40">Click to change profile picture</p>
        </div>

        <Section title="Edit Profile">
          <div className="px-5 py-4 space-y-3">
            <Input label="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-textPrimary/80">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} placeholder="Tell the world about yourself" className="w-full rounded-lg bg-background border border-white/10 px-3 py-2 text-sm text-textPrimary placeholder:text-textPrimary/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all" />
            </div>
            <Input label="Website" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
            <Button onClick={saveProfile} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</> : 'Save Changes'}
            </Button>
          </div>
        </Section>

        <Section title="Account">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-textPrimary">Account Type</p>
              <p className="text-xs text-textPrimary/40 mt-0.5">Currently: <span className={`font-semibold ${form.account_type === 'creator' ? 'text-accent' : 'text-primary'}`}>{form.account_type}</span></p>
            </div>
            <Button variant="outline" size="sm" onClick={switchAccountType}>
              <Crown className="w-4 h-4 mr-1.5" /> Switch to {form.account_type === 'creator' ? 'Viewer' : 'Creator'}
            </Button>
          </div>
        </Section>

        <Section title="Notifications">
          <Toggle label="New Followers" on={notifs.follows} onChange={() => updateToggle('follows', !notifs.follows)} />
          <Toggle label="Likes" on={notifs.likes} onChange={() => updateToggle('likes', !notifs.likes)} />
          <Toggle label="Comments & Replies" on={notifs.comments} onChange={() => updateToggle('comments', !notifs.comments)} />
          <Toggle label="Subscriptions" on={notifs.subscriptions} onChange={() => updateToggle('subscriptions', !notifs.subscriptions)} />
        </Section>

        <Section title="Privacy & Security">
          <Toggle label="Private Account" description="Only approved followers can see your content" on={isPrivate} onChange={() => updateToggle('is_private', !isPrivate)} />
          <Row label="Change Email" value={user?.email} onClick={handleChangeEmail} />
          <Row label="Two-Factor Authentication" value="Enabled via Supabase Auth" />
        </Section>

        <Section title="Account Actions">
          <Row label="Log Out" onClick={handleLogout} danger />
          <Row label="Delete Account" onClick={() => setDeleteModal(true)} danger />
        </Section>

        <AnimatePresence>
          {deleteModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-surface border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h2 className="text-lg font-display font-bold text-red-400 mb-2">Delete Account</h2>
                <p className="text-sm text-textPrimary/60 mb-4">This action is irreversible. Type <strong>DELETE</strong> to confirm.</p>
                <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" className="mb-4" />
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setDeleteModal(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleDeleteAccount} className="flex-1 bg-red-500 hover:bg-red-600 shadow-red-500/20" disabled={deleteConfirm !== 'DELETE'}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showCropper && tempImage && (
            <ImageCropper 
              image={tempImage} 
              onCropComplete={handleAvatarUpload} 
              onCancel={() => {
                setShowCropper(false)
                setTempImage(null)
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  )
}

export default SettingsPage
