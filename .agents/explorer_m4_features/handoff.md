# Handoff Report: Frontend Component & Feature Architecture for Web Admin Portal (Milestone M4)

**Author**: Explorer 2 (Components & Feature Architecture)  
**Target Directory**: `/Users/aditya/workspace/hh4u/admin-panel/src/`  
**Working Directory**: `/Users/aditya/workspace/hh4u/.agents/explorer_m4_features/`  
**Date**: 2026-09-19  

---

## 1. Observation

Direct investigation of the codebase, contracts, and backend implementation revealed the following concrete facts:

### 1.1 Backend API Contracts & Endpoints
From `backend/src/routes/adminRoutes.ts` (lines 12-38):
- **Authentication**:
  - `POST /api/admin/auth/login` (Public): expects `{ email, password }`. Returns HTTP 200 `{ success: true, token, admin: { email, role } }`. Returns HTTP 400 for empty fields (`{ success: false, message: 'Email and password required' }`), or HTTP 401 for bad credentials (`{ success: false, message: 'Invalid credentials' }`). Default credentials supported in backend: `admin@healinghands4u.com` / `Admin@123456`.
  - `GET /api/admin/auth/me` (Protected): guarded by `adminAuthMiddleware`. Returns HTTP 200 `{ success: true, admin: { id, email, role } }`. Returns HTTP 401 if token is missing or expired.
- **KPI Stats**:
  - `GET /api/admin/stats` (Protected): returns HTTP 200 `{ success: true, stats: { totalQuestions, activeQuestions, inactiveQuestions, totalConsultations, totalAnswers, vectorIndexActive } }`.
- **Knowledge Base CRUD**:
  - `GET /api/admin/knowledge-base` (Protected): query params `search`, `page`, `limit`, `tag`, `isActive`. Returns HTTP 200 `{ success: true, total, page, totalPages, items: KnowledgeBaseItem[] }`.
  - `GET /api/admin/knowledge-base/:id` (Protected): returns HTTP 200 `{ success: true, item: KnowledgeBaseItem }`.
  - `POST /api/admin/knowledge-base` (Protected): expects `{ canonicalQuestionText, tags?, diagnosticQuestions?: string[], answerText?, reasonText?, remedyText?, homeRemedyText?, videoUrl? }`. Returns HTTP 201 `{ success: true, item: KnowledgeBaseItem }`. Returns HTTP 400 if `canonicalQuestionText` is missing.
  - `PUT /api/admin/knowledge-base/:id` (Protected): expects `Partial<KnowledgeBaseItem>`. Returns HTTP 200 `{ success: true, item: KnowledgeBaseItem }`.
  - `DELETE /api/admin/knowledge-base/:id` (Protected): cascade deletes associated consultation queries and answers. Returns HTTP 200 `{ success: true, message: string, deletedCount: { questions, consultations, answers } }`.
- **Multipart Excel Bulk Import**:
  - `POST /api/admin/knowledge-base/import` (Protected): expects `multipart/form-data` with field name `file`. Only `.xlsx` extension accepted (per `backend/src/middlewares/uploadMiddleware.ts` lines 8-16). File size limit is 20MB. Returns HTTP 200 `{ success: true, counts: { questions, consultations, answers } }`. On validation failure (missing sheets or columns), returns HTTP 400 `{ success: false, message: string, details?: string[] }`.

### 1.2 Data Shape (`KnowledgeBaseItem`)
From `backend/src/services/adminKnowledgeBaseService.ts` (lines 75-105 and 860-911):
- Each item returned by `GET /api/admin/knowledge-base` contains:
  ```ts
  interface KnowledgeBaseItem {
    id: string;
    canonicalQuestionText: string;
    tags: string[];
    isActive: boolean;
    version: number;
    embedding?: number[];
    createdAt: string;
    updatedAt: string;
    diagnosticQuestions?: string[]; // Convenient top-level array of strings
    answerText?: string;
    homeRemedyText?: string;
    videoUrl?: string;
    consultationQuery?: {
      id: string;
      diagnosticQuestions: Array<{ id: string; questionText: string }>;
      answerBranches?: Array<{ conditions: Record<string, string>; resolvedAnswerId?: string }>;
    };
    answer?: {
      id: string;
      answerText: string;
      reasonText?: string;
      remedyText?: string;
      homeRemedyText?: string;
      dosageInstructions?: string;
      safetyDisclaimerText?: string;
      videoUrl?: string;
      answerType?: string;
    };
  }
  ```

