import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import Admin from '../src/models/Admin';
import { generateAdminToken, verifyAdminToken } from '../src/utils/jwt';

describe('Admin Authentication & JWT Protection Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  const JWT_SECRET = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Admin.deleteMany({});
  });

  // ==========================================================================
  // 1. JWT Utilities Unit Tests
  // ==========================================================================
  describe('JWT Utilities (generateAdminToken & verifyAdminToken)', () => {
    it('should generate a token that decodes with admin role and adminId', () => {
      const token = generateAdminToken({
        adminId: 'admin_123',
        email: 'testadmin@healinghands4u.com',
        role: 'admin',
      });

      expect(typeof token).toBe('string');
      const decoded = verifyAdminToken(token);
      expect(decoded.adminId).toBe('admin_123');
      expect(decoded.email).toBe('testadmin@healinghands4u.com');
      expect(decoded.role).toBe('admin');
    });

    it('should throw when verifying an invalid or tampered token', () => {
      expect(() => {
        verifyAdminToken('invalid.token.structure');
      }).toThrow();

      const forgedToken = jwt.sign({ adminId: '1', role: 'admin' }, 'wrong_secret_key');
      expect(() => {
        verifyAdminToken(forgedToken);
      }).toThrow();
    });
  });

  // ==========================================================================
  // 2. Admin Login Endpoint (POST /api/admin/auth/login)
  // ==========================================================================
  describe('POST /api/admin/auth/login', () => {
    it('should authenticate default admin credentials and auto-seed the admin record', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@healinghands4u.com',
          password: 'Admin@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.email).toBe('admin@healinghands4u.com');
      expect(res.body.admin.role).toBe('admin');

      // Verify token payload
      const decoded = verifyAdminToken(res.body.token);
      expect(decoded.email).toBe('admin@healinghands4u.com');
      expect(decoded.role).toBe('admin');

      // Verify admin auto-created in database
      const dbAdmin = await Admin.findOne({ email: 'admin@healinghands4u.com' });
      expect(dbAdmin).not.toBeNull();
      expect(dbAdmin?.role).toBe('admin');
    });

    it('should handle case-insensitive email matching on login', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'ADMIN@HEALINGHANDS4U.COM',
          password: 'Admin@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.email).toBe('admin@healinghands4u.com');
    });

    it('should authenticate existing admin in DB with matching passwordHash', async () => {
      await Admin.create({
        email: 'staff@healinghands4u.com',
        passwordHash: 'StaffPass#2026',
        authProvider: 'password',
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'staff@healinghands4u.com',
          password: 'StaffPass#2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.email).toBe('staff@healinghands4u.com');
    });

    it('should reject login when email is missing with 400', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          password: 'Admin@123456',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email and password required');
    });

    it('should reject login when password is missing with 400', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@healinghands4u.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email and password required');
    });

    it('should reject login when email or password is empty/whitespace with 400', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: '   ',
          password: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email and password required');
    });

    it('should reject login with wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@healinghands4u.com',
          password: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject login with non-existent admin email with 401', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'unknown_user@example.com',
          password: 'SomePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  // ==========================================================================
  // 3. Admin Authorization Middleware & Profile (GET /api/admin/auth/me)
  // ==========================================================================
  describe('Admin Auth Middleware & Profile (GET /api/admin/auth/me)', () => {
    it('should reject request when Authorization header is completely missing with 401', async () => {
      const res = await request(app).get('/api/admin/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject non-Bearer scheme (e.g. Basic auth) with 401', async () => {
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject empty Bearer token with 401', async () => {
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject forged JWT with wrong secret with 401', async () => {
      const forged = jwt.sign({ adminId: '1', role: 'admin' }, 'invalid_fake_secret');
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${forged}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject expired JWT with 401', async () => {
      const expired = jwt.sign(
        { adminId: '1', role: 'admin' },
        JWT_SECRET,
        { expiresIn: -10 }
      );
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject token without admin role (e.g. role: "user" or "guest") with 401', async () => {
      const userToken = jwt.sign(
        { userId: 'user_123', role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should return 200 with admin profile when valid admin token is provided', async () => {
      const token = generateAdminToken({
        adminId: 'admin_xyz_999',
        email: 'doctor@healinghands4u.com',
        role: 'admin',
      });

      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.id).toBe('admin_xyz_999');
      expect(res.body.admin.email).toBe('doctor@healinghands4u.com');
      expect(res.body.admin.role).toBe('admin');
    });
  });
});
