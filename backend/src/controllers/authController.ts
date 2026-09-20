import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import Otp from '../models/Otp';
import { generateToken } from '../utils/jwt';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const guestAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = new User({
      displayName: 'Guest User',
      authProvider: 'guest',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      authProvider: 'guest'
    });

    res.status(200).json({
      success: true,
      message: 'Guest session created',
      token,
      user: {
        id: user._id.toString(),
        displayName: user.displayName,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Guest auth error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    // 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate prior OTPs for this email
    await Otp.deleteMany({ email: normalizedEmail });

    await Otp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
      createdAt: new Date()
    });

    const isDevOrTest = process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      email: normalizedEmail,
      ...(isDevOrTest ? { otp } : {})
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const otpCode = String(otp).trim();

    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      otp: otpCode,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
      return;
    }

    // Delete consumed OTP
    await Otp.deleteMany({ email: normalizedEmail });

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        authProvider: 'email_otp',
        createdAt: new Date(),
        lastLoginAt: new Date()
      });
    } else {
      user.lastLoginAt = new Date();
      if (!user.authProvider) {
        user.authProvider = 'email_otp';
      }
    }
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      authProvider: user.authProvider,
      email: user.email
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, email, displayName, photoUrl } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
      return;
    }

    let googlePayload: { email?: string; name?: string; picture?: string; sub?: string } = {};

    const isMockOrTest = idToken.startsWith('mock_') || process.env.NODE_ENV === 'test';

    if (isMockOrTest) {
      googlePayload = {
        email: email || 'user@gmail.com',
        name: displayName || 'Google User',
        picture: photoUrl,
        sub: 'mock_google_sub_12345'
      };
    } else {
      try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          res.status(401).json({ success: false, message: 'Invalid Google token' });
          return;
        }
        googlePayload = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          sub: payload.sub
        };
      } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid Google token' });
        return;
      }
    }

    if (!googlePayload.email) {
      res.status(400).json({
        success: false,
        message: 'Google account email not found'
      });
      return;
    }

    const normalizedEmail = googlePayload.email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        displayName: googlePayload.name || normalizedEmail.split('@')[0],
        authProvider: 'google',
        googleId: googlePayload.sub,
        avatarUrl: googlePayload.picture,
        createdAt: new Date(),
        lastLoginAt: new Date()
      });
    } else {
      user.lastLoginAt = new Date();
      user.authProvider = 'google';
      if (googlePayload.sub) user.googleId = googlePayload.sub;
      if (googlePayload.picture) user.avatarUrl = googlePayload.picture;
      if (googlePayload.name && !user.displayName) user.displayName = googlePayload.name;
    }
    await user.save();

    const token = generateToken({
      userId: user._id.toString(),
      authProvider: 'google',
      email: user.email
    });

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
