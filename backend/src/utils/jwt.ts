import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';
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
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): AuthPayload & JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as AuthPayload & JwtPayload;
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
  return jwt.sign(finalPayload, JWT_SECRET, options);
};

export const verifyAdminToken = (token: string): AdminAuthPayload & JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as AdminAuthPayload & JwtPayload;
};
