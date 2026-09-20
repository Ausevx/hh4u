import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {
  getE2ETestApp,
  setupE2ETestEnvironment,
  parseExcelBuffer,
  generateAdminToken,
  generateUserToken,
  generateExpiredAdminToken,
  JWT_SECRET,
  ExcelValidationError,
} from './helpers/e2eHarness';
import {
  createCorruptedBuffer,
  createEmptyWorkbookBuffer,
  createMissingSheetWorkbookBuffer,
  createMissingColumnWorkbookBuffer,
  createWhitespaceWorkbookBuffer,
  createExtremeLengthWorkbookBuffer,
} from './helpers/excelTestHelper';
import Level1Question from '../../src/models/Level1Question';

describe('Tier 2: Boundary & Corner Cases — Opaque-Box E2E Test Suite', () => {
  setupE2ETestEnvironment();

  const app = getE2ETestApp();

  // =========================================================================
  // Group 1: Excel Ingestion Boundaries & Corrupted Files (Tests 1 - 10)
  // =========================================================================
  describe('Excel Parser Boundary & Malformed Inputs (Tests 1 - 10)', () => {
    it('Test 2.1: Empty buffer (0 bytes) should be rejected with 400', async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(parseExcelBuffer(emptyBuffer)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(emptyBuffer)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('Test 2.2: Corrupted non-zip binary file should be rejected with 400', async () => {
      const corrupted = createCorruptedBuffer();
      await expect(parseExcelBuffer(corrupted)).rejects.toThrow(ExcelValidationError);
      await expect(parseExcelBuffer(corrupted)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringMatching(/corrupted|invalid/i),
      });
    });

    it('Test 2.3: Non-xlsx text file disguised as .xlsx should be rejected with 400', async () => {
      const textBuffer = Buffer.from('Col1,Col2,Col3\nVal1,Val2,Val3\n');
      await expect(parseExcelBuffer(textBuffer)).rejects.toThrow(ExcelValidationError);
    });

    it("Test 2.4: Missing required sheet 'level1' should throw 400 with descriptive message", async () => {
      const buffer = createMissingSheetWorkbookBuffer('level1');
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required sheet.*level1/i),
        })
      );
    });

    it("Test 2.5: Missing required sheet 'ConsultationQueries' should throw 400", async () => {
      const buffer = createMissingSheetWorkbookBuffer('ConsultationQueries');
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required sheet.*ConsultationQueries/i),
        })
      );
    });

    it("Test 2.6: Missing required sheet 'Answers' should throw 400", async () => {
      const buffer = createMissingSheetWorkbookBuffer('Answers');
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required sheet.*Answers/i),
        })
      );
    });

    it("Test 2.7: Sheet 'level1' missing column header 'Questions' should throw 400", async () => {
      const buffer = createMissingColumnWorkbookBuffer('level1', 0);
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required header.*Questions/i),
        })
      );
    });

    it("Test 2.8: Sheet 'ConsultationQueries' missing diagnostic header should throw 400", async () => {
      const buffer = createMissingColumnWorkbookBuffer('ConsultationQueries', 1);
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required header/i),
        })
      );
    });

    it("Test 2.9: Sheet 'Answers' missing 'Remedy' header should throw 400", async () => {
      const buffer = createMissingColumnWorkbookBuffer('Answers', 2);
      await expect(parseExcelBuffer(buffer)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/missing required header/i),
        })
      );
    });

    it('Test 2.10: String fields with whitespace and trailing newlines should be trimmed cleanly', async () => {
      const buffer = createWhitespaceWorkbookBuffer();
      const parsed = await parseExcelBuffer(buffer);

      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Are natural remedies effective?');
      expect(parsed.consultationQueries[0].diagnosticQuestions[0]).toBe('Is it acute?');
      expect(parsed.answers[0].remedyText).toContain('Take warm water.');
      expect(parsed.answers[0].videoUrl).toBe('https://youtu.be/IUy9hg8iT3Q');
    });
  });

  // =========================================================================
  // Group 2: Authentication & Authorization Boundaries (Tests 11 - 17)
  // =========================================================================
  describe('Authentication & Authorization Boundaries (Tests 11 - 17)', () => {
    it('Test 2.11: Protected endpoint with missing Authorization header should return 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('Test 2.12: Protected endpoint with non-Bearer Authorization header should return 401', async () => {
      const token = generateAdminToken();
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Basic ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.13: Protected endpoint with empty Bearer token should return 401', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.14: Protected endpoint with tampered or forged JWT should return 401', async () => {
      const forgedToken = jwt.sign({ role: 'admin' }, 'wrong_secret_key');
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.15: Protected endpoint with expired JWT should return 401', async () => {
      const expiredToken = generateExpiredAdminToken();
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.16: Protected endpoint with non-admin role (guest/user) should return 401', async () => {
      const userToken = generateUserToken('normal_user_999');
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.17: POST /api/admin/auth/login with missing email or password should return 400', async () => {
      const res1 = await request(app).post('/api/admin/auth/login').send({ email: 'admin@test.com' });
      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app).post('/api/admin/auth/login').send({ password: 'Password123' });
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Group 3: Data Boundaries, Search Escaping & Pagination (Tests 18 - 25)
  // =========================================================================
  describe('Data Boundaries, Search Escaping & Pagination (Tests 18 - 25)', () => {
    it('Test 2.18: Pagination bounds - page=0 and negative pages should clamp to page 1', async () => {
      const token = generateAdminToken();
      await Level1Question.create({ canonicalQuestionText: 'Boundary question 1' });

      const res0 = await request(app)
        .get('/api/admin/knowledge-base?page=0&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res0.status).toBe(200);
      expect(res0.body.page).toBe(1);

      const resNeg = await request(app)
        .get('/api/admin/knowledge-base?page=-5&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(resNeg.status).toBe(200);
      expect(resNeg.body.page).toBe(1);
    });

    it('Test 2.19: Pagination bounds - limit=0 and negative limit should default to 20', async () => {
      const token = generateAdminToken();

      const res = await request(app)
        .get('/api/admin/knowledge-base?limit=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Test 2.20: Pagination bounds - page > totalPages should return empty items array without error', async () => {
      const token = generateAdminToken();
      await Level1Question.create({ canonicalQuestionText: 'Existing question' });

      const res = await request(app)
        .get('/api/admin/knowledge-base?page=9999&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(1);
    });

    it('Test 2.21: Search with regex meta-characters should be escaped properly without crashing', async () => {
      const token = generateAdminToken();
      await Level1Question.create({ canonicalQuestionText: 'Question with special symbols [test] (regex)?' });

      // Search with unescaped regex characters
      const res = await request(app)
        .get('/api/admin/knowledge-base?search=[test]')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].canonicalQuestionText).toContain('[test]');
    });

    it('Test 2.22: Search with empty string search="" should return all entries', async () => {
      const token = generateAdminToken();
      await Level1Question.create({ canonicalQuestionText: 'Item 1' });
      await Level1Question.create({ canonicalQuestionText: 'Item 2' });

      const res = await request(app)
        .get('/api/admin/knowledge-base?search=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toHaveLength(2);
    });

    it('Test 2.23: Creating a question with empty or whitespace-only text should return 400', async () => {
      const token = generateAdminToken();

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${token}`)
        .send({ canonicalQuestionText: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Test 2.24: Extremely long question text (8000+ chars) should be handled safely without crash', async () => {
      const token = generateAdminToken();
      const longText = 'Medical condition question '.repeat(300) + '?';

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${token}`)
        .send({ canonicalQuestionText: longText });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.canonicalQuestionText.length).toBeGreaterThan(8000);
    });

    it('Test 2.25: PUT and DELETE with non-existent or invalid ObjectId should return 404', async () => {
      const token = generateAdminToken();
      const randomId = new mongoose.Types.ObjectId().toString();

      // PUT non-existent valid ObjectId
      const putRes = await request(app)
        .put(`/api/admin/knowledge-base/${randomId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ canonicalQuestionText: 'Updating ghost question' });
      expect(putRes.status).toBe(404);

      // DELETE non-existent valid ObjectId
      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${randomId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(404);

      // Invalid ID format
      const invalidIdRes = await request(app)
        .delete('/api/admin/knowledge-base/invalid-mongo-id')
        .set('Authorization', `Bearer ${token}`);
      expect(invalidIdRes.status).toBe(404);
    });
  });
});
