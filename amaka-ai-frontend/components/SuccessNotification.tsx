'use client'

import { CheckCircle, X } from 'lucide-react'
import { useEffect } from 'react'
import { notificationSounds } from '@/lib/sounds'

interface SuccessNotificationProps {
  onClose: () => void
}

export default function SuccessNotification({ onClose }: SuccessNotificationProps) {
  useEffect(() => {
    // Play success sound when notification appears
    notificationSounds.complete()

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="mb-4 animate-slide-in">
      <div className="bg-success/10 backdrop-blur-sm border border-success/30 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-success/10">
        <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="text-success font-bold text-sm mb-1">Processing Complete!</h3>
          <p className="text-gray-300 text-xs font-medium">
            Your content has been successfully transcribed, summarized, translated, and synthesized.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-success/10 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  )
}