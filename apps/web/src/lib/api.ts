import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

function normalizeApiBaseUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

    if (withProtocol.endsWith('/api')) {
        return withProtocol;
    }

    return `${withProtocol}/api`;
}

// Canonical API base URL (must resolve to .../api)
const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:8000/api');

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for httpOnly cookies
});

// Request interceptor - attach access token and org context
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');

        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Get selected organization from localStorage
        const selectedOrgId = localStorage.getItem('selected_org_id');
        if (selectedOrgId && config.headers) {
            config.headers['X-Organization-ID'] = selectedOrgId;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return apiClient(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh token
                const response = await axios.post(
                    `${API_BASE_URL}/v1/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { access_token } = response.data;

                // Save new access token
                localStorage.setItem('access_token', access_token);

                // Update authorization header
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                }

                processQueue(null, access_token);

                // Retry original request
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);

                // Refresh failed - clear auth and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('selected_org_id');
                window.location.href = '/login';

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

function extractFilenameFromDisposition(disposition?: string): string | null {
    if (!disposition) return null;

    const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1].trim().replace(/["']/g, ''));
    }

    const plainMatch = disposition.match(/filename\s*=\s*"?([^\";]+)"?/i);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim();
    }

    return null;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
}

async function readErrorBlob(blob: Blob): Promise<string | null> {
    try {
        const text = await blob.text();
        if (!text) return null;
        try {
            const parsed = JSON.parse(text);
            return parsed?.detail || parsed?.error?.message || text;
        } catch {
            return text;
        }
    } catch {
        return null;
    }
}

export async function downloadBlobFromApi(
    url: string,
    options?: {
        params?: Record<string, any>;
        method?: 'GET' | 'POST';
        data?: unknown;
        defaultFilename?: string;
    }
): Promise<string> {
    try {
        const response = await apiClient.request<Blob>({
            url,
            method: options?.method || 'GET',
            params: options?.params,
            data: options?.data,
            responseType: 'blob',
        });

        const disposition = response.headers['content-disposition'] as string | undefined;
        const filename =
            extractFilenameFromDisposition(disposition) ||
            options?.defaultFilename ||
            `download-${new Date().toISOString().slice(0, 10)}.bin`;

        triggerBrowserDownload(response.data, filename);
        return filename;
    } catch (error: any) {
        const axiosErr = error as AxiosError;
        const blob = axiosErr.response?.data;
        const blobMessage = blob instanceof Blob ? await readErrorBlob(blob) : null;
        const apiMessage =
            (axiosErr.response?.data as any)?.detail ||
            (axiosErr.response?.data as any)?.error?.message;

        throw new Error(blobMessage || apiMessage || axiosErr.message || 'Download failed');
    }
}

// API Methods

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        const response = await apiClient.post('/v1/auth/login', { email, password });
        return response.data;
    },

    logout: async () => {
        const response = await apiClient.post('/v1/auth/logout');
        return response.data;
    },

    getMe: async () => {
        const response = await apiClient.get('/v1/auth/me');
        return response.data;
    },

    refresh: async () => {
        const response = await apiClient.post('/v1/auth/refresh');
        return response.data;
    },
};

// Projects API
export const projectsAPI = {
    list: async (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        priority?: string;
        search?: string;
        manager_id?: string;
    }) => {
        const response = await apiClient.get('/v1/projects', { params });
        return response.data;
    },

    create: async (data: any) => {
        const response = await apiClient.post('/v1/projects', data);
        return response.data;
    },

    get: async (id: string) => {
        const response = await apiClient.get(`/v1/projects/${id}`);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/v1/projects/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await apiClient.delete(`/v1/projects/${id}`);
    },

    getMembers: async (id: string) => {
        const response = await apiClient.get(`/v1/projects/${id}/members`);
        return response.data;
    },

    addMember: async (id: string, data: { user_id: string; role_in_project?: string }) => {
        const response = await apiClient.post(`/v1/projects/${id}/members`, data);
        return response.data;
    },

    updateMember: async (
        id: string,
        userId: string,
        data: {
            role_in_project?: string;
            can_view_project?: boolean;
            can_post_messages?: boolean;
            can_upload_documents?: boolean;
            can_edit_tasks?: boolean;
            can_manage_milestones?: boolean;
            can_manage_risks?: boolean;
            can_manage_expenses?: boolean;
            can_approve_expenses?: boolean;
        }
    ) => {
        const response = await apiClient.patch(`/v1/projects/${id}/members/${userId}`, data);
        return response.data;
    },

    removeMember: async (id: string, userId: string) => {
        await apiClient.delete(`/v1/projects/${id}/members/${userId}`);
    },
};

// Tasks API
export const tasksAPI = {
    list: async (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
        priority?: string;
        assignee_id?: string;
        search?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/tasks`, { params });
        return response.data;
    },

    create: async (projectId: string, data: any) => {
        const response = await apiClient.post(`/v1/projects/${projectId}/tasks`, data);
        return response.data;
    },

    get: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/tasks/${id}`);
        return response.data;
    },

    update: async (projectId: string, id: string, data: any) => {
        const response = await apiClient.put(`/v1/projects/${projectId}/tasks/${id}`, data);
        return response.data;
    },

    updateStatus: async (projectId: string, id: string, status: string) => {
        const response = await apiClient.patch(`/v1/projects/${projectId}/tasks/${id}/status`, { status });
        return response.data;
    },

    updateProgress: async (projectId: string, id: string, progress: number) => {
        const response = await apiClient.patch(`/v1/projects/${projectId}/tasks/${id}/progress`, { progress });
        return response.data;
    },

    delete: async (projectId: string, id: string) => {
        await apiClient.delete(`/v1/projects/${projectId}/tasks/${id}`);
    },
};

// Expenses API
export const expensesAPI = {
    list: async (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
        category?: string;
        from_date?: string;
        to_date?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/expenses`, { params });
        return response.data;
    },

    create: async (projectId: string, data: any) => {
        const response = await apiClient.post(`/v1/projects/${projectId}/expenses`, data);
        return response.data;
    },

    get: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/expenses/${id}`);
        return response.data;
    },

    update: async (projectId: string, id: string, data: any) => {
        const response = await apiClient.put(`/v1/projects/${projectId}/expenses/${id}`, data);
        return response.data;
    },

    approve: async (projectId: string, id: string, notes?: string) => {
        const response = await apiClient.patch(`/v1/projects/${projectId}/expenses/${id}/approve`, { notes });
        return response.data;
    },

    reject: async (projectId: string, id: string, notes: string) => {
        const response = await apiClient.patch(`/v1/projects/${projectId}/expenses/${id}/reject`, { notes });
        return response.data;
    },

    delete: async (projectId: string, id: string) => {
        await apiClient.delete(`/v1/projects/${projectId}/expenses/${id}`);
    },
};

// Documents API
export const documentsAPI = {
    list: async (projectId: string, params?: {
        page?: number;
        page_size?: number;
        document_type?: string;
        category?: string;
        search?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/documents`, { params });
        return response.data;
    },

    upload: async (
        projectId: string,
        file: File,
        documentType?: string,
        description?: string
    ) => {
        const formData = new FormData();
        formData.append('file', file);

        const params = new URLSearchParams();
        if (documentType) params.append('document_type', documentType);
        if (description) params.append('description', description);

        const response = await apiClient.post(
            `/v1/projects/${projectId}/documents?${params.toString()}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    get: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/documents/${id}`);
        return response.data;
    },

    download: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/documents/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    update: async (
        projectId: string,
        id: string,
        data: { document_type?: string; category?: string; description?: string }
    ) => {
        if (!data.document_type && data.category) {
            data.document_type = data.category;
        }
        const response = await apiClient.put(`/v1/projects/${projectId}/documents/${id}`, data);
        return response.data;
    },

    delete: async (projectId: string, id: string) => {
        await apiClient.delete(`/v1/projects/${projectId}/documents/${id}`);
    },
};

