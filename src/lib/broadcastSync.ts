"use client"

import { queryClient } from "./queryClient"
import type { QueryKey } from "@tanstack/react-query"

const channel = typeof window !== "undefined" ? new BroadcastChannel("chatme-sync") : null

export function broadcastInvalidate(queryKey: QueryKey) {
  channel?.postMessage({ type: "invalidate", queryKey })
}

export function initBroadcastListener() {
  if (!channel) return () => {}
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "invalidate") {
      queryClient.invalidateQueries({ queryKey: event.data.queryKey })
    }
  }
  channel.addEventListener("message", handler)
  return () => channel.removeEventListener("message", handler)
}
