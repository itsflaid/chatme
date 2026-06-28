"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getCache, setCache, updateCache, CacheKeys, CACHE_INITIAL } from "@/lib/cache"
import type { ChatMessage } from "@/types/chat"

// L1 in-memory cache — sync, zero latency
// Hidup selama tab terbuka, tidak perlu await
const memoryCache = new Map<string, ChatMessage[]>()

type MessageAPI = {
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => Promise<void>
  addMessage: (msg: ChatMessage) => void
  replaceMessage: (tempId: string, real: ChatMessage) => void
  removeMessage: (id: string) => void
  patchMessage: (id: string, patch: Partial<ChatMessage>) => void
  mergeMessages: (newMsgs: ChatMessage[]) => void
  refresh: () => Promise<void>
}

export default function useMessages(roomId: string): MessageAPI {
  const cacheKey = CacheKeys.messages(roomId)

  // Cek memory cache dulu — sync, langsung ada
  const memHit = memoryCache.get(cacheKey)

  const [messages, setMessages] = useState<ChatMessage[]>(memHit ?? [])
  const [loading, setLoading] = useState(!memHit) // kalau ada di memory, skip loading
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const messagesRef = useRef<ChatMessage[]>(messages)

  useEffect(() => {
    messagesRef.current = messages
    // Sync ke memory cache setiap update
    if (messages.length > 0) {
      memoryCache.set(cacheKey, messages)
    }
  }, [messages, cacheKey])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Kalau memory cache sudah ada, langsung fetch fresh di background
      // tanpa set loading true (sudah ada konten yang ditampilkan)
      if (!memHit) {
        setLoading(true)

        // L2: cek IndexedDB
        const cached = await getCache<ChatMessage[]>(cacheKey)
        if (cached && !cancelled) {
          setMessages(cached.data)
          memoryCache.set(cacheKey, cached.data)
          setLoading(false)
        }
      }

      // L3: fetch fresh dari server (selalu jalan, sebagai background revalidate)
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages?limit=${CACHE_INITIAL}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return

        const fresh = data.messages as ChatMessage[]
        setMessages(fresh)
        memoryCache.set(cacheKey, fresh)
        await setCache(cacheKey, fresh)
        setHasMore(data.hasMore)
        setError(null)
      } catch {
        if (!cancelled && messagesRef.current.length === 0) {
          setError("Gagal memuat pesan")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [roomId, cacheKey, memHit])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    const oldest = messagesRef.current[0]
    if (!oldest) return

    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages?before=${oldest.id}&limit=30`)
      if (!res.ok) return
      const data = await res.json()

      const older = data.messages as ChatMessage[]
      const merged = await updateCache(cacheKey, older)
      if (merged) {
        setMessages(merged)
        memoryCache.set(cacheKey, merged)
      } else {
        setMessages((prev) => {
          const next = [...older, ...prev]
          memoryCache.set(cacheKey, next)
          return next
        })
      }

      setHasMore(data.hasMore)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [roomId, cacheKey, hasMore, loading])

  const addMessage = useCallback(
    (msg: ChatMessage) => {
      setMessages((prev) => {
        const next = [...prev, msg]
        memoryCache.set(cacheKey, next)
        return next
      })
      updateCache(cacheKey, [msg])
    },
    [cacheKey]
  )

  const replaceMessage = useCallback(
    (tempId: string, real: ChatMessage) => {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? real : m))
        memoryCache.set(cacheKey, next)
        return next
      })
      updateCache(cacheKey, [real])
    },
    [cacheKey]
  )

  const removeMessage = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== id)
        memoryCache.set(cacheKey, next)
        return next
      })
    },
    [cacheKey]
  )

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
        memoryCache.set(cacheKey, next)
        return next
      })
    },
    [cacheKey]
  )

  const mergeMessages = useCallback(
    (newMsgs: ChatMessage[]) => {
      if (newMsgs.length === 0) return
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id))
        const fresh = newMsgs.filter((m) => !existingIds.has(m.id))
        if (fresh.length === 0) return prev
        const merged = [...prev, ...fresh]
        memoryCache.set(cacheKey, merged)
        updateCache(cacheKey, fresh)
        return merged
      })
    },
    [cacheKey]
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages?limit=${CACHE_INITIAL}`)
      if (!res.ok) throw new Error("Gagal refresh")
      const data = await res.json()
      const fresh = data.messages as ChatMessage[]
      setMessages(fresh)
      memoryCache.set(cacheKey, fresh)
      await setCache(cacheKey, fresh)
      setHasMore(data.hasMore)
    } catch {
      setError("Gagal refresh data")
    } finally {
      setLoading(false)
    }
  }, [roomId, cacheKey])

  return {
    messages,
    loading,
    hasMore,
    error,
    loadMore,
    addMessage,
    replaceMessage,
    removeMessage,
    patchMessage,
    mergeMessages,
    refresh,
  }
}