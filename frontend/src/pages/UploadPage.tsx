import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Video, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { VideoRecorder } from '../components/VideoRecorder'
import { PageWrapper } from '../components/PageWrapper'
import { toast } from '../lib/toast'
import * as api from '../lib/supabaseApi'
import imageCompression from 'browser-image-compression'
import { handleNewPostInteractions } from '../utils/botInteractions'

/**
 * UploadPage.tsx — Drishti Content Upload
 * Architectural Role: Media ingestion interface.
 * Supports drag-drop image + video upload directly to Supabase Storage.
 * No Express backend — all operations via Supabase client SDK.
 */
const UploadPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'upload' | 'record'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleRecordingComplete = (recordedFile: File) => {
    setFile(recordedFile)
    setMode('upload')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !caption || !user) return

    setLoading(true)
    setError('')

    try {
      let uploadFile = file
      
      // Compress if image
      if (file.type.startsWith('image')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        }
        try {
          uploadFile = await imageCompression(file, options)
        } catch (compErr) {
          console.error('Compression failed, uploading original:', compErr)
        }
      }

      const post = await api.uploadPost(uploadFile, caption, isPremium)
      handleNewPostInteractions(post.id, user.id)
      setSuccess(true)
      toast.success('Post published! 🎉')
      // Refreshing profile in context for immediate grid update
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const isImage = file?.type.startsWith('image')

  if (success) {
    return (
      <PageWrapper className="min-h-[70vh] flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-textPrimary mb-2">Post Published!</h2>
          <p className="text-textPrimary/50">Redirecting to feed...</p>
        </motion.div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <h1 className="text-3xl font-display font-bold text-textPrimary mb-2">Create Post</h1>
      <p className="text-textPrimary/50 mb-8">Share your content with the world. Upload a photo, video, or record.</p>

      <div className="flex gap-3 mb-8">
        <Button variant={mode === 'upload' ? 'primary' : 'secondary'} onClick={() => setMode('upload')}>
          <Upload className="w-4 h-4 mr-2" /> Upload File
        </Button>
        <Button variant={mode === 'record' ? 'primary' : 'secondary'} onClick={() => setMode('record')}>
          <Video className="w-4 h-4 mr-2" /> Record Video
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'record' ? (
          <motion.div key="recorder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <VideoRecorder onRecordingComplete={handleRecordingComplete} />
          </motion.div>
        ) : (
          <motion.form key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleUpload} className="space-y-6 max-w-2xl">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5' : file ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 hover:border-white/20 bg-surface'}`}
            >
              <input type="file" accept="video/*,image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="w-10 h-10 mx-auto text-emerald-400" />
                  <p className="text-textPrimary font-medium">{file.name}</p>
                  <p className="text-textPrimary/40 text-sm">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB • {isImage ? '🖼 Photo' : '▶ Video'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <ImageIcon className="w-8 h-8 text-textPrimary/20" />
                    <Upload className="w-10 h-10 text-textPrimary/30" />
                    <Video className="w-8 h-8 text-textPrimary/20" />
                  </div>
                  <p className="text-textPrimary/60">Drag & drop your media here, or click to browse</p>
                  <p className="text-textPrimary/30 text-xs">Max 100 MB • Image or Video</p>
                </div>
              )}
            </div>

            <Input label="Caption" placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} required />

            {/* Premium Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-12 h-7 rounded-full transition-colors ${isPremium ? 'bg-accent' : 'bg-white/10'}`} onClick={() => setIsPremium(!isPremium)}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isPremium ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-textPrimary/70 group-hover:text-textPrimary transition-colors">
                {isPremium ? <span className="font-premium italic text-accent">Premium Content</span> : 'Free Content'}
              </span>
            </label>

            <Button type="submit" className="w-full sm:w-auto" disabled={loading || !file || !caption}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Publish Post <Upload className="w-4 h-4 ml-2" /></>}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}

export default UploadPage
