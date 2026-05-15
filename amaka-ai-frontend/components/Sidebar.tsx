'use client'

import { Home, History, Settings, ChevronLeft, ChevronRight, Mic, FileText, Clock, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { useDrag } from '@use-gesture/react'

interface HistoryItem {
  id: string
  title: string
  timestamp: string
  date: string
  language: string
  type: 'audio' | 'text'
  data: {
    transcript?: string
    summary?: string
    translation?: string
    audioUrl?: string
  }
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  onHistoryClick: () => void
  historyItems?: HistoryItem[]
  onSelectHistoryItem?: (id: string) => void
  onDeleteHistoryItem?: (id: string) => void
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  onHistoryClick,
  historyItems = [],
  onSelectHistoryItem,
  onDeleteHistoryItem,
}: SidebarProps) {
  const recentHistory = historyItems.slice(0, 5)
  const sidebarRef = useRef<HTMLElement>(null)

  // Swipe to close gesture (mobile)
  const bind = useDrag(
    ({ movement: [mx], direction: [xDir], cancel }) => {
      // Only on mobile and when swiping left
      if (window.innerWidth > 768) return

      if (xDir < 0 && Math.abs(mx) > 100) {
        onToggle()
        cancel()
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10
    }
  )

  return (
    <aside
      ref={sidebarRef}
      {...bind()}
      className={`bg-primary-dark border-r border-gray-700 flex flex-col h-screen transition-all duration-300 touch-pan-y ${isCollapsed ? 'w-16' : 'w-80'
        }`}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-white font-bold text-lg">Amaka AI</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-primary-light rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
          </>
        ) : (
          <button
            onClick={onToggle}
            className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center mx-auto"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all bg-primary-light text-accent ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? 'Home' : ''}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Home</span>}
        </button>

        <button
          onClick={onHistoryClick}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-gray-400 hover:text-white hover:bg-primary-light/50 ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? 'History' : ''}
        >
          <History className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">History</span>}
        </button>

        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-gray-400 hover:text-white hover:bg-primary-light/50 ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? 'Settings' : ''}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Settings</span>}
        </button>
      </nav>

      {/* Recent History */}
      {!isCollapsed && (
        <div className="flex-1 p-4 overflow-y-auto scrollbar-custom">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Recent History
            </h3>
            {historyItems.length > 0 && (
              <button
                onClick={onHistoryClick}
                className="text-xs text-gray-500 hover:text-accent transition-colors"
              >
                View all
              </button>
            )}
          </div>

          {historyItems.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">
              No history yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectHistoryItem?.(item.id)}
                  className="w-full text-left p-3 rounded-lg bg-primary-light/30 hover:bg-primary-light/50 border border-gray-700 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-2 mb-2">
                    {item.type === 'audio' ? (
                      <Mic size={16} className="text-accent mt-1 flex-shrink-0" />
                    ) : (
                      <FileText size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-200 truncate group-hover:text-accent transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-gray-600" />
                        <span className="text-xs text-gray-600">{item.timestamp} · {item.date}</span>
                      </div>
                    </div>
                    {onDeleteHistoryItem && (
                      <div
                        role="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteHistoryItem(item.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 text-gray-600 transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{item.type === 'audio' ? 'Audio' : 'Text'}</span>
                    <span className="text-gray-700">•</span>
                    <span className="text-accent">{item.language}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {historyItems.length > 5 && (
            <button
              onClick={onHistoryClick}
              className="w-full mt-3 text-sm text-accent hover:text-accent/80 transition-colors text-center"
            >
              View all history
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-600 text-center">
            Swipe left to close • Tap History to view all
          </p>
        </div>
      )}
    </aside>
  )
}