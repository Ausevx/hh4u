## 2026-09-17T05:23:41Z
Implement Milestone 2.1 Backend Authentication Endpoints and Jest/Supertest Test Suite:
1. Dependencies: jsonwebtoken, google-auth-library, jest, ts-jest, @types/jest, supertest, @types/supertest, @types/jsonwebtoken, mongodb-memory-server. (BypassSandbox: true for npm install).
2. Architecture Refactor:
   - backend/src/app.ts: CORS, Helmet, JSON parser, route mounting (/api/auth, /health), export app. No app.listen or top-level DB connection here.
   - backend/src/index.ts: import app, connectDB(), app.listen(port).
3. Models:
   - backend/src/models/User.ts: authProvider ('email_otp' | 'google' | 'guest'), sparse unique index on email, displayName, googleId, avatarUrl, createdAt, lastLoginAt.
   - backend/src/models/Otp.ts: email, otp, expiresAt with TTL index (expires: 0), createdAt.
4. JWT & Auth Middleware:
   - backend/src/utils/jwt.ts: token generation and verification using process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026'.
   - backend/src/middlewares/authMiddleware.ts: Bearer <token> extraction & verification, req.user attachment, 401 on missing/invalid.
5. Auth Endpoints:
   - POST /api/auth/guest
   - POST /api/auth/otp/request
   - POST /api/auth/otp/verify
   - POST /api/auth/google
   - GET /api/auth/me
6. Test Suite (backend/tests/auth.test.ts):
   - jest.config.js with ts-jest.
   - "test": "jest --runInBand --detectOpenHandles" in package.json.
   - Comprehensive tests: guest, otp flow, me, error handling.
7. Verification: npm test passes with 0 failures.
8. Document: handoff.md and notify parent.
