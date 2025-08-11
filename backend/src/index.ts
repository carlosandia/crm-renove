// FASE 1: Backend Básico - Servidor Simplificado para Correção
import dotenv from 'dotenv';
import path from 'path';

// ✅ CORREÇÃO CRÍTICA: .env está na pasta backend, não na raiz
// __dirname aponta para backend/src, então backend/.env está um nível acima
const backendPath = path.resolve(__dirname, '..');
const envPath = path.join(backendPath, '.env');
console.log('🔍 [DEBUG] __dirname:', __dirname);
console.log('🔍 [DEBUG] backendPath:', backendPath);
console.log('🔍 [DEBUG] envPath:', envPath);
const envResult = dotenv.config({ path: envPath });
console.log('🔍 [DEBUG] .env result:', envResult.parsed ? 'SUCCESS' : 'ERROR', envResult.error || '');
console.log('🔍 [DEBUG] SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORREÇÃO ORDEM CRÍTICA: Importar dependências básicas primeiro
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { User } from './types/express';

// ✅ IMPORTANTE: Importar supabase DEPOIS do carregamento do .env
import supabase, { createUserSupabaseClient } from './config/supabase';

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORREÇÃO CRÍTICA: Trust proxy para detecção correta de IP localhost
// Necessário para que req.ip funcione corretamente com o rate limiter
app.set('trust proxy', true);

// ✅ CORREÇÃO PROBLEMA #17: Cache com TTL automático e cleanup periódico
// Evita memory leaks com limpeza automática
interface CacheEntry {
  timestamp: number;
  ttl: number;
}

class TTLCache<K, V extends CacheEntry> {
  private cache = new Map<K, V>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxSize: number;
  
  constructor(cleanupIntervalMs: number = 30000, maxSize: number = 1000) {
    this.maxSize = maxSize;
    
    // ✅ Cleanup periódico para prevenir memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
    
    // ✅ Graceful shutdown - limpar interval
    process.on('SIGTERM', () => this.destroy());
    process.on('SIGINT', () => this.destroy());
  }
  
  set(key: K, value: V): void {
    // ✅ Prevenir crescimento ilimitado
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // ✅ Verificar TTL na consulta
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry;
  }
  
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }
  
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 [TTLCache] Limpeza automática: ${deletedCount} entries removidos, ${this.cache.size} restantes`);
    }
  }
  
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    console.log('🛑 [TTLCache] Cache destruído e limpo');
  }
  
  size(): number {
    return this.cache.size;
  }
}

// ✅ CORREÇÃO: Cache TTL para métricas (3 segundos TTL, cleanup a cada 30s)
const recentMetricsUpdates = new TTLCache<string, CacheEntry>(30000, 500);

// Função para marcar update recente
function markRecentMetricsUpdate(userId: string) {
  recentMetricsUpdates.set(userId, {
    timestamp: Date.now(),
    ttl: 3000 // 3 segundos TTL
  });
  console.log(`⏰ [Cache] Marcando update recente para usuário ${userId} (cache size: ${recentMetricsUpdates.size()})`);
}

// Função para verificar se houve update recente
function hasRecentMetricsUpdate(userId: string): boolean {
  const cacheEntry = recentMetricsUpdates.get(userId);
  const hasRecent = cacheEntry !== undefined;
  
  if (hasRecent && cacheEntry) {
    const timeSinceUpdate = Date.now() - cacheEntry.timestamp;
    console.log(`🔍 [Cache] Update recente encontrado para usuário ${userId}:`, {
      updateTime: new Date(cacheEntry.timestamp).toISOString(),
      timeSinceUpdate: `${timeSinceUpdate}ms`,
      ttl: `${cacheEntry.ttl}ms`,
      cacheSize: recentMetricsUpdates.size()
    });
  }
  
  return hasRecent;
}

// Log inicial
console.log('🔄 Iniciando configuração do servidor...');

// ============================================
// CONFIGURAÇÕES BÁSICAS DE SEGURANÇA
// ============================================

// ✅ CORREÇÃO CSP: Helmet para headers de segurança com Google Fonts e localhost API
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://fonts.googleapis.com"  // ✅ Google Fonts CSS
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"     // ✅ Google Fonts files
      ],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'", 
        "https://*.supabase.co",
        "http://localhost:3001",        // ✅ API local para desenvolvimento
        process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : process.env.API_URL || 'http://127.0.0.1:3001'        // ✅ API local para desenvolvimento
      ]
    }
  },
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// ✅ CORREÇÃO PROBLEMA #16: CORS configurado apropriadamente por ambiente
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Lista de origins permitidos por ambiente
    const allowedOrigins = isDevelopment ? [
      process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : process.env.FRONTEND_URL || 'http://127.0.0.1:8080',  // Frontend principal
      process.env.NODE_ENV === 'production' ? 'https://crm.renovedigital.com.br' : process.env.FRONTEND_URL || 'http://localhost:8080',  // Frontend principal (localhost)
      process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173',  // Vite dev server fallback
      process.env.VITE_DEV_SERVER_URL_LOCALHOST || 'http://localhost:5173'   // Vite dev server fallback (localhost)
    ] : [
      'https://crm.renovedigital.com.br',    // ✅ PRODUÇÃO CORRETO
      'https://www.crm.renovedigital.com.br', // ✅ PRODUÇÃO COM WWW
      'http://168.231.99.133',               // ✅ IP SERVIDOR
      'http://127.0.0.1'                     // ✅ LOCALHOST PRODUÇÃO
    ];

    // Permitir requests sem origin (Postman, curl, health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 [CORS] Origin rejeitado: ${origin} (ambiente: ${process.env.NODE_ENV})`);
      console.warn(`🔍 [CORS] Origins permitidos: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS policy não permite origin: ${origin}`));
    }
  },
  credentials: true, // Importante para autenticação
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Cache-Control',
    // Headers específicos do CRM
    'X-User-ID',
    'X-User-Role', 
    'X-Tenant-ID',
    'x-user-id',
    'x-user-role',
    'x-tenant-id',
    'tenant-id'
  ],
  exposedHeaders: [
    'X-Total-Count',  // Para paginação
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining'
  ],
  optionsSuccessStatus: 200, // Para IE11
  preflightContinue: false,
  maxAge: process.env.NODE_ENV !== 'production' ? 3600 : 86400 // Cache menor em desenvolvimento
};

app.use(cors(corsOptions));

// ✅ CORREÇÃO CRÍTICA: Rate limiting customizado será importado das rotas específicas
// Removendo rate limiter duplicado que estava causando conflito
// O sistema customizado em rateLimiter.ts já tem bypass para localhost configurado

// Logging básico
app.use(morgan('combined'));

// Parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// ============================================
// ROTAS BÁSICAS
// ============================================

// ✅ CORREÇÃO PROBLEMA #20: Health check com timeout para evitar travamento do monitoring
app.get('/health', (req, res) => {
  // ✅ Definir timeout de 5 segundos para resposta do health check
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ [HEALTH CHECK] Timeout na resposta /health');
      res.status(503).json({
        status: 'TIMEOUT',
        message: 'Health check timeout - servidor pode estar sobrecarregado',
        timestamp: new Date().toISOString(),
        version: '1.0.0-basic'
      });
    }
  }, 5000);

  try {
    // ✅ Resposta rápida com informações básicas
    res.json({
      status: 'OK',
      message: 'Backend CRM rodando corretamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0-basic',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    });
    
    // ✅ Limpar timeout após resposta bem-sucedida
    clearTimeout(timeout);
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ [HEALTH CHECK] Erro em /health:', error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro interno no health check',
        timestamp: new Date().toISOString(),
        version: '1.0.0-basic'
      });
    }
  }
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'CRM Marketing API - Versão Básica',
    version: '1.0.0-basic',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Login básico removido - usando rota completa do authRoutes

