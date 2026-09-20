import { Request, Response } from 'express';
import Admin from '../models/Admin';
import { generateAdminToken } from '../utils/jwt';

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@healinghands4u.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Email and password required',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    let admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      admin = await Admin.findOne({ email: email.trim() });
    }

    const isDefaultAdminEmail =
      normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase().trim();

    const isDefaultMatch =
      isDefaultAdminEmail &&
      password === DEFAULT_ADMIN_PASSWORD;

    const isDbMatch =
      admin &&
      (admin.passwordHash === password ||
        (isDefaultAdminEmail && password === DEFAULT_ADMIN_PASSWORD));

    if (isDefaultMatch || isDbMatch) {
      if (!admin) {
        admin = await Admin.create({
          email: normalizedEmail,
          passwordHash: DEFAULT_ADMIN_PASSWORD,
          authProvider: 'password',
          role: 'admin',
        });
      }

      const token = generateAdminToken({
        adminId: admin._id.toString(),
        email: admin.email,
        role: 'admin',
      });

      res.status(200).json({
        success: true,
        token,
        admin: {
          email: admin.email,
          role: admin.role || 'admin',
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid',
      });
      return;
    }

    res.status(200).json({
      success: true,
      admin: {
        id: req.admin.adminId,
        email: req.admin.email,
        role: req.admin.role,
      },
    });
  } catch (error: any) {
    console.error('Admin me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export default {
  login,
  me,
};
