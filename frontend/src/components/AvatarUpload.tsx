/**
 * AvatarUpload.tsx — Drishti Profile Avatar Manager
 * Architectural Role: User identity visual — avatar upload + display.
 * FIX 8: Uploads to avatars bucket, updates avatar_url in users table,
 * reflects everywhere via AuthContext refreshProfile().
 * Shows initials avatar (#7C3AED violet circle) when no avatar set.
 */
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Camera, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as api from '../lib/supabaseApi'
import { toast } from '../lib/toast'
import imageCompression from 'browser-image-compression'

interface AvatarUploadProps {
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
}

const sizes = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-20 h-20 text-xl',
  lg: 'w-32 h-32 text-4xl',
}

export const AvatarUpload = ({ size = 'md', editable = true }: AvatarUploadProps) => {
  const { user, profile, refreshProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      let uploadFile = file
      
      // Compress avatar
      const options = {
        maxSizeMB: 0.2, // Avatars should be small
        maxWidthOrHeight: 512,
        useWebWorker: true,
      }
      try {
        uploadFile = await imageCompression(file, options)
      } catch (compErr) {
        console.error('Avatar compression failed:', compErr)
      }

      const path = `${user.id}/avatar.jpg`

      // Upload (overwrite existing)
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, uploadFile, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      // Bust cache with timestamp
      const avatarUrl = `${publicUrl}?t=${Date.now()}`

      // Update user profile
      await api.updateProfile(user.id, { avatar_url: avatarUrl })
      await refreshProfile()

      toast.success('Avatar updated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    }
    setUploading(false)
  }

  const initials = (profile?.full_name || profile?.username || 'D')[0].toUpperCase()

  return (
    <div className="relative group">
      <div className={`${sizes[size]} rounded-full overflow-hidden bg-primary/20 flex items-center justify-center ring-4 ring-primary/20`}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#7C3AED] flex items-center justify-center text-white font-bold">
            {initials}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {editable && (
        <>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-background hover:bg-primary/90 transition-all"
          >
            <Camera className="w-4 h-4 text-white" />
          </motion.button>
        </>
      )}
    </div>
  )
}
