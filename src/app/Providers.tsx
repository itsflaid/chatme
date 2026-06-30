"use client"

import { useEffect } from "react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient, idbPersister } from "@/lib/queryClient"
import { initBroadcastListener } from "@/lib/broadcastSync"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initBroadcastListener()
    return cleanup
  }, [])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 24 * 60 * 60_000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            ["rooms", "messages"].includes(query.queryKey[0] as string),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
