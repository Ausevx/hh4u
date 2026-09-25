import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
};
const JWT_EXPIRES_IN = '30d';

export interface AuthPayload {
  userId: string;
  authProvider: 'email_otp' | 'google' | 'guest';
  email?: string;
}

export const generateToken = (payload: AuthPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as unknown as number // jsonwebtoken types accept string/number
  };
  return jwt.sign(payload, getJwtSecret(), { ...options, jwtid: require('crypto').randomUUID() });
};

export const verifyToken = (token: string): AuthPayload & JwtPayload => {
  const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as AuthPayload & JwtPayload;
  if (!payload.userId || !payload.exp || !['guest', 'google', 'email_otp'].includes(payload.authProvider)) throw new Error('Invalid user token');
  return payload;
};

export interface AdminAuthPayload {
  adminId: string;
  email: string;
  role: 'admin';
}

export const generateAdminToken = (payload?: Partial<AdminAuthPayload>): string => {
  const finalPayload: AdminAuthPayload = {
    adminId: payload?.adminId || 'mock_admin_id_123',
    email: payload?.email || process.env.ADMIN_EMAIL || 'admin@healinghands4u.com',
    role: 'admin',
    ...(payload as any),
  };
  const options: SignOptions = {
    expiresIn: '7d' as unknown as number
  };
  return jwt.sign(finalPayload, getJwtSecret(), options);
};

export const verifyAdminToken = (token: string): AdminAuthPayload & JwtPayload => {
  return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as AdminAuthPayload & JwtPayload;
};