### 1.3 Design System & "Trusted Teal" Palette
From `app/src/main/java/com/healinghands4u/presentation/theme/Color.kt` and `PROJECT.md`:
- **Primary / Accent Teal**: `#0E7C86` (`LightAccent`), hover: `#0A5C63`, dark accent: `#2DD4C8`
- **Light Background**: `#FFFFFF`
- **Light Surface**: `#F7F9FB`
- **Light Surface Tint**: `#EAF5F6`
- **Text Ink**: `#0F2027` (headings / main body)
- **Text Ink Dim**: `#5C7480` (secondary captions / placeholders)
- **Borders & Dividers**: `rgba(15, 32, 39, 0.08)` / `#E2E8F0`
- **Warning / Alert Background**: `#FFF0EC`, Alert Ink: `#A14A2A`
- **Success / WhatsApp Green**: `#25D366`

### 1.4 Peer Explorer Alignment (`explorer_m4_scaffold`)
From `explorer_m4_scaffold/DISPATCH.md`:
- Package setup: `react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`, `vite`, `tailwindcss`.
- Vite proxy configured to forward `/api` to `http://localhost:5000`.

---

## 2. Logic Chain

From these observations, we derive the structural and component architecture for `admin-panel/src/`:

1. **Authentication State & Storage**:
   - The admin token must be persisted in `localStorage` under key `'admin_token'`.
   - On app initialization, `AuthContext` checks for an existing token and executes `GET /api/admin/auth/me` to validate the token against MongoDB Atlas. If valid, the user state is restored. If 401 or invalid, the token is pruned and user is flagged unauthenticated.
   - `services/api.ts` attaches `Authorization: Bearer <token>` automatically to every outgoing request.
   - `services/api.ts` intercepts HTTP 401 responses, removes the stale token from `localStorage`, and emits a custom DOM event (`auth:unauthorized`), which `AuthContext` listens to for seamless logout and redirect to `/login`.

2. **Route Protection (`ProtectedRoute`)**:
   - Routes like `/` (Dashboard) must be wrapped by `ProtectedRoute`.
   - While the initial auth check is resolving (`isLoading: true`), render a smooth medical teal spinner/skeleton to prevent layout flashing or premature redirect.
   - If unauthenticated, redirect to `/login` with `state: { from: location }` so the user can be returned to their intended destination post-login.

3. **Login Experience (`LoginPage`)**:
   - Must visually communicate clinic trust using the "Trusted Teal" medical palette.
   - Includes real-time email format validation and password presence check.
   - Displays clear error alerts on HTTP 401 ("Invalid credentials") or network failure.
   - Provides a "Demo Credentials" quick-fill button for testing convenience (`admin@healinghands4u.com` / `Admin@123456`).

4. **Dashboard Layout & Analytics (`DashboardPage`)**:
   - **Header**: Displays clinic branding, current admin email, and quick-action buttons ("Add Entry", "Bulk Import", "Logout").
   - **KPI Cards**: Fetches `GET /api/admin/stats` to render 4 metric cards (`totalQuestions`, `totalConsultations`, `totalAnswers`, and `vectorIndexActive` with an active pulsating status dot).
   - **Search & Filter**: Includes a 300ms debounced search input sending requests to `GET /api/admin/knowledge-base?search=...`, updating pagination and table data without UI blocking.
   - **Interactive Table**: Displays canonical question, tags as chips, count of diagnostic questions (e.g. "3 Qs"), video badge if YouTube link exists, and Edit/Delete action buttons.
   - **Expandable Row Details**: Each table row toggles an expandable accordion containing:
     - The 3 Diagnostic Questions displayed in step sequence.
     - Clinical Reasoning explanation.
     - Home Remedy recommendation.
     - YouTube video preview (with playable embed / thumbnail).

5. **CRUD Modals**:
   - **`KnowledgeModal`**: Reusable for both Create (`POST /api/admin/knowledge-base`) and Edit (`PUT /api/admin/knowledge-base/:id`). Form inputs include Canonical Question Text (required), Tags (chip/comma-delimited), 3 Diagnostic Questions, Clinical Reason, Home Remedy, and Video URL with live YouTube thumbnail preview.
   - **`DeleteConfirmModal`**: Danger modal specifically warning about cascade deletion ("Deleting this canonical question will also permanently remove its associated diagnostic consultation queries and remedy answers from MongoDB Atlas.").

6. **Bulk Excel Ingestion (`BulkUploadModal`)**:
   - Interactive drag-and-drop zone with visual hover states and fallback file-picker input.
   - Client-side validation enforcing `.xlsx` extension and 20MB file size ceiling.
   - Multipart `FormData` submission to `POST /api/admin/knowledge-base/import`.
   - Upload & ingestion progress feedback with animated loading bar.
   - Result screen displaying import counts (`questions`, `consultations`, `answers`) on success, or structured error message and details on 400 validation failures.

---

## 3. Caveats

