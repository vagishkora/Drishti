import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

export const PageWrapper: React.FC<{ 
  children: React.ReactNode, 
  className?: string,
  noPadding?: boolean 
}> = ({ children, className, noPadding }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full mx-auto max-w-7xl",
        !noPadding && "pt-24 pb-12 px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </motion.div>
  )
}