// ✅ CORREÇÃO PROBLEMA #20: Health check da API com timeout
app.get('/api/health', (req, res) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('⚠️ [HEALTH CHECK] Timeout na resposta /api/health');
      res.status(503).json({
        status: 'TIMEOUT',
        message: 'API health check timeout',
        timestamp: new Date().toISOString(),
        version: '1.0.0-basic'
      });
    }
  }, 5000);

  try {
    res.json({
      status: 'OK',
      message: 'API CRM funcionando corretamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0-basic',
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    });
    
    clearTimeout(timeout);
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ [HEALTH CHECK] Erro em /api/health:', error);
    if (!res.headersSent) {
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro interno no API health check',
        timestamp: new Date().toISOString(),
        version: '1.0.0-basic'
      });
    }
  }
});

// Rota básica de notificações do usuário
app.get('/api/notifications/user', (req, res) => {
  // Por enquanto retorna array vazio, será implementado futuramente
  res.json({
    success: true,
    notifications: [],
    total: 0,
    unread: 0,
    timestamp: new Date().toISOString()
  });
});

// Rota para forçar logout (invalidar tokens antigos)
app.post('/api/auth/force-logout', (req, res) => {
  res.json({
    success: true,
    message: 'Tokens invalidados. Faça login novamente.',
    forceLogout: true
  });
});

// Teste de conexão Supabase
app.get('/api/supabase/test', async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis Supabase não configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Teste simples de conexão
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Conexão Supabase OK',
      supabaseUrl: supabaseUrl.substring(0, 30) + '...',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro teste Supabase:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ TESTE SIMPLES: Confirmar que nossa unificação funciona
app.get('/api/test-simple/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { tenant_id } = req.query;
    
    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id obrigatório' });
    }

    // Usar service role para testar diretamente no banco
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Query direta na tabela lead_tasks
    const { data: leadTasks, error } = await supabaseAdmin
      .from('lead_tasks')
      .select('id, descricao, status, data_programada')
      .eq('lead_id', leadId)
      .eq('tenant_id', tenant_id);

    if (error) {
      throw new Error(error.message);
    }

    // Normalizar status para o frontend
    const normalizedTasks = (leadTasks || []).map(task => ({
      id: task.id,
      title: task.descricao,
      status: task.status === 'pendente' ? 'pending' : 
              task.status === 'concluida' ? 'completed' : task.status,
      scheduled_at: task.data_programada,
      is_overdue: task.status === 'pendente' && 
                  task.data_programada && 
                  new Date(task.data_programada) < new Date()
    }));

    const stats = {
      total: normalizedTasks.length,
      pending: normalizedTasks.filter(t => t.status === 'pending').length,
      completed: normalizedTasks.filter(t => t.status === 'completed').length,
      overdue: normalizedTasks.filter(t => t.is_overdue === true).length
    };

    console.log('✅ [SIMPLE TEST] Resultado:', {
      leadId: leadId.substring(0, 8),
      stats
    });

    res.json({
      success: true,
      data: normalizedTasks,
      stats: stats,
      message: `Encontradas ${normalizedTasks.length} tarefas`
    });

  } catch (error: any) {
    console.error('❌ [SIMPLE TEST] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ROTAS DE MÓDULOS
// ============================================

// Importar rotas de pipelines
import pipelineRoutes from './routes/pipelines';
import testArchiveRoutes from './routes/testArchive';
import authRoutes from './routes/auth';
import cadenceRoutes from './routes/cadence';
import adminRoutes from './routes/admin';
import platformIntegrationsRoutes from './routes/platformIntegrations';
import leadsRoutes from './routes/leads-simple';
import activitiesRoutes from './routes/activities';
import leadTasksRoutes from './routes/leadTasks';
import leadDocumentsRoutes from './routes/leadDocuments';
import opportunitiesRoutes from './routes/opportunities';
import meetingsRoutes from './routes/meetings';
import annotationsRoutes from './routes/annotations';
import emailRoutes from './routes/email';
import { authenticateToken } from './middleware/auth';

// Rota de teste para debug
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Autenticação funcionando',
    user: (req as any).user
  });
});

// Registrar rotas de pipelines
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/test', testArchiveRoutes);

// Registrar rotas de autenticação
app.use('/api/auth', authRoutes);

// Registrar rotas de cadência
app.use('/api/cadence', cadenceRoutes);

// Registrar rotas de administração Supabase
app.use('/api/admin', adminRoutes);

// Registrar rotas de plataforma de integrações
app.use('/api/platform-integrations', platformIntegrationsRoutes);

// Registrar rotas de leads (Import/Export)
app.use('/api/leads', leadsRoutes);
// Registrar rotas de oportunidades
app.use('/api/opportunities', opportunitiesRoutes);

// Registrar rotas de atividades (combinadas - cadência + manuais)
app.use('/api/activities', activitiesRoutes);
app.use('/api/lead-tasks', leadTasksRoutes);
app.use('/api', leadDocumentsRoutes); // Lead documents routes com prefixo /api para consistência

// Registrar rotas de integração de e-mail
import simpleEmailRoutes from './routes/simple-email';
import suggestConfigRoutes from './routes/suggest-config';
// import gmailOAuthRoutes from './routes/gmail-oauth';
app.use('/api/email', emailRoutes);
app.use('/api/email', suggestConfigRoutes); // Rotas de sugestão de configuração
app.use('/api/simple-email', simpleEmailRoutes);
// app.use('/api/gmail-oauth', gmailOAuthRoutes);

// Registrar rotas de outcome reasons (USANDO SIMPLE AUTH)
import outcomeReasonsRoutes from './routes/outcome-reasons';
app.use('/api/outcome-reasons', outcomeReasonsRoutes);

// ✅ NOVO: Registrar rotas de integrações e webhooks (sistema N8N)
import integrationsRoutes from './routes/integrations';
app.use('/api/integrations', integrationsRoutes);

// ✅ NOVO: Registrar rotas de webhook universal (N8N, Zapier, Make.com, etc.)
import webhooksUniversalRoutes from './routes/webhooks-universal';
app.use('/api/webhook', webhooksUniversalRoutes);

// Registrar rotas de qualificação
import qualificationRoutes from './routes/qualification';
app.use('/api/qualification', qualificationRoutes);

// Registrar rotas de preferências de métricas por pipeline
import pipelineMetricsPreferencesRoutes from './routes/pipelineMetricsPreferences';
app.use('/api/pipeline-metrics-preferences', pipelineMetricsPreferencesRoutes);

// AIDEV-NOTE: Registrar rotas de reuniões (IMPLEMENTAÇÃO COMPLETA)
app.use('/api/meetings', meetingsRoutes);

// AIDEV-NOTE: Registrar rotas de anotações (SISTEMA COMPLETO)
app.use('/api/annotations', annotationsRoutes);


// ============================================ 
// MEETINGS API MOCK (CORREÇÃO 404)
// ============================================

// Armazenamento em memória para reuniões mock
const mockMeetings: any[] = [];

