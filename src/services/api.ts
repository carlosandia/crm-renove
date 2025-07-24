/**
 * 🔧 Service Layer Unificado - Elimina duplicação de lógicas de API
 * Centraliza todas as operações de API com padrões consistentes
 */

import { API } from '@/utils/constants';

// ============================================
// TIPOS BASE
// ============================================

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: Record<string, unknown>;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ============================================
// CONFIGURAÇÕES DA API
// ============================================

class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Configura headers de autenticação
   */
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Request base com retry e timeout
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: PaginationParams): Promise<ApiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request<T>(url);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Constrói query string
   */
  private buildQueryString(params: PaginationParams): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'object') {
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }
}

// Instância singleton da API
export const api = new ApiService();

export default api; 