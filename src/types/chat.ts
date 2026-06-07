import type { ChecklistItem, Message } from "@prisma/client"

export type ChatMessage = Message & {
  checklistItems: ChecklistItem[]
}
