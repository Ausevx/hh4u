import { createHash } from 'crypto';
import Level1Question from '../models/Level1Question';
import Answer from '../models/Answer';
import ConsultationQuery from '../models/ConsultationQuery';

/** One complete snapshot, shared by device sync and APK asset export. */
export async function buildOfflineKnowledgeSnapshot() {
  const [questions, answers, consultations] = await Promise.all([
    Level1Question.find({ isActive: true }).select('-embedding').sort({ _id: 1 }).lean(),
    Answer.find().sort({ _id: 1 }).lean(),
    ConsultationQuery.find().sort({ _id: 1 }).lean(),
  ]);
  const byAnswerId = new Map(answers.map(a => [String(a._id), a]));
  const answerDto = (a: any) => a ? {
    id: String(a._id), answerText: a.answerText, reasonText: a.reasonText,
    remedyName: a.remedyText, dosageInstructions: a.dosageInstructions,
    homeRemedyText: a.homeRemedyText, safetyDisclaimerText: a.safetyDisclaimerText,
    videoUrl: a.videoUrl,
  } : null;
  const items = questions.map(q => {
    const related = answers.filter(a => String(a.level1QuestionId) === String(q._id));
    const answer = related.find(a => a.answerType === 'level1') || related[0];
    const consultation = consultations.find(c => String(c.level1QuestionId) === String(q._id));
    const diagnosticQuestions = (consultation?.diagnosticQuestions || []).map(d => ({
      id: d.id, questionText: d.questionText,
    }));
    const answerBranches = (consultation?.answerBranches || []).map(b => ({
      conditions: b.conditions instanceof Map ? Object.fromEntries(b.conditions) : b.conditions,
      answer: answerDto(byAnswerId.get(String(b.resolvedAnswerId))),
    }));
    return {
      id: String(q._id), questionText: q.canonicalQuestionText, tags: q.tags || [],
      answerText: answer?.answerText || null, reasonText: answer?.reasonText || null,
      remedyText: answer?.remedyText || null, homeRemedyText: answer?.homeRemedyText || null,
      dosageInstructions: answer?.dosageInstructions || null,
      safetyDisclaimerText: answer?.safetyDisclaimerText || null, videoUrl: answer?.videoUrl || null,
      diagnosticQ1: diagnosticQuestions[0]?.questionText || null,
      diagnosticQ2: diagnosticQuestions[1]?.questionText || null,
      diagnosticQ3: diagnosticQuestions[2]?.questionText || null,
      diagnosticQuestions, answerBranches,
      updatedAt: new Date(q.updatedAt).getTime(),
    };
  });
  // A content hash also detects deletion, deactivation and an empty database.
  const dataVersion = createHash('sha256').update(JSON.stringify(items)).digest('hex');
  return { schemaVersion: 2, success: true, upToDate: false, dataVersion, totalItems: items.length, items };
}
