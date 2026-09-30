import { createHash } from 'crypto';
import mongoose, { Schema } from 'mongoose';
const schema = new Schema({ _id: String, value: Schema.Types.Mixed, expiresAt: Date }, { bufferCommands: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ContentCacheEntry = mongoose.model('ContentCacheEntry', schema);
export const contentHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** No query text in keys. TTL bounds durable retention; a bounded LRU serves hot requests. */
export class ContentCache {
  private memory = new Map<string, { value: any; expires: number }>();
  private pending = new Map<string, Promise<any>>();
  constructor(private namespace: string, private ttlMs: number, private maxEntries = 500) {}
  async get<T>(input: unknown, work: () => Promise<T>): Promise<T> {
    const key = contentHash([this.namespace, input]);
    const hit = this.memory.get(key);
    if (hit && hit.expires > Date.now()) {
      this.memory.delete(key); this.memory.set(key, hit);
      return structuredClone(hit.value);
    }
    this.memory.delete(key);
    const pending = this.pending.get(key);
    if (pending) return structuredClone(await pending);
    const promise = (async () => {
      if (mongoose.connection.readyState === 1) {
        try {
          const row = await ContentCacheEntry.findOne({ _id: key, expiresAt: { $gt: new Date() } }).maxTimeMS(300).lean();
          if (row) { this.remember(key, row.value, new Date(row.expiresAt!).getTime()); return row.value as T; }
        } catch { /* Cache failure must not prevent a live answer. */ }
      }
      const value = await work();
      const expires = Date.now() + this.ttlMs;
      this.remember(key, value, expires);
      if (mongoose.connection.readyState === 1) {
        void ContentCacheEntry.updateOne({ _id: key }, { $set: { value, expiresAt: new Date(expires) } },
          { upsert: true, maxTimeMS: 300 }).catch(() => undefined);
      }
      return value;
    })().finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return structuredClone(await promise);
  }
  private remember(key: string, value: any, expires: number) {
    if (this.memory.size >= this.maxEntries) this.memory.delete(this.memory.keys().next().value!);
    this.memory.set(key, { value: structuredClone(value), expires });
  }
}
