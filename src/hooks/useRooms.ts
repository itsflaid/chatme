"use client"

import { trpc } from "@/lib/trpc"

export type RoomData = {
  id: string
  name: string
  icon: string
  description: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

export default function useRooms(serverRooms?: RoomData[] | null) {
  const { data, isLoading, error, refetch } = trpc.room.list.useQuery(undefined, {
    initialData: serverRooms ?? undefined,
  })

  return {
    rooms: data ?? [],
    loading: isLoading,
    error: error ? "Gagal mengambil data" : null,
    refresh: refetch,
  }
}
