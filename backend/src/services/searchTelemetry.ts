import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
const context = new AsyncLocalStorage<{ requestId: string; timings: Record<string, number> }>();
export async function timed<T>(stage: string, work: () => PromiseLike<T>): Promise<T> {
  const start = performance.now();
  try { return await work(); }
  finally { const state = context.getStore(); if (state) state.timings[stage] = Math.round(performance.now() - start); }
}
export function requestMetadata() { return { requestId: context.getStore()?.requestId }; }
export function searchTelemetry(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID(); const start = performance.now();
  const timings: Record<string, number> = {};
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => console.info(JSON.stringify({ event: 'chatbot_timing', requestId,
    route: req.path, status: res.statusCode, totalMs: Math.round(performance.now() - start), timings })));
  context.run({ requestId, timings }, next);
}
