import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../../src/app';
import * as mail from '../../src/services/authEmailService';
import { OAuth2Client } from 'google-auth-library';

export const api = request(app);
export function authHarness() {
  let mongo: MongoMemoryServer;
  const codes = new Map<string, string>();
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  }, 60000);
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
    codes.clear();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.AUTH_EMAIL_FROM = 'signin@example.com';
    process.env.GOOGLE_CLIENT_ID = 'test-web-client';
    jest.spyOn(mail, 'sendOtpEmail').mockImplementation(async (email, otp) => { codes.set(email, otp); });
    (jest.spyOn(OAuth2Client.prototype, 'verifyIdToken') as jest.Mock).mockRejectedValue(new Error('Invalid token'));
  });
  afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
  return { codes, async issue(email = 'person@example.com') {
    const response = await api.post('/api/auth/otp/request').send({ email });
    expect(response.status).toBe(200);
    return codes.get(email.toLowerCase().trim())!;
  } };
}
export function verifiedGoogle(overrides: Record<string, unknown> = {}) {
  (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValue({ getPayload: () => ({
    sub: 'google-subject', email: 'person@gmail.com', email_verified: true, name: 'Google Person', ...overrides
  }) });
}
