import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'accent' | 'white'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'primary', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    white: 'text-white'
  }

  return (
    <div className={cn('animate-spin', sizeClasses[size], colorClasses[color], className)}>
      <Loader2 className="w-full h-full" />
    </div>
  )
}
