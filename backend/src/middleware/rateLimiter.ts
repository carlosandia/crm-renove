import { Request, Response, NextFunction } from 'express';

// Interface para armazenar dados de rate limiting
interface RateLimitData {
  count: number;
  resetTime: Date;
  blocked: boolean;
}

// Armazenamento em memória (simples e eficiente)
const rateLimitStore = new Map<string, RateLimitData>();

// ✅ CORREÇÃO CRÍTICA: Rate limiting otimizado para desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENVIRONMENT === 'development';

// Configurações de rate limiting
const RATE_LIMIT_CONFIG = {
  // Limite geral de requests por IP
  general: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev / 15 min prod
    maxRequests: isDevelopment ? 1000 : 100, // 1000 dev / 100 prod requests
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Limite específico para login (mais restritivo)
  auth: {
    windowMs: isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 min dev / 15 min prod
    maxRequests: isDevelopment ? 50 : 5, // 50 dev / 5 prod tentativas
    message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
    skipSuccessfulRequests: true, // não contar logins bem-sucedidos
    skipFailedRequests: false
  },

  // Limite para APIs sensíveis
  sensitive: {
    windowMs: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000, // 1 min dev / 5 min prod
    maxRequests: isDevelopment ? 200 : 10, // 200 dev / 10 prod requests
    message: 'Limite de requisições excedido para este endpoint.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

/**
 * Obter chave única para rate limiting
 */
function getRateLimitKey(req: Request, type: string): string {
  // Usar IP do usuário + user agent + tipo de rate limit
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Se usuário logado, usar o ID do usuário também
  const userId = req.user?.id || '';
  
  return `${type}:${ip}:${userAgent.slice(0, 50)}:${userId}`;
}

/**
 * Limpar dados expirados do store
 */
function cleanExpiredData(): void {
  const now = new Date();
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Middleware genérico de rate limiting
 */
function createRateLimiter(config: typeof RATE_LIMIT_CONFIG.general, type: string = 'general') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // ✅ CORREÇÃO CRÍTICA: Bypass completo para desenvolvimento localhost
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const isLocalhost = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1'].includes(ip);
      
      if (isDevelopment && isLocalhost) {
        console.log(`⚡ [RATE-LIMIT-BYPASS] ${type} - IP localhost em desenvolvimento`);
        next();
        return;
      }

      // Limpar dados expirados periodicamente
      if (Math.random() < 0.01) { // 1% de chance a cada request
        cleanExpiredData();
      }

      const key = getRateLimitKey(req, type);
      const now = new Date();
      
      // Buscar dados existentes
      let limitData = rateLimitStore.get(key);
      
      // Se não existe ou expirou, criar novo
      if (!limitData || limitData.resetTime < now) {
        limitData = {
          count: 0,
          resetTime: new Date(now.getTime() + config.windowMs),
          blocked: false
        };
      }
      
      // Verificar se está bloqueado
      if (limitData.blocked && limitData.resetTime > now) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: config.message,
          retryAfter: Math.ceil((limitData.resetTime.getTime() - now.getTime()) / 1000),
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Incrementar contador
      limitData.count++;
      
      // Verificar se excedeu o limite
      if (limitData.count > config.maxRequests) {
        limitData.blocked = true;
        rateLimitStore.set(key, limitData);
        
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: config.message,
          retryAfter: Math.ceil((limitData.resetTime.getTime() - now.getTime()) / 1000),
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Salvar dados atualizados
      rateLimitStore.set(key, limitData);
      
      // Adicionar headers de rate limiting
      const remaining = Math.max(0, config.maxRequests - limitData.count);
      const resetTime = Math.ceil(limitData.resetTime.getTime() / 1000);
      
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);
      
      // Adicionar informações ao request
      req.rateLimit = {
        limit: config.maxRequests,
        current: limitData.count,
        remaining: remaining,
        resetTime: limitData.resetTime
      };
      
      next();
      
    } catch (error) {
      console.error('Erro no rate limiting:', error);
      // Em caso de erro, permitir requisição mas logar
      next();
    }
  };
}

/**
 * Rate limiter geral (padrão)
 */
export const rateLimiter = createRateLimiter(RATE_LIMIT_CONFIG.general, 'general');

/**
 * Rate limiter para autenticação
 */
export const authRateLimiter = createRateLimiter(RATE_LIMIT_CONFIG.auth, 'auth');

/**
 * Rate limiter para endpoints sensíveis
 */
export const sensitiveRateLimiter = createRateLimiter(RATE_LIMIT_CONFIG.sensitive, 'sensitive');

/**
 * Middleware para limpar rate limit de um usuário (admin only)
 */
export function clearRateLimit(type: string = 'general') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Verificar se é admin
      if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: 'Apenas administradores podem limpar rate limits'
        });
        return;
      }
      
      const targetIp = req.body.ip || req.query.ip;
      if (!targetIp) {
        res.status(400).json({
          success: false,
          error: 'IP requerido',
          message: 'Forneça o IP para limpar o rate limit'
        });
        return;
      }
      
      // Limpar todos os rate limits deste IP
      let cleared = 0;
      for (const [key, data] of rateLimitStore.entries()) {
        if (key.includes(targetIp)) {
          rateLimitStore.delete(key);
          cleared++;
        }
      }
      
      res.json({
        success: true,
        message: `Rate limit limpo para IP ${targetIp}`,
        cleared: cleared
      });
      
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Endpoint para verificar status do rate limit
 */
export function getRateLimitStatus(req: Request, res: Response): void {
  try {
    const key = getRateLimitKey(req, 'general');
    const limitData = rateLimitStore.get(key);
    
    if (!limitData) {
      res.json({
        success: true,
        rateLimit: {
          count: 0,
          limit: RATE_LIMIT_CONFIG.general.maxRequests,
          remaining: RATE_LIMIT_CONFIG.general.maxRequests,
          resetTime: null,
          blocked: false
        }
      });
      return;
    }
    
    const remaining = Math.max(0, RATE_LIMIT_CONFIG.general.maxRequests - limitData.count);
    
    res.json({
      success: true,
      rateLimit: {
        count: limitData.count,
        limit: RATE_LIMIT_CONFIG.general.maxRequests,
        remaining: remaining,
        resetTime: limitData.resetTime,
        blocked: limitData.blocked
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar rate limit'
    });
  }
}

/**
 * Função para monitoramento - obter estatísticas
 */
export function getRateLimitStats(): any {
  const stats = {
    totalKeys: rateLimitStore.size,
    blockedIPs: 0,
    topIPs: new Map<string, number>(),
    byType: new Map<string, number>()
  };
  
  for (const [key, data] of rateLimitStore.entries()) {
    const [type, ip] = key.split(':');
    
    // Contar bloqueados
    if (data.blocked) {
      stats.blockedIPs++;
    }
    
    // Contar por tipo
    stats.byType.set(type, (stats.byType.get(type) || 0) + 1);
    
    // Top IPs
    stats.topIPs.set(ip, (stats.topIPs.get(ip) || 0) + data.count);
  }
  
  return {
    ...stats,
    topIPs: Array.from(stats.topIPs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    byType: Object.fromEntries(stats.byType)
  };
} 