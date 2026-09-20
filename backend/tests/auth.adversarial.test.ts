import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import User from '../src/models/User';
import Otp from '../src/models/Otp';
import { generateToken, verifyToken } from '../src/utils/jwt';

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

describe('Adversarial Challenge: OTP Verification, Consumption & Replay Attacks', () => {
  it('Challenge 1.1: Verifying an OTP must consume it so replay attacks fail immediately', async () => {
    const email = 'replay.victim@example.com';
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email });

    expect(reqRes.status).toBe(200);
    const otp = reqRes.body.otp;
    expect(otp).toBeDefined();

    // First verification attempt: MUST succeed
    const firstVerify = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp });

    expect(firstVerify.status).toBe(200);
    expect(firstVerify.body.success).toBe(true);
    expect(firstVerify.body.token).toBeDefined();

    // Replay attack: Second verification attempt with same OTP MUST fail
    const replayVerify = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp });

    expect(replayVerify.status).toBe(400);
    expect(replayVerify.body.success).toBe(false);
    expect(replayVerify.body.message).toMatch(/invalid or expired otp/i);

    // Third verification attempt: MUST also fail
    const thirdVerify = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp });
    expect(thirdVerify.status).toBe(400);

    // Database state check: Otp document MUST be deleted/consumed
    const otpInDb = await Otp.findOne({ email });
    expect(otpInDb).toBeNull();
  });

  it('Challenge 1.2: Requesting a new OTP invalidates previous unverified OTPs', async () => {
    const email = 'overwrite@example.com';

    // First OTP request
    const req1 = await request(app)
      .post('/api/auth/otp/request')
      .send({ email });
    const otp1 = req1.body.otp;

    // Second OTP request for same email
    const req2 = await request(app)
      .post('/api/auth/otp/request')
      .send({ email });
    const otp2 = req2.body.otp;

    // Verify first OTP: MUST fail because it was invalidated by the second request
    const verifyOld = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp: otp1 });
    expect(verifyOld.status).toBe(400);
    expect(verifyOld.body.success).toBe(false);

    // Verify second OTP: MUST succeed
    const verifyNew = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp: otp2 });
    expect(verifyNew.status).toBe(200);
    expect(verifyNew.body.success).toBe(true);
  });

  it('Challenge 1.3: Concurrency / Race Condition on OTP verification (new user)', async () => {
    const email = 'concurrent@example.com';
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email });
    const otp = reqRes.body.otp;

    // Fire 5 concurrent verify requests with the exact same OTP
    const concurrentRequests = Array.from({ length: 5 }, () =>
      request(app).post('/api/auth/otp/verify').send({ email, otp })
    );

    const responses = await Promise.all(concurrentRequests);
    const successful = responses.filter(r => r.status === 200);
    const failed400 = responses.filter(r => r.status === 400);
    const failed500 = responses.filter(r => r.status === 500);

    console.log(`New user concurrent verify: 200=${successful.length}, 400=${failed400.length}, 500=${failed500.length}`);

    // Total user count in DB must be exactly 1
    const userCount = await User.countDocuments({ email });
    expect(userCount).toBe(1);

    // OTP in DB must now be consumed
    const remainingOtp = await Otp.findOne({ email });
    expect(remainingOtp).toBeNull();
  });

  it('Challenge 1.3b: Concurrency / Race Condition on OTP verification (existing user)', async () => {
    const email = 'existing.concurrent@example.com';
    await User.create({
      email,
      displayName: 'Existing',
      authProvider: 'email_otp'
    });

    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email });
    const otp = reqRes.body.otp;

    // Fire 5 concurrent verify requests with the exact same OTP
    const concurrentRequests = Array.from({ length: 5 }, () =>
      request(app).post('/api/auth/otp/verify').send({ email, otp })
    );

    const responses = await Promise.all(concurrentRequests);
    const successful = responses.filter(r => r.status === 200);
    const failed400 = responses.filter(r => r.status === 400);
    const failed500 = responses.filter(r => r.status === 500);

    console.log(`Existing user concurrent verify: 200=${successful.length}, 400=${failed400.length}, 500=${failed500.length}`);

    // OTP in DB must now be consumed
    const remainingOtp = await Otp.findOne({ email });
    expect(remainingOtp).toBeNull();
  });

  it('Challenge 1.4: NoSQL query injection attempt via object payload in OTP verification', async () => {
    const email = 'injection@example.com';
    await request(app).post('/api/auth/otp/request').send({ email });

    // Attempt NoSQL operator injection: { "$ne": null }
    const res1 = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email, otp: { $ne: null } });
    expect(res1.status).toBe(400);

    // Attempt object injection in email
    const res2 = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: { $regex: '.*' }, otp: '123456' });
    expect(res2.status).toBe(400);
  });

  it('Challenge 1.5: Case insensitive email normalization in OTP request and verification', async () => {
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ email: 'CaseTest@Example.COM' });
    expect(reqRes.status).toBe(200);
    const otp = reqRes.body.otp;

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ email: 'casetest@example.com', otp });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.email).toBe('casetest@example.com');
  });
});