// Risks API
export const risksAPI = {
    list: async (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
        category?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/risks`, { params });
        return response.data;
    },

    create: async (projectId: string, data: any) => {
        const response = await apiClient.post(`/v1/projects/${projectId}/risks`, data);
        return response.data;
    },

    get: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/risks/${id}`);
        return response.data;
    },

    update: async (projectId: string, id: string, data: any) => {
        const response = await apiClient.put(`/v1/projects/${projectId}/risks/${id}`, data);
        return response.data;
    },

    delete: async (projectId: string, id: string) => {
        await apiClient.delete(`/v1/projects/${projectId}/risks/${id}`);
    },
};

// Milestones API
export const milestonesAPI = {
    list: async (projectId: string, params?: {
        page?: number;
        page_size?: number;
        status?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/milestones`, { params });
        return response.data;
    },

    create: async (projectId: string, data: any) => {
        const response = await apiClient.post(`/v1/projects/${projectId}/milestones`, data);
        return response.data;
    },

    get: async (projectId: string, id: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/milestones/${id}`);
        return response.data;
    },

    update: async (projectId: string, id: string, data: any) => {
        const response = await apiClient.put(`/v1/projects/${projectId}/milestones/${id}`, data);
        return response.data;
    },

    delete: async (projectId: string, id: string) => {
        await apiClient.delete(`/v1/projects/${projectId}/milestones/${id}`);
    },
};

