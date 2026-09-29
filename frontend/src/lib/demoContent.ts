/**
 * demoContent.ts — Drishti Demo Content Feed
 * Provides placeholder posts when followed-user content is < 5.
 * All demo posts use locally-bundled images from /demo-content/.
 * Demo posts are tagged with isDemo: true for the "Demo" badge in UI.
 */
export interface DemoPost {
  id: string
  type: 'photo' | 'video'
  title: string
  media_url: string     // relative URL served from /public/demo-content/
  signed_url: string    // same as media_url for local files
  is_premium: boolean
  is_demo: true
  likes_count: number
  views_count: number
  created_at: string
  profiles: {
    username: 'drishti.demo'
    full_name: 'Drishti Demo'
    avatar_url: '/demo-content/demo-avatar.svg'
    account_type: 'creator'
  }
}

const DEMO_BASE = '/demo-content'

const demoItems: DemoPost[] = [
  { id: 'demo-1', type: 'photo', title: 'Mountain sunrise — golden hour magic', media_url: `${DEMO_BASE}/img1.jpg`, signed_url: `${DEMO_BASE}/img1.jpg`, is_premium: false, is_demo: true, likes_count: 1204, views_count: 8400, created_at: new Date(Date.now() - 3600000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-2', type: 'photo', title: 'Urban street photography — night lights', media_url: `${DEMO_BASE}/img2.jpg`, signed_url: `${DEMO_BASE}/img2.jpg`, is_premium: false, is_demo: true, likes_count: 892, views_count: 5200, created_at: new Date(Date.now() - 7200000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-3', type: 'photo', title: 'Ocean at sunset — a quiet evening', media_url: `${DEMO_BASE}/img3.jpg`, signed_url: `${DEMO_BASE}/img3.jpg`, is_premium: false, is_demo: true, likes_count: 2103, views_count: 14200, created_at: new Date(Date.now() - 14400000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-4', type: 'photo', title: 'Forest trail — morning mist', media_url: `${DEMO_BASE}/img4.jpg`, signed_url: `${DEMO_BASE}/img4.jpg`, is_premium: false, is_demo: true, likes_count: 757, views_count: 3900, created_at: new Date(Date.now() - 21600000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-5', type: 'photo', title: 'City skyline at dusk', media_url: `${DEMO_BASE}/img5.jpg`, signed_url: `${DEMO_BASE}/img5.jpg`, is_premium: false, is_demo: true, likes_count: 1588, views_count: 9700, created_at: new Date(Date.now() - 28800000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-6', type: 'photo', title: 'Abstract architecture — lines & shadows', media_url: `${DEMO_BASE}/img6.jpg`, signed_url: `${DEMO_BASE}/img6.jpg`, is_premium: false, is_demo: true, likes_count: 430, views_count: 2100, created_at: new Date(Date.now() - 36000000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-7', type: 'photo', title: 'Wildflowers in a field — spring bloom', media_url: `${DEMO_BASE}/img7.jpg`, signed_url: `${DEMO_BASE}/img7.jpg`, is_premium: false, is_demo: true, likes_count: 2841, views_count: 18900, created_at: new Date(Date.now() - 43200000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-8', type: 'photo', title: 'Coffee shop aesthetic — morning ritual', media_url: `${DEMO_BASE}/img8.jpg`, signed_url: `${DEMO_BASE}/img8.jpg`, is_premium: false, is_demo: true, likes_count: 952, views_count: 5600, created_at: new Date(Date.now() - 50400000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-9', type: 'photo', title: 'Desert dunes — golden hour', media_url: `${DEMO_BASE}/img9.jpg`, signed_url: `${DEMO_BASE}/img9.jpg`, is_premium: false, is_demo: true, likes_count: 1763, views_count: 11200, created_at: new Date(Date.now() - 57600000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
  { id: 'demo-10', type: 'photo', title: 'Night sky — milky way over mountains', media_url: `${DEMO_BASE}/img10.jpg`, signed_url: `${DEMO_BASE}/img10.jpg`, is_premium: false, is_demo: true, likes_count: 4210, views_count: 28900, created_at: new Date(Date.now() - 64800000).toISOString(), profiles: { username: 'drishti.demo', full_name: 'Drishti Demo', avatar_url: `${DEMO_BASE}/demo-avatar.svg`, account_type: 'creator' } },
]

/**
 * Returns demo posts to fill the gap when real posts < minCount.
 * Shuffles slightly to feel organic on each load.
 */
export const getDemoPosts = (minCount: number, currentCount: number): DemoPost[] => {
  const needed = Math.max(0, minCount - currentCount)
  if (needed === 0) return []
  // Shuffle and slice
  const shuffled = [...demoItems].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, needed)
}

export default demoItems
