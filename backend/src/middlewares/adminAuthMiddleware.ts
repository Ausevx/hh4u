import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AdminAuthPayload } from '../utils/jwt';

const JWT_SECRET: string = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminAuthPayload & JwtPayload;
    }
  }
}

export const adminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || decoded.role !== 'admin') {
      res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid',
      });
      return;
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid',
    });
    return;
  }
};

export default adminAuthMiddleware;
