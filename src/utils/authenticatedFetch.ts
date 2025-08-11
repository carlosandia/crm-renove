// ❌ ARQUIVO COMPLETAMENTE DEPRECADO: Sistema migrado para autenticação básica Supabase
// 🚫 NÃO USAR: Use supabase.auth.getUser() + RLS policies diretamente
import { supabase } from '../lib/supabase';

/**
 * Função utilitária para fazer requisições autenticadas usando tokens do Supabase
 * Baseada nos padrões oficiais do Supabase para authenticated fetch
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Obter sessão atual do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    // Configurar headers com autenticação
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Content-Type', 'application/json');

    // Fazer a requisição autenticada
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error('🚨 [authenticatedFetch] Erro:', error);
    throw error;
  }
}

// AIDEV-NOTE: Função handleJWTRefresh removida completamente
// Sistema usa 100% Supabase Auth nativo sem refresh manual

/**
 * Função helper para fazer POST requests autenticados
 */
export async function authenticatedPost(url: string, data: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Função helper para fazer PUT requests autenticados
 */
export async function authenticatedPut(url: string, data: any): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Função helper para fazer DELETE requests autenticados
 */
export async function authenticatedDelete(url: string): Promise<Response> {
  return authenticatedFetch(url, {
    method: 'DELETE',
  });
}