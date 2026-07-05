"use client"

import { createContext, useContext, useMemo } from "react"
import {
  useEditMessage, useDeleteMessage, useTogglePin,
  useToggleDone, useSetReminder, useMarkReminded, useChecklistToggle,
} from "./useMessages"

type MessageActions = {
  editMessage: ReturnType<typeof useEditMessage>
  deleteMessage: ReturnType<typeof useDeleteMessage>
  togglePin: ReturnType<typeof useTogglePin>
  toggleDone: ReturnType<typeof useToggleDone>
  setReminder: ReturnType<typeof useSetReminder>
  markReminded: ReturnType<typeof useMarkReminded>
  checklistToggle: ReturnType<typeof useChecklistToggle>
}

const MessageActionsContext = createContext<MessageActions | null>(null)

export function MessageActionsProvider({
  roomId,
  children,
}: {
  roomId: string
  children: React.ReactNode
}) {
  const editMessage = useEditMessage(roomId)
  const deleteMessage = useDeleteMessage(roomId)
  const togglePin = useTogglePin(roomId)
  const toggleDone = useToggleDone(roomId)
  const setReminder = useSetReminder(roomId)
  const markReminded = useMarkReminded(roomId)
  const checklistToggle = useChecklistToggle(roomId)

  const value = useMemo(
    () => ({ editMessage, deleteMessage, togglePin, toggleDone, setReminder, markReminded, checklistToggle }),
    [editMessage, deleteMessage, togglePin, toggleDone, setReminder, markReminded, checklistToggle]
  )

  return <MessageActionsContext.Provider value={value}>{children}</MessageActionsContext.Provider>
}

export function useMessageActions() {
  const ctx = useContext(MessageActionsContext)
  if (!ctx) throw new Error("useMessageActions harus dipanggil di dalam MessageActionsProvider")
  return ctx
}
