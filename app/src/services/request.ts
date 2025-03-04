import { toast } from 'sonner';
import { LOCAL_STORAGE_KEY_SESSION_TOKEN } from "@/context/AuthContext";
import { API_BASE_URL } from '@/settings';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
    skipErrorToast?: boolean;
}

interface ApiError {
    error: string;
    message?: string;
    details?: any;
}

function getUrl(path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${API_BASE_URL}/${cleanPath}`;
}

export function prepareHeaders(options: RequestOptions): Headers {
    const headers = new Headers(options.headers || {
        'Content-Type': 'application/json',
    });

    if (!options.skipAuth) {
        const token = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION_TOKEN);
        if (token) {
            headers.append('Authorization', `Bearer ${token}`);
        }
    }

    return headers;
}

async function handleResponse<T>(response: Response, options: RequestOptions): Promise<T> {
    if (response.ok) {
        // Handle empty responses (DELETE)
        if (response.status === 204) {
            return {} as T;
        }
        return response.json();
    }

    let errorMessage: string;
    try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.message || errorData.error;
    } catch {
        errorMessage = 'An unexpected error occurred';
    }


    switch (response.status) {
        case 429:
            errorMessage = errorMessage || 'Too many requests. Please try again later.';
            break;
        case 401:
            errorMessage = errorMessage || 'Authentication failed. Please login.';
            // TODO: to trigger a logout or auth refresh here
            break;
        case 403:
            errorMessage = errorMessage || 'You don\'t have permission to perform this action.';
            break;
        case 404:
            errorMessage = errorMessage || 'The requested resource was not found.';
            break;
        case 500:
            errorMessage = errorMessage || 'Server error. Please try again later.';
            break;
    }

    errorMessage = errorMessage || 'An error occurred';

    if (!options.skipErrorToast) {
        toast.error(errorMessage);
    }

    throw new Error(errorMessage);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = getUrl(path);
    const headers = prepareHeaders(options);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: options.credentials || 'include',
        });

        return await handleResponse<T>(response, options);
    } catch (error) {
        if (error instanceof Error) {
            // If it's already handled by handleResponse, just rethrow
            throw error;
        }

        // Handle network errors or other unexpected errors
        const errorMessage = 'Network error or server is unreachable';
        if (!options.skipErrorToast) {
            toast.error(errorMessage);
        }
        throw new Error(errorMessage);
    }
}

// Convenience methods for different HTTP methods
export const api = {
    get: <T>(path: string, options: RequestOptions = {}) =>
        request<T>(path, { ...options, method: 'GET' }),

    post: <T>(path: string, data?: any, options: RequestOptions = {}) =>
        request<T>(path, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        }),

    put: <T>(path: string, data?: any, options: RequestOptions = {}) =>
        request<T>(path, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    patch: <T>(path: string, data?: any, options: RequestOptions = {}) =>
        request<T>(path, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    delete: <T>(path: string, options: RequestOptions = {}) =>
        request<T>(path, { ...options, method: 'DELETE' }),
};