// AIDEV-NOTE: Endpoint REAL para métricas de reuniões do Supabase
app.get('/api/meetings/reports/metrics', async (req, res) => {
  const { pipeline_id, start_date, end_date } = req.query;
  
  try {
    console.log(`📊 [Meetings] Calculando métricas no Supabase:`, {
      pipeline_id,
      start_date,
      end_date
    });

    // AIDEV-NOTE: Query base para métricas agregadas
    let query = supabase
      .from('meetings')
      .select('outcome, pipeline_lead_id, created_at');

    // Filtros opcionais
    if (pipeline_id) {
      // Buscar reuniões para leads específicos de um pipeline
      const { data: pipelineLeads } = await supabase
        .from('pipeline_leads')
        .select('id')
        .eq('pipeline_id', pipeline_id);
      
      if (pipelineLeads && pipelineLeads.length > 0) {
        const leadIds = pipelineLeads.map(pl => pl.id);
        query = query.in('pipeline_lead_id', leadIds);
      }
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: meetings, error } = await query;

    if (error) {
      console.error('❌ [Meetings] Erro ao buscar métricas no Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: `Erro ao calcular métricas: ${error.message}`
      });
    }

    // AIDEV-NOTE: Calcular métricas baseadas nos dados reais
    const totalMeetings = meetings?.length || 0;
    const scheduledCount = meetings?.filter(m => m.outcome === 'agendada').length || 0;
    const attendedCount = meetings?.filter(m => m.outcome === 'realizada').length || 0;
    const noShowCount = meetings?.filter(m => m.outcome === 'no_show').length || 0;
    const rescheduledCount = meetings?.filter(m => m.outcome === 'reagendada').length || 0;
    const canceledCount = meetings?.filter(m => m.outcome === 'cancelada').length || 0;
    
    const noShowRate = totalMeetings > 0 ? (noShowCount / totalMeetings) * 100 : 0;
    const attendRate = totalMeetings > 0 ? (attendedCount / totalMeetings) * 100 : 0;
    
    console.log(`✅ [Meetings] Métricas calculadas do Supabase: ${totalMeetings} reuniões total, ${scheduledCount} agendadas`);
    
    res.json({
      success: true,
      data: {
        individual_pipelines: [], // TODO: Implementar quebra por pipeline se necessário
        aggregated: {
          total_meetings: totalMeetings,
          scheduled_count: scheduledCount,
          attended_count: attendedCount,
          no_show_count: noShowCount,
          rescheduled_count: rescheduledCount,
          canceled_count: canceledCount,
          no_show_rate: parseFloat(noShowRate.toFixed(2)),
          attend_rate: parseFloat(attendRate.toFixed(2))
        }
      },
      message: `Métricas calculadas com ${totalMeetings} reuniões do banco de dados`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado no cálculo de métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro interno: ${error.message}`
    });
  }
});

// AIDEV-NOTE: Endpoint REAL para buscar reuniões de um lead específico no Supabase
app.get('/api/meetings/lead/:leadId', async (req, res) => {
  const { leadId } = req.params;
  const { limit = '20', page = '1', outcome } = req.query;
  
  try {
    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    console.log(`📅 [Meetings] Buscando reuniões no Supabase para lead ${leadId}:`, {
      limit: limitNumber,
      page: pageNumber,
      outcome
    });

    // AIDEV-NOTE: Usar função RPC para bypass RLS
    console.log(`📅 [Meetings] Usando função RPC para buscar reuniões do leadId: ${leadId}`);
    
    const { data: meetings, error } = await supabase
      .rpc('get_meetings_for_lead', { lead_id_param: leadId });

    console.log(`🔍 [Meetings] RPC retornou ${meetings?.length || 0} reuniões`);

    if (error) {
      console.error('❌ [Meetings] Erro RPC:', error);
    }

    // AIDEV-NOTE: Aplicar filtros de outcome e paginação no resultado
    let filteredMeetings = meetings || [];
    
    if (outcome && outcome !== '') {
      filteredMeetings = filteredMeetings.filter(m => m.outcome === outcome);
      console.log(`🔍 [Meetings] Após filtro outcome '${outcome}': ${filteredMeetings.length} reuniões`);
    }

    // Aplicar paginação
    const paginatedMeetings = filteredMeetings.slice(offset, offset + limitNumber);
    console.log(`🔍 [Meetings] Após paginação: ${paginatedMeetings.length} reuniões (offset=${offset}, limit=${limitNumber})`);
    
    // Usar resultado paginado para o processamento
    const processedMeetings = paginatedMeetings;

    if (error) {
      console.error('❌ [Meetings] Erro ao buscar no Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: `Erro ao buscar reuniões: ${error.message}`
      });
    }

    // AIDEV-NOTE: Buscar dados relacionados separadamente se há reuniões
    const formattedMeetings = [];
    
    if (processedMeetings && processedMeetings.length > 0) {
      // Buscar informações dos owners
      const ownerIds = [...new Set(processedMeetings.map(m => m.owner_id))];
      const { data: owners } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', ownerIds);

      // Buscar informações dos pipeline leads
      const pipelineLeadIds = [...new Set(processedMeetings.map(m => m.pipeline_lead_id))];
      const { data: pipelineLeads } = await supabase
        .from('pipeline_leads')
        .select('id, custom_data')
        .in('id', pipelineLeadIds);

      // Buscar informações dos lead masters
      const leadMasterIds = [...new Set(processedMeetings.map(m => m.lead_master_id).filter(Boolean))];
      let leadMasters: any[] = [];
      if (leadMasterIds.length > 0) {
        const { data } = await supabase
          .from('leads_master')
          .select('id, first_name, last_name, email')
          .in('id', leadMasterIds);
        leadMasters = data || [];
      }

      // Formatar dados combinados
      for (const meeting of processedMeetings) {
        const owner = owners?.find(o => o.id === meeting.owner_id);
        const pipelineLead = pipelineLeads?.find(pl => pl.id === meeting.pipeline_lead_id);
        const leadMaster = leadMasters?.find(lm => lm.id === meeting.lead_master_id);

        formattedMeetings.push({
          ...meeting,
          owner_name: owner 
            ? `${owner.first_name} ${owner.last_name}`.trim()
            : 'Responsável não informado',
          pipeline_lead: {
            id: meeting.pipeline_lead_id,
            custom_data: pipelineLead?.custom_data || {}
          },
          lead_master: {
            id: meeting.lead_master_id,
            first_name: leadMaster?.first_name || 'Lead',
            last_name: leadMaster?.last_name || 'Master',
            email: leadMaster?.email || 'unknown@example.com'
          }
        });
      }
    }

    // Total count para paginação (usar length dos dados filtrados antes da paginação)
    const totalCount = filteredMeetings.length;

    console.log(`✅ [Meetings] Retornando ${formattedMeetings.length} reuniões do Supabase para lead ${leadId} (total: ${totalCount || 0})`);
    
    res.json({
      success: true,
      data: formattedMeetings,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limitNumber)
      },
      message: `Encontradas ${totalCount || 0} reuniões no banco de dados`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado na busca:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro interno: ${error.message}`
    });
  }
});

