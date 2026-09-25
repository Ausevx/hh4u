import { Request, Response, NextFunction } from 'express';
import mongoose, { Schema } from 'mongoose';
import { createHash } from 'crypto';
const Bucket = mongoose.model('AuthRateBucket', new Schema({
  _id: String, count: Number, expiresAt: { type: Date, index: { expires: 0 } }
}));
export async function authRateLimit(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST' || req.path === '/logout') { next(); return; }
  const period = 15 * 60000;
  const window = Math.floor(Date.now() / period);
  const ip = createHash('sha256').update(req.ip || 'unknown').digest('hex');
  const bucket = await Bucket.findOneAndUpdate({ _id: `${ip}:${window}` }, {
    $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * period) }
  }, { upsert: true, returnDocument: 'after' });
  if ((bucket.count || 0) > 60) {
    res.setHeader('Retry-After', String(Math.ceil(((window + 1) * period - Date.now()) / 1000)));
    res.status(429).json({ success: false, message: 'Too many sign-in requests. Please try again later.' }); return;
  }
  if (['/otp/request', '/otp/send'].includes(req.path) && typeof req.body?.email === 'string') {
    const hour = Math.floor(Date.now() / 3600000);
    const email = createHash('sha256').update(req.body.email.trim().toLowerCase()).digest('hex');
    const sends = await Bucket.findOneAndUpdate({ _id: `email:${email}:${hour}` }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((hour + 1) * 3600000) }
    }, { upsert: true, returnDocument: 'after' });
    if ((sends.count || 0) > 5) {
      res.status(429).json({ success: false, message: 'Too many codes requested for this email. Please try again in an hour.' }); return;
    }
  }
  next();
}
