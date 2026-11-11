/**
 * Idempotency store helper (#448).
 *
 * Thin in-memory store keyed by idempotency key, used by write endpoints
 * (refund claims, transfer initiation) to reject duplicate submissions
 * before they reach the DB. Keeps the result payload and HTTP status so a
 * retried call returns the same response instead of re-executing.
 *
 * Entries are never evicted in this scaffold; a production deployment
 * should back this with Redis and a TTL. See services/refund.service.ts
 * for the DB-level unique-constraint guard (#423) that serializes
 * concurrent identical requests.
 */
export interface IdempotencyEntry {
  statusCode: number;
  body: unknown;
  createdAt: string;
}

export class IdempotencyStore {
  private readonly store = new Map<string, IdempotencyEntry>();

  /** Returns the stored response for `key`, or undefined if absent. */
  get(key: string): IdempotencyEntry | undefined {
    return this.store.get(key);
  }

  /** Stores `response` under `key`. Returns false if the key already exists. */
  set(key: string, statusCode: number, body: unknown): boolean {
    if (this.store.has(key)) return false;
    this.store.set(key, { statusCode, body, createdAt: new Date().toISOString() });
    return true;
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

export const idempotencyStore = new IdempotencyStore();