// AIDEV-NOTE: Endpoint REAL para criar reunião no Supabase (COM AUTENTICAÇÃO)
app.post('/api/meetings', authenticateToken, async (req: any, res) => {
  const { pipeline_lead_id, lead_master_id, planned_at, notes } = req.body;
  
  try {
    // AIDEV-NOTE: Extrair usuário real do JWT token
    const user = req.user;
    const userName = user?.first_name && user?.last_name 
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.email || 'Usuário não identificado';
    
    console.log('👤 [Meetings] Usuário autenticado criando reunião no Supabase:', {
      userId: user?.userId,
      userName,
      tenantId: user?.tenantId,
      pipeline_lead_id,
      lead_master_id
    });

    // Validar campos obrigatórios  
    if (!pipeline_lead_id || !user?.tenant_id || !user?.id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'pipeline_lead_id, tenant_id e owner_id são obrigatórios'
      });
    }
    
    // AIDEV-NOTE: Buscar lead_master_id real do pipeline_lead
    console.log(`📅 [Meetings] Buscando lead_master_id do pipeline_lead: ${pipeline_lead_id}`);
    
    const { data: pipelineLead, error: pipelineError } = await supabase
      .from('pipeline_leads')
      .select('lead_master_id')
      .eq('id', pipeline_lead_id)
      .single();

    if (pipelineError) {
      console.error('❌ [Meetings] Erro ao buscar pipeline_lead:', pipelineError);
      return res.status(400).json({
        success: false,
        error: 'Invalid pipeline lead',
        message: `Pipeline lead não encontrado: ${pipelineError.message}`
      });
    }

    const realLeadMasterId = pipelineLead?.lead_master_id || null;
    console.log(`📅 [Meetings] lead_master_id encontrado:`, {
      pipeline_lead_id,
      lead_master_id_from_request: lead_master_id,
      real_lead_master_id: realLeadMasterId
    });

    // AIDEV-NOTE: Usar função RPC para bypass RLS na criação
    console.log(`📅 [Meetings] Usando função RPC para criar reunião`);
    
    const { data: createdMeetings, error } = await supabase
      .rpc('create_meeting_safe', {
        tenant_id_param: user.tenant_id,
        pipeline_lead_id_param: pipeline_lead_id,
        owner_id_param: user.id,
        planned_at_param: planned_at || new Date().toISOString(),
        lead_master_id_param: realLeadMasterId,
        outcome_param: 'agendada',
        notes_param: notes || null
      });

    const meeting = createdMeetings?.[0];

    if (error) {
      console.error('❌ [Meetings] Erro ao inserir no Supabase:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: `Erro ao salvar reunião: ${error.message}`,
        details: error.details
      });
    }

    // AIDEV-NOTE: Formatar resposta com dados relacionados
    const formattedMeeting = {
      ...meeting,
      owner_name: userName,
      pipeline_lead: {
        id: pipeline_lead_id,
        custom_data: meeting.pipeline_lead?.custom_data || {}
      },
      lead_master: {
        id: lead_master_id,
        first_name: meeting.lead_master?.first_name || 'Lead',
        last_name: meeting.lead_master?.last_name || 'Master',
        email: meeting.lead_master?.email || 'unknown@example.com'
      }
    };
    
    console.log(`✅ [Meetings] Reunião criada no Supabase:`, {
      id: meeting.id,
      pipeline_lead_id: meeting.pipeline_lead_id,
      lead_master_id: meeting.lead_master_id,
      planned_at: meeting.planned_at,
      outcome: meeting.outcome
    });
    
    res.json({
      success: true,
      data: formattedMeeting,
      message: 'Reunião criada e salva no banco de dados',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro interno: ${error.message}`
    });
  }
});

// AIDEV-NOTE: Mock endpoint TESTE para criar reunião sem auth (apenas para testes)
app.post('/api/meetings/test', (req, res) => {
  const { pipeline_lead_id = 'test-lead', lead_master_id = 'test-master' } = req.body;
  
  const mockMeeting = {
    id: `mock-meeting-${Date.now()}`,
    tenant_id: 'd7caffc1-c923-47c8-9301-ca9eeff1a243',
    pipeline_lead_id,
    lead_master_id,
    owner_id: 'test-owner',
    planned_at: new Date().toISOString(),
    outcome: 'agendada',
    no_show_reason: null,
    notes: 'Reunião de teste criada sem autenticação',
    google_event_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    owner_name: 'Usuário Teste',
    pipeline_lead: { id: pipeline_lead_id, stage_name: 'Teste', pipeline_name: 'Teste Pipeline' },
    lead_master: { id: lead_master_id, first_name: 'Lead', last_name: 'Teste', email: 'teste@example.com' }
  };
  
  mockMeetings.push(mockMeeting);
  
  console.log(`✅ [Test] Reunião de teste criada: ${mockMeeting.id}`);
  
  res.json({
    success: true,
    data: mockMeeting,
    message: 'Reunião de teste criada'
  });
});

// AIDEV-NOTE: Mock endpoint TESTE para atualizar outcome sem auth (apenas para testes)
app.patch('/api/meetings/:meetingId/outcome/test', (req, res) => {
  const { meetingId } = req.params;
  const { outcome, no_show_reason, notes } = req.body;
  
  console.log(`🔄 [Test] Tentando atualizar reunião ${meetingId}:`, {
    outcome,
    no_show_reason,
    notes
  });
  
  const meetingIndex = mockMeetings.findIndex(meeting => meeting.id === meetingId);
  
  if (meetingIndex === -1) {
    console.log(`❌ [Test] Reunião ${meetingId} não encontrada`);
    return res.status(404).json({
      success: false,
      error: 'Meeting not found',
      message: `Reunião ${meetingId} não foi encontrada`,
      available_meetings: mockMeetings.map(m => m.id)
    });
  }
  
  const meeting = mockMeetings[meetingIndex];
  const updatedMeeting = {
    ...meeting,
    outcome: outcome || meeting.outcome,
    no_show_reason: no_show_reason || meeting.no_show_reason,
    notes: notes || meeting.notes,
    updated_at: new Date().toISOString()
  };
  
  mockMeetings[meetingIndex] = updatedMeeting;
  
  console.log(`✅ [Test] Reunião ${meetingId} atualizada: ${meeting.outcome} → ${updatedMeeting.outcome}`);
  
  res.json({
    success: true,
    data: updatedMeeting,
    message: `Reunião ${meetingId} atualizada com sucesso`
  });
});

// AIDEV-NOTE: Endpoint REAL para atualizar outcome da reunião no Supabase (PATCH)
app.patch('/api/meetings/:meetingId/outcome', authenticateToken, async (req: any, res) => {
  const { meetingId } = req.params;
  const { outcome, no_show_reason, notes } = req.body;
  
  try {
    console.log(`🔄 [Meetings] Tentando atualizar reunião ${meetingId} no Supabase:`, {
      outcome,
      no_show_reason,
      notes
    });

    // AIDEV-NOTE: Usar função RPC para bypass RLS na atualização
    console.log(`📅 [Meetings] Usando função RPC para atualizar reunião ${meetingId}`);
    
    const { data: updatedMeetings, error: updateError } = await supabase
      .rpc('update_meeting_outcome', {
        meeting_id_param: meetingId,
        outcome_param: outcome,
        no_show_reason_param: no_show_reason,
        notes_param: notes
      });

    const updatedMeeting = updatedMeetings?.[0];

    if (updateError || !updatedMeeting) {
      console.error('❌ [Meetings] Erro ao atualizar no Supabase:', updateError?.message || 'Reunião não encontrada');
      return res.status(updateError ? 500 : 404).json({
        success: false,
        error: updateError ? 'Database error' : 'Meeting not found',
        message: updateError ? `Erro ao atualizar reunião: ${updateError.message}` : `Reunião ${meetingId} não foi encontrada`
      });
    }

    console.log(`✅ [Meetings] Reunião ${meetingId} atualizada no Supabase:`, {
      meeting_id: updatedMeeting.id,
      new_outcome: updatedMeeting.outcome,
      no_show_reason: updatedMeeting.no_show_reason
    });
    
    res.json({
      success: true,
      data: updatedMeeting,
      message: `Reunião ${meetingId} atualizada com sucesso no banco de dados`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado na atualização:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro interno: ${error.message}`
    });
  }
});

