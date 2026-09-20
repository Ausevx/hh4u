import request from 'supertest';
import mongoose from 'mongoose';
import {
  getE2ETestApp,
  setupE2ETestEnvironment,
  generateAdminToken,
} from './e2e/helpers/e2eHarness';
import Admin from '../src/models/Admin';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';

/**
 * Tier 5: Adversarial Coverage & Stress Hardening Suite
 * 
 * Empirically probes security boundaries, stress resilience, and concurrency behaviors:
 * 1. Authentication & Credential Isolation Vectors
 * 2. Non-JSON & Malformed Body Handling
 * 3. Extreme Payload & Boundary Stress Testing
 * 4. High-Concurrency & Race Condition Hardening
 * 5. Knowledge Base Cascade & Orphan Document Integrity
 */
describe('Tier 5: Adversarial Coverage & Stress Hardening Suite', () => {
  setupE2ETestEnvironment();

  const app = getE2ETestApp();
  const validAdminToken = generateAdminToken();

  // =========================================================================
  // Adversarial Suite 1: Authentication & Credential Isolation Vectors
  // =========================================================================
  describe('Adversarial 1: Authentication & Credential Isolation Vectors', () => {
    it('Adversarial 1.1: Empirical probe of credential isolation — default password against non-default admin', async () => {
      // Create custom admin with dedicated, distinct password
      const customEmail = 'staff_specialist@healinghands4u.com';
      const customPassword = 'DoctorCustomPassword#2026!';

      await Admin.create({
        email: customEmail,
        passwordHash: customPassword,
        authProvider: 'password',
        role: 'admin',
      });

      // Attempt to login using the default admin password 'Admin@123456'
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: customEmail,
          password: 'Admin@123456',
        });

      // Hardened Assertion:
      // Non-default admin MUST reject default password with 401 Unauthorized.
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    });

    it('Adversarial 1.2: Custom admin must authenticate successfully with their own dedicated password', async () => {
      const customEmail = 'specialist_dr@healinghands4u.com';
      const customPassword = 'SpecialistPassword#789!';

      await Admin.create({
        email: customEmail,
        passwordHash: customPassword,
        authProvider: 'password',
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: customEmail,
          password: customPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.admin.email).toBe(customEmail);
    });

    it('Adversarial 1.3: Custom admin password must NOT authenticate default admin account', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: 'admin@healinghands4u.com',
          password: 'RandomWrongPassword#999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    });

    it('Adversarial 1.4: Cross-account credential leakage prevention (Admin A pass on Admin B email)', async () => {
      const adminAEmail = 'admin_alpha@healinghands4u.com';
      const adminAPassword = 'AlphaPassword#111';
      const adminBEmail = 'admin_beta@healinghands4u.com';
      const adminBPassword = 'BetaPassword#222';

      await Admin.create({
        email: adminAEmail,
        passwordHash: adminAPassword,
        authProvider: 'password',
        role: 'admin',
      });

      await Admin.create({
        email: adminBEmail,
        passwordHash: adminBPassword,
        authProvider: 'password',
        role: 'admin',
      });

      // Try Alpha's password for Beta's email
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: adminBEmail,
          password: adminAPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Adversarial 1.5: NoSQL injection attempt in auth body must be neutralized with 400', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          email: { $ne: null },
          password: { $gt: '' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Adversarial Suite 2: Non-JSON & Malformed Body Handling
  // =========================================================================
  describe('Adversarial 2: Non-JSON & Malformed Body Handling', () => {
    it('Adversarial 2.1: Empirical probe of POST /api/admin/auth/login with text/plain body', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'text/plain')
        .send('admin@healinghands4u.com:Admin@123456');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Adversarial 2.2: Empirical probe of POST /api/admin/auth/login with application/x-www-form-urlencoded', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=admin%40healinghands4u.com&password=Admin%40123456');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Adversarial 2.3: Empirical probe of POST /api/admin/auth/login with completely empty body', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Adversarial 2.4: Empirical probe of POST /api/admin/auth/login with JSON number primitive', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send('12345');

      // express.json({ strict: true }) rejects primitive JSON with 400 status
      expect(res.status).toBe(400);
    });

    it('Adversarial 2.5: Empirical probe of POST /api/admin/knowledge-base with text/plain body', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .set('Content-Type', 'text/plain')
        .send('canonicalQuestionText=What+is+homeopathy');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Adversarial Suite 3: Extreme Payload & Boundary Stress Testing
  // =========================================================================
  describe('Adversarial 3: Extreme Payload & Boundary Stress', () => {
    it('Adversarial 3.1: Enormous canonical question text (50,000+ chars) should be handled safely', async () => {
      const hugeQuestion = 'Adversarial Question ' + 'A'.repeat(50000);
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: hugeQuestion,
          tags: ['stress', 'large-payload'],
          answerText: 'Standard stress answer',
        });

      // Either accepted or cleanly rejected with 400, NEVER 500 crash
      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.item.canonicalQuestionText).toBeDefined();
        await Level1Question.findByIdAndDelete(res.body.item.id);
      }
    });

    it('Adversarial 3.2: High-density diagnostic question array (200 questions) should persist and link cleanly', async () => {
      const highDensityDiags = Array.from({ length: 200 }, (_, i) => `Is symptom #${i + 1} present?`);

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Adversarial high density diagnostic stress question',
          diagnosticQuestions: highDensityDiags,
          answerText: 'Remedy guidance for complex diagnosis',
        });

      expect(res.status).toBe(201);
      expect(res.body.item.id).toBeDefined();

      const consultDoc = await ConsultationQuery.findOne({ level1QuestionId: res.body.item.id });
      expect(consultDoc).toBeDefined();
      expect(consultDoc?.diagnosticQuestions).toHaveLength(200);

      await request(app)
        .delete(`/api/admin/knowledge-base/${res.body.item.id}`)
        .set('Authorization', `Bearer ${validAdminToken}`);
    });

    it('Adversarial 3.3: Massive tags array (500 tags) should be processed and normalized without crash', async () => {
      const massiveTags = Array.from({ length: 500 }, (_, i) => `tag_${i}`);

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Adversarial tags stress question',
          tags: massiveTags,
        });

      expect(res.status).toBe(201);
      expect(res.body.item.tags).toHaveLength(500);

      await Level1Question.findByIdAndDelete(res.body.item.id);
    });

    it('Adversarial 3.4: Unicode stress with zero-width spaces, RTL text, and emojis', async () => {
      const unicodeQuestion = 'Can \u200B\u200Chomeopathy treat \u0627\u0644\u0635\u062F\u0627\u0639 and 🤧🤒?';
      const unicodeRemedy = 'Belladonna 30C for 💥 throbbing pain \u200F\u200E';

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: unicodeQuestion,
          homeRemedyText: unicodeRemedy,
        });

      expect(res.status).toBe(201);
      expect(res.body.item.canonicalQuestionText).toBe(unicodeQuestion);

      const searchRes = await request(app)
        .get('/api/admin/knowledge-base')
        .query({ search: 'الصداع' })
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.items.length).toBeGreaterThanOrEqual(1);

      await request(app)
        .delete(`/api/admin/knowledge-base/${res.body.item.id}`)
        .set('Authorization', `Bearer ${validAdminToken}`);
    });
  });

  // =========================================================================
  // Adversarial Suite 4: High-Concurrency & Race Condition Hardening
  // =========================================================================
  describe('Adversarial 4: High-Concurrency & Race Conditions', () => {
    it('Adversarial 4.1: 20 concurrent KB creations should all succeed and maintain accurate stats', async () => {
      const initialStats = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${validAdminToken}`);

      const startQuestions = initialStats.body.stats.totalQuestions;

      const promises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/admin/knowledge-base')
          .set('Authorization', `Bearer ${validAdminToken}`)
          .send({
            canonicalQuestionText: `Concurrent Unique Question #${i + 1} - ${Date.now()}`,
            answerText: `Concurrent Answer #${i + 1}`,
          })
      );

      const results = await Promise.all(promises);

      results.forEach((res) => {
        expect(res.status).toBe(201);
        expect(res.body.item.id).toBeDefined();
      });

      const finalStats = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(finalStats.body.stats.totalQuestions).toBe(startQuestions + 20);
    });

    it('Adversarial 4.2: 10 concurrent updates to the same KB entry should maintain consistency without crash', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Base question for concurrent update stress',
          answerText: 'Initial answer text',
        });

      const itemId = createRes.body.item.id;

      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .put(`/api/admin/knowledge-base/${itemId}`)
          .set('Authorization', `Bearer ${validAdminToken}`)
          .send({
            answerText: `Updated concurrent answer version #${i + 1}`,
          })
      );

      const updateResults = await Promise.all(updatePromises);

      updateResults.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      const verifyRes = await request(app)
        .get(`/api/admin/knowledge-base/${itemId}`)
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.item.answerText).toMatch(/^Updated concurrent answer version #\d+$/);

      await request(app)
        .delete(`/api/admin/knowledge-base/${itemId}`)
        .set('Authorization', `Bearer ${validAdminToken}`);
    });

    it('Adversarial 4.3: Empirical probe of simultaneous DELETE and PUT race condition', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Question for Delete vs Put Race',
          answerText: 'Race answer',
        });

      const itemId = createRes.body.item.id;

      const [delRes, putRes] = await Promise.all([
        request(app)
          .delete(`/api/admin/knowledge-base/${itemId}`)
          .set('Authorization', `Bearer ${validAdminToken}`),
        request(app)
          .put(`/api/admin/knowledge-base/${itemId}`)
          .set('Authorization', `Bearer ${validAdminToken}`)
          .send({ answerText: 'Late update race' }),
      ]);

      // DELETE should return 200 or 404
      expect([200, 404]).toContain(delRes.status);

      // In hardened race handling, PUT returns 200 (if executed before DELETE) or 404 (if executed after DELETE), never 500.
      expect([200, 404]).toContain(putRes.status);
    });

    it('Adversarial 4.4: Concurrent Read-Heavy Load during active creation operations', async () => {
      const writes = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/admin/knowledge-base')
          .set('Authorization', `Bearer ${validAdminToken}`)
          .send({
            canonicalQuestionText: `Load test write #${i + 1}`,
            answerText: `Load answer #${i + 1}`,
          })
      );

      const reads = Array.from({ length: 15 }, () =>
        request(app)
          .get('/api/admin/stats')
          .set('Authorization', `Bearer ${validAdminToken}`)
      );

      const allResults = await Promise.all([...writes, ...reads]);

      allResults.forEach((res) => {
        expect([200, 201]).toContain(res.status);
      });
    });

    it('Adversarial 4.5: Empirical probe of Double-Delete race on identical ID', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Question for Double-Delete Race',
        });

      const itemId = createRes.body.item.id;

      const [res1, res2] = await Promise.all([
        request(app)
          .delete(`/api/admin/knowledge-base/${itemId}`)
          .set('Authorization', `Bearer ${validAdminToken}`),
        request(app)
          .delete(`/api/admin/knowledge-base/${itemId}`)
          .set('Authorization', `Bearer ${validAdminToken}`),
      ]);

      // In hardened atomic handling: exactly one 200 and one 404.
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 404]);
    });
  });

  // =========================================================================
  // Adversarial Suite 5: Knowledge Base Cascade & Orphan Document Integrity
  // =========================================================================
  describe('Adversarial 5: Knowledge Base Cascade & Orphan Document Integrity', () => {
    it('Adversarial 5.1: Cascade deletion must thoroughly purge multiple answers associated with question', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Multi-answer cascade test question',
          answerText: 'Level 1 Primary Answer',
        });

      const qId = createRes.body.item.id;

      await Answer.create({
        level1QuestionId: qId,
        questionText: 'Multi-answer cascade test question',
        answerText: 'Secondary diagnostic branch remedy',
        answerType: 'diagnostic',
      });

      const answersBefore = await Answer.countDocuments({ level1QuestionId: qId });
      expect(answersBefore).toBe(2);

      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${qId}`)
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(delRes.status).toBe(200);

      const answersAfter = await Answer.countDocuments({ level1QuestionId: qId });
      const consultAfter = await ConsultationQuery.countDocuments({ level1QuestionId: qId });
      const questionAfter = await Level1Question.findById(qId);

      expect(answersAfter).toBe(0);
      expect(consultAfter).toBe(0);
      expect(questionAfter).toBeNull();
    });

    it('Adversarial 5.2: Deleting question whose consultation query was pre-deleted should succeed gracefully', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({
          canonicalQuestionText: 'Pre-deleted child cascade test',
        });

      const qId = createRes.body.item.id;

      await ConsultationQuery.deleteMany({ level1QuestionId: qId });

      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${qId}`)
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });

    it('Adversarial 5.3: Update with malformed non-ObjectId parameter returns 404 cleanly', async () => {
      const res = await request(app)
        .put('/api/admin/knowledge-base/invalid-non-object-id-123')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send({ canonicalQuestionText: 'Should not update' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Adversarial 5.4: Delete with malformed non-ObjectId parameter returns 404 cleanly', async () => {
      const res = await request(app)
        .delete('/api/admin/knowledge-base/invalid-non-object-id-123')
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
