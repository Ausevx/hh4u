# Backend Architecture & Authentication Survey Report (Milestone 2)

## 1. Observation

### 1.1 Codebase & File Structure
Direct inspection of `/Users/aditya/workspace/hh4u/backend` reveals a TypeScript Express project:
- **`backend/package.json`**:
  - `main`: `"index.js"`, `type`: `"commonjs"`
  - Scripts: `"dev": "ts-node-dev --respawn src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`, `"test": "echo \"Error: no test specified\" && exit 1"`
  - Dependencies:
    ```json
    "dependencies": {
      "cors": "^2.8.6",
      "dotenv": "^17.4.2",
      "express": "^5.2.1",
      "helmet": "^8.3.0",
      "mongoose": "^9.10.1"
    },
    "devDependencies": {
      "@types/cors": "^2.8.19",
      "@types/express": "^5.0.6",
      "@types/node": "^22.20.3",
      "ts-node-dev": "^2.0.0",
      "typescript": "^7.0.2"
    }
    ```
- **`backend/src/index.ts`** (lines 9-27):
  ```typescript
  const app = express();
  const port = process.env.PORT || 5000;
  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  connectDB();
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Healing Hands4U API is running' });
  });
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  ```
  - **Critical Observation**: `app` is not exported from `index.ts`. `connectDB()` and `app.listen(port)` execute immediately on file load.
- **`backend/src/config/db.ts`** (lines 6-20):
  ```typescript
  const connectDB = async () => {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env file');
      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
      process.exit(1);
    }
  };
  ```
- **Directories**:
  - `backend/src/controllers/` — empty directory.
  - `backend/src/routes/` — empty directory.
  - `backend/src/services/` — empty directory.
  - `backend/src/middlewares/` — does not exist yet.
  - `backend/tests/` or `backend/src/__tests__/` — does not exist yet.

### 1.2 User & Domain Models
- **`backend/src/models/User.ts`** (lines 3-19):
  ```typescript
  export interface IUser extends Document {
    email?: string;
    displayName?: string;
    authProvider: 'email_otp' | 'google' | 'guest';
    createdAt: Date;
    lastLoginAt: Date;
  }

  const UserSchema: Schema = new Schema({
    email: { type: String, unique: true, sparse: true },
    displayName: { type: String },
    authProvider: { type: String, enum: ['email_otp', 'google', 'guest'], required: true },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now }
  });
  ```
  - The model already matches the 3 auth modes: `'email_otp'`, `'google'`, `'guest'`.
  - `email` uses `{ unique: true, sparse: true }`, which allows multiple guest users with `null`/`undefined` email.
  - There is currently no `Otp` model for storing email verification codes.

### 1.3 Database & Network Connectivity
- `.env` contains:
  `MONGODB_URI="mongodb+srv://test1magnitude_db_user:JZvOlrRvxOZ0XnBb@cluster0.iifejq3.mongodb.net"`
- Direct command within sandbox failed with:
  `querySrv ECONNREFUSED _mongodb._tcp.cluster0.iifejq3.mongodb.net`
- Command with `BypassSandbox: true` succeeded:
  `MongoDB connection SUCCESSFUL!`
  Verified full read/write CRUD functionality against MongoDB Atlas.
- External npm registry (`https://registry.npmjs.org`) is also accessible with `BypassSandbox: true`.

---

## 2. Logic Chain

1. **Separation of Concerns for Testability**:
   - Supertest requires importing the Express application instance without triggering a live network listener on a fixed port.
   - Because `backend/src/index.ts` currently runs `app.listen(port)` and `connectDB()` top-level, running tests importing `index.ts` would cause port conflicts (`EADDRINUSE`) and process hang.
   - **Inference**: Refactor into `backend/src/app.ts` (middleware configuration, route mounting, export of `app`) and `backend/src/index.ts` (imports `app`, invokes `connectDB()`, starts `app.listen(port)`).

2. **User Model Evaluation**:
   - `IUser` and `UserSchema` already contain the core fields: `email`, `displayName`, `authProvider`, `createdAt`, and `lastLoginAt`.
   - For Google Sign-In, adding `googleId?: string` (sparse index) prevents collisions or multiple accounts if email changes, and `avatarUrl?: string` enables profile display in Android UI.
   - For Guest accounts, `authProvider: 'guest'` with no `email` satisfies the unique sparse index.
   - **Inference**: The existing `User.ts` model is sound and can be extended with optional `googleId` and `avatarUrl`.

3. **Email OTP Architecture**:
   - Storing OTPs in memory fails when multiple server instances run or upon server restart, and cannot be cleanly tested or expired.
   - Mongoose provides native TTL indexes (`expires: 0` or `expires: 300`).
   - **Inference**: Create `backend/src/models/Otp.ts` with fields `email`, `otp`, `expiresAt`, `createdAt`. In demo/test environments, the OTP should also be logged and returned in development response to allow automated end-to-end and integration testing without SMTP dependencies.

