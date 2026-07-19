"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMessagesQuery } from "@/hooks/useMessages"
import { useRoom } from "@/hooks/useRoom"
import ChatContainer from "./ChatContainer"

type Props = {
  roomId: string
}

export default function RoomWrapper({ roomId }: Props) {
  const router = useRouter()
  const { data: room, error: roomError } = useRoom(roomId)
  const { data: messages = [], fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessagesQuery(roomId)

  useEffect(() => {
    if (roomError) router.replace("/")
  }, [roomError, router])

  if (!room && !roomError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] animate-pulse" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-28 h-3 rounded-full bg-[var(--surface2)] animate-pulse" />
          <div className="w-20 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>
    )
  }

  if (roomError || !room) return null

  return (
    <ChatContainer
      room={room}
      messages={messages}
      loading={isLoading}
      loadingMore={isFetchingNextPage}
      hasMore={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
    />
  )
}