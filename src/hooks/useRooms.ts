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

// Standalone function — bisa dipanggil dari mana saja tanpa instance hook
// Dipakai oleh RoomWrapper supaya tidak perlu buat instance useRooms baru
export function updateRoomLastMessage(roomId: string, text: string): void {
  const now = new Date()
  const prev = memoryRooms ?? []
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
  // Import setCache tidak tersedia di sini karena ini di luar hook,
  // jadi dispatch event saja — instance useRooms aktif yang akan handle cache
  window.dispatchEvent(new CustomEvent("rooms:updated", { detail: updated }))
}

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

  // Sync antar instance useRooms via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<RoomData[]>
      if (customEvent.detail && customEvent.detail.length > 0) {
        // Pakai data dari event langsung — guaranteed sudah up-to-date
        setRooms(customEvent.detail)
      } else if (memoryRooms) {
        // Fallback ke memoryRooms kalau tidak ada detail (backward compat)
        setRooms(memoryRooms)
      }
    }
    window.addEventListener("rooms:updated", handler)
    return () => window.removeEventListener("rooms:updated", handler)
  }, [])

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

    // Ambil state terkini dari memoryRooms (module-level, selalu up-to-date)
    // lakukan komputasi di luar setState agar memoryRooms bisa di-set
    // sebelum dispatchEvent, bukan di dalam callback yang di-defer React
    const prev = memoryRooms ?? []
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

    // Set memoryRooms DULU sebelum dispatch event
    // supaya handler rooms:updated di instance lain baca nilai yang sudah benar
    memoryRooms = updated
    setCache(CacheKeys.rooms, updated)

    // Update state instance ini
    setRooms(updated)

    // Dispatch dengan data langsung via CustomEvent — tidak bergantung timing memoryRooms
    window.dispatchEvent(new CustomEvent("rooms:updated", { detail: updated }))
  }, [])

  return { rooms, loading, error, refresh, updateLastMessage }
}