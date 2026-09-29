import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

type MotionButtonProps = ButtonProps & React.ComponentProps<typeof motion.button>

export const Button = React.forwardRef<HTMLButtonElement, MotionButtonProps>(({ 
  className, variant = 'primary', size = 'md', ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25",
    secondary: "bg-surface text-textPrimary hover:bg-surface/80 border border-white/5",
    outline: "border border-primary text-primary hover:bg-primary/10",
    ghost: "hover:bg-white/5 text-textPrimary"
  }
  
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg"
  }

  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  )
})
Button.displayName = "Button"
