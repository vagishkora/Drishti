/**
 * CommentSection.tsx — Drishti Comment Thread
 * Architectural Role: Post engagement interface with nested replies.
 * Uses Supabase SDK for comments CRUD + like toggle.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Heart, Send, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/supabaseApi'
import { toast } from '../lib/toast'
import { Avatar } from './Avatar'

interface CommentSectionProps {
  postId: string
}

export const CommentSection = ({ postId }: CommentSectionProps) => {
  const { user } = useAuth()
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.getComments(postId).then(setComments).finally(() => setLoading(false))
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !user) return
    setSending(true)
    try {
      const newComment = await api.addComment(user.id, postId, text.trim())
      setComments(prev => [...prev, newComment])
      setText('')
      toast.success('Comment posted!')
    } catch { toast.error('Failed to post comment') }
    setSending(false)
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) return
    await api.likeComment(user.id, commentId)
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
        <MessageCircle className="w-4 h-4" /> Comments ({comments.length})
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <AnimatePresence>
          {comments.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 py-2">
              <Link to={`/profile/${c.users?.username}`}>
                <Avatar 
                  src={c.users?.avatar_url} 
                  username={c.users?.username} 
                  size="sm" 
                  isVerified={c.users?.is_verified}
                  isPremium={c.users?.account_type === 'creator'}
                />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link to={`/profile/${c.users?.username}`} className="font-semibold text-textPrimary hover:text-primary transition-colors mr-1.5">
                    {c.users?.username}
                  </Link>
                  <span className="text-textPrimary/70">{c.content}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-textPrimary/30">{new Date(c.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleLikeComment(c.id)}
                    className="text-[10px] text-textPrimary/40 hover:text-red-400 transition-colors flex items-center gap-0.5">
                    <Heart className="w-3 h-3" /> Like
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Comment input */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-white/5">
          <input
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm text-textPrimary placeholder:text-textPrimary/30 focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="text-primary hover:text-primary/80 disabled:opacity-30 transition-all">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      )}
    </div>
  )
}