4. **Authentication & Token Strategy**:
   - Milestone 2 acceptance criteria require: "Tests verify that the Guest login endpoint creates a user and returns a valid JWT" and endpoints supporting Email OTP, Google, and Guest.
   - `jsonwebtoken` is required for signing session tokens with payload `{ userId, email, authProvider }`.
   - A dedicated middleware `verifyToken` / `authenticateToken` in `backend/src/middlewares/auth.ts` is required to protect future endpoints and provide a `GET /api/auth/me` session check endpoint.

5. **Test Infrastructure Setup**:
   - Current `npm test` script fails immediately (`echo "Error: no test specified" && exit 1`).
   - Acceptance criteria require: "A programmatic test suite exists for the backend... All backend test cases pass successfully."
   - **Inference**: Install `jest`, `@types/jest`, `ts-jest`, `supertest`, `@types/supertest`, and configure `jest.config.js`. Create `tests/auth.test.ts` testing Guest login, OTP flow, and token verification.

---

## 3. Caveats

1. **Network Sandbox**: Network operations (such as npm package installation and MongoDB Atlas access) require `BypassSandbox: true` in this Mac environment.
2. **Google Sign-In Mocking in Tests / Demo**: In a demo/test environment, Google ID token verification against `https://oauth2.googleapis.com` will fail with fake test tokens unless the verification logic supports a mock/demo bypass when `NODE_ENV !== 'production'` or when a recognized test token prefix is provided.
3. **Email Transport**: For Email OTP, real SMTP credentials are not present in `.env`. The system should log generated OTPs to console and include them in response payloads during demo/testing mode (`process.env.NODE_ENV !== 'production'`).
4. **Admin vs Mobile User**: The codebase contains `models/Admin.ts` (for the admin panel) and `models/User.ts` (for mobile app users). Milestone 2 specifically targets the mobile app ecosystem (`User.ts`).

---

## 4. Conclusion & Detailed API Specification

### 4.1 Required Dependencies to Install
In `backend/`:
```bash
# Runtime dependencies
npm install jsonwebtoken google-auth-library

# Development / Testing dependencies
npm install --save-dev @types/jsonwebtoken jest @types/jest ts-jest supertest @types/supertest
```

### 4.2 Database Models Specification

#### `backend/src/models/User.ts` (Updated)
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  displayName?: string;
  authProvider: 'email_otp' | 'google' | 'guest';
  googleId?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  displayName: { type: String, default: '' },
  authProvider: { type: String, enum: ['email_otp', 'google', 'guest'], required: true },
  googleId: { type: String, sparse: true },
  avatarUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
```

#### `backend/src/models/Otp.ts` (New)
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema: Schema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOtp>('Otp', OtpSchema);
```

---

### 4.3 Endpoints Specification

Base URL: `/api/auth`

#### 1. Request Email OTP
- **Path**: `POST /api/auth/otp/request` (alias: `POST /api/auth/otp/send`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Validation**:
  - `email`: required, valid format.
- **Error Responses**:
  - `400 Bad Request`: `{ "success": false, "message": "Valid email is required" }`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "OTP sent successfully",
    "email": "user@example.com",
    "otp": "123456" // Returned in development/demo mode for test automation
  }
  ```

#### 2. Verify Email OTP
- **Path**: `POST /api/auth/otp/verify`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
- **Validation**:
  - `email`: required
  - `otp`: required, 6 digits
- **Logic**:
  - Validates OTP against `Otp` collection.
  - On match, consumes/deletes OTP.
  - Upserts `User` record (`authProvider: 'email_otp'`, `email`, `lastLoginAt = new Date()`).
  - Generates JWT token.
- **Error Responses**:
  - `400 Bad Request`: `{ "success": false, "message": "Invalid or expired OTP" }`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Authentication successful",
    "token": "<JWT_STRING>",
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a1",
      "email": "user@example.com",
      "displayName": "user",
      "authProvider": "email_otp",
      "createdAt": "2026-09-17T05:20:00.000Z",
      "lastLoginAt": "2026-09-17T05:20:00.000Z"
    }
  }
  ```