1. **Token Lifecycle & Expiration**: The backend issues 7-day JWTs without a separate refresh token endpoint. When a token expires, the backend returns HTTP 401, which our interceptor catches to clear `localStorage` and transition state to `/login`.
2. **YouTube Video URL Formats**: Ingested URLs can be standard watch links (`youtube.com/watch?v=...`), short links (`youtu.be/...`), embed URLs (`youtube.com/embed/...`), or direct query strings. The frontend parser extracts the 11-character video ID with regex to generate reliable thumbnail URLs (`img.youtube.com/vi/${id}/hqdefault.jpg`) and embeds (`youtube.com/embed/${id}`).
3. **Excel File MIME & Extension**: The backend `uploadMiddleware.ts` strictly checks `originalname.toLowerCase().endsWith('.xlsx')`. The frontend file uploader restricts files to `.xlsx` (MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
4. **Backend Transactions**: As observed in `adminKnowledgeBaseService.ts`, the backend automatically detects whether MongoDB Atlas is a replica set or standalone and handles transactions accordingly. Frontend requests do not need to manage transaction headers.

---

## 4. Conclusion & Component Architecture Specifications

The following detailed specifications and code blueprints provide the complete implementation for `admin-panel/src/`.

### 4.1 Directory Structure
```
admin-panel/src/
├── types/
│   └── index.ts                 # All TypeScript interfaces for API & UI state
├── services/
│   └── api.ts                   # Fetch API client with Bearer auth & 401 interceptor
├── contexts/
│   └── AuthContext.tsx          # AuthProvider & useAuth hook
├── components/
│   ├── ProtectedRoute.tsx       # Route guard with loading skeleton
│   ├── KnowledgeModal.tsx       # Create/Edit modal with YouTube live preview
│   ├── DeleteConfirmModal.tsx   # Cascade deletion warning modal
│   └── BulkUploadModal.tsx      # Drag-and-drop Excel importer with progress & stats
├── pages/
│   ├── LoginPage.tsx            # Trusted Teal medical login screen
│   └── DashboardPage.tsx        # KPI stats, searchable paginated table, expandable rows
├── App.tsx                      # Root routes wiring
└── main.tsx                     # React DOM root entry
```

---

### 4.2 Detailed Specifications & Blueprints

#### 4.2.1 Data Models & Types (`src/types/index.ts`)
```ts
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

export interface ImportResponse {
  success: boolean;
  counts: ImportCounts;
  message?: string;
  details?: string[];
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  details?: string[];
}
```

---

#### 4.2.2 API Service (`src/services/api.ts`)
```ts
import {
  AdminUser,
  LoginRequest,
  LoginResponse,
  KPIStats,
  KnowledgeBaseItem,
  CreateKnowledgeBaseInput,
  UpdateKnowledgeBaseInput,
  PaginatedResponse,
  ImportResponse,
} from '../types';

export class ApiError extends Error {
  public status: number;
  public details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = 'admin_token';
const BASE_URL = import.meta.env.VITE_API_URL || '/api/admin';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    tokenStorage.clear();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError('Authentication token missing or invalid', 401);
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const details = data?.details || undefined;
    throw new ApiError(message, response.status, details);
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (creds: LoginRequest): Promise<LoginResponse> => {
      const res = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(creds),
      });
      if (res.token) {
        tokenStorage.set(res.token);
      }
      return res;
    },

    me: async (): Promise<{ success: boolean; admin: AdminUser }> => {
      return request<{ success: boolean; admin: AdminUser }>('/auth/me');
    },

    logout: (): void => {
      tokenStorage.clear();
    },
  },

  stats: {
    get: async (): Promise<{ success: boolean; stats: KPIStats }> => {
      return request<{ success: boolean; stats: KPIStats }>('/stats');
    },
  },

  knowledgeBase: {
    list: async (params: {
      search?: string;
      page?: number;
      limit?: number;
      tag?: string;
      isActive?: boolean;
    } = {}): Promise<PaginatedResponse<KnowledgeBaseItem>> => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.page) q.set('page', params.page.toString());
      if (params.limit) q.set('limit', params.limit.toString());
      if (params.tag) q.set('tag', params.tag);
      if (params.isActive !== undefined) q.set('isActive', params.isActive.toString());

      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<PaginatedResponse<KnowledgeBaseItem>>(`/knowledge-base${queryStr}`);
    },

    getById: async (id: string): Promise<{ success: boolean; item: KnowledgeBaseItem }> => {
      return request<{ success: boolean; item: KnowledgeBaseItem }>(`/knowledge-base/${id}`);
    },

    create: async (
      input: CreateKnowledgeBaseInput
    ): Promise<{ success: boolean; item: KnowledgeBaseItem }> => {
      return request<{ success: boolean; item: KnowledgeBaseItem }>('/knowledge-base', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    update: async (
      id: string,
      input: UpdateKnowledgeBaseInput
    ): Promise<{ success: boolean; item: KnowledgeBaseItem }> => {
      return request<{ success: boolean; item: KnowledgeBaseItem }>(`/knowledge-base/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    delete: async (
      id: string
    ): Promise<{
      success: boolean;
      message: string;
      deletedCount: { questions: number; consultations: number; answers: number };
    }> => {
      return request(`/knowledge-base/${id}`, {
        method: 'DELETE',
      });
    },

    importExcel: async (
      file: File,
      onProgress?: (percent: number) => void
    ): Promise<ImportResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const token = tokenStorage.get();

      return new Promise<ImportResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE_URL}/knowledge-base/import`);

        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          let responseData: any;
          try {
            responseData = JSON.parse(xhr.responseText);
          } catch {
            responseData = { message: xhr.responseText };
          }

          if (xhr.status === 401) {
            tokenStorage.clear();
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            reject(new ApiError('Authentication token missing or invalid', 401));
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(responseData as ImportResponse);
          } else {
            reject(
              new ApiError(
                responseData?.message || 'Failed to import Excel file',
                xhr.status,
                responseData?.details
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(new ApiError('Network error during Excel upload', 0));
        };

        xhr.send(formData);
      });
    },
  },
};

export default api;
```

