"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getCache, setCache, CacheKeys } from "@/lib/cache"

export type RoomData = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

// L1 memory cache — sync, zero latency
let memoryRooms: RoomData[] | null = null

export default function useRooms(serverRooms?: RoomData[] | null) {
  // Priority: serverRooms → memory cache → []
  const initial = serverRooms ?? memoryRooms ?? []

  const [rooms, setRooms] = useState<RoomData[]>(initial)
  // Kalau sudah ada data (server atau memory), skip loading state
  const [loading, setLoading] = useState(initial.length === 0)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Bekukan serverRooms di ref — nilainya sudah dipakai untuk useState initial,
  // tidak perlu masuk dependency useEffect (mencegah loop karena referensi array baru tiap render)
  const serverRoomsRef = useRef(serverRooms)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms")
      if (!res.ok) throw new Error("Gagal mengambil data")
      const data = await res.json()
      if (!mountedRef.current) return null
      return data.rooms.map((r: Record<string, unknown>) => ({
        ...r,
        messages: (r.messages as Record<string, unknown>[]).map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt as string),
        })),
      })) as RoomData[]
    } catch {
      return null
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const fresh = await fetchRooms()
    if (!fresh) {
      setError("Gagal refresh data")
      setLoading(false)
      return
    }
    memoryRooms = fresh
    setRooms(fresh)
    setCache(CacheKeys.rooms, fresh)
    setLoading(false)
  }, [fetchRooms])

  useEffect(() => {
    window.addEventListener("rooms:refresh", refresh as EventListener)
    return () => window.removeEventListener("rooms:refresh", refresh as EventListener)
  }, [refresh])

  useEffect(() => {
    let cancelled = false

    async function init() {
      const initialServerRooms = serverRoomsRef.current
      const hasInitialData =
        (initialServerRooms?.length ?? 0) > 0 || (memoryRooms?.length ?? 0) > 0

      if (!hasInitialData) {
        // L2: cek IndexedDB kalau tidak ada sama sekali
        const cached = await getCache<RoomData[]>(CacheKeys.rooms)
        if (cached && !cancelled) {
          const parsed = cached.data.map((r) => ({
            ...r,
            messages: r.messages.map((m) => ({
              ...m,
              createdAt: new Date(m.createdAt),
            })),
          }))
          memoryRooms = parsed
          setRooms(parsed)
          setLoading(false)
        }
      }

      // L3: background revalidate dari server (hanya jalan sekali saat mount)
      const fresh = await fetchRooms()
      if (cancelled || !fresh) return

      memoryRooms = fresh
      setRooms(fresh)
      setCache(CacheKeys.rooms, fresh)
      setError(null)
      setLoading(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [fetchRooms])

  const updateLastMessage = useCallback((roomId: string, text: string) => {
    const now = new Date()
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === roomId
          ? { ...r, messages: [{ text, createdAt: now }] }
          : r
      )
      updated.sort((a, b) => {
        const aTime = a.messages[0]?.createdAt?.getTime() ?? 0
        const bTime = b.messages[0]?.createdAt?.getTime() ?? 0
        return bTime - aTime
      })
      memoryRooms = updated
      return updated
    })
    fetchRooms().then((fresh) => {
      if (!fresh) return
      memoryRooms = fresh
      setRooms(fresh)
      setCache(CacheKeys.rooms, fresh)
    })
  }, [fetchRooms])

  return { rooms, loading, error, refresh, updateLastMessage }
}