/**
 * demoContent.js — Drishti Demo Content Engine
 *
 * Fetches 5 popular videos from Pexels API + generates 10 Picsum image posts.
 * If Pexels fails or the API key is missing, falls back to Picsum images only.
 * Every demo post carries `is_demo: true` so the feed can badge it.
 */

const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY || ''

const captions = [
  'Golden hour vibes ✨',
  'City lights never sleep 🌃',
  'Nature therapy 🌿',
  'Weekend mood 🎶',
  'Living in the moment 📸',
  'Explore the unseen 🔭',
  'Chasing sunsets 🌅',
  'Art is everywhere 🎨',
  'Stay curious, stay creative 💡',
  'Lost in the beauty of it all 🌌',
  'Coffee & calm mornings ☕',
  'Streets full of stories 🏙️',
  'A frame worth a thousand words 🖼️',
  'Into the wild 🏔️',
  'Colors of life 🌈',
]

function randomLikes() {
  return Math.floor(Math.random() * 900) + 100 // 100–999
}

function pickCaption(index) {
  return captions[index % captions.length]
}

/**
 * Generate 10 Picsum image demo posts (always works, no key needed).
 */
function generatePicsumPosts() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `demo-img-${i + 1}`,
    media_url: `https://picsum.photos/600/600?random=${i + 1}`,
    media_type: 'image',
    username: 'drishti.explore',
    avatar: 'https://picsum.photos/40/40?random=99',
    caption: pickCaption(i),
    likes: randomLikes(),
    is_demo: true,
  }))
}

/**
 * Fetch 5 popular videos from Pexels.
 * Returns an empty array on any error so the feed never breaks.
 */
async function fetchPexelsVideos() {
  if (!PEXELS_KEY) return []

  try {
    const res = await fetch('https://api.pexels.com/videos/popular?per_page=5', {
      headers: { Authorization: PEXELS_KEY },
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.videos || []).map((v, i) => {
      // Pick the best quality file that is ≤ 1280 width
      const file =
        v.video_files?.find((f) => f.width <= 1280 && f.quality === 'hd') ||
        v.video_files?.[0]

      return {
        id: `demo-vid-${v.id}`,
        media_url: file?.link || '',
        media_type: 'video',
        username: 'drishti.explore',
        avatar: 'https://picsum.photos/40/40?random=99',
        caption: pickCaption(i + 10),
        likes: randomLikes(),
        is_demo: true,
        thumbnail: v.image || '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Main export — returns all demo content (videos + images).
 * Always succeeds; Pexels failure gracefully falls back to images-only.
 */
export async function fetchDemoContent() {
  const [videos, images] = await Promise.all([
    fetchPexelsVideos(),
    Promise.resolve(generatePicsumPosts()),
  ])
  // Videos first, then images
  return [...videos, ...images]
}

/**
 * Synchronous helper — returns a fixed set of image-only demo posts.
 * Used as an instant fallback when async fetch hasn't completed.
 */
export function getStaticDemoPosts() {
  return generatePicsumPosts()
}

export default fetchDemoContent