describe('Adversarial Challenge: Google Auth State Mutation & Record Integrity', () => {
  it('Challenge 2.1: Google auth creates genuine User record with mock tokens', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        idToken: 'mock_google_id_token_adversarial',
        email: 'genuine.google@example.com',
        displayName: 'Genuine Google User',
        photoUrl: 'https://lh3.googleusercontent.com/a/photo123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    const user = res.body.user;
    expect(user.id).toBeDefined();
    expect(user.email).toBe('genuine.google@example.com');
    expect(user.displayName).toBe('Genuine Google User');
    expect(user.authProvider).toBe('google');
    expect(user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/photo123');
    expect(user.createdAt).toBeDefined();
    expect(user.lastLoginAt).toBeDefined();

    // Verify database record
    const dbUser = await User.findById(user.id);
    expect(dbUser).not.toBeNull();
    expect(dbUser!.email).toBe('genuine.google@example.com');
    expect(dbUser!.authProvider).toBe('google');
    expect(dbUser!.googleId).toBe('mock_google_sub_12345');
    expect(dbUser!.avatarUrl).toBe('https://lh3.googleusercontent.com/a/photo123');
  });

  it('Challenge 2.2: Subsequent Google auth updates lastLoginAt without duplicate records', async () => {
    // Initial login
    const firstLogin = await request(app)
      .post('/api/auth/google')
      .send({
        idToken: 'mock_token_1',
        email: 'repeat.google@example.com',
        displayName: 'Repeat Google'
      });

    expect(firstLogin.status).toBe(200);
    const firstUserId = firstLogin.body.user.id;
    const firstLoginAt = new Date(firstLogin.body.user.lastLoginAt).getTime();

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 50));

    // Second login
    const secondLogin = await request(app)
      .post('/api/auth/google')
      .send({
        idToken: 'mock_token_2',
        email: 'repeat.google@example.com',
        displayName: 'Repeat Google Updated Name'
      });

    expect(secondLogin.status).toBe(200);
    const secondUserId = secondLogin.body.user.id;
    const secondLoginAt = new Date(secondLogin.body.user.lastLoginAt).getTime();

    // Same user ID, no duplicate records
    expect(secondUserId).toBe(firstUserId);
    const userDocs = await User.find({ email: 'repeat.google@example.com' });
    expect(userDocs.length).toBe(1);

    // lastLoginAt must be newer
    expect(secondLoginAt).toBeGreaterThanOrEqual(firstLoginAt);
  });

  it('Challenge 2.3: Google auth handles non-string or malformed payloads gracefully', async () => {
    // Missing idToken
    const resMissing = await request(app)
      .post('/api/auth/google')
      .send({ email: 'test@example.com' });
    expect(resMissing.status).toBe(400);

    // Non-string idToken
    const resNumber = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 12345 });
    expect(resNumber.status).toBe(400);

    // Array idToken
    const resArray = await request(app)
      .post('/api/auth/google')
      .send({ idToken: ['mock_token'] });
    expect(resArray.status).toBe(400);
  });
});

describe('Adversarial Challenge: Protected Endpoint GET /api/auth/me', () => {
  it('Challenge 3.1: Rejects missing Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Challenge 3.2: Rejects non-Bearer Authorization headers', async () => {
    const res1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res1.status).toBe(401);

    const res2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Token some_token');
    expect(res2.status).toBe(401);

    const res3 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer');
    expect(res3.status).toBe(401);

    const res4 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer    ');
    expect(res4.status).toBe(401);
  });

  it('Challenge 3.3: Rejects malformed, tampered, and expired JWT tokens', async () => {
    // Tampered token
    const resTampered = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
    expect(resTampered.status).toBe(401);

    // Token signed with wrong secret
    const fakeToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString(), authProvider: 'guest' },
      'wrong_secret_key'
    );
    const resWrongSecret = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(resWrongSecret.status).toBe(401);

    // Expired token
    const secret = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';
    const expiredToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString(), authProvider: 'guest' },
      secret,
      { expiresIn: '-1s' }
    );
    const resExpired = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(resExpired.status).toBe(401);
  });

  it('Challenge 3.4: Accepts valid token for all 3 auth providers and returns correct profile', async () => {
    // 1. Guest user
    const guestUser = await User.create({
      displayName: 'Guest Profile',
      authProvider: 'guest'
    });
    const guestToken = generateToken({ userId: guestUser._id.toString(), authProvider: 'guest' });

    const guestMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(guestMe.status).toBe(200);
    expect(guestMe.body.user.id).toBe(guestUser._id.toString());
    expect(guestMe.body.user.authProvider).toBe('guest');

    // 2. Email OTP user
    const otpUser = await User.create({
      email: 'verified.otp@example.com',
      displayName: 'verified.otp',
      authProvider: 'email_otp'
    });
    const otpToken = generateToken({
      userId: otpUser._id.toString(),
      authProvider: 'email_otp',
      email: otpUser.email
    });

    const otpMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${otpToken}`);
    expect(otpMe.status).toBe(200);
    expect(otpMe.body.user.id).toBe(otpUser._id.toString());
    expect(otpMe.body.user.email).toBe('verified.otp@example.com');
    expect(otpMe.body.user.authProvider).toBe('email_otp');

    // 3. Google user
    const googleUser = await User.create({
      email: 'google.account@example.com',
      displayName: 'Google Account',
      authProvider: 'google',
      avatarUrl: 'https://example.com/pic.png'
    });
    const googleToken = generateToken({
      userId: googleUser._id.toString(),
      authProvider: 'google',
      email: googleUser.email
    });

    const googleMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${googleToken}`);
    expect(googleMe.status).toBe(200);
    expect(googleMe.body.user.id).toBe(googleUser._id.toString());
    expect(googleMe.body.user.authProvider).toBe('google');
    expect(googleMe.body.user.avatarUrl).toBe('https://example.com/pic.png');
  });

  it('Challenge 3.5: Returns 404 when valid token refers to a deleted user', async () => {
    const user = await User.create({
      displayName: 'Doomed User',
      authProvider: 'guest'
    });
    const token = generateToken({ userId: user._id.toString(), authProvider: 'guest' });

    // Delete the user from DB
    await User.findByIdAndDelete(user._id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/user not found/i);
  });
});
