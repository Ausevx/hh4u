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
  UploadMode,
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
      mode: UploadMode = 'append',
      onProgress?: (percent: number) => void
    ): Promise<ImportResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const token = tokenStorage.get();

      return new Promise<ImportResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE_URL}/knowledge-base/import?mode=${encodeURIComponent(mode)}`);

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
