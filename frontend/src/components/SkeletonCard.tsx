import React from 'react'
import { cn } from '../lib/utils'

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl p-3 bg-surface border border-white/5 animate-pulse", className)}>
      <div className="aspect-video w-full rounded-lg bg-white/5" />
      <div className="flex flex-col px-1 pb-1 gap-2 mt-2">
        <div className="h-4 bg-white/5 rounded-md w-[80%]" />
        <div className="h-4 bg-white/5 rounded-md w-[60%]" />
      </div>
    </div>
  )
}
