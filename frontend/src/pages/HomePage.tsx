import React, { useState, useEffect } from 'react'
import { PageWrapper } from '../components/PageWrapper'
import { VideoFeed } from '../components/VideoFeed'
import { StoriesTray } from '../components/StoriesTray'
import { StoryViewer } from '../components/StoryViewer'
import { useAuth } from '../contexts/AuthContext'
import { TrendingWidget } from '../components/TrendingWidget'
import { SuggestedCreators } from '../components/SuggestedCreators'
import { ActiveNowWidget, UniverseStatsWidget } from '../components/SidebarWidgets'
import type { StoryGroup } from '../components/StoriesTray'
import * as api from '../lib/supabaseApi'
import { SWRConfig, preload } from 'swr'

/**
 * HomePage.tsx — Drishti Premium Feed
 */
const HomePage: React.FC = () => {
  const { user } = useAuth()
  const [viewer, setViewer] = useState<{feed: StoryGroup[], gIdx: number, sIdx: number} | null>(null)

  // Batch all initial data fetches into ONE Promise.all on mount
  useEffect(() => {
    if (!user) return
    
    // Warm up the SWR cache
    Promise.all([
      preload([`stories-feed`, user.id], () => api.getStoriesFeed(user.id)),
      preload([`feed`, user.id], () => api.getFeed(user.id)),
      preload('trending-posts', api.getTrendingPosts),
      preload([`suggested-creators`, user.id], () => api.getSuggestedCreators(user.id))
    ])
  }, [user])

  return (
    <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 5000 }}>
      <PageWrapper className="pt-20 md:pt-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">
          <div className="flex flex-col gap-8 max-w-[600px] lg:mx-0 mx-auto w-full">
            {/* Stories Hub */}
            <StoriesTray onStoryClick={(groups, idx) => setViewer({ feed: groups, gIdx: idx, sIdx: 0 })} />
            
            <div className="px-4">
              <h1 className="text-[28px] font-syne font-bold text-[#EDE9F8] leading-tight">Your Universe</h1>
              <p className="text-textPrimary/40 font-dm-sans text-sm mt-1">Discover cinematic frames from creators you follow.</p>
            </div>

            <VideoFeed />
          </div>

          {/* Cinematic Sidebar */}
          <aside className="hidden lg:flex flex-col gap-10 sticky top-24">
            <TrendingWidget />
            <SuggestedCreators />
            <ActiveNowWidget />
            <UniverseStatsWidget />
          </aside>
        </div>

        {/* Story Viewer Overlay */}
        {viewer && (
          <StoryViewer
            feed={viewer.feed}
            initialGroupIdx={viewer.gIdx}
            initialStoryIdx={viewer.sIdx}
            onClose={() => setViewer(null)}
          />
        )}
      </PageWrapper>
    </SWRConfig>
  )
}

export default HomePage
