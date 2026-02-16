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
        category?: string;
        search?: string;
    }) => {
        const response = await apiClient.get(`/v1/projects/${projectId}/documents`, { params });
        return response.data;
    },

    upload: async (projectId: string, file: File, category?: string, description?: string) => {
        const formData = new FormData();
        formData.append('file', file);

        const params = new URLSearchParams();
        if (category) params.append('category', category);
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

    update: async (projectId: string, id: string, data: { category?: string; description?: string }) => {
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

    create: async (data: { name: string; slug: string; description?: string; industry?: string }) => {
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
        project_id?: string;
        task_id?: string;
        message_type?: string;
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

