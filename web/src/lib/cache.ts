/**
 * Simple module-level cache for persisting data across component unmounts.
 * Used to prevent skeleton loading on subsequent mounts.
 */

const cache = new Map<string, unknown>();

export function getCache<T>(key: string): T | null {
  const data = cache.get(key);
  return data !== undefined ? (data as T) : null;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, data);
}

export function hasCache(key: string): boolean {
  return cache.has(key);
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}