#### 3. Google Sign-In
- **Path**: `POST /api/auth/google`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "idToken": "<GOOGLE_ID_TOKEN>",
    "email": "user@gmail.com", // Optional fallback in demo mode
    "displayName": "John Doe",  // Optional fallback
    "photoUrl": "https://..."   // Optional
  }
  ```
- **Logic**:
  - Verifies token via `OAuth2Client` (with demo/test mock bypass if `idToken` starts with `mock_` or in test environment).
  - Finds or creates user by email.
  - Updates `lastLoginAt = new Date()`, `authProvider = 'google'`.
  - Generates JWT token.
- **Error Responses**:
  - `400 Bad Request`: `{ "success": false, "message": "Google ID token is required" }`
  - `401 Unauthorized`: `{ "success": false, "message": "Invalid Google token" }`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Google authentication successful",
    "token": "<JWT_STRING>",
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a2",
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "authProvider": "google",
      "avatarUrl": "https://...",
      "createdAt": "2026-09-17T05:20:00.000Z",
      "lastLoginAt": "2026-09-17T05:20:00.000Z"
    }
  }
  ```

#### 4. Guest User Login
- **Path**: `POST /api/auth/guest`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {}
  ```
  *(Optional `{ "deviceId": "..." }` accepted)*
- **Logic**:
  - Creates a new `User` document:
    - `displayName: "Guest User"`
    - `authProvider: "guest"`
    - `lastLoginAt: new Date()`
  - Saves to database.
  - Generates JWT token: `{ userId: user._id, authProvider: 'guest' }`.
- **Success Response** (`200 OK` or `201 Created`):
  ```json
  {
    "success": true,
    "message": "Guest session created",
    "token": "<JWT_STRING>",
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a3",
      "displayName": "Guest User",
      "authProvider": "guest",
      "createdAt": "2026-09-17T05:20:00.000Z",
      "lastLoginAt": "2026-09-17T05:20:00.000Z"
    }
  }
  ```

#### 5. Verify Session / Current User
- **Path**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Logic**:
  - Validates JWT from header.
  - Fetches current user by `req.user.userId`.
- **Error Responses**:
  - `401 Unauthorized`: `{ "success": false, "message": "Authentication token missing or invalid" }`
  - `404 Not Found`: `{ "success": false, "message": "User not found" }`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "user": {
      "id": "60d5ec49f1b2c8b1f8e4e1a3",
      "displayName": "Guest User",
      "authProvider": "guest",
      "createdAt": "2026-09-17T05:20:00.000Z",
      "lastLoginAt": "2026-09-17T05:20:00.000Z"
    }
  }
  ```

---

### 4.4 JWT Generation & Auth Middleware Spec
- **JWT Helper** (`backend/src/utils/jwt.ts`):
  - Secret: `process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026'`
  - Expiration: `'30d'`
  - Payload: `{ userId: string, authProvider: string, email?: string }`
  - Functions: `generateToken(payload): string`, `verifyToken(token): JwtPayload`
- **Middleware** (`backend/src/middlewares/authMiddleware.ts`):
  - Extracts `Bearer <token>` from `req.headers.authorization`.
  - Verifies token and populates `req.user`.
  - Returns `401 Unauthorized` if token is absent or invalid.

---

### 4.5 Implementation Architecture Blueprint
```
backend/
├── src/
│   ├── app.ts                 # Express configuration, middlewares, routes (exported for tests & server)
│   ├── index.ts               # Server startup (connectDB + app.listen)
│   ├── config/
│   │   └── db.ts              # MongoDB connection
│   ├── models/
│   │   ├── User.ts            # User schema (email_otp, google, guest)
│   │   └── Otp.ts             # Temporary OTP storage with TTL
│   ├── controllers/
│   │   └── authController.ts  # Handlers: requestOtp, verifyOtp, googleAuth, guestAuth, getMe
│   ├── routes/
│   │   └── authRoutes.ts      # Router mounting POST /otp/request, /otp/verify, /google, /guest, GET /me
│   ├── middlewares/
│   │   └── authMiddleware.ts  # Bearer token verification
│   └── utils/
│       └── jwt.ts             # Token sign & verify helpers
├── tests/
│   └── auth.test.ts           # Jest + Supertest test suite for all endpoints
├── jest.config.ts             # Jest config (ts-jest preset)
└── package.json               # Updated scripts and dependencies
```

---

## 5. Verification Method

To independently verify this survey's technical findings:
1. **Verify Sandbox Bypass & Atlas Connection**:
   ```bash
   # Run with BypassSandbox: true
   node -e "const m = require('mongoose'); require('dotenv').config({path:'backend/.env'}); m.connect(process.env.MONGODB_URI).then(() => { console.log('OK'); process.exit(0); });"
   ```
2. **Inspect Existing Model & Entry Point**:
   ```bash
   cat backend/src/models/User.ts
   cat backend/src/index.ts
   ```
3. **Verify Planned Test Command for Worker Phase**:
   Once worker installs `jest`, `ts-jest`, `supertest`:
   ```bash
   cd backend && npm test
   ```
   Must verify:
   - Guest login creates user document and returns 200/201 with a valid JWT string.
   - Decoded JWT contains the user ID.
   - OTP request & verify flow returns valid token.
   - All tests pass with exit code 0.