---

#### 4.2.3 Auth Context & Hook (`src/contexts/AuthContext.tsx`)
```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminUser } from '../types';
import { api, tokenStorage, ApiError } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    tokenStorage.clear();
    setToken(null);
    setAdmin(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = tokenStorage.get();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        if (res.success && res.admin) {
          setAdmin(res.admin);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.auth.login({ email, password });
      if (res.success && res.token) {
        setToken(res.token);
        setAdmin(res.admin);
        return { success: true };
      }
      return { success: false, error: res.message || 'Login failed' };
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Invalid credentials or network error';
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

#### 4.2.4 Protected Route (`src/components/ProtectedRoute.tsx`)
```tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#EAF5F6] flex items-center justify-center text-[#0E7C86] animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-[#0E7C86]" />
          </div>
          <p className="text-[#0F2027] font-medium text-sm">Verifying Healing Hands4U session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
```

---

#### 4.2.5 Login Page (`src/pages/LoginPage.tsx`)
```tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, AlertCircle, Loader2, Lock, Mail, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromPath = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid credentials');
    }
  };

  const handleFillDemoCredentials = () => {
    setEmail('admin@healinghands4u.com');
    setPassword('Admin@123456');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0E7C86] flex items-center justify-center text-white shadow-lg shadow-teal-900/10">
            <Activity className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-[#0F2027]">
          Healing Hands4U
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-[#5C7480]">
          Clinical Knowledge Base Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMessage && (
            <div className="mb-6 rounded-xl bg-[#FFF0EC] p-4 border border-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-[#A14A2A] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#A14A2A] font-medium">{errorMessage}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1.5">
                Staff Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@healinghands4u.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F2027] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F2027] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E7C86] transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col space-y-3">
            <button
              type="button"
              onClick={handleFillDemoCredentials}
              className="w-full flex items-center justify-center py-2 px-3 text-xs font-medium text-[#0E7C86] bg-[#EAF5F6] hover:bg-[#d8edef] rounded-lg transition-colors"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Fill Demo Admin Credentials
            </button>
            <p className="text-center text-xs text-[#5C7480]">
              Authorized Clinic Personnel Only • End-to-End Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

---

