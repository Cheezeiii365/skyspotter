const ORIGIN_API = '/api/origin';

export class RouteCache {
  constructor() {
    this._cache = new Map();   // icao24 → airport code (string) or null
    this._pending = new Set();
    this._onUpdate = null;
  }

  onUpdate(fn) { this._onUpdate = fn; }

  /** Returns airport code string, null (not found), or undefined (not yet fetched) */
  getOrigin(icao24) {
    return this._cache.has(icao24) ? this._cache.get(icao24) : undefined;
  }

  /** Kick off background origin lookups for uncached aircraft */
  fetchOrigins(icao24s) {
    const needed = icao24s.filter(
      id => id && !this._cache.has(id) && !this._pending.has(id)
    );
    if (needed.length === 0) return;
    this._fetchBatch(needed.slice(0, 5));
  }

  async _fetchBatch(icao24s) {
    let anyNew = false;
    for (const id of icao24s) {
      const resolved = await this._fetchOne(id);
      if (resolved) anyNew = true;
    }
    if (anyNew && this._onUpdate) this._onUpdate();
  }

  async _fetchOne(icao24) {
    this._pending.add(icao24);
    try {
      const resp = await fetch(`${ORIGIN_API}?icao24=${encodeURIComponent(icao24)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.origin) {
          console.log(`[RouteCache] ${icao24} → ${data.origin}`);
          this._cache.set(icao24, data.origin);
          return true;
        } else {
          this._cache.set(icao24, null);
        }
      } else {
        console.warn(`[RouteCache] ${icao24} error ${resp.status}`);
      }
    } catch (e) {
      console.error(`[RouteCache] ${icao24} network error:`, e.message);
    } finally {
      this._pending.delete(icao24);
    }
    return false;
  }
}
