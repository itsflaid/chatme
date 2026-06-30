"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export type RoomData = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

async function fetchRooms(): Promise<RoomData[]> {
  const res = await fetch("/api/rooms")
  if (!res.ok) throw new Error("Gagal mengambil data")
  const data = await res.json()
  return data.rooms.map((r: Record<string, unknown>) => ({
    ...r,
    messages: (r.messages as Record<string, unknown>[]).map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt as string),
    })),
  })) as RoomData[]
}

export default function useRooms(serverRooms?: RoomData[] | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: fetchRooms,
    initialData: serverRooms ?? undefined,
  })

  return {
    rooms: data ?? [],
    loading: isLoading,
    error: error ? "Gagal mengambil data" : null,
    refresh: refetch,
  }
}
