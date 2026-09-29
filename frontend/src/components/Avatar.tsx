import React from 'react'
import { CheckCircle2 } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  username?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  isVerified?: boolean
  isPremium?: boolean
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  username = '?', 
  size = 'md', 
  isVerified = false, 
  isPremium = false,
  className = ''
}) => {
  const initial = React.useMemo(() => {
    if (!username || username === '?') return '?'
    // If it's a full name with spaces, get first letters of first and last name
    const parts = username.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return username[0].toUpperCase()
  }, [username])
  
  const sizeClasses: Record<string, string> = {
    'xs': 'w-6 h-6 text-[10px]',
    'sm': 'w-8 h-8 text-xs',
    'md': 'w-10 h-10 text-sm',
    'lg': 'w-14 h-14 text-lg',
    'xl': 'w-20 h-20 text-2xl',
    '2xl': 'w-24 h-24 text-3xl',
    'full': 'w-full h-full text-base'
  }

  const badgeSizes: Record<string, string> = {
    'xs': 'w-2 h-2',
    'sm': 'w-2.5 h-2.5',
    'md': 'w-3.5 h-3.5',
    'lg': 'w-4 h-4',
    'xl': 'w-5 h-5',
    '2xl': 'w-6 h-6',
    'full': 'w-4 h-4'
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Outer Ring for Premium/Verified */}
      <div className={`rounded-full flex items-center justify-center p-[1.5px] transition-transform
        ${sizeClasses[size]}
        ${isPremium ? 'bg-gradient-to-tr from-[#7C3AED] to-[#EC4899]' : (size === 'full' ? 'bg-transparent' : 'bg-white/5')}
      `}>
        {/* Inner Content */}
        <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${size === 'full' ? 'bg-transparent' : 'bg-background'}`}>
          {src ? (
            <img src={src} alt={username} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-accent font-bold ${size === 'full' ? 'bg-transparent' : 'bg-accent/20'}`}>
              {initial}
            </div>
          )}
        </div>
      </div>

      {/* Verified Badge Overlay */}
      {isVerified && (
        <div className={`absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5`}>
          <CheckCircle2 className={`${badgeSizes[size]} text-accent fill-accent/20`} />
        </div>
      )}
    </div>
  )
}
