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

export default function useRooms(serverRooms?: RoomData[] | null) {
  const [rooms, setRooms] = useState<RoomData[]>(serverRooms ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

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
    setRooms(fresh)
    setCache(CacheKeys.rooms, fresh)
    setLoading(false)
  }, [fetchRooms])

  useEffect(() => {
    function handleRefresh() {
      refresh()
    }
    window.addEventListener("rooms:refresh", handleRefresh)
    return () => window.removeEventListener("rooms:refresh", handleRefresh)
  }, [refresh])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)

      const cached = await getCache<RoomData[]>(CacheKeys.rooms)
      if (cached && !cancelled) {
        setRooms(cached.data)
        setLoading(false)
      } else if (!serverRooms && !cancelled) {
        setLoading(true)
      }

      const fresh = await fetchRooms()
      if (cancelled || !fresh) return

      setRooms(fresh)
      setCache(CacheKeys.rooms, fresh)
      setError(null)
      setLoading(false)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [serverRooms, fetchRooms])

  return { rooms, loading, error, refresh }
}
