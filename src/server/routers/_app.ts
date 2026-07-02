import { router } from "../trpc"
import { roomRouter } from "./room"
import { messageRouter } from "./message"
import { checklistItemRouter } from "./checklistItem"

export const appRouter = router({
  room: roomRouter,
  message: messageRouter,
  checklistItem: checklistItemRouter,
})

export type AppRouter = typeof appRouter
