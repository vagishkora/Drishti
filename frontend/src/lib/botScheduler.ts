import { supabase } from './supabase'

/**
 * botScheduler.ts — Drishti Bot Story Automation
 * Ensures creator accounts have active stories by checking fallback content every 4 hours.
 */

const BOTS = [
  { 
    id: '00000000-0000-0000-0000-000000000010', // drishti.official
    stories: [
      { url: 'https://picsum.photos/seed/drishti_s1/1080/1920', type: 'image' },
      { url: 'https://picsum.photos/seed/drishti_s2/1080/1920', type: 'image' }
    ]
  },
  { 
    id: '00000000-0000-0000-0000-000000000001', // rohit.reels
    stories: [
      { url: 'https://picsum.photos/seed/rohit_s1/1080/1920', type: 'image' },
      { url: 'https://picsum.photos/seed/rohit_s2/1080/1920', type: 'image' }
    ]
  },
  { 
    id: '00000000-0000-0000-0000-000000000002', // arjun.creates
    stories: [
      { url: 'https://picsum.photos/seed/arjun_s1/1080/1920', type: 'image' },
      { url: 'https://picsum.photos/seed/arjun_s2/1080/1920', type: 'image' }
    ]
  }
]

export const checkBotActivity = async () => {
  console.log('🤖 Checking bot activity...')
  
  for (const bot of BOTS) {
    // Check if bot has an active story (less than 24h old)
    const { data: latestStory } = await supabase
      .from('stories')
      .select('created_at')
      .eq('user_id', bot.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
    const lastStoryTime = latestStory ? new Date(latestStory.created_at) : new Date(0)

    if (lastStoryTime < fourHoursAgo) {
      console.log(`✨ Bot ${bot.id} posting new story...`)
      
      // Select a random story from the bot's pool
      const story = bot.stories[Math.floor(Math.random() * bot.stories.length)]
      
      const { error } = await supabase.from('stories').insert({
        user_id: bot.id,
        media_url: story.url,
        media_type: story.type,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      
      if (error) console.error(`❌ Bot ${bot.id} story failed:`, error.message)
    }
  }
}
