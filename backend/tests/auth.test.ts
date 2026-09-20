import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import User from '../src/models/User';
import Otp from '../src/models/Otp';
import { verifyToken } from '../src/utils/jwt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Otp.deleteMany({});
});

describe('Health Check Endpoint', () => {
  it('GET /health should return 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Healing Hands4U API is running');
  });
});

describe('Auth Endpoints - Guest Login', () => {
  it('POST /api/auth/guest should create a guest user and return a valid signed JWT', async () => {
    const res = await request(app).post('/api/auth/guest').send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Guest session created');
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.displayName).toBe('Guest User');
    expect(res.body.user.authProvider).toBe('guest');
    expect(res.body.user.id).toBeDefined();

    // Verify token validity
    const decoded = verifyToken(res.body.token);
    expect(decoded.userId).toBe(res.body.user.id);
    expect(decoded.authProvider).toBe('guest');

    // Verify user exists in database
    const dbUser = await User.findById(res.body.user.id);
    expect(dbUser).not.toBeNull();
    expect(dbUser?.authProvider).toBe('guest');
  });

  it('POST /api/auth/guest should allow multiple guests without email collision', async () => {
    const res1 = await request(app).post('/api/auth/guest').send({});
    const res2 = await request(app).post('/api/auth/guest').send({});

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.user.id).not.toBe(res2.body.user.id);

    const userCount = await User.countDocuments();
    expect(userCount).toBe(2);
  });
});

describe('Auth Endpoints - Email OTP Flow', () => {
  it('POST /api/auth/otp/request should validate email format', async () => {
    const missingRes = await request(app).post('/api/auth/otp/request').send({});
    expect(missingRes.status).toBe(400);
    expect(missingRes.body.success).toBe(false);
    expect(missingRes.body.message).toBe('Valid email is required');

    const invalidRes = await request(app).post('/api/auth/otp/request').send({ email: 'not-an-email' });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.message).toBe('Valid email is required');
  });

  it('POST /api/auth/otp/request should generate OTP and store in DB', async () => {
    const res = await request(app)
      .post('/api/auth/otp/request')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OTP sent successfully');
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.otp).toBeDefined();
    expect(res.body.otp).toMatch(/^\d{6}$/);

    const otpDoc = await Otp.findOne({ email: 'test@example.com' });
    expect(otpDoc).not.toBeNull();
    expect(otpDoc?.otp).toBe(res.body.otp);
  });

  it('POST /api/auth/otp/verify should reject missing email or otp', async () => {
    const res1 = await request(app).post('/api/auth/otp/verify').send({ email: 'test@example.com' });
    expect(res1.status).toBe(400);
    expect(res1.body.message).toBe('Email and OTP are required');

    const res2 = await request(app).post('/api/auth/otp/verify').send({ otp: '123456' });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toBe('Email and OTP are required');
  });

  it('POST /api/auth/otp/verify should reject invalid or expired OTP', async () => {
    await Otp.create({
      email: 'test@example.com',
      otp: '111111',
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date()
    });

    const resWrong = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'test@example.com', otp: '999999' });
    expect(resWrong.status).toBe(400);
    expect(resWrong.body.success).toBe(false);
    expect(resWrong.body.message).toBe('Invalid or expired OTP');

    // Expired OTP
    await Otp.deleteMany({});
    await Otp.create({
      email: 'expired@example.com',
      otp: '222222',
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      createdAt: new Date(Date.now() - 60000)
    });

    const resExpired = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'expired@example.com', otp: '222222' });
    expect(resExpired.status).toBe(400);
    expect(resExpired.body.success).toBe(false);
    expect(resExpired.body.message).toBe('Invalid or expired OTP');
  });

  it('POST /api/auth/otp/verify should create user and return valid JWT upon successful verification', async () => {
    const reqOtpRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email: 'newuser@example.com' });
    const otp = reqOtpRes.body.otp;

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'newuser@example.com', otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.user).toBeDefined();
    expect(verifyRes.body.user.email).toBe('newuser@example.com');
    expect(verifyRes.body.user.authProvider).toBe('email_otp');

    // Verify token
    const decoded = verifyToken(verifyRes.body.token);
    expect(decoded.userId).toBe(verifyRes.body.user.id);
    expect(decoded.email).toBe('newuser@example.com');

    // Verify OTP record was consumed/deleted
    const remainingOtp = await Otp.findOne({ email: 'newuser@example.com' });
    expect(remainingOtp).toBeNull();

    // Verify User in DB
    const dbUser = await User.findOne({ email: 'newuser@example.com' });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.authProvider).toBe('email_otp');
  });

  it('POST /api/auth/otp/verify should update existing user without creating duplicates', async () => {
    const existing = await User.create({
      email: 'existing@example.com',
      displayName: 'Existing User',
      authProvider: 'email_otp'
    });

    await Otp.create({
      email: 'existing@example.com',
      otp: '333333',
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date()
    });

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'existing@example.com', otp: '333333' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.id).toBe(existing._id.toString());

    const totalUsers = await User.countDocuments({ email: 'existing@example.com' });
    expect(totalUsers).toBe(1);
  });
});

describe('Auth Endpoints - Google Sign-In', () => {
  it('POST /api/auth/google should reject request missing idToken', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Google ID token is required');
  });

  it('POST /api/auth/google should authenticate mock token and create user', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        idToken: 'mock_google_id_token',
        email: 'googleuser@gmail.com',
        displayName: 'Google Test User',
        photoUrl: 'https://example.com/avatar.jpg'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('googleuser@gmail.com');
    expect(res.body.user.displayName).toBe('Google Test User');
    expect(res.body.user.authProvider).toBe('google');

    const decoded = verifyToken(res.body.token);
    expect(decoded.userId).toBe(res.body.user.id);
    expect(decoded.email).toBe('googleuser@gmail.com');
  });
});

describe('Auth Endpoints - /api/auth/me Session Verification', () => {
  it('GET /api/auth/me should reject request with missing Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication token missing or invalid');
  });

  it('GET /api/auth/me should reject malformed or invalid token', async () => {
    const res1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidFormat');
    expect(res1.status).toBe(401);

    const res2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(res2.status).toBe(401);
    expect(res2.body.message).toBe('Authentication token missing or invalid');
  });

  it('GET /api/auth/me should return current user for valid token', async () => {
    // Create guest user first
    const guestRes = await request(app).post('/api/auth/guest').send({});
    const token = guestRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.id).toBe(guestRes.body.user.id);
    expect(meRes.body.user.displayName).toBe('Guest User');
    expect(meRes.body.user.authProvider).toBe('guest');
  });

  it('GET /api/auth/me should return 404 if user was deleted from DB', async () => {
    const guestRes = await request(app).post('/api/auth/guest').send({});
    const token = guestRes.body.token;

    // Delete user from DB
    await User.findByIdAndDelete(guestRes.body.user.id);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(404);
    expect(meRes.body.success).toBe(false);
    expect(meRes.body.message).toBe('User not found');
  });
});
