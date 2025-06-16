import { Router } from 'express';
import { mcpMiddleware } from '../mcp-integration';

const router = Router();

// Rotas para usuários
router.get('/users', mcpMiddleware.getUsers);
router.post('/users', mcpMiddleware.createUser);

// Rotas para empresas
router.get('/companies', mcpMiddleware.getCompanies);
router.post('/companies', mcpMiddleware.createCompany);

// Rotas para leads
router.get('/leads', mcpMiddleware.getLeads);
router.post('/leads', mcpMiddleware.createLead);

// Rota para dashboard
router.get('/dashboard/:tenantId', mcpMiddleware.getDashboard);

// Rota para queries personalizadas
router.post('/query', mcpMiddleware.executeQuery);

// Rota de status/health check
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'MCP Integration está funcionando',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

export default router; 