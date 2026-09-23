"use client"

import { useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc"
import { getRoomsKey } from "./useMessages"

export type RoomData = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  pinnedAt: Date | null
  userId: string
  createdAt: Date
  updatedAt: Date
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

export function sortRoomsPinnedFirst(rooms: RoomData[]): RoomData[] {
  return [...rooms].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.isPinned && b.isPinned) {
      return (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0)
    }
    const aTime = a.messages[0]?.createdAt?.getTime() ?? new Date(a.createdAt).getTime()
    const bTime = b.messages[0]?.createdAt?.getTime() ?? new Date(b.createdAt).getTime()
    return bTime - aTime
  })
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

export function useCreateRoom() {
  const queryClient = useQueryClient()
  const roomsKey = getRoomsKey()

  return trpc.room.create.useMutation({
    onSuccess: (newRoom) => {
      queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) => {
        if (!old) return old
        return sortRoomsPinnedFirst([
          { ...newRoom, _count: { messages: 0 }, messages: [] },
          ...old,
        ])
      })
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  const roomsKey = getRoomsKey()

  return trpc.room.update.useMutation({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: roomsKey })
      const previous = queryClient.getQueryData<RoomData[]>(roomsKey)
      queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) =>
        old?.map((r) => (r.id === variables.id ? { ...r, ...variables } : r))
      )
      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(roomsKey, context.previous)
    },
  })
}

export function useTogglePinRoom() {
  const queryClient = useQueryClient()
  const roomsKey = getRoomsKey()

  return trpc.room.togglePin.useMutation({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: roomsKey })
      const previous = queryClient.getQueryData<RoomData[]>(roomsKey)
      queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) =>
        old
          ? sortRoomsPinnedFirst(
              old.map((r) =>
                r.id === variables.id
                  ? { ...r, isPinned: variables.isPinned, pinnedAt: variables.isPinned ? new Date() : null }
                  : r
              )
            )
          : old
      )
      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(roomsKey, context.previous)
    },
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  const roomsKey = getRoomsKey()

  return trpc.room.delete.useMutation({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: roomsKey })
      const previous = queryClient.getQueryData<RoomData[]>(roomsKey)
      queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) =>
        old?.filter((r) => r.id !== variables.id)
      )
      return { previous }
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(roomsKey, context.previous)
    },
  })
}