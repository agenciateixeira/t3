import { useState, useCallback } from 'react'

type ToastVariant = 'default' | 'destructive'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

const toastTimeouts = new Map<string, NodeJS.Timeout>()

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7)
    const newToast: Toast = { id, ...options }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after specified duration or default 5 seconds
    const duration = options.duration || 5000
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      toastTimeouts.delete(id)
    }, duration)

    toastTimeouts.set(id, timeout)

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timeout = toastTimeouts.get(id)
    if (timeout) {
      clearTimeout(timeout)
      toastTimeouts.delete(id)
    }
  }, [])

  return { toast, toasts, dismiss }
}
