import { api, authHarness, verifiedGoogle } from './helpers/authHarness';
import Otp from '../src/models/Otp';
import User from '../src/models/User';
import * as mail from '../src/services/authEmailService';
import { verifyToken } from '../src/utils/jwt';
import { OAuth2Client } from 'google-auth-library';

const { issue, codes } = authHarness();

test('guest gets a backend session and authenticated profile', async () => {
  const response = await api.post('/api/auth/guest').send({});
  expect(response.status).toBe(200);
  expect(verifyToken(response.body.token).userId).toBe(response.body.user.id);
  expect(response.body.expiresAt).toBeGreaterThan(Date.now());
  const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${response.body.token}`);
  expect(me.body.user.authProvider).toBe('guest');
});
test('different guests receive different accounts', async () => {
  const one = await api.post('/api/auth/guest').send({});
  const two = await api.post('/api/auth/guest').send({});
  expect(one.body.user.id).not.toBe(two.body.user.id);
});
test.each([undefined, 'bad-email', { $ne: null }, ['person@example.com']])('rejects invalid email %p', async email => {
  expect((await api.post('/api/auth/otp/request').send({ email })).status).toBe(400);
  expect(mail.sendOtpEmail).not.toHaveBeenCalled();
});
test('sends six digits to normalized email and never exposes plaintext in response or DB', async () => {
  const response = await api.post('/api/auth/otp/request').send({ email: ' Person@Example.COM ' });
  expect(response.status).toBe(200);
  expect(response.body.otp).toBeUndefined();
  const code = codes.get('person@example.com');
  expect(code).toMatch(/^\d{6}$/);
  const record = await Otp.findById('person@example.com');
  expect(record?.hash).not.toBe(code);
  expect(record?.ready).toBe(true);
  expect(record?.toObject()).not.toHaveProperty('otp');
});
test('valid code creates account and existing-account sign-in preserves identity', async () => {
  await User.create({ email: 'person@example.com', displayName: 'Person', authProvider: 'email_otp' });
  const code = await issue();
  const response = await api.post('/api/auth/otp/verify').send({ email: 'PERSON@example.com', otp: code });
  expect(response.status).toBe(200);
  expect(response.body.user.displayName).toBe('Person');
  expect(await User.countDocuments()).toBe(1);
  expect(verifyToken(response.body.token).email).toBe('person@example.com');
});
test('provider failure returns failure and removes unusable challenge', async () => {
  (mail.sendOtpEmail as jest.Mock).mockRejectedValueOnce(new Error('Provider unavailable'));
  const response = await api.post('/api/auth/otp/request').send({ email: 'person@example.com' });
  expect(response.status).toBe(503);
  expect(await Otp.countDocuments()).toBe(0);
});
test('missing email configuration fails honestly', async () => {
  delete process.env.RESEND_API_KEY;
  expect((await api.post('/api/auth/otp/request').send({ email: 'person@example.com' })).status).toBe(503);
  expect(mail.sendOtpEmail).not.toHaveBeenCalled();
});
test('Google verifier receives configured audience and ignores client supplied identity', async () => {
  verifiedGoogle();
  const response = await api.post('/api/auth/google').send({ idToken: 'signed-token', email: 'attacker@example.com' });
  expect(response.status).toBe(200);
  expect(response.body.user.email).toBe('person@gmail.com');
  expect(OAuth2Client.prototype.verifyIdToken).toHaveBeenCalledWith({ idToken: 'signed-token', audience: 'test-web-client' });
  const again = await api.post('/api/auth/google').send({ idToken: 'signed-token' });
  expect(again.body.user.id).toBe(response.body.user.id);
});
test('missing Google configuration fails', async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  expect((await api.post('/api/auth/google').send({ idToken: 'anything' })).status).toBe(503);
});
test('logout revokes only the current session', async () => {
  const code = await issue();
  const response = await api.post('/api/auth/otp/verify').send({ email: 'person@example.com', otp: code });
  const token = response.body.token;
  expect((await api.post('/api/auth/logout').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  expect((await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  expect((await api.post('/chatbot/query').set('Authorization', `Bearer ${token}`).send({ query: 'test' })).status).toBe(401);
});
