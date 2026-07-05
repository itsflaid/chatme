"use client"

import { useEffect, useState } from "react"
import { httpBatchLink } from "@trpc/client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient, idbPersister } from "@/lib/queryClient"
import { trpc } from "@/lib/trpc"
import { initBroadcastListener } from "@/lib/broadcastSync"
import superjson from 'superjson';


export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initBroadcastListener()
    return cleanup
  }, [])

const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: idbPersister,
          maxAge: 24 * 60 * 60_000,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0]
            return Array.isArray(key) && (key[0] === "room" || key[0] === "message")
          },
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    </trpc.Provider>
  )
}
