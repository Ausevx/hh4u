// ============================================================================
// Healing Hands4U Admin Portal - TypeScript Interface Definitions
// ============================================================================

export interface AdminUser {
  id?: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  admin: AdminUser;
  message?: string;
}

export interface KPIStats {
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  totalConsultations: number;
  totalAnswers: number;
  vectorIndexActive: boolean;
}

export interface DiagnosticQuestionItem {
  id: string;
  questionText: string;
}

export interface AnswerBranchItem {
  conditions: Record<string, string>;
  resolvedAnswerId?: string;
}

export interface ConsultationQueryData {
  id: string;
  diagnosticQuestions: DiagnosticQuestionItem[];
  answerBranches?: AnswerBranchItem[];
}

export interface AnswerData {
  id: string;
  answerText: string;
  reasonText?: string;
  remedyText?: string;
  homeRemedyText?: string;
  dosageInstructions?: string;
  safetyDisclaimerText?: string;
  videoUrl?: string;
  answerType?: string;
}

export interface KnowledgeBaseItem {
  id: string;
  canonicalQuestionText: string;
  tags: string[];
  isActive: boolean;
  version: number;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  consultationQuery?: ConsultationQueryData;
  answer?: AnswerData;
  diagnosticQuestions?: string[];
  answerText?: string;
  homeRemedyText?: string;
  videoUrl?: string;
}

export interface CreateKnowledgeBaseInput {
  canonicalQuestionText: string;
  tags?: string[];
  diagnosticQuestions?: string[];
  answerText?: string;
  reasonText?: string;
  remedyText?: string;
  homeRemedyText?: string;
  videoUrl?: string;
  isActive?: boolean;
}

export interface UpdateKnowledgeBaseInput extends Partial<CreateKnowledgeBaseInput> {
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  totalPages: number;
  items: T[];
}

export interface ImportCounts {
  questions: number;
  consultations: number;
  answers: number;
}

export type UploadMode = 'append' | 'overwrite';

export interface ImportResponse {
  success: boolean;
  mode?: UploadMode;
  counts: ImportCounts;
  message?: string;
  details?: string[];
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  details?: string[];
}

// ============================================================================
// User Management Types
// ============================================================================

export interface AppUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
  authProvider: 'email_otp' | 'google' | 'guest';
  createdAt: string;
  lastLoginAt: string;
  queryCount?: number;
}

export interface UserSession {
  id: string;
  queryText: string;
  intent: string;
  matchConfident: boolean;
  createdAt: string;
}

export interface UserDetail extends AppUser {
  avatarUrl?: string | null;
  recentSessions: UserSession[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SearchesPerDay {
  date: string;
  count: number;
}

export interface TopQuestion {
  questionText: string;
  count: number;
}

export interface UsersByProvider {
  provider: string;
  count: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalSearches: number;
  searchesPerDay: SearchesPerDay[];
  topQuestions: TopQuestion[];
  usersByProvider: UsersByProvider[];
}

