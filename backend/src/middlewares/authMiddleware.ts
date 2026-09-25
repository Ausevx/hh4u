import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthPayload } from '../utils/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { createHash } from 'crypto';
import RevokedToken from '../models/RevokedToken';
export class InvalidSession extends Error {}
export async function validateSession(token: string) {
  let decoded;
  try { decoded = verifyToken(token); }
  catch { throw new InvalidSession('Invalid token'); }
  const revoked = await RevokedToken.exists({ _id: createHash('sha256').update(token).digest('hex') });
  if (revoked) throw new InvalidSession('Session revoked');
  return decoded;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload & JwtPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid'
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid'
    });
    return;
  }

  try {
    const decoded = await validateSession(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (!(error instanceof InvalidSession)) {
      res.status(503).json({ success: false, message: 'Session verification is temporarily unavailable. Please try again.' });
      return;
    }
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid'
    });
    return;
  }
};
