import { api, authHarness, verifiedGoogle } from './helpers/authHarness';
import Otp from '../src/models/Otp';
import User from '../src/models/User';
import { generateAdminToken, generateToken, getJwtSecret } from '../src/utils/jwt';
import jwt from 'jsonwebtoken';

const { issue } = authHarness();
const verify = (otp: unknown, email: unknown = 'person@example.com') => api.post('/api/auth/otp/verify').send({ email, otp });
test('code cannot be replayed', async () => {
  const code = await issue();
  expect((await verify(code)).status).toBe(200);
  expect((await verify(code)).status).toBe(400);
});
test('only one of five concurrent correct attempts can create a session', async () => {
  const code = await issue();
  const results = await Promise.all(Array.from({ length: 5 }, () => verify(code)));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 400)).toHaveLength(4);
  expect(await User.countDocuments()).toBe(1);
});
test('five wrong guesses lock out even the correct code', async () => {
  const code = await issue();
  for (let i = 0; i < 5; i++) expect((await verify('000000')).status).toBe(400);
  expect((await verify(code)).status).toBe(400);
});
test('expired code fails even before MongoDB TTL cleanup', async () => {
  const code = await issue();
  await Otp.updateOne({ _id: 'person@example.com' }, { $set: { expiresAt: new Date(Date.now() - 1) } });
  expect((await verify(code)).status).toBe(400);
});
test('resend enforces cooldown and invalidates previous code', async () => {
  const old = await issue();
  expect((await api.post('/api/auth/otp/send').send({ email: 'person@example.com' })).status).toBe(429);
  await Otp.updateOne({ _id: 'person@example.com' }, { $set: { createdAt: new Date(Date.now() - 61000) } });
  const fresh = await issue();
  if (old !== fresh) expect((await verify(old)).status).toBe(400);
  expect((await verify(fresh)).status).toBe(200);
});
test('parallel requests deliver only one code', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => api.post('/api/auth/otp/request').send({ email: 'person@example.com' })));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 429)).toHaveLength(4);
});
test.each([null, 123456, { $ne: null }, '12345', '1234567'])('invalid OTP payload %p cannot authenticate', async otp => {
  expect((await verify(otp)).status).toBe(400);
});
test('email query operator injection fails', async () => {
  expect((await verify('123456', { $ne: null })).status).toBe(400);
});
test('mock-prefixed Google token is rejected even in test mode', async () => {
  expect((await api.post('/api/auth/google').send({ idToken: 'mock_google_token', email: 'victim@gmail.com' })).status).toBe(401);
  expect(await User.countDocuments()).toBe(0);
});
test('unverified Google email is rejected', async () => {
  verifiedGoogle({ email_verified: false });
  expect((await api.post('/api/auth/google').send({ idToken: 'token' })).status).toBe(401);
});
test('Google cannot silently link an existing non-Google third-party email account', async () => {
  await User.create({ email: 'person@example.com', authProvider: 'email_otp' });
  verifiedGoogle({ email: 'person@example.com' });
  expect((await api.post('/api/auth/google').send({ idToken: 'token' })).status).toBe(409);
});
test.each(['', 'Basic abc', 'Bearer', 'Bearer fake.jwt.token'])('invalid authorization %p fails', async header => {
  expect((await api.get('/api/auth/me').set('Authorization', header)).status).toBe(401);
});
test('admin token cannot authenticate as an app user', async () => {
  expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${generateAdminToken()}`)).status).toBe(401);
});
test('expired signed token fails', async () => {
  const token = jwt.sign({ userId: 'abc', authProvider: 'guest' }, getJwtSecret(), { expiresIn: -1 });
  expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
});
test('deleted account returns unauthorized so Android removes session', async () => {
  const user = await User.create({ authProvider: 'guest' });
  const token = generateToken({ userId: user.id, authProvider: 'guest' });
  await User.deleteMany({});
  expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
});
test('sixth hourly email send request is rate limited', async () => {
  for (let i = 0; i < 5; i++) {
    await api.post('/api/auth/otp/request').send({ email: 'person@example.com' });
    await Otp.deleteMany({});
  }
  expect((await api.post('/api/auth/otp/request').send({ email: 'person@example.com' })).status).toBe(429);
});
