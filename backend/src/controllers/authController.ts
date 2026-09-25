import { Request, Response } from 'express';
import { createHmac, randomInt, timingSafeEqual, createHash } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import Otp from '../models/Otp';
import RevokedToken from '../models/RevokedToken';
import { generateToken, getJwtSecret } from '../utils/jwt';
import { requireEmailConfiguration, sendOtpEmail } from '../services/authEmailService';

const normalizeEmail = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? value.trim().toLowerCase() : undefined;
export const hashOtp = (email: string, otp: string): string =>
  createHmac('sha256', getJwtSecret()).update(`${email}:${otp}`).digest('hex');
export const tokenHash = (token: string): string => createHash('sha256').update(token).digest('hex');
const profile = (user: any) => ({ id: user._id.toString(), email: user.email,
  displayName: user.displayName, authProvider: user.authProvider, avatarUrl: user.avatarUrl,
  createdAt: user.createdAt, lastLoginAt: user.lastLoginAt });
function signedIn(res: Response, user: any, message: string) {
  const token = generateToken({ userId: user._id.toString(), email: user.email, authProvider: user.authProvider });
  res.json({ success: true, message, token, expiresAt: Date.now() + 30 * 86400000, user: profile(user) });
}
export const guestAuth = async (_req: Request, res: Response): Promise<void> => {
  getJwtSecret();
  const user = await User.create({ displayName: 'Guest User', authProvider: 'guest' });
  signedIn(res, user, 'Guest session created');
};
export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  if (!email) { res.status(400).json({ success: false, message: 'Valid email is required' }); return; }
  try { requireEmailConfiguration(); getJwtSecret(); }
  catch { res.status(503).json({ success: false, message: 'Email sign-in is not configured. Please try Google or continue as guest.' }); return; }
  const otp = randomInt(100000, 1000000).toString();
  const hash = hashOtp(email, otp);
  try {
    await Otp.findOneAndUpdate({ _id: email, createdAt: { $lte: new Date(Date.now() - 60000) } },
      { $set: { hash, attempts: 0, ready: false, createdAt: new Date(), expiresAt: new Date(Date.now() + 600000) } },
      { upsert: true, returnDocument: 'after' });
  } catch (error: any) {
    if (error.code !== 11000) throw error;
    res.setHeader('Retry-After', '60');
    res.status(429).json({ success: false, message: 'Please wait one minute before requesting another code.' }); return;
  }
  try {
    await sendOtpEmail(email, otp);
    await Otp.updateOne({ _id: email, hash }, { $set: { ready: true } });
    res.json({ success: true, message: 'OTP sent successfully', email, retryAfterSeconds: 60 });
  } catch {
    await Otp.deleteOne({ _id: email, hash });
    res.status(503).json({ success: false, message: 'We could not send your code. Please try again shortly.' });
  }
};
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const otp = req.body?.otp;
  if (!email || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    res.status(400).json({ success: false, message: 'A valid email and six-digit OTP are required' }); return;
  }
  const challenge = await Otp.findOneAndUpdate({ _id: email, ready: true,
    attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
  const expected = hashOtp(email, otp);
  if (!challenge || !timingSafeEqual(Buffer.from(challenge.hash), Buffer.from(expected))) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP. Request a new code after five attempts.' }); return;
  }
  const consumed = await Otp.findOneAndDelete({ _id: email, hash: expected, ready: true, expiresAt: { $gt: new Date() } });
  if (!consumed) { res.status(400).json({ success: false, message: 'This code has already been used. Request a new code.' }); return; }
  const user = await User.findOneAndUpdate({ email }, {
    $set: { lastLoginAt: new Date() },
    $setOnInsert: { email, displayName: email.split('@')[0], authProvider: 'email_otp' }
  }, { upsert: true, returnDocument: 'after' });
  signedIn(res, user, 'Authentication successful');
};
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string' || !idToken || idToken.length > 16000) {
    res.status(400).json({ success: false, message: 'Google ID token is required' }); return;
  }
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) { res.status(503).json({ success: false, message: 'Google sign-in is not configured yet.' }); return; }
  let payload;
  try {
    const ticket = await new OAuth2Client(audience).verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
    if (!payload?.sub || !payload.email_verified || !normalizeEmail(payload.email)) throw new Error('Invalid identity');
  } catch { res.status(401).json({ success: false, message: 'Invalid Google token. Please sign in again.' }); return; }
  getJwtSecret();
  const email = normalizeEmail(payload.email)!;
  let user = await User.findOne({ googleId: payload.sub });
  if (!user) {
    const existing = await User.findOne({ email });
    if (existing && (existing.googleId && existing.googleId !== payload.sub ||
      (!existing.googleId && !email.endsWith('@gmail.com') && !payload.hd))) {
      res.status(409).json({ success: false, message: 'Please sign in to this existing account using email OTP.' }); return;
    }
    user = existing || new User({ email, displayName: payload.name || email.split('@')[0] });
  }
  user.authProvider = 'google'; user.googleId = payload.sub;
  user.avatarUrl = payload.picture; user.lastLoginAt = new Date();
  await user.save();
  signedIn(res, user, 'Google authentication successful');
};
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.userId);
  if (!user) { res.status(401).json({ success: false, message: 'Please sign in again.' }); return; }
  res.json({ success: true, user: profile(user) });
};
export const logout = async (req: Request, res: Response): Promise<void> => {
  await RevokedToken.updateOne({ _id: tokenHash(req.headers.authorization!.substring(7).trim()) },
    { $set: { expiresAt: new Date(req.user!.exp! * 1000) } }, { upsert: true });
  res.json({ success: true, message: 'Signed out' });
};