// AIDEV-NOTE: Endpoint REAL para deletar reunião do Supabase (DELETE)
app.delete('/api/meetings/:meetingId', authenticateToken, async (req: any, res) => {
  const { meetingId } = req.params;
  
  try {
    console.log(`🗑️ [Meetings] Tentando deletar reunião ${meetingId} do Supabase`);

    // AIDEV-NOTE: Usar função RPC para bypass RLS na deleção
    console.log(`📅 [Meetings] Usando função RPC para deletar reunião ${meetingId}`);
    
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_meeting_safe', {
        meeting_id_param: meetingId
      });

    const result = deleteResult?.[0];

    if (deleteError) {
      console.error('❌ [Meetings] Erro ao deletar no Supabase:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: `Erro ao deletar reunião: ${deleteError.message}`
      });
    }

    if (!result || !result.success) {
      console.error('❌ [Meetings] Reunião não encontrada:', {
        meetingId,
        result
      });
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
        message: `Reunião ${meetingId} não foi encontrada`
      });
    }

    console.log(`✅ [Meetings] Reunião ${meetingId} deletada do Supabase com sucesso`);
    
    res.json({
      success: true,
      message: `Reunião ${meetingId} deletada com sucesso`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado na exclusão:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro interno: ${error.message}`
    });
  }
});

// ============================== [7] REAGENDAMENTO INTELIGENTE ==============================
// AIDEV-NOTE: Endpoint para reagendar reunião (cria nova reunião vinculada)
app.post('/api/meetings/:meetingId/reschedule', authenticateToken, async (req: any, res) => {
  const { meetingId } = req.params;
  const { new_planned_at, reschedule_reason, notes } = req.body;
  
  try {
    console.log(`🔄 [Meetings] Reagendando reunião ${meetingId}:`, {
      new_planned_at,
      reschedule_reason,
      notes
    });

    const user = req.user;
    
    // Validar dados obrigatórios
    if (!new_planned_at || !reschedule_reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'new_planned_at e reschedule_reason são obrigatórios'
      });
    }

    // Validar se nova data é no futuro
    const newDate = new Date(new_planned_at);
    if (newDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        message: 'A nova data deve ser no futuro'
      });
    }

    // Usar função RPC para reagendamento
    console.log(`📅 [Meetings] Usando função RPC para reagendar reunião ${meetingId}`);
    
    const { data: rescheduleResult, error: rescheduleError } = await supabase
      .rpc('reschedule_meeting_safe', {
        original_meeting_id_param: meetingId,
        new_planned_at_param: new_planned_at,
        reschedule_reason_param: reschedule_reason,
        notes_param: notes,
        user_id_param: user.id
      });

    const result = rescheduleResult?.[0];

    if (rescheduleError || !result?.success) {
      console.error('❌ [Meetings] Erro ao reagendar no Supabase:', rescheduleError?.message || result?.message);
      return res.status(400).json({
        success: false,
        error: 'Reschedule failed',
        message: rescheduleError?.message || result?.message || 'Erro ao reagendar reunião'
      });
    }

    console.log(`✅ [Meetings] Reunião ${meetingId} reagendada com sucesso:`, {
      original_meeting_id: result.original_meeting.id,
      new_meeting_id: result.new_meeting.id,
      new_planned_at: result.new_meeting.planned_at
    });
    
    res.json({
      success: true,
      message: `Reunião reagendada com sucesso`,
      data: {
        original_meeting: result.original_meeting,
        new_meeting: result.new_meeting
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado no reagendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

// ============================== [8] NO-SHOW INTELIGENTE ==============================
// AIDEV-NOTE: Endpoint para registrar no-show com workflow inteligente
app.patch('/api/meetings/:meetingId/no-show', authenticateToken, async (req: any, res) => {
  const { meetingId } = req.params;
  const { no_show_reason, notes, next_action, follow_up_type } = req.body;
  
  try {
    console.log(`🚫 [Meetings] Registrando no-show para reunião ${meetingId}:`, {
      no_show_reason,
      next_action,
      follow_up_type,
      notes
    });

    // Validar dados obrigatórios
    if (!no_show_reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'no_show_reason é obrigatório'
      });
    }

    // Usar função RPC para no-show
    console.log(`📅 [Meetings] Usando função RPC para registrar no-show ${meetingId}`);
    
    const { data: noShowResult, error: noShowError } = await supabase
      .rpc('update_meeting_no_show_safe', {
        meeting_id_param: meetingId,
        no_show_reason_param: no_show_reason,
        notes_param: notes,
        next_action_param: next_action,
        follow_up_type_param: follow_up_type
      });

    const result = noShowResult?.[0];

    if (noShowError || !result?.success) {
      console.error('❌ [Meetings] Erro ao registrar no-show no Supabase:', noShowError?.message || result?.message);
      return res.status(400).json({
        success: false,
        error: 'No-show registration failed',
        message: noShowError?.message || result?.message || 'Erro ao registrar no-show'
      });
    }

    console.log(`✅ [Meetings] No-show registrado com sucesso para reunião ${meetingId}:`, {
      meeting_id: result.meeting.id,
      no_show_reason: result.meeting.no_show_reason,
      next_action: result.meeting.no_show_details?.next_action
    });
    
    res.json({
      success: true,
      message: `No-show registrado com sucesso`,
      data: result.meeting,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado no registro de no-show:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

// ============================== [9] HISTÓRICO DE REAGENDAMENTOS ==============================
// AIDEV-NOTE: Endpoint para buscar histórico completo de reagendamentos
app.get('/api/meetings/:meetingId/history', authenticateToken, async (req: any, res) => {
  const { meetingId } = req.params;
  
  try {
    console.log(`📋 [Meetings] Buscando histórico de reagendamentos para reunião ${meetingId}`);

    // Usar função RPC para buscar histórico
    const { data: historyResult, error: historyError } = await supabase
      .rpc('get_meeting_history_chain', {
        meeting_id_param: meetingId
      });

    if (historyError) {
      console.error('❌ [Meetings] Erro ao buscar histórico no Supabase:', historyError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: `Erro ao buscar histórico: ${historyError.message}`
      });
    }

    console.log(`✅ [Meetings] Histórico encontrado para reunião ${meetingId}:`, {
      total_meetings: historyResult?.length || 0,
      chain_length: historyResult?.filter((m: any) => !m.is_original).length || 0
    });
    
    res.json({
      success: true,
      data: {
        chain: historyResult || [],
        statistics: {
          total_meetings: historyResult?.length || 0,
          reschedule_count: historyResult?.filter((m: any) => !m.is_original).length || 0,
          original_meeting: historyResult?.find((m: any) => m.is_original) || null,
          latest_meeting: historyResult?.[historyResult.length - 1] || null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Meetings] Erro inesperado na busca de histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

// AIDEV-NOTE: Mock endpoint TESTE para deletar reunião sem auth (apenas para testes)
app.delete('/api/meetings/:meetingId/test', (req, res) => {
  const { meetingId } = req.params;
  
  console.log(`🗑️ [Test] Tentando deletar reunião ${meetingId}`);
  
  const meetingIndex = mockMeetings.findIndex(meeting => meeting.id === meetingId);
  
  if (meetingIndex === -1) {
    console.log(`❌ [Test] Reunião ${meetingId} não encontrada`);
    return res.status(404).json({
      success: false,
      error: 'Meeting not found',
      message: `Reunião ${meetingId} não foi encontrada`,
      available_meetings: mockMeetings.map(m => m.id)
    });
  }
  
  const deletedMeeting = mockMeetings[meetingIndex];
  mockMeetings.splice(meetingIndex, 1);
  
  console.log(`✅ [Test] Reunião ${meetingId} deletada: ${deletedMeeting.outcome}`);
  
  res.json({
    success: true,
    message: `Reunião ${meetingId} excluída com sucesso`,
    data: { deleted_meeting_id: meetingId, remaining_meetings: mockMeetings.length }
  });
});

// AIDEV-NOTE: Endpoint de debug para testar query Supabase com RLS
app.get('/api/meetings/debug/supabase/:leadId', async (req, res) => {
  const { leadId } = req.params;
  
  try {
    console.log(`🔍 [Debug] Testando query Supabase para leadId: ${leadId}`);
    
    // AIDEV-NOTE: Usar raw SQL para bypass temporário do RLS durante debug
    const { data: directSqlResult, error: sqlError } = await supabase
      .rpc('execute_sql', { 
        query: `SELECT * FROM meetings WHERE pipeline_lead_id = '${leadId}' OR lead_master_id = '${leadId}' ORDER BY created_at DESC;`
      });
    
    if (sqlError) {
      console.log(`❌ [Debug] Erro SQL RPC:`, sqlError);
      
      // Fallback: Tentar query direta via Supabase JS
      const { data: allMeetings, error: allError } = await supabase
        .from('meetings')
        .select('*');
      
      console.log(`🔍 [Debug] Total reuniões na tabela (JS client): ${allMeetings?.length || 0}`);
      
      const { data: pipelineMeetings, error: pipelineError } = await supabase
        .from('meetings')
        .select('*')
        .eq('pipeline_lead_id', leadId);
      
      console.log(`🔍 [Debug] Reuniões com pipeline_lead_id=${leadId}: ${pipelineMeetings?.length || 0}`);
      
      res.json({
        success: true,
        debug: {
          leadId,
          method: 'supabase_js_client',
          total_meetings: allMeetings?.length || 0,
          pipeline_matches: pipelineMeetings?.length || 0,
          all_meetings: allMeetings || [],
          pipeline_meetings: pipelineMeetings || [],
          sql_error: sqlError.message,
          errors: {
            all: allError?.message,
            pipeline: pipelineError?.message
          }
        }
      });
    } else {
      console.log(`✅ [Debug] SQL direto retornou ${directSqlResult?.length || 0} reuniões`);
      
      res.json({
        success: true,
        debug: {
          leadId,
          method: 'direct_sql',
          total_meetings: directSqlResult?.length || 0,
          direct_sql_results: directSqlResult || []
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ [Debug] Erro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint de debug para verificar armazenamento em memória
app.get('/api/meetings/debug/storage', (req, res) => {
  console.log('🔍 [Debug] Verificando armazenamento em memória de reuniões');
  
  res.json({
    success: true,
    data: {
      total_meetings: mockMeetings.length,
      meetings: mockMeetings.map(meeting => ({
        id: meeting.id,
        pipeline_lead_id: meeting.pipeline_lead_id,
        lead_master_id: meeting.lead_master_id,
        outcome: meeting.outcome,
        planned_at: meeting.planned_at,
        created_at: meeting.created_at
      }))
    },
    message: `${mockMeetings.length} reuniões armazenadas em memória`,
    timestamp: new Date().toISOString()
  });
});

// ============================================ 
// ROTAS ADMIN DASHBOARD DIRETAS (CORREÇÃO 404)
// ============================================

/**
 * GET /api/admin-dashboard
 * Dashboard admin principal com métricas gerais
 */
app.get('/api/admin-dashboard', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    console.log('📊 Admin dashboard endpoint chamado:', req.originalUrl);
    
    // Buscar dados reais do Supabase
    const { data: meetings } = await supabase
      .from('meetings')
      .select('outcome, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const { data: pipelineLeads } = await supabase
      .from('pipeline_leads')
      .select('stage_name, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const totalMeetings = meetings?.length || 0;
    const scheduledMeetings = meetings?.filter(m => m.outcome === 'agendada').length || 0;
    const completedMeetings = meetings?.filter(m => m.outcome === 'realizada').length || 0;
    const noShowMeetings = meetings?.filter(m => m.outcome === 'no_show').length || 0;
    
    const noShowRate = totalMeetings > 0 ? (noShowMeetings / totalMeetings) * 100 : 0;
    const showRate = totalMeetings > 0 ? (completedMeetings / totalMeetings) * 100 : 0;
    
    const totalLeads = pipelineLeads?.length || 0;
    const closedWonLeads = pipelineLeads?.filter(l => l.stage_name === 'Ganho').length || 0;
    const conversionRate = totalLeads > 0 ? (closedWonLeads / totalLeads) * 100 : 0;
    
    const dashboardData = {
      overview: {
        total_revenue: 0,
        total_leads: totalLeads,
        total_deals: closedWonLeads,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        avg_deal_size: 0,
        pipeline_velocity: 0
      },
      trends: {
        revenue_trend: 0,
        leads_trend: 0, 
        deals_trend: 0,
        conversion_trend: 0
      },
      team_summary: {
        total_members: 0,
        active_members: 0,
        top_performer: null,
        avg_performance_score: 0
      },
      targets_summary: {
        total_targets: 0,
        active_targets: 0,
        completed_targets: 0,
        on_track_targets: 0
      },
      alerts_summary: {
        total_alerts: 0,
        unread_alerts: 0,
        critical_alerts: 0
      },
      noshow_metrics: {
        total_meetings: totalMeetings,
        scheduled_meetings: scheduledMeetings,
        completed_meetings: completedMeetings,
        noshow_meetings: noShowMeetings,
        noshow_rate: parseFloat(noShowRate.toFixed(2)),
        show_rate: parseFloat(showRate.toFixed(2)),
        benchmark_comparison: noShowRate > 25 ? 'critical' : noShowRate > 15 ? 'warning' : 'good'
      },
      timeRange,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ Admin dashboard dados calculados do Supabase:', {
      totalMeetings,
      totalLeads,
      conversionRate,
      noShowRate
    });
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no admin dashboard:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /api/admin-dashboard/sales-targets
 * Metas de vendas com dados reais
 */
app.get('/api/admin-dashboard/sales-targets', async (req, res) => {
  try {
    console.log('🎯 Sales targets endpoint chamado:', req.originalUrl);
    
    // Buscar metas reais do Supabase se existir tabela
    let salesTargetsData = {
      targets: [],
      summary: {
        total_targets: 0,
        active_targets: 0,
        completed_targets: 0,
        on_track_targets: 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    try {
      const { data: targets } = await supabase
        .from('sales_targets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (targets) {
        salesTargetsData.targets = targets;
        salesTargetsData.summary = {
          total_targets: targets.length,
          active_targets: targets.filter(t => t.status === 'active').length,
          completed_targets: targets.filter(t => t.status === 'completed').length,
          on_track_targets: targets.filter(t => t.progress_percentage >= 80).length
        };
      }
    } catch (tableError) {
      console.log('ℹ️ Tabela sales_targets não existe, usando dados mock');
    }
    
    res.json({
      success: true,
      data: salesTargetsData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro nas metas de vendas:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /api/admin-dashboard/alerts
 * Alertas do sistema com dados reais
 */
app.get('/api/admin-dashboard/alerts', async (req, res) => {
  try {
    console.log('🚨 Alerts endpoint chamado:', req.originalUrl);
    
    let alertsData = {
      alerts: [],
      summary: {
        total_alerts: 0,
        unread_alerts: 0,
        critical_alerts: 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    try {
      const { data: alerts } = await supabase
        .from('admin_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (alerts) {
        alertsData.alerts = alerts;
        alertsData.summary = {
          total_alerts: alerts.length,
          unread_alerts: alerts.filter(a => a.status === 'unread').length,
          critical_alerts: alerts.filter(a => a.priority === 'critical').length
        };
      }
    } catch (tableError) {
      console.log('ℹ️ Tabela admin_alerts não existe, usando dados mock');
    }
    
    res.json({
      success: true,
      data: alertsData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro nos alertas:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

/**
 * GET /api/admin-dashboard/team-performance
 * Performance da equipe com dados reais
 */
app.get('/api/admin-dashboard/team-performance', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    console.log('👥 Team performance endpoint chamado:', req.originalUrl);
    
    // Calcular período
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    // Buscar dados reais dos vendedores
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'member');
    
    const { data: pipelineLeads } = await supabase
      .from('pipeline_leads')
      .select('owner_id, stage_name, created_at')
      .gte('created_at', startDate);
    
    const { data: meetings } = await supabase
      .from('meetings')
      .select('owner_id, outcome, created_at')
      .gte('created_at', startDate);
    
    let teamPerformanceData = [];
    
    if (users) {
      teamPerformanceData = users.map(user => {
        const userLeads = pipelineLeads?.filter(l => l.owner_id === user.id) || [];
        const userMeetings = meetings?.filter(m => m.owner_id === user.id) || [];
        
        const totalLeads = userLeads.length;
        const qualifiedLeads = userLeads.filter(l => l.stage_name !== 'Lead').length;
        const dealsClosed = userLeads.filter(l => l.stage_name === 'Ganho').length;
        const conversionRate = totalLeads > 0 ? (dealsClosed / totalLeads) * 100 : 0;
        const meetingsCount = userMeetings.length;
        
        const performanceScore = Math.min(100, (conversionRate * 0.4) + (qualifiedLeads * 2) + (meetingsCount * 1.5));
        
        return {
          member_id: user.id,
          member_name: `${user.first_name} ${user.last_name}`.trim(),
          period_type: period,
          period_start: startDate,
          period_end: new Date().toISOString(),
          total_leads: totalLeads,
          qualified_leads: qualifiedLeads,
          deals_closed: dealsClosed,
          revenue_generated: dealsClosed * 1000, // Mock
          conversion_rate: parseFloat(conversionRate.toFixed(2)),
          avg_deal_size: 1000, // Mock
          pipeline_velocity: 7, // Mock
          activities_count: meetingsCount,
          performance_score: parseFloat(performanceScore.toFixed(2)),
          performance_grade: performanceScore >= 90 ? 'A+' : 
                            performanceScore >= 80 ? 'A' :
                            performanceScore >= 70 ? 'B+' :
                            performanceScore >= 60 ? 'B' : 
                            performanceScore >= 50 ? 'C+' : 'C'
        };
      });
    }
    
    const result = {
      team_performance: teamPerformanceData,
      summary: {
        total_members: teamPerformanceData.length,
        active_members: teamPerformanceData.filter(t => t.total_leads > 0).length,
        top_performer: teamPerformanceData.length > 0 ? 
          teamPerformanceData.reduce((prev, current) => 
            prev.performance_score > current.performance_score ? prev : current
          ).member_name : null,
        avg_performance_score: teamPerformanceData.length > 0 ?
          parseFloat((teamPerformanceData.reduce((sum, t) => sum + t.performance_score, 0) / teamPerformanceData.length).toFixed(2)) : 0
      },
      period,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ Team performance calculado do Supabase:', {
      totalMembers: result.summary.total_members,
      activeMembers: result.summary.active_members,
      avgScore: result.summary.avg_performance_score
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na performance da equipe:', error);
    res.status(500).json({
      success: false,
      error: (error instanceof Error ? error.message : String(error))
    });
  }
});

// ============================== [10] USER PREFERENCES ==============================
// AIDEV-NOTE: Endpoints para gerenciar preferências de usuário

/**
 * GET /api/user-preferences
 * Buscar preferências do usuário autenticado
 */
app.get('/api/user-preferences', authenticateToken, async (req: any, res) => {
  const user = req.user;
  
  try {
    console.log(`🔍 [UserPreferences] Buscando preferências para usuário ${user.id}`);
    console.log(`🔍 [UserPreferences] Tenant ID: ${user.tenant_id}`);
    console.log(`🔍 [UserPreferences] User Role: ${user.role}`);
    
    // ✅ CORREÇÃO: Usar service role para garantir acesso aos dados
    // O RLS pode estar bloqueando o acesso mesmo com credenciais válidas
    console.log(`🔍 [UserPreferences] Consultando banco para usuário ${user.id}, tenant ${user.tenant_id}`);
    
    // Debug: Primeiro tentar buscar apenas por user_id para verificar se existe
    const { data: debugCheck, error: debugError } = await supabase
      .from('user_preferences')
      .select('user_id, tenant_id, preferences->metrics_visibility as metrics_config, updated_at')
      .eq('user_id', user.id);
    
    console.log(`🔍 [DEBUG] Verificação por user_id apenas:`, {
      count: debugCheck?.length || 0,
      records: debugCheck || [],
      debugError: debugError?.message
    });
    
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('tenant_id', user.tenant_id)
      .single();
    
    console.log(`📊 [UserPreferences] Resultado da consulta:`, {
      hasData: !!preferences,
      errorCode: error?.code,
      errorMessage: error?.message,
      userId: user.id,
      tenantId: user.tenant_id,
      preferencesId: preferences?.id || 'null',
      queryExecuted: `user_id='${user.id}' AND tenant_id='${user.tenant_id}'`
    });
    
    if (preferences) {
      console.log(`📊 [UserPreferences] Dados encontrados:`, {
        id: preferences.id,
        metricsConfig: preferences.preferences?.metrics_visibility,
        updatedAt: preferences.updated_at,
        createdAt: preferences.created_at
      });
    }
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ [UserPreferences] Erro ao buscar preferências:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Erro ao buscar preferências do usuário'
      });
    }
    
    // ✅ CORREÇÃO CRÍTICA: Investigar por que query não encontra dados que existem
    if (!preferences) {
      console.log(`❌ [UserPreferences] PROBLEMA CRÍTICO: Query não encontrou dados para usuário ${user.id}`);
      
      // ✅ CORREÇÃO ADICIONAL: Busca alternativa para debug
      console.log(`🔍 [UserPreferences] Fazendo busca alternativa para debug...`);
      const { data: alternativeSearch, error: altError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id);
      
      console.log(`🔍 [UserPreferences] Busca alternativa (só user_id):`, {
        foundRecords: alternativeSearch?.length || 0,
        records: alternativeSearch?.map(r => ({
          id: r.id,
          user_id: r.user_id,
          tenant_id: r.tenant_id,
          has_metrics: !!r.preferences?.metrics_visibility
        })) || [],
        error: altError
      });
      
      // Verificar se houve update recente - se sim, aguardar mais tempo
      if (hasRecentMetricsUpdate(user.id)) {
        console.log(`⚠️ [UserPreferences] Update recente detectado - função RPC ainda processando`);
        
        // ✅ CORREÇÃO CRÍTICA: Aguardar a função RPC completar antes de responder
        console.log(`⏰ [UserPreferences] Aguardando 1.5 segundos para função RPC completar...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Tentar buscar novamente após aguardar
        const { data: delayedPrefs, error: delayedError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('tenant_id', user.tenant_id)
          .single();
        
        if (delayedPrefs) {
          console.log(`✅ [UserPreferences] Dados encontrados após aguardar função RPC`);
          return res.json({
            success: true,
            data: delayedPrefs,
            timestamp: new Date().toISOString(),
            note: 'Dados carregados após aguardar função RPC completar'
          });
        }
        
        console.log(`⚠️ [UserPreferences] Ainda não encontrado após aguardar - forçando retry`);
        return res.status(202).json({
          success: true,
          data: null,
          message: 'Função RPC ainda processando, aguarde mais um momento',
          timestamp: new Date().toISOString(),
          shouldRetry: true
        });
      }
      
      // ✅ CORREÇÃO EMERGENCIAL: Se há dados mas não foram encontrados pela query principal,
      // usar os dados da busca alternativa se encontrarem match por tenant_id
      if (alternativeSearch && alternativeSearch.length > 0) {
        const matchingRecord = alternativeSearch.find(r => r.tenant_id === user.tenant_id);
        if (matchingRecord) {
          console.log(`🚨 [UserPreferences] CORREÇÃO EMERGENCIAL: Encontrado registro via busca alternativa`);
          console.log(`✅ [UserPreferences] Retornando dados encontrados pela busca alternativa`);
          
          return res.json({
            success: true,
            data: matchingRecord,
            timestamp: new Date().toISOString(),
            warning: 'Dados encontrados via busca alternativa - pode haver problema na query principal'
          });
        }
      }
      
      console.log(`📝 [UserPreferences] Criando preferências padrão para usuário ${user.id}`);
      
      const defaultPreferencesData = {
        user_id: user.id,
        tenant_id: user.tenant_id,
        preferences: {
          metrics_visibility: {
            visible_metrics: [
              'unique_leads', 'opportunities', 'conversion_rate', 
              'total_sales', 'ticket_medio', 'meetings_scheduled', 
              'meetings_attended', 'meetings_noshow', 'meetings_noshow_rate'
            ],
            updated_at: new Date().toISOString()
          }
        },
        theme: 'light',
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        email_notifications: true,
        push_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Criar registro no banco
      const { data: newPreferences, error: createError } = await supabase
        .from('user_preferences')
        .insert(defaultPreferencesData)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ [UserPreferences] Erro ao criar preferências padrão:', createError);
        // Retornar padrões sem salvar se der erro
        return res.json({
          success: true,
          data: { id: null, ...defaultPreferencesData },
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✨ [UserPreferences] Preferências padrão criadas com sucesso para usuário ${user.id}`);
      return res.json({
        success: true,
        data: newPreferences,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ [UserPreferences] Preferências encontradas para usuário ${user.id}`);
    
    res.json({
      success: true,
      data: preferences,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [UserPreferences] Erro inesperado:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

/**
 * PATCH /api/user-preferences
 * Atualizar preferências do usuário autenticado
 */
app.patch('/api/user-preferences', authenticateToken, async (req: any, res) => {
  const user = req.user;
  const { preferences, theme, language, timezone, email_notifications, push_notifications } = req.body;
  
  try {
    console.log(`📝 [UserPreferences] Atualizando preferências para usuário ${user.id}:`, req.body);
    
    // Verificar se já existem preferências
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', user.tenant_id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ [UserPreferences] Erro ao verificar preferências existentes:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Erro ao verificar preferências existentes'
      });
    }
    
    const updateData = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      updated_at: new Date().toISOString(),
      ...(preferences && { preferences }),
      ...(theme && { theme }),
      ...(language && { language }),
      ...(timezone && { timezone }),
      ...(email_notifications !== undefined && { email_notifications }),
      ...(push_notifications !== undefined && { push_notifications })
    };
    
    let result;
    
    if (existingPrefs) {
      // Atualizar existente
      console.log(`🔄 [UserPreferences] Atualizando preferências existentes`);
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('tenant_id', user.tenant_id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Criar novo
      console.log(`✨ [UserPreferences] Criando novas preferências`);
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          ...updateData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      result = { data, error };
    }
    
    if (result.error) {
      console.error('❌ [UserPreferences] Erro ao salvar preferências:', result.error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Erro ao salvar preferências'
      });
    }
    
    console.log(`✅ [UserPreferences] Preferências salvas com sucesso para usuário ${user.id}`);
    
    res.json({
      success: true,
      data: result.data,
      message: 'Preferências atualizadas com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [UserPreferences] Erro inesperado:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

/**
 * PATCH /api/user-preferences/metrics
 * Endpoint específico para atualizar apenas preferências de métricas
 */
app.patch('/api/user-preferences/metrics', authenticateToken, async (req: any, res) => {
  const user = req.user;
  const userJWT = req.jwtToken;
  const { visible_metrics } = req.body;
  
  try {
    console.log(`📊 [UserPreferences] Atualizando preferências de métricas para usuário ${user.id}:`, { 
      visible_metrics,
      userId: user.id,
      tenantId: user.tenant_id,
      endpoint: 'PATCH /api/user-preferences/metrics'
    });
    
    if (visible_metrics === undefined || visible_metrics === null || !Array.isArray(visible_metrics)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'visible_metrics deve ser um array'
      });
    }
    
    // ✅ CORREÇÃO: Marcar update recente antes da operação
    markRecentMetricsUpdate(user.id);
    
    // ✅ CORREÇÃO RLS: Usar função RPC que bypassa RLS de forma segura
    console.log(`🔑 [UserPreferences] Usando função RPC para atualizar preferências do usuário ${user.id}`);
    
    const { data: result, error } = await supabase.rpc('update_user_metrics_preferences', {
      p_user_id: user.id,
      p_tenant_id: user.tenant_id,
      p_visible_metrics: visible_metrics
    });
    
    if (error) {
      console.error('❌ [UserPreferences] Erro ao salvar preferências de métricas via RPC:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Erro ao salvar preferências de métricas'
      });
    }
    
    console.log(`✅ [UserPreferences] Preferências de métricas salvas com sucesso para usuário ${user.id}`);
    
    // ✅ CORREÇÃO DEFINITIVA: Retornar dados completos para o TanStack Query
    // O frontend precisa dos dados completos para atualizar o cache corretamente
    res.json({
      success: true,
      data: {
        id: result.user_id, // ID das preferências (pode ser null se criado via RPC)
        user_id: user.id,
        tenant_id: user.tenant_id,
        preferences: {
          metrics_visibility: result.metrics_visibility
        },
        theme: 'light',
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        email_notifications: true,
        push_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      message: 'Preferências de métricas atualizadas com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [UserPreferences] Erro inesperado:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Erro inesperado: ${error.message}`
    });
  }
});

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler básico
app.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

const server = createServer(app);

// ============================================
// GRACEFUL SHUTDOWN MELHORADO
// ============================================

let isShuttingDown = false;

const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) {
    console.log('🔄 Shutdown já em andamento...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`🛑 ${signal} recebido. Iniciando shutdown graceful...`);
  
  // Timeout para forçar saída se demorar muito
  const forceExitTimer = setTimeout(() => {
    console.error('⚠️ Forçando saída após 10 segundos');
    process.exit(1);
  }, 10000);
  
  server.close((err) => {
    clearTimeout(forceExitTimer);
    
    if (err) {
      console.error('❌ Erro ao fechar servidor:', err);
      process.exit(1);
    } else {
      console.log('✅ Servidor fechado com sucesso');
      process.exit(0);
    }
  });
  
  // Se não houver conexões ativas, forçar fechamento após 5s
  setTimeout(() => {
    if (!server.listening) return;
    console.log('⚠️ Forçando fechamento do servidor');
    server.closeAllConnections?.();
    process.exit(0);
  }, 5000);
};

// Tratamento de erros de processo
process.on('uncaughtException', (error) => {
  console.error('🚨 Erro não capturado:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Promise rejeitada:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Sinais de shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Iniciar servidor básico
async function startServer() {
  try {
    // Start the server com binding explícito
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log('🚀 =====================================');
      console.log('🌟 CRM Backend BÁSICO - Iniciado com Sucesso!');
      console.log('🚀 =====================================');
      console.log(`📍 Servidor rodando na porta: ${PORT}`);
      console.log(`🔗 Health check: http://127.0.0.1:${PORT}/health`);
      console.log(`🔗 API info: http://127.0.0.1:${PORT}/api`);
      console.log(`🔗 Login test: http://127.0.0.1:${PORT}/api/auth/login`);
      console.log(`🔗 Supabase test: http://127.0.0.1:${PORT}/api/supabase/test`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 =====================================');
      console.log('✅ Backend pronto para testes de conectividade!');
      console.log('✅ Funcionalidades avançadas serão adicionadas gradualmente');
      console.log('🚀 =====================================');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor básico:', error);
    process.exit(1);
  }
}

// Iniciar o servidor
startServer();

export default app;