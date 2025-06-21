import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Importar rotas
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import customersRoutes from './routes/customers';
import pipelinesRoutes from './routes/pipelines';
import vendedoresRoutes from './routes/vendedores';
import salesGoalsRoutes from './routes/sales-goals';
import integrationsRoutes from './routes/integrations';
import integrationsSecureRoutes from './routes/integrations-secure';
import conversionsRoutes from './routes/conversions';
import companiesRoutes from './routes/companies';
import databaseRoutes from './routes/database';
import healthRoutes from './routes/health';
import setupRoutes from './routes/setup';
import mcpRoutes from './routes/mcp';
import analyticsRoutes from './routes/analytics';
import formsRoutes from './routes/forms';
import leadTasksRoutes from './routes/leadTasks';
import cadenceRoutes from './routes/cadence';

// Middleware de autenticação
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { validateRequest } from './middleware/validation';
import { rateLimiter } from './middleware/rateLimiter';

// Configurar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================

// Helmet para headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://marajvabdwkpgopytvhh.supabase.co"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configurado de forma segura
app.use(cors({
  origin: function (origin, callback) {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:8081', 
      'http://localhost:8082',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Permitir requests sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Rate limiting
app.use(rateLimiter);

// Logging de requests
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400 // Log apenas erros em produção
}));

// Parse JSON com limite de tamanho
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Verificar integridade do JSON
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('JSON inválido');
    }
  }
}));

// Parse URL encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// MIDDLEWARE CUSTOMIZADO
// ============================================

// Adicionar timestamp a todas as requests
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Health check básico (sem autenticação)
app.use('/health', healthRoutes);

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'CRM Marketing API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ============================================

// Rotas de autenticação (login, registro)
app.use('/api/auth', authRoutes);

// Setup inicial do sistema
app.use('/api/setup', setupRoutes);

// Teste de cadência (sem autenticação para debug)
app.post('/api/cadence/test-public', async (req, res) => {
  try {
    res.json({
      message: 'API de cadência funcionando',
      status: 'OK',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Erro no teste'
    });
  }
});

// Webhooks (com autenticação própria)
app.use('/api/webhooks', integrationsRoutes);

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================

// Aplicar autenticação para todas as rotas /api/* (exceto as acima)
app.use('/api', authMiddleware);

// ============================================
// ROTAS PROTEGIDAS (COM AUTENTICAÇÃO)
// ============================================

// Gestão de usuários
app.use('/api/users', usersRoutes);
app.use('/api/vendedores', vendedoresRoutes);

// CRM Core
app.use('/api/customers', customersRoutes);
app.use('/api/pipelines', pipelinesRoutes);
// app.use('/api/leads', leadsRoutes); // TODO: Implementar quando estiver pronto
app.use('/api/sales-goals', salesGoalsRoutes);

// Formulários
app.use('/api/forms', formsRoutes);

// Tarefas de Leads
app.use('/api/lead-tasks', leadTasksRoutes);

// Cadência de Leads
app.use('/api/cadence', cadenceRoutes);

// Integrações
app.use('/api/integrations', integrationsRoutes);
app.use('/api/integrations-secure', integrationsSecureRoutes);
app.use('/api/conversions', conversionsRoutes);

// Gestão de empresas
app.use('/api/companies', companiesRoutes);

// Banco de dados e admin
app.use('/api/database', databaseRoutes);

// MCP Integration
app.use('/api/mcp', mcpRoutes);

// ============================================
// ANALYTICS
// ============================================
app.use('/api/analytics', analyticsRoutes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// Rota não encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler global
app.use(errorHandler);

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

const server = createServer(app);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM recebido, fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT recebido, fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    process.exit(0);
  });
});

// Error handling não capturado
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`
🚀 ===================================
📡 CRM Marketing API Server
📍 Porta: ${PORT}
🌍 Ambiente: ${process.env.NODE_ENV || 'development'}
📅 Iniciado: ${new Date().toISOString()}
🔒 Segurança: Ativada
📊 Monitoramento: Ativo
===================================
  `);
});

export default app;