// Organizations API
export const organizationsAPI = {
    list: async () => {
        const response = await apiClient.get('/v1/organizations');
        return response.data;
    },

    create: async (data: { name: string; slug: string }) => {
        const response = await apiClient.post('/v1/organizations', data);
        return response.data;
    },

    get: async (id: string) => {
        const response = await apiClient.get(`/v1/organizations/${id}`);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/v1/organizations/${id}`, data);
        return response.data;
    },

    getMembers: async (id: string) => {
        const response = await apiClient.get(`/v1/organizations/${id}/members`);
        return response.data;
    },
};

// Messages API
export const messagesAPI = {
    list: async (params?: {
        page?: number;
        page_size?: number;
        limit?: number;
        project_id?: string;
        task_id?: string;
        message_type?: string;
        unread_only?: boolean;
    }) => {
        const response = await apiClient.get('/v1/messages', { params });
        return response.data;
    },

    create: async (data: {
        content: string;
        project_id?: string;
        task_id?: string;
        message_type?: string;
    }) => {
        const response = await apiClient.post('/v1/messages', data);
        return response.data;
    },

    markAsRead: async (id: string) => {
        const response = await apiClient.patch(`/v1/messages/${id}/read`);
        return response.data;
    },

    delete: async (id: string) => {
        await apiClient.delete(`/v1/messages/${id}`);
    },
};

// Reports API
export const reportsAPI = {
    download: async (format: 'pdf' | 'excel') => {
        const extension = format === 'excel' ? 'csv' : 'pdf';
        return downloadBlobFromApi('/v1/analytics/reports/export', {
            params: { format },
            defaultFilename: `buildpro-report-${new Date().toISOString().slice(0, 10)}.${extension}`,
        });
    },

    downloadProjectSummary: async () => {
        return downloadBlobFromApi('/v1/analytics/reports/project-summary/export', {
            defaultFilename: `buildpro-project-summary-${new Date().toISOString().slice(0, 10)}.csv`,
        });
    },

    downloadFinancialSummary: async () => {
        return downloadBlobFromApi('/v1/analytics/reports/financial-summary/export', {
            defaultFilename: `buildpro-financial-summary-${new Date().toISOString().slice(0, 10)}.csv`,
        });
    },
};

export const notificationsAPI = {
    list: async (params?: {
        page?: number;
        page_size?: number;
        unread_only?: boolean;
        project_id?: string;
    }) => {
        const response = await apiClient.get('/v1/notifications', { params });
        return response.data;
    },

    markRead: async (id: string) => {
        const response = await apiClient.post(`/v1/notifications/${id}/read`);
        return response.data;
    },

    readAll: async (projectId?: string) => {
        await apiClient.post('/v1/notifications/read-all', undefined, {
            params: projectId ? { project_id: projectId } : undefined,
        });
    },
};

export const boqAPI = {
    import: async (
        projectId: string,
        file: File,
        options?: { title?: string; currency?: string; start_date?: string; end_date?: string }
    ) => {
        const formData = new FormData();
        formData.append('file', file);
        const params = new URLSearchParams();
        if (options?.title) params.append('title', options.title);
        if (options?.currency) params.append('currency', options.currency);
        if (options?.start_date) params.append('start_date', options.start_date);
        if (options?.end_date) params.append('end_date', options.end_date);

        const query = params.toString();
        const url = `/v1/projects/${projectId}/boq/import${query ? `?${query}` : ''}`;
        const response = await apiClient.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    get: async (projectId: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/boq`);
        return response.data;
    },

    updateItem: async (projectId: string, itemId: string, data: any) => {
        const response = await apiClient.patch(`/v1/projects/${projectId}/boq/items/${itemId}`, data);
        return response.data;
    },

    summary: async (projectId: string) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/boq/summary`);
        return response.data;
    },

    syncTasks: async (projectId: string, overwriteExisting = false) => {
        const response = await apiClient.post(`/v1/projects/${projectId}/boq/sync-tasks`, undefined, {
            params: { overwrite_existing: overwriteExisting },
        });
        return response.data;
    },
};

// Audit Logs API
export const auditAPI = {
    list: async (params?: {
        page?: number;
        page_size?: number;
        entity_type?: string;
        action?: string;
        user_id?: string;
    }) => {
        const response = await apiClient.get('/v1/audit-logs', { params });
        return response.data;
    },
};

// Analytics API
export const analyticsAPI = {
    getDashboard: async () => {
        const response = await apiClient.get('/v1/analytics/dashboard');
        return response.data;
    },

    getProjectSummary: async (projectId: string) => {
        const response = await apiClient.get(`/v1/analytics/projects/${projectId}/summary`);
        return response.data;
    },
};

// Export the client for custom requests
export default apiClient;

