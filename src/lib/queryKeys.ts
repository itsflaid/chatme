export const queryKeys = {
  rooms: ["rooms"] as const,
  room: (roomId: string) => ["rooms", roomId] as const,
  messages: (roomId: string) => ["messages", roomId] as const,
}
