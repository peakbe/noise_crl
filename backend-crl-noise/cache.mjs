export class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expireAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, {
      value,
      expireAt: Date.now() + ttlMs
    });
  }

  async wrap(key, ttlMs, fetcher) {
    const cached = this.get(key);
    if (cached) return cached;

    const existing = this.store.get(key);
    if (existing?.promise) return existing.promise;

    const promise = fetcher()
      .then(data => {
        this.set(key, data, ttlMs);
        return data;
      })
      .finally(() => {
        const e = this.store.get(key);
        if (e && e.promise) delete e.promise;
      });

    this.store.set(key, { promise, expireAt: Date.now() + ttlMs });
    return promise;
  }
}

export const cache = new MemoryCache();
