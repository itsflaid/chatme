import { get, set, del, clear } from "idb-keyval"

export const CACHE_VERSION = 1
export const CACHE_TTL = 5 * 60 * 1000
export const CACHE_INITIAL = 30
export const CACHE_MAX = 100

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
  newItems: T[],
  maxItems: number = CACHE_MAX
): Promise<T[] | null> {
  try {
    const existing = await get<CacheEntry<T[]> | undefined>(key)
    if (!existing || existing.version !== CACHE_VERSION) {
      const limited = newItems.slice(-maxItems)
      await setCache(key, limited)
      return limited
    }
    const merged = [...existing.data, ...newItems]
    const unique = merged.filter(
      (item, index, self) => self.findIndex((i) => i.id === item.id) === index
    )
    const limited = unique.slice(-maxItems)
    await set(key, { ...existing, data: limited })
    return limited
  } catch {
    return null
  }
}
