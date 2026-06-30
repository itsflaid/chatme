import { get, set, del, clear } from "idb-keyval"

export const CACHE_VERSION = 1
export const CACHE_TTL = 5 * 60 * 1000

export type CacheEntry<T> = {
  data: T
  updatedAt: number
  expiresAt: number
  version: number
}

export const CacheKeys = {
  rooms: "chat:rooms",
  messages: (roomId: string) => `chat:messages:${roomId}`,
} as const

export async function getCache<T>(
  key: string
): Promise<{ data: T; isExpired: boolean } | null> {
  try {
    const entry = await get<CacheEntry<T> | undefined>(key)
    if (!entry) return null
    if (entry.version !== CACHE_VERSION) {
      await del(key)
      return null
    }
    return {
      data: entry.data,
      isExpired: Date.now() > entry.expiresAt,
    }
  } catch {
    return null
  }
}

export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = CACHE_TTL
): Promise<void> {
  try {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      data,
      updatedAt: now,
      expiresAt: now + ttl,
      version: CACHE_VERSION,
    }
    await set(key, entry)
  } catch {
    /* IndexedDB tidak tersedia — silent fallback */
  }
}

export async function invalidate(key: string): Promise<void> {
  try {
    await del(key)
  } catch {
    /* silent fallback */
  }
}

export async function invalidateAll(): Promise<void> {
  try {
    await clear()
  } catch {
    /* silent fallback */
  }
}

export async function updateCache<T extends { id: string }>(
  key: string,
  newItems: T[]
): Promise<T[] | null> {
  try {
    const existing = await get<CacheEntry<T[]> | undefined>(key)
    if (!existing || existing.version !== CACHE_VERSION) {
      await setCache(key, newItems)
      return newItems
    }
    const map = new Map(existing.data.map((i) => [i.id, i]))
    newItems.forEach((i) => map.set(i.id, i))
    const unique = [...map.values()]
    await set(key, { ...existing, data: unique })
    return unique
  } catch {
    return null
  }
}
