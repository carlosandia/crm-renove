
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc2NDAwOSwiZXhwIjoyMDY1MzQwMDA5fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

// ⚠️ ATENÇÃO: Esta service role key está inválida!
// Você precisa obter a chave correta do painel do Supabase
console.log('⚠️ AVISO: Service Role Key pode estar inválida. Verifique no painel do Supabase.');

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177', 
    'http://localhost:8080',
    'https://id-preview--0ff8b3f5-78cd-49a2-84cb-a1011762c09d.lovable.app',
    /https:\/\/.*\.lovable\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota de teste
app.get('/', (req, res) => {
  res.json({
    message: 'CRM Backend está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rota para testar conexão com Supabase
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      message: 'Conexão com Supabase OK',
      data
    });
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao conectar com Supabase',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rotas da API
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import customersRoutes from './routes/customers';
import companiesRoutes from './routes/companies';
import integrationsRoutes from './routes/integrations';
import vendedoresRoutes from './routes/vendedores';
import salesGoalsRoutes from './routes/sales-goals';
import pipelinesRoutes from './routes/pipelines';

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/sales-goals', salesGoalsRoutes);
app.use('/api/pipelines', pipelinesRoutes);

// Middleware de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Algo deu errado!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💾 Supabase conectado: ${supabaseUrl}`);
});
