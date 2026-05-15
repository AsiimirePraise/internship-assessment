'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'amaka-history-v1'

export interface HistoryItem {
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

type SetterArg = HistoryItem[] | ((prev: HistoryItem[]) => HistoryItem[])

function readFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToStorage(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage quota exceeded or private-browsing restriction — silently ignore.
  }
}

export function usePersistedHistory(): [HistoryItem[], (arg: SetterArg) => void] {
  const [items, setItemsState] = useState<HistoryItem[]>([])

  // Hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    setItemsState(readFromStorage())
  }, [])

  const setItems = useCallback((arg: SetterArg) => {
    setItemsState((prev) => {
      const next = typeof arg === 'function' ? arg(prev) : arg
      writeToStorage(next)
      return next
    })
  }, [])

  return [items, setItems]
}

/** Convenience: add a new item to the front of the list */
export function prependHistoryItem(
  setItems: (arg: SetterArg) => void,
  item: HistoryItem,
  maxItems = 100
) {
  setItems((prev) => [item, ...prev].slice(0, maxItems))
}

/** Convenience: delete one item by id */
export function deleteHistoryItem(
  setItems: (arg: SetterArg) => void,
  id: string
) {
  setItems((prev) => prev.filter((item) => item.id !== id))
}

/** Convenience: clear everything */
export function clearHistory(setItems: (arg: SetterArg) => void) {
  setItems([])
}