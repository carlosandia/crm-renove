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

// Rota para listar tabelas
router.get('/tables', mcpMiddleware.listTables);

// Rotas para operações CRUD avançadas
router.put('/update', mcpMiddleware.updateRecord);
router.delete('/delete', mcpMiddleware.deleteRecord);
router.get('/structure/:table', mcpMiddleware.getTableStructure);

// Rota de status/health check
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'MCP Integration está funcionando',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        endpoints: [
            'GET /api/mcp/users',
            'POST /api/mcp/users',
            'GET /api/mcp/companies',
            'POST /api/mcp/companies',
            'GET /api/mcp/leads',
            'POST /api/mcp/leads',
            'GET /api/mcp/dashboard/:tenantId',
            'POST /api/mcp/query',
            'GET /api/mcp/tables',
            'PUT /api/mcp/update',
            'DELETE /api/mcp/delete',
            'GET /api/mcp/structure/:table',
            'GET /api/mcp/status'
        ]
    });
});

export default router; 