"use client"

import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => (await get(key)) ?? null,
    setItem: async (key: string, value: string) => set(key, value),
    removeItem: async (key: string) => del(key),
  },
  key: "chatme-query-cache",
  throttleTime: 1000,
})
