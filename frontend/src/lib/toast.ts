/**
 * toast.ts — Drishti Global Toast Notification System
 * Uses a custom event bus so any component can fire toasts
 * without prop-drilling or a global state lib.
 *
 * Usage:
 *   import { toast } from '../lib/toast'
 *   toast.success('Post uploaded!')
 *   toast.error('Something went wrong')
 *   toast.info('Loading...')
 */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastEvent {
  id: string
  type: ToastType
  message: string
}

const emit = (type: ToastType, message: string) => {
  const event = new CustomEvent<ToastEvent>('drishti-toast', {
    detail: { id: crypto.randomUUID(), type, message }
  })
  window.dispatchEvent(event)
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
  warning: (message: string) => emit('warning', message),
}
