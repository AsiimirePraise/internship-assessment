'use client'

import { X, Trash2, Share2, Calendar, Mic, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface HistoryItem {
  id: string
  title: string
  timestamp: string
  date: string
  language: string
  type: 'audio' | 'text'
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  historyItems: HistoryItem[]
  onDeleteItem: (id: string) => void
  onShareItem: (id: string) => void
  onClearAll: () => void
  onSelectItem: (id: string) => void
}

export default function HistoryModal({
  isOpen,
  onClose,
  historyItems,
  onDeleteItem,
  onShareItem,
  onClearAll,
  onSelectItem,
}: HistoryModalProps) {
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      onClearAll()
    }
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      onDeleteItem(id)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - More transparent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* Modal - Left side */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-primary-dark/95 backdrop-blur-md border-r border-gray-700 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Processing History</h2>
                  <p className="text-xs text-gray-400">
                    {historyItems.length} {historyItems.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary-light rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {historyItems.length > 0 ? (
                <div className="space-y-2">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-primary-light/30 border border-gray-700 rounded-xl p-4 hover:border-accent/50 hover:bg-primary-light/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.type === 'audio' ? (
                            <Mic className="w-5 h-5 text-accent" />
                          ) : (
                            <FileText className="w-5 h-5 text-accent" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => {
                              onSelectItem(item.id)
                              onClose()
                            }}
                            className="text-left w-full group-hover:text-accent transition-colors"
                          >
                            <h3 className="text-sm font-bold text-white truncate mb-1">
                              {item.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                              <span>{item.date}</span>
                              <span>•</span>
                              <span>{item.timestamp}</span>
                              <span>•</span>
                              <span className="capitalize">{item.type}</span>
                              <span>•</span>
                              <span>{item.language}</span>
                            </div>
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onShareItem(item.id)}
                            className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 text-accent" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-2 hover:bg-error/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-primary-light/50 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No History Yet</h3>
                  <p className="text-sm text-gray-400 max-w-sm">
                    Start processing audio or text to build your history. All your past activities will appear here.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {historyItems.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <button
                  onClick={handleClearAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-all font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}