#### 4.2.6 Dashboard Page (`src/pages/DashboardPage.tsx`)
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { KPIStats, KnowledgeBaseItem } from '../types';
import KnowledgeModal from '../components/KnowledgeModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import BulkUploadModal from '../components/BulkUploadModal';
import {
  Activity,
  BookOpen,
  GitBranch,
  Pill,
  Database,
  Search,
  Plus,
  Upload,
  LogOut,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Video,
  ExternalLink,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { admin, logout } = useAuth();

  // Stats State
  const [stats, setStats] = useState<KPIStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Table & Filter State
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 15;

  // Row Expansion State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal States
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeModalMode, setKnowledgeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedKnowledgeItem, setSelectedKnowledgeItem] = useState<KnowledgeBaseItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBaseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Debounce search query by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load KPI Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.stats.get();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Knowledge Base Items
  const fetchItems = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await api.knowledgeBase.list({
        search: debouncedSearch,
        page: currentPage,
        limit: pageSize,
      });
      if (res.success) {
        setItems(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base items:', err);
    } finally {
      setTableLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchItems();
  };

  const handleOpenCreateModal = () => {
    setSelectedKnowledgeItem(null);
    setKnowledgeModalMode('create');
    setIsKnowledgeModalOpen(true);
  };

  const handleOpenEditModal = (item: KnowledgeBaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKnowledgeItem(item);
    setKnowledgeModalMode('edit');
    setIsKnowledgeModalOpen(true);
  };

  const handleOpenDeleteModal = (item: KnowledgeBaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.knowledgeBase.delete(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchStats();
      fetchItems();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // Helper to extract YouTube video ID
  const getYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col text-[#0F2027]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0E7C86] flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base text-[#0F2027] leading-tight">Healing Hands4U</h1>
                <span className="bg-[#EAF5F6] text-[#0E7C86] text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Admin Portal
                </span>
              </div>
              <p className="text-xs text-[#5C7480]">Knowledge Base Management & Vector Sync</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-[#0E7C86]" />
              Bulk Import (.xlsx)
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Knowledge Entry
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#0F2027]">{admin?.email}</p>
                <p className="text-[10px] text-[#5C7480] uppercase tracking-wider">{admin?.role || 'Admin'}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Questions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#EAF5F6] flex items-center justify-center text-[#0E7C86] flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Level 1 Questions</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalQuestions ?? 0}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {stats?.activeQuestions ?? 0} Active in App
              </p>
            </div>
          </div>

          {/* Card 2: Consultations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Diagnostic Trees</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalConsultations ?? 0}
              </p>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">Yes/No Logic Branches</p>
            </div>
          </div>

          {/* Card 3: Answers & Remedies */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Remedies & Answers</p>
              <p className="text-2xl font-bold text-[#0F2027]">
                {statsLoading ? '...' : stats?.totalAnswers ?? 0}
              </p>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">Homeopathic Guidance</p>
            </div>
          </div>

          {/* Card 4: Vector Index Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C7480]">Atlas Vector Search</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${stats?.vectorIndexActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <p className="text-sm font-bold text-[#0F2027]">
                  {statsLoading ? '...' : stats?.vectorIndexActive ? 'Index Active' : 'Fallback Cosine'}
                </p>
              </div>
              <p className="text-[11px] text-[#5C7480] font-medium mt-0.5">1536-dim Cosine Embeddings</p>
            </div>
          </div>
        </section>

        {/* Knowledge Base Table Card */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Table Controls Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, tags, remedies, diagnostic criteria..."
                className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-[#5C7480]">
              <span>
                Showing <strong className="text-[#0F2027]">{items.length}</strong> of{' '}
                <strong className="text-[#0F2027]">{totalItems}</strong> entries
              </span>
              <button
                onClick={handleRefreshAll}
                title="Refresh Table"
                className="p-2 text-slate-500 hover:text-[#0E7C86] hover:bg-[#EAF5F6] rounded-lg transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-[#5C7480]">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Canonical Health Question</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Diagnostics</th>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tableLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#5C7480]">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <RotateCw className="w-6 h-6 animate-spin text-[#0E7C86]" />
                        <span>Loading Knowledge Base records...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#5C7480]">
                      <div className="inline-flex flex-col items-center space-y-2">
                        <HelpCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-medium text-sm text-[#0F2027]">No knowledge base items found</span>
                        <span className="text-xs">Try adjusting your search query or add a new entry.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isExpanded = expandedRowId === item.id;
                    const diagnosticList =
                      item.diagnosticQuestions ||
                      item.consultationQuery?.diagnosticQuestions.map((dq) => dq.questionText) ||
                      [];
                    const hasVideo = !!item.videoUrl || !!item.answer?.videoUrl;
                    const youtubeId = getYouTubeId(item.videoUrl || item.answer?.videoUrl);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => toggleRowExpand(item.id)}
                          className={`hover:bg-[#F7F9FB] cursor-pointer transition-colors ${
                            isExpanded ? 'bg-[#F7F9FB]/80' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#0E7C86]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#0F2027] max-w-md">
                            <span className="line-clamp-2">{item.canonicalQuestionText}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.tags && item.tags.length > 0 ? (
                                item.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="bg-[#EAF5F6] text-[#0E7C86] font-semibold px-2 py-0.5 rounded-full text-[10px]">
                              {diagnosticList.length} Steps
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {hasVideo ? (
                              <span className="inline-flex items-center text-rose-600 font-medium text-[11px]">
                                <Video className="w-3.5 h-3.5 mr-1" />
                                Video
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={(e) => handleOpenEditModal(item, e)}
                                title="Edit Question"
                                className="p-1.5 text-slate-400 hover:text-[#0E7C86] hover:bg-[#EAF5F6] rounded-lg transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleOpenDeleteModal(item, e)}
                                title="Delete Question"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Accordion Row Details */}
                        {isExpanded && (
                          <tr className="bg-[#F7F9FB]/40">
                            <td colSpan={7} className="p-4 sm:p-6 border-y border-slate-100">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200/70 shadow-sm">
                                {/* Col 1: Diagnostic Questions Tree */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#0E7C86]">
                                    <GitBranch className="w-4 h-4" />
                                    <span>Diagnostic Questions</span>
                                  </div>
                                  <div className="space-y-2">
                                    {diagnosticList.length > 0 ? (
                                      diagnosticList.map((dq, idx) => (
                                        <div
                                          key={idx}
                                          className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs"
                                        >
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5C7480] mb-0.5">
                                            Step {idx + 1}
                                          </div>
                                          <p className="text-[#0F2027] font-medium">{dq}</p>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No diagnostic questions defined.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Col 2: Reason & Home Remedy Guidance */}
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
                                      Pathology & Clinical Reason
                                    </div>
                                    <p className="text-xs text-[#0F2027] bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                                      {item.answer?.reasonText || 'No clinical reason recorded.'}
                                    </p>
                                  </div>

                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-[#0E7C86] mb-1">
                                      Home Remedy & Rx Prescription
                                    </div>
                                    <p className="text-xs text-[#0F2027] bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 leading-relaxed font-medium">
                                      {item.homeRemedyText ||
                                        item.answer?.remedyText ||
                                        item.answer?.homeRemedyText ||
                                        'No remedy specified.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Col 3: Media / YouTube Video Preview */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
                                    <Video className="w-4 h-4" />
                                    <span>Video Demonstration</span>
                                  </div>
                                  {youtubeId ? (
                                    <div className="space-y-2">
                                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-black">
                                        <iframe
                                          src={`https://www.youtube.com/embed/${youtubeId}`}
                                          title="Remedy Video Demonstration"
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                      <a
                                        href={item.videoUrl || item.answer?.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs font-medium text-[#0E7C86] hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Watch on YouTube
                                      </a>
                                    </div>
                                  ) : item.videoUrl || item.answer?.videoUrl ? (
                                    <a
                                      href={item.videoUrl || item.answer?.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-xs font-medium text-[#0E7C86] hover:underline"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                      Open External Video Link
                                    </a>
                                  ) : (
                                    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200/60 text-center text-slate-400 text-xs">
                                      No video attached to this knowledge base item.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#5C7480]">
            <div>
              Page <strong className="text-[#0F2027]">{currentPage}</strong> of{' '}
              <strong className="text-[#0F2027]">{totalPages}</strong>
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1 || tableLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages || tableLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0F2027] bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modals */}
      {isKnowledgeModalOpen && (
        <KnowledgeModal
          isOpen={isKnowledgeModalOpen}
          mode={knowledgeModalMode}
          initialData={selectedKnowledgeItem}
          onClose={() => setIsKnowledgeModalOpen(false)}
          onSuccess={() => {
            setIsKnowledgeModalOpen(false);
            fetchStats();
            fetchItems();
          }}
        />
      )}

      {isDeleteModalOpen && itemToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          itemTitle={itemToDelete.canonicalQuestionText}
          isDeleting={isDeleting}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {isBulkUploadOpen && (
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onSuccess={() => {
            setIsBulkUploadOpen(false);
            fetchStats();
            fetchItems();
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
```

---

#### 4.2.7 Create / Edit Knowledge Modal (`src/components/KnowledgeModal.tsx`)
```tsx
import React, { useState, useEffect } from 'react';
import { KnowledgeBaseItem, CreateKnowledgeBaseInput, UpdateKnowledgeBaseInput } from '../types';
import { api, ApiError } from '../services/api';
import { X, Loader2, AlertCircle, Video, Tag, Check } from 'lucide-react';

interface KnowledgeModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: KnowledgeBaseItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [canonicalQuestionText, setCanonicalQuestionText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [diagnosticQ1, setDiagnosticQ1] = useState('');
  const [diagnosticQ2, setDiagnosticQ2] = useState('');
  const [diagnosticQ3, setDiagnosticQ3] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [remedyText, setRemedyText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setCanonicalQuestionText(initialData.canonicalQuestionText || '');
      setTagsInput((initialData.tags || []).join(', '));

      const diagList =
        initialData.diagnosticQuestions ||
        initialData.consultationQuery?.diagnosticQuestions.map((dq) => dq.questionText) ||
        [];
      setDiagnosticQ1(diagList[0] || '');
      setDiagnosticQ2(diagList[1] || '');
      setDiagnosticQ3(diagList[2] || '');

      setReasonText(initialData.answer?.reasonText || '');
      setRemedyText(
        initialData.homeRemedyText ||
          initialData.answer?.remedyText ||
          initialData.answer?.homeRemedyText ||
          ''
      );
      setVideoUrl(initialData.videoUrl || initialData.answer?.videoUrl || '');
      setIsActive(initialData.isActive !== false);
    } else {
      setCanonicalQuestionText('');
      setTagsInput('homeopathy, general');
      setDiagnosticQ1('');
      setDiagnosticQ2('');
      setDiagnosticQ3('');
      setReasonText('');
      setRemedyText('');
      setVideoUrl('');
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [initialData, mode]);

  if (!isOpen) return null;

  // Extract YouTube ID for thumbnail preview
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };
  const previewYouTubeId = getYouTubeId(videoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!canonicalQuestionText.trim()) {
      setErrorMessage('Canonical question text is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const diagnosticQuestions = [diagnosticQ1.trim(), diagnosticQ2.trim(), diagnosticQ3.trim()].filter(
      Boolean
    );

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const payload: CreateKnowledgeBaseInput = {
          canonicalQuestionText: canonicalQuestionText.trim(),
          tags,
          diagnosticQuestions,
          reasonText: reasonText.trim(),
          remedyText: remedyText.trim(),
          homeRemedyText: remedyText.trim(),
          videoUrl: videoUrl.trim(),
          isActive,
        };
        await api.knowledgeBase.create(payload);
      } else if (initialData) {
        const payload: UpdateKnowledgeBaseInput = {
          canonicalQuestionText: canonicalQuestionText.trim(),
          tags,
          diagnosticQuestions,
          reasonText: reasonText.trim(),
          remedyText: remedyText.trim(),
          homeRemedyText: remedyText.trim(),
          videoUrl: videoUrl.trim(),
          isActive,
        };
        await api.knowledgeBase.update(initialData.id, payload);
      }
      onSuccess();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save knowledge base item';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0F2027]">
            {mode === 'create' ? 'Create Knowledge Base Entry' : 'Edit Knowledge Base Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="rounded-xl bg-[#FFF0EC] p-3.5 border border-rose-200 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-[#A14A2A] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#A14A2A] font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Canonical Question */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              Canonical Health Question <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={canonicalQuestionText}
              onChange={(e) => setCanonicalQuestionText(e.target.value)}
              placeholder="e.g. What helps with severe migraine headache?"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              Tags (comma separated)
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="headache, pain, migraine, urgent"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* 3 Diagnostic Questions */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0E7C86]">
              Diagnostic Tree Questions (Yes/No Steps)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={diagnosticQ1}
                onChange={(e) => setDiagnosticQ1(e.target.value)}
                placeholder="Diagnostic Question 1 (e.g. Is the pain throbbing on one side of head?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
              <input
                type="text"
                value={diagnosticQ2}
                onChange={(e) => setDiagnosticQ2(e.target.value)}
                placeholder="Diagnostic Question 2 (e.g. Is it triggered or worsened by bright light?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
              <input
                type="text"
                value={diagnosticQ3}
                onChange={(e) => setDiagnosticQ3(e.target.value)}
                placeholder="Diagnostic Question 3 (e.g. Is nausea or visual disturbance present?)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
          </div>

          {/* Pathology Reason & Remedy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
                Clinical Reason & Cause
              </label>
              <textarea
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explain the underlying cause or pathology..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0E7C86] mb-1">
                Home Remedy & Prescription
              </label>
              <textarea
                rows={3}
                value={remedyText}
                onChange={(e) => setRemedyText(e.target.value)}
                placeholder="Recommended remedy, potency, and dosage..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
          </div>

          {/* Video URL & Live Preview */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1">
              YouTube Video URL
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0F2027] focus:outline-none focus:ring-2 focus:ring-[#0E7C86] transition-colors"
              />
            </div>
            {previewYouTubeId && (
              <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={`https://img.youtube.com/vi/${previewYouTubeId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  className="w-20 h-12 object-cover rounded-lg"
                />
                <span className="text-[11px] text-emerald-600 font-medium flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Valid YouTube link attached
                </span>
              </div>
            )}
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-[#0E7C86] focus:ring-[#0E7C86] h-4 w-4 border-slate-300"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-[#0F2027]">
              Make this entry active immediately in Android App
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {mode === 'create' ? 'Save Entry' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KnowledgeModal;
```

---

#### 4.2.8 Delete Confirmation Modal (`src/components/DeleteConfirmModal.tsx`)
```tsx
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  itemTitle: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemTitle,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-base font-bold text-[#0F2027]">Delete Knowledge Base Entry?</h3>
          <p className="text-xs text-[#5C7480] leading-relaxed">
            Are you sure you want to delete <strong className="text-[#0F2027]">"{itemTitle}"</strong>?
          </p>
          <div className="p-3 bg-[#FFF0EC] rounded-xl border border-rose-200 text-[11px] text-[#A14A2A] text-left leading-relaxed">
            <strong>Warning: Cascade Deletion!</strong> This will permanently delete this Level 1 question as well as its associated 3 diagnostic questions, consultation tree branches, and remedy answers from MongoDB Atlas.
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
```

---

#### 4.2.9 Drag-and-Drop Bulk Excel Upload Modal (`src/components/BulkUploadModal.tsx`)
```tsx
import React, { useState, useRef } from 'react';
import { api, ApiError } from '../services/api';
import { ImportResponse } from '../types';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  GitBranch,
  Pill,
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    setErrorDetails([]);

    if (!selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMessage('Only Excel (.xlsx) files are supported.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      const res = await api.knowledgeBase.importExcel(file, (percent) => {
        setUploadProgress(percent);
      });
      setImportResult(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        if (err.details && Array.isArray(err.details)) {
          setErrorDetails(err.details);
        }
      } else {
        setErrorMessage('An unexpected error occurred during import.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setErrorMessage(null);
    setErrorDetails([]);
    setUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF5F6] flex items-center justify-center text-[#0E7C86]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F2027]">Bulk Import Knowledge Base</h2>
              <p className="text-[11px] text-[#5C7480]">Upload an .xlsx dataset with level1, ConsultationQueries, Answers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {importResult ? (
            /* Success View */
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F2027]">Import Completed Successfully!</h3>
                <p className="text-xs text-[#5C7480] mt-1">
                  Atlas Vector embeddings generated and MongoDB collections upserted.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                <div className="p-2">
                  <BookOpen className="w-4 h-4 text-[#0E7C86] mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.questions}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Questions</p>
                </div>
                <div className="p-2 border-x border-slate-200">
                  <GitBranch className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.consultations}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Consultations</p>
                </div>
                <div className="p-2">
                  <Pill className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-[#0F2027]">{importResult.counts.answers}</p>
                  <p className="text-[10px] text-[#5C7480] uppercase tracking-wider font-semibold">Answers</p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Import Another
                </button>
                <button
                  type="button"
                  onClick={onSuccess}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Upload View */
            <div className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl bg-[#FFF0EC] p-3.5 border border-rose-200 space-y-2">
                  <div className="flex items-start space-x-2 text-xs text-[#A14A2A] font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {errorDetails.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-[#A14A2A]/90 pl-5 space-y-0.5">
                      {errorDetails.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#0E7C86] bg-[#EAF5F6]/40 scale-[0.99]'
                    : 'border-slate-200 hover:border-[#0E7C86]/50 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-[#EAF5F6] text-[#0E7C86] flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-[#0F2027]">
                  Click to select or drag and drop your .xlsx workbook
                </p>
                <p className="text-[11px] text-[#5C7480] mt-1">
                  Expected sheets: <strong>level1</strong>, <strong>ConsultationQueries</strong>, <strong>Answers</strong>
                </p>
              </div>

              {/* Selected File Card */}
              {file && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileSpreadsheet className="w-5 h-5 text-[#0E7C86] flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-[#0F2027] truncate">{file.name}</p>
                      <p className="text-[10px] text-[#5C7480]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-[#0F2027]">
                    <span className="flex items-center">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#0E7C86]" />
                      Ingesting and vectorizing...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0E7C86] h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-[#5C7480] hover:text-[#0F2027] hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={!file || isUploading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processing Import...
                    </>
                  ) : (
                    'Upload and Ingest'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
```

---

#### 4.2.10 App Routing & Setup (`src/App.tsx`)
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
```

---

## 5. Verification Method

To independently verify the frontend components and features:

1. **TypeScript Typechecking Verification**:
   Once scaffolded by Explorer 1 and implemented by the worker:
   ```bash
   cd /Users/aditya/workspace/hh4u/admin-panel
   npx tsc --noEmit
   ```
   *Expected result*: Clean exit with 0 errors across all types, context hooks, and modal props.

2. **Production Build Verification**:
   ```bash
   cd /Users/aditya/workspace/hh4u/admin-panel
   npm run build
   ```
   *Expected result*: Clean compilation of `dist/` containing `index.html` and bundled assets.

3. **Behavioral Acceptance Checks**:
   - **Auth Guard**: Visiting `http://localhost:5173/` without token redirects immediately to `/login`.
   - **Login Flow**: Entering `admin@healinghands4u.com` and `Admin@123456` authenticates against backend `POST /api/admin/auth/login`, saves JWT, and redirects to dashboard.
   - **Dashboard Stats**: Displays 4 KPI cards matching backend `GET /api/admin/stats`.
   - **Search & Pagination**: Typing in search bar triggers debounced request to `GET /api/admin/knowledge-base?search=...`. Pagination buttons correctly fetch subsequent pages.
   - **Accordion Expansion**: Clicking any row expands the 3-step diagnostic questions, clinical reason, remedy guidance, and playable YouTube preview.
   - **Create & Edit**: Submitting `KnowledgeModal` creates/updates record via backend API and triggers dashboard re-fetch.
   - **Cascade Delete**: Opening `DeleteConfirmModal` displays warning text; confirming triggers `DELETE /api/admin/knowledge-base/:id` and updates counts.
   - **Drag & Drop Bulk Upload**: Dropping `/Users/aditya/workspace/hh4u/database-dummy.xlsx` uploads multipart file to `/api/admin/knowledge-base/import` and renders import count stats card (184 questions, 184 consultations, 220 answers).

---
