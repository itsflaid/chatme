"use client"

import { useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc"
import { getRoomsKey } from "./useMessages"
import type { RoomData } from "./useRooms"

export type RoomHeaderData = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  pinnedAt: Date | null
}

export type RoomInfoData = {
  id: string
  name: string
  icon: string
  description: string | null
  createdAt: Date
  totalPesan: number
  pesanDipin: number
  reminderAktif: number
  checklist: { total: number; selesai: number }
  aktivitasTerakhir: Date | null
}

export function useRoomInfo(roomId: string) {
  return trpc.room.getInfo.useQuery({ id: roomId })
}

export function useRoom(roomId: string) {
  const queryClient = useQueryClient()
  const roomsKey = getRoomsKey()

  const cachedList = queryClient.getQueryData<RoomData[]>(roomsKey)
  const fromList = cachedList?.find((r) => r.id === roomId)

  const initialData: RoomHeaderData | undefined = fromList
    ? {
        id: fromList.id,
        name: fromList.name,
        icon: fromList.icon,
        description: fromList.description,
        isPinned: fromList.isPinned,
        pinnedAt: fromList.pinnedAt,
      }
    : undefined

  return trpc.room.getById.useQuery(
    { id: roomId },
    {
      initialData,
      initialDataUpdatedAt: initialData ? 0 : undefined,
    }
  )
}
