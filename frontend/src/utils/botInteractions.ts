/**
 * botInteractions.ts — Drishti Autonomous Bot Logic
 * Orchestrates "organic" interactions from bot accounts to simulate a thriving universe.
 */
import { supabase } from '../lib/supabase'
import * as api from '../lib/supabaseApi'

const BOTS = [
  '00000000-0000-0000-0000-000000000010', // drishti.official
  '00000000-0000-0000-0000-000000000001', // rohit.reels
  '00000000-0000-0000-0000-000000000002'  // arjun.creates
]

const COMMENT_POOL = [
  "This perspective is absolute core! 🔥",
  "See Beyond... indeed. Cinematic work! 👁️",
  "Drishti vibes only. Loving this frame.",
  "The lighting here is strictly premium.",
  "Another masterpiece in the universe.",
  "Strictly cinematic. Keep creating! ✨",
  "This is why the universe is expanding.",
  "Premium capture. Found your vision!"
]

/**
 * Handle interactions when a new post is created.
 * Sets random timeouts to simulate real user behavior.
 */
export const handleNewPostInteractions = (postId: string, userId: string) => {
  console.log(`🤖 Scheduling bot interactions for post ${postId}...`)

  // 1. Random Bot Likes (30s - 120s)
  BOTS.forEach(botId => {
    if (botId === userId) return // Bot doesn't like its own post here
    
    const delay = Math.random() * (120000 - 30000) + 30000
    setTimeout(async () => {
      try {
        await api.likePost(botId, postId)
        console.log(`✨ Bot ${botId} liked post ${postId}`)
      } catch (err) {
        console.error('Bot like error:', err)
      }
    }, delay)
  })

  // 2. Random Bot Comment (60s - 180s)
  const commenterId = BOTS[Math.floor(Math.random() * BOTS.length)]
  if (commenterId !== userId) {
    const commentDelay = Math.random() * (180000 - 60000) + 60000
    setTimeout(async () => {
      try {
        const content = COMMENT_POOL[Math.floor(Math.random() * COMMENT_POOL.length)]
        await api.addComment(commenterId, postId, content)
        console.log(`💬 Bot ${commenterId} commented on post ${postId}`)
      } catch (err) {
        console.error('Bot comment error:', err)
      }
    }, commentDelay)
  }
}

/**
 * Handle interactions when a new user signs up.
 * Bots follow the new user to make them feel welcome.
 */
export const handleNewUserSignup = (userId: string) => {
  console.log(`🤖 Bots welcoming new user ${userId}...`)
  
  BOTS.forEach(botId => {
    const delay = Math.random() * (300000 - 60000) + 60000 // 1-5 mins
    setTimeout(async () => {
      try {
        await api.follow(botId, userId)
        console.log(`👤 Bot ${botId} followed user ${userId}`)
      } catch (err) {
        console.error('Bot follow error:', err)
      }
    }, delay)
  })
}

/**
 * Periodically make bots interact with each other.
 * This ensures the feed always has engagement.
 */
export const botCrossInteract = async () => {
  console.log('🤖 Running bot cross-interaction cycle...')
  try {
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, user_id')
      .in('user_id', BOTS)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!recentPosts) return

    for (const post of recentPosts) {
      const luckyBot = BOTS[Math.floor(Math.random() * BOTS.length)]
      if (luckyBot !== post.user_id) {
        await api.likePost(luckyBot, post.id)
      }
    }
  } catch (err) {
    console.error('Bot cross-interaction error:', err)
  }
}

/**
 * Send a welcome DM from drishti.official to a new user.
 */
export const sendWelcomeDM = (userId: string) => {
  const drishtiBot = '00000000-0000-0000-0000-000000000010'
  const delay = 120000 // 2 mins
  
  setTimeout(async () => {
    try {
      const convId = await api.getOrCreateConversation(drishtiBot, userId)
      await api.sendMessage(
        convId, 
        drishtiBot, 
        "Welcome to Drishti! 👁️ You've just entered a cinematic visual universe. We've gifted you 500 Credits to start exploring premium content. See Beyond!"
      )
      console.log(`📩 Welcome DM sent to user ${userId}`)
    } catch (err) {
      console.error('Welcome DM error:', err)
    }
  }, delay)
}
