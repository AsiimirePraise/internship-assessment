'use client'

import { AlertCircle, XCircle, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { notificationSounds } from '@/lib/sounds'

interface Alert {
  id: number
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
}

interface AlertsSectionProps {
  alerts: Alert[]
  onRemoveAlert: (id: number) => void
}

export default function AlertsSection({ alerts, onRemoveAlert }: AlertsSectionProps) {
  // Play sound when new alert is added
  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[alerts.length - 1]

      switch (latestAlert.type) {
        case 'error':
          notificationSounds.error()
          break
        case 'warning':
          notificationSounds.warning()
          break
        case 'info':
          notificationSounds.info()
          break
      }
    }
  }, [alerts.length]) // Only trigger when alert count changes

  if (alerts.length === 0) return null

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-error/10 border-error/30 shadow-error/10',
          icon: 'bg-error/20 text-error',
          title: 'text-error',
          Icon: XCircle,
        }
      case 'warning':
        return {
          container: 'bg-warning/10 border-warning/30 shadow-warning/10',
          icon: 'bg-warning/20 text-warning',
          title: 'text-warning',
          Icon: AlertCircle,
        }
      case 'info':
        return {
          container: 'bg-info/10 border-info/30 shadow-info/10',
          icon: 'bg-info/20 text-info',
          title: 'text-info',
          Icon: Info,
        }
    }
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-bold text-warning uppercase tracking-wide">
          ALERTS & MESSAGES
        </h3>
      </div>

      {alerts.map((alert) => {
        const styles = getAlertStyles(alert.type)
        const Icon = styles.Icon

        return (
          <div
            key={alert.id}
            className={`${styles.container} backdrop-blur-sm border rounded-xl p-4 flex items-start gap-3 shadow-lg animate-slide-in`}
          >
            <div className={`w-10 h-10 ${styles.icon} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className={`${styles.title} font-bold text-sm mb-1`}>
                {alert.title}
              </h3>
              <p className="text-gray-300 text-xs font-medium">
                {alert.message}
              </p>
            </div>
            <button
              onClick={() => onRemoveAlert(alert.id)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        )
      })}
    </div>
  )
}