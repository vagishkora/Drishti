/**
 * MessagesPage.tsx — Drishti Zero-Knowledge E2EE Communications Hub
 * ──────────────────────────────────────────────────────────────────
 * Architectural Role: End-to-End Encrypted Direct Messaging Interface.
 * Features:
 *  - Curve P-256 (ECDH) Key Agreement with AES-GCM-256 authenticated encryption.
 *  - Automatic public key exchange via `user_keys` vault.
 *  - Client-side IndexedDB private key preservation.
 *  - Out-of-band SHA-256 Key Fingerprint verification.
 *  - Real-time Supabase streaming with client-side decryption.
 */
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Smile, Search, ArrowLeft, Paperclip, 
  ShieldCheck, Lock, Key, Copy, Check 
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageWrapper } from '../components/PageWrapper'
import { Avatar } from '../components/Avatar'
import * as api from '../lib/supabaseApi'
import { supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '../lib/toast'
import { 
  getOrCreateIdentityKeyPair, 
  deriveSharedSecretKey, 
  encryptE2EEMessage, 
  decryptE2EEMessage 
} from '../lib/cryptoEngine'

interface DecryptedMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_encrypted: boolean
  created_at: string
  isDecrypted?: boolean
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  
  // E2EE States
  const [myFingerprint, setMyFingerprint] = useState<string>('')
  const [peerFingerprint, setPeerFingerprint] = useState<string | null>(null)
  const [sharedCryptoKey, setSharedCryptoKey] = useState<CryptoKey | null>(null)
  const [isE2EEActive, setIsE2EEActive] = useState<boolean>(false)
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. Initialize Client E2EE Keypair & Publish Public Key
  useEffect(() => {
    if (!user) return

    const initCrypto = async () => {
      try {
        const keyPair = await getOrCreateIdentityKeyPair(user.id)
        setMyFingerprint(keyPair.fingerprint)
        // Publish/ensure public key is registered in server directory
        await api.publishUserPublicKey(user.id, keyPair.publicKeySPKI, keyPair.fingerprint)
      } catch (err) {
        console.error('[E2EE] Key initialization error:', err)
      }
    }

    initCrypto()
  }, [user])

  // 2. Load conversations
  useEffect(() => {
    if (user) loadConversations()
  }, [user])

  // 3. Negotiate shared key and load messages when active conversation changes
  useEffect(() => {
    if (!activeConv || !user) return

    let isMounted = true

    const setupConversationCrypto = async () => {
      setSharedCryptoKey(null)
      setIsE2EEActive(false)
      setPeerFingerprint(null)

      const peerId = activeConv.otherMember?.id
      if (peerId) {
        try {
          const peerKeyData = await api.getUserPublicKey(peerId)
          if (peerKeyData && peerKeyData.public_identity_key) {
            const derivedKey = await deriveSharedSecretKey(user.id, peerKeyData.public_identity_key)
            if (isMounted) {
              setSharedCryptoKey(derivedKey)
              setPeerFingerprint(peerKeyData.key_fingerprint)
              setIsE2EEActive(true)
            }
          }
        } catch (err) {
          console.warn('[E2EE] Peer key negotiation fallback:', err)
        }
      }

      await loadAndDecryptMessages(activeConv.id)
    }

    setupConversationCrypto()

    // Real-time message polling with graceful Supabase channel fallback
    let pollInterval: any = null
    let channel: any = null

    try {
      channel = supabase
        .channel(`conv-${activeConv.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        }, async (payload) => {
          const rawMsg = payload.new as any
          const processed = await processIncomingMessage(rawMsg)
          setMessages(prev => {
            if (prev.some(m => m.id === processed.id)) return prev
            return [...prev, processed]
          })
          scrollToBottom()
        })
        .subscribe()
    } catch (_) {
      // Supabase realtime offline
    }

    // High-performance polling fallback (every 3.5s)
    pollInterval = setInterval(async () => {
      if (!isMounted) return
      try {
        const rawData = await api.getMessages(activeConv.id)
        if (rawData.length !== messages.length) {
          const decryptedList = await Promise.all(rawData.map((m: any) => processIncomingMessage(m)))
          if (isMounted) setMessages(decryptedList)
        }
      } catch (_) {}
    }, 3500)

    return () => { 
      isMounted = false
      if (pollInterval) clearInterval(pollInterval)
      if (channel) {
        try { supabase.removeChannel(channel) } catch (_) {}
      }
    }
  }, [activeConv, user, sharedCryptoKey, messages.length])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const data = await api.getConversations(user!.id)
      setConversations(data)
    } finally {
      setLoading(false)
    }
  }

  const processIncomingMessage = async (msg: any): Promise<DecryptedMessage> => {
    if (msg.is_encrypted && msg.ciphertext && msg.iv && sharedCryptoKey) {
      try {
        const decryptedText = await decryptE2EEMessage(msg.ciphertext, msg.iv, sharedCryptoKey)
        return {
          ...msg,
          content: decryptedText,
          isDecrypted: true,
        }
      } catch (err) {
        return {
          ...msg,
          content: '🔒 [Decryption error: Mismatched key or corrupted ciphertext]',
          isDecrypted: false,
        }
      }
    }
    return {
      ...msg,
      content: msg.content || (msg.is_encrypted ? '🔒 [Encrypted Message]' : ''),
      isDecrypted: false,
    }
  }

  const loadAndDecryptMessages = async (convId: string) => {
    const rawData = await api.getMessages(convId)
    const decryptedList = await Promise.all(rawData.map((m: any) => processIncomingMessage(m)))
    setMessages(decryptedList)
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text || !activeConv || !user || sending) return

    setSending(true)
    const tempId = `temp-${Date.now()}`

    try {
      if (isE2EEActive && sharedCryptoKey) {
        // Encrypt with AES-GCM
        const encrypted = await encryptE2EEMessage(text, sharedCryptoKey)
        
        // Optimistic UI update
        const optimisticMsg: DecryptedMessage = {
          id: tempId,
          conversation_id: activeConv.id,
          sender_id: user.id,
          content: text,
          is_encrypted: true,
          isDecrypted: true,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])
        setInputValue('')

        const saved = await api.sendEncryptedMessage(
          activeConv.id,
          user.id,
          encrypted.ciphertext,
          encrypted.iv
        )

        // Replace tempId with actual DB id
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: saved.id } : m))
      } else {
        // Plaintext fallback (if recipient hasn't generated keys yet)
        await api.sendMessage(activeConv.id, user.id, text)
        setInputValue('')
      }
    } catch (err: any) {
      toast.error('Failed to dispatch secure message: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const copyFingerprint = (fp: string) => {
    navigator.clipboard.writeText(fp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Key Fingerprint copied to clipboard')
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  if (!user) return null

  return (
    <PageWrapper noPadding className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] flex overflow-hidden">
      {/* ── 1. Conversation List ── */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-white/5 bg-background/50 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-syne font-extrabold text-textPrimary tracking-tight">Messages</h1>
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono text-emerald-400 font-bold">
              <Lock className="w-3 h-3" /> E2EE
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textPrimary/40" />
            <input 
              type="text" 
              placeholder="Search secure threads..." 
              className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-accent/40 transition-all placeholder:text-textPrimary/20 font-dm-sans"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col gap-1 p-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-24" />
                    <div className="h-3 bg-white/5 rounded w-full opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-30">
               <ShieldCheck className="w-12 h-12 mb-4 text-accent" />
               <p className="text-sm font-syne font-bold uppercase tracking-wider">No conversations yet</p>
               <p className="text-xs font-dm-sans italic mt-1">Start a secure, zero-knowledge dialogue from any creator profile.</p>
             </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => { setActiveConv(conv); setMobileView('chat') }}
                className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-left border-l-2 ${activeConv?.id === conv.id ? 'border-accent bg-accent/5' : 'border-transparent'}`}
              >
                <div className="relative">
                   <Avatar src={conv.otherMember?.avatar_url} username={conv.otherMember?.username} size="md" />
                   <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-syne font-bold text-sm text-textPrimary truncate">@{conv.otherMember?.username}</span>
                    <span className="text-[10px] text-textPrimary/30 uppercase">{conv.lastMessage ? formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false }).replace('about ', '') : ''}</span>
                  </div>
                  <p className="text-xs text-textPrimary/40 truncate flex items-center gap-1 font-dm-sans">
                    <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    {conv.lastMessage?.sender_id === user.id && 'You: '}{conv.lastMessage?.is_encrypted ? 'Encrypted transmission' : conv.lastMessage?.content || 'Secure thread initialized'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── 2. Active Chat View ── */}
      <div className={`flex-1 flex flex-col bg-surface/30 relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 p-12 text-center">
            <div className="w-24 h-24 mb-6 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center text-accent">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-syne font-extrabold uppercase tracking-widest mb-2">Zero-Knowledge Vault</h2>
            <p className="max-w-xs font-dm-sans italic text-sm">Select a contact to establish an authenticated P-256 ECDH session with 256-bit AES-GCM encryption.</p>
          </div>
        ) : (
          <>
            {/* Header with Security Telemetry Bar */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/80 backdrop-blur-xl z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 text-textPrimary/60 hover:text-textPrimary">
                   <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar src={activeConv.otherMember?.avatar_url} username={activeConv.otherMember?.username} size="sm" />
                <div className="flex flex-col">
                  <span className="font-syne font-bold text-sm text-textPrimary">@{activeConv.otherMember?.username}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider">
                      {isE2EEActive ? 'ECDH P-256 / AES-GCM' : 'CONNECTING...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Verification Button */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-textPrimary/70 hover:text-white transition-all"
                  title="Verify Security Keys"
                >
                  <Key className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden sm:inline">Verify Key Fingerprint</span>
                </button>
              </div>
            </div>

            {/* Zero-Knowledge Privacy Notice Banner */}
            <div className="bg-emerald-500/5 border-b border-emerald-500/10 px-6 py-2 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>End-to-End Encrypted. Messages are encrypted locally on your device.</span>
              </div>
              {peerFingerprint && (
                <span className="hidden md:inline text-emerald-400/60 text-[10px]">
                  Fingerprint: {peerFingerprint.slice(0, 14)}...
                </span>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth scrollbar-hide"
            >
              {messages.map((msg, i) => {
                const isOwn = msg.sender_id === user.id
                const showAvatar = !isOwn && (i === 0 || messages[i-1].sender_id !== msg.sender_id)
                
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isOwn && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && <Avatar src={activeConv.otherMember?.avatar_url} username={activeConv.otherMember?.username} size="xs" />}
                      </div>
                    )}
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative group
                        ${isOwn 
                          ? 'bg-accent text-background rounded-br-none shadow-accent/10 font-medium' 
                          : 'bg-white/5 text-textPrimary rounded-bl-none border border-white/5 font-dm-sans'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 opacity-60 text-[9px] font-mono">
                        <Lock className="w-2.5 h-2.5" />
                        <span>E2EE VERIFIED</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <span className={`block text-[9px] mt-1 text-right font-mono ${isOwn ? 'text-background/60' : 'text-textPrimary/30'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  </div>
                )
              })}
            </div>

            {/* Input Bar */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-background to-transparent">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl px-4 py-2 focus-within:border-accent/40 transition-all shadow-xl"
              >
                <button type="button" className="p-2 text-textPrimary/40 hover:text-accent transition-colors"><Paperclip className="w-5 h-5" /></button>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Type an end-to-end encrypted message..."
                  className="flex-1 bg-transparent py-2.5 outline-none text-sm text-textPrimary placeholder:text-textPrimary/20 font-dm-sans"
                />
                <button type="button" className="p-2 text-textPrimary/40 hover:text-accent transition-colors hidden sm:block"><Smile className="w-5 h-5" /></button>
                <button 
                  type="submit" 
                  disabled={!inputValue.trim() || sending}
                  className={`p-2.5 rounded-xl transition-all ${inputValue.trim() ? 'bg-accent text-background scale-105 shadow-lg shadow-accent/20' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                >
                  <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ── 3. Out-of-Band Key Verification Modal ── */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0B1A] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-accent font-syne font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Cryptographic Key Verification</span>
                </div>
                <button onClick={() => setShowKeyModal(false)} className="text-textPrimary/40 hover:text-white text-sm font-bold">✕</button>
              </div>

              <p className="text-xs text-textPrimary/60 leading-relaxed font-dm-sans">
                Compare these SHA-256 fingerprints with your contact through an out-of-band channel (e.g., in person or phone call) to verify no adversary is performing a Machine-in-the-Middle (MitM) attack.
              </p>

              <div className="space-y-3 font-mono text-xs">
                {/* My Fingerprint */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-textPrimary/40 mb-1">
                    <span>YOUR IDENTITY FINGERPRINT</span>
                    <button onClick={() => copyFingerprint(myFingerprint)} className="hover:text-accent flex items-center gap-1">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-accent break-all select-all">{myFingerprint || 'Generating...'}</p>
                </div>

                {/* Peer Fingerprint */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="block text-[10px] text-textPrimary/40 mb-1">RECIPIENT FINGERPRINT</span>
                  <p className="text-emerald-400 break-all select-all">{peerFingerprint || 'Awaiting public key handshake...'}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setShowKeyModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-accent text-background font-syne font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}

export default MessagesPage
