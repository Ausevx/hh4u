const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const http = require('http');
const jwt = require('jsonwebtoken');

const app = require('../../backend/dist/app').default || require('../../backend/dist/app').app;
const User = require('../../backend/dist/models/User').default;
const Otp = require('../../backend/dist/models/Otp').default;

async function runForensicAudit() {
  console.log('>>> Starting Independent Forensic Probe <<<');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Probe server running at ${baseUrl}`);

  const results = [];

  // Check 1: Guest Auth endpoint produces real DB document and valid JWT
  try {
    const res = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json();
    if (res.status !== 200 || !body.token || !body.user?.id) {
      throw new Error(`Invalid response: status=${res.status}, body=${JSON.stringify(body)}`);
    }

    // Cryptographic validation
    const secret = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';
    const decoded = jwt.verify(body.token, secret);
    if (decoded.userId !== body.user.id || decoded.authProvider !== 'guest') {
      throw new Error(`JWT payload mismatch: ${JSON.stringify(decoded)}`);
    }

    // Cryptographic rejection on forged secret
    let forgedCaught = false;
    try {
      jwt.verify(body.token, 'wrong_secret_123');
    } catch {
      forgedCaught = true;
    }
    if (!forgedCaught) throw new Error('JWT accepted invalid secret');

    // Mongoose DB check
    const dbDoc = await User.findById(body.user.id);
    if (!dbDoc || dbDoc.authProvider !== 'guest') {
      throw new Error(`Database doc not found or invalid: ${JSON.stringify(dbDoc)}`);
    }

    results.push({ test: 'Guest Auth & JWT Cryptography', status: 'PASS', details: `User ID: ${body.user.id}` });
  } catch (err) {
    results.push({ test: 'Guest Auth & JWT Cryptography', status: 'FAIL', details: err.message });
  }

  // Check 2: OTP Generation, DB Storage, and Invalidation
  try {
    const email = 'forensic.test@hh4u.org';
    const res1 = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const body1 = await res1.json();
    if (res1.status !== 200 || !body1.otp || !/^\d{6}$/.test(body1.otp)) {
      throw new Error(`Invalid OTP request response: ${JSON.stringify(body1)}`);
    }

    const otpDoc1 = await Otp.findOne({ email });
    if (!otpDoc1 || otpDoc1.otp !== body1.otp) {
      throw new Error(`Otp not found in DB: ${JSON.stringify(otpDoc1)}`);
    }

    // Second OTP request invalidates first
    const res2 = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const body2 = await res2.json();
    const otpDoc2 = await Otp.findOne({ email });
    if (!otpDoc2 || otpDoc2.otp !== body2.otp) {
      throw new Error(`New OTP not in DB: ${JSON.stringify(otpDoc2)}`);
    }

    // Verify first OTP fails
    const failVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: body1.otp })
    });
    if (failVerify.status !== 400) {
      throw new Error(`Old OTP should fail with 400, got ${failVerify.status}`);
    }

    // Verify second OTP succeeds
    const passVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: body2.otp })
    });
    const passBody = await passVerify.json();
    if (passVerify.status !== 200 || !passBody.token || passBody.user.email !== email) {
      throw new Error(`Verify failed: status=${passVerify.status}, body=${JSON.stringify(passBody)}`);
    }

    // Check DB User created and OTP consumed
    const userDoc = await User.findOne({ email });
    if (!userDoc || userDoc.authProvider !== 'email_otp') {
      throw new Error(`User not persisted properly: ${JSON.stringify(userDoc)}`);
    }
    const consumedOtp = await Otp.findOne({ email });
    if (consumedOtp !== null) {
      throw new Error('OTP was not consumed/deleted from database after verification');
    }

    // Replay attack must fail
    const replayRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: body2.otp })
    });
    if (replayRes.status !== 400) {
      throw new Error(`Replay attack did not return 400, got ${replayRes.status}`);
    }

    results.push({ test: 'OTP Lifecycle, DB Persistence & Replay Defense', status: 'PASS', details: `Verified and consumed OTP for ${email}` });
  } catch (err) {
    results.push({ test: 'OTP Lifecycle, DB Persistence & Replay Defense', status: 'FAIL', details: err.message });
  }

  // Check 3: Google Auth Upsert & Verification
  try {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: 'mock_google_forensic_probe',
        email: 'forensic.google@gmail.com',
        displayName: 'Forensic Investigator',
        photoUrl: 'https://example.com/photo.png'
      })
    });
    const body = await res.json();
    if (res.status !== 200 || !body.token || body.user.email !== 'forensic.google@gmail.com') {
      throw new Error(`Google auth failed: ${JSON.stringify(body)}`);
    }

    const dbGoogleUser = await User.findOne({ email: 'forensic.google@gmail.com' });
    if (!dbGoogleUser || dbGoogleUser.authProvider !== 'google') {
      throw new Error(`Google user not in DB: ${JSON.stringify(dbGoogleUser)}`);
    }

    results.push({ test: 'Google Auth & DB Upsert', status: 'PASS', details: `Created google user ${dbGoogleUser.email}` });
  } catch (err) {
    results.push({ test: 'Google Auth & DB Upsert', status: 'FAIL', details: err.message });
  }

  // Check 4: Protected GET /api/auth/me
  try {
    const guestRes = await fetch(`${baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const guestBody = await guestRes.json();
    const token = guestBody.token;

    // Authorized call
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meBody = await meRes.json();
    if (meRes.status !== 200 || meBody.user.id !== guestBody.user.id) {
      throw new Error(`GET /me failed: ${JSON.stringify(meBody)}`);
    }

    // Tampered token call
    const tamperedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}tampered` }
    });
    if (tamperedRes.status !== 401) {
      throw new Error(`Tampered token should return 401, got ${tamperedRes.status}`);
    }

    // No token call
    const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
    if (unauthRes.status !== 401) {
      throw new Error(`Missing token should return 401, got ${unauthRes.status}`);
    }

    results.push({ test: 'GET /api/auth/me Token Guard & Identity Resolution', status: 'PASS', details: 'Correctly verified and rejected' });
  } catch (err) {
    results.push({ test: 'GET /api/auth/me Token Guard & Identity Resolution', status: 'FAIL', details: err.message });
  }

  // Teardown
  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log('\n--- Forensic Probe Results ---');
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}: ${r.details}`);
  }

  const allPassed = results.every(r => r.status === 'PASS');
  if (!allPassed) {
    process.exit(1);
  }
}

runForensicAudit().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
