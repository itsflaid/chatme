"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getCache, setCache, updateCache, CacheKeys } from "@/lib/cache"
import type { ChatMessage } from "@/types/chat"

// L1 in-memory cache — sync, zero latency
// Hidup selama tab terbuka, tidak perlu await
const memoryCache = new Map<string, ChatMessage[]>()

type MessageAPI = {
  messages: ChatMessage[]
  loading: boolean
  loadingMore: boolean
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

  // Baca sekali saat inisialisasi — aman karena ini bukan ref.current,
  // melainkan nilai yang di-capture saat pertama kali hook dipanggil
  // dan disimpan di useState/useRef agar tidak berubah antar render
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => memoryCache.get(cacheKey) ?? []
  )
  const [loading, setLoading] = useState(
    () => !memoryCache.has(cacheKey)
  )
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const mountedRef = useRef(true)
  const messagesRef = useRef<ChatMessage[]>(messages)

  // Flag apakah sudah ada cache saat mount — dibekukan agar tidak masuk dependency
  const hadCacheOnMount = useRef(memoryCache.has(cacheKey))

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
      if (!hadCacheOnMount.current) {
        setLoading(true)

        // L2: cek IndexedDB
        const cached = await getCache<ChatMessage[]>(cacheKey)
        if (cached && !cancelled) {
          // Tetap tampilkan data expired sebagai fallback visual,
          // tapi jangan set ke memoryCache kalau sudah expired
          // (biar L3 fetch yang update memoryCache dengan data fresh)
          if (!cached.isExpired) {
            memoryCache.set(cacheKey, cached.data)
          }
          setMessages(cached.data)
          setLoading(false)
        }
      }

      // L3: fetch fresh dari server (selalu jalan, sebagai background revalidate)
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages?limit=50`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return

        const fresh = data.messages as ChatMessage[]
        const freshIds = new Set(fresh.map((m) => m.id))

        setMessages((prev) => {
          // Ambil semua optimistic messages yang masih pending (belum dikonfirmasi server)
          const pendingTemps = prev.filter((m) => m.id.startsWith("temp-") && !freshIds.has(m.id))

          // Kalau tidak ada yang pending, aman untuk overwrite langsung
          if (pendingTemps.length === 0) {
            return fresh
          }

          // Ada optimistic messages — merge: server data + pending temps di akhir
          return [...fresh, ...pendingTemps]
        })

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
  }, [roomId, cacheKey])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    const oldest = messagesRef.current[0]
    if (!oldest) return

    setLoadingMore(true)
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
      setLoadingMore(false)
    }
  }, [roomId, cacheKey, hasMore, loadingMore])

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
        const found = prev.some((m) => m.id === tempId)
        let next: ChatMessage[]

        if (found) {
          // Normal case: replace temp dengan real
          next = prev.map((m) => (m.id === tempId ? real : m))
        } else {
          // Fallback: tempId sudah di-overwrite oleh background fetch,
          // cek apakah real message sudah ada di state (mungkin sudah masuk via server fetch)
          const alreadyExists = prev.some((m) => m.id === real.id)
          if (alreadyExists) {
            // Sudah ada, tidak perlu tambah lagi
            next = prev
          } else {
            // Belum ada, append ke akhir
            next = [...prev, real]
          }
        }

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
      const res = await fetch(`/api/rooms/${roomId}/messages?limit=50`)
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
    loadingMore,
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