import React from 'react'
import { FeedPost } from './FeedPost'
// @ts-ignore — JS module
import { fetchDemoContent, getStaticDemoPosts } from '../data/demoContent'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/supabaseApi'
import { InView } from 'react-intersection-observer'

/**
 * VideoFeed.tsx — Drishti Feed Content Delivery
 * PERF: Uses InView for viewport-only rendering of post cards.
 */

import useSWR from 'swr'

export const VideoFeed: React.FC = () => {
  const { user } = useAuth()

  const { data: posts, isLoading } = useSWR(
    user ? [`feed`, user.id] : null,
    async ([, userId]) => {
      let realPosts: any[] = []
      try {
        realPosts = await api.getFeed(userId)
      } catch {
        realPosts = []
      }

      // Normalize real posts
      const normalized = realPosts.map((p: any) => ({
        id: p.id,
        media_url: p.media_url,
        media_type: p.media_type || 'image',
        caption: p.caption || '',
        is_premium: p.is_premium,
        is_demo: false,
        views: p.views || 0,
        creator: p.users || { username: 'unknown', full_name: 'Unknown' },
      }))

      // If < 5 real posts, add demo content
      if (normalized.length < 5) {
        try {
          const demos = await fetchDemoContent()
          const needed = Math.max(0, 15 - normalized.length)
          const filler = demos.slice(0, needed).map((d: any) => ({
            id: d.id,
            media_url: d.media_url,
            media_type: d.media_type || 'image',
            caption: d.caption,
            is_premium: false,
            is_demo: true,
            views: 0,
            likes: d.likes,
            creator: { 
              username: d.username, 
              full_name: 'Drishti Explore', 
              avatar_url: d.avatar, 
              account_type: 'creator', 
              is_verified: false 
            },
          }))
          return [...normalized, ...filler]
        } catch {
          const fallback = getStaticDemoPosts().slice(0, 10).map((d: any) => ({
            id: d.id, media_url: d.media_url, media_type: 'image',
            caption: d.caption, is_premium: false, is_demo: true, views: 0, likes: d.likes,
            creator: { username: d.username, full_name: 'Drishti Explore', avatar_url: d.avatar, is_verified: false },
          }))
          return [...normalized, ...fallback]
        }
      }
      return normalized
    },
    { revalidateOnFocus: false }
  )

  if (isLoading) {
    return (
      <div className="max-w-[600px] mx-auto space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-2xl overflow-hidden animate-pulse">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-white/5" />
              <div className="h-4 bg-white/5 rounded w-24" />
            </div>
            <div className="aspect-square bg-white/3" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-[600px] mx-auto" style={{ willChange: 'transform' }}>
      {posts?.map((post: any, index: number) => (
        <InView key={post.id} triggerOnce rootMargin="200px 0px" fallbackInView>
          {({ inView, ref }) => (
            <div ref={ref} style={{ minHeight: inView ? undefined : '400px' }}>
              {inView && (
                <FeedPost
                  id={post.id}
                  mediaUrl={post.media_url}
                  mediaType={post.media_type === 'video' ? 'video' : 'image'}
                  caption={post.caption}
                  creator={post.creator}
                  isPremium={post.is_premium}
                  isDemo={post.is_demo}
                  likesCount={post.likes || 0}
                  viewsCount={post.views || 0}
                  index={index}
                />
              )}
            </div>
          )}
        </InView>
      ))}
    </div>
  )
}
