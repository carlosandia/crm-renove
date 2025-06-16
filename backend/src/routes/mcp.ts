import { Router, Request, Response } from 'express';
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

// GET /api/mcp/tools
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const tools = [
      {
        name: 'execute_sql',
        description: 'Execute SQL queries on Supabase database',
        parameters: {
          query: 'string',
          params: 'array (optional)'
        }
      },
      {
        name: 'create_user',
        description: 'Create a new user in the system',
        parameters: {
          email: 'string',
          first_name: 'string',
          last_name: 'string',
          role: 'string',
          tenant_id: 'string'
        }
      },
      {
        name: 'create_pipeline',
        description: 'Create a new sales pipeline',
        parameters: {
          name: 'string',
          description: 'string',
          tenant_id: 'string',
          created_by: 'string'
        }
      }
    ]

    return res.json({
      tools,
      total: tools.length,
      server_info: {
        name: 'CRM Marketing MCP Server',
        version: '1.0.0'
      }
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao listar ferramentas MCP',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

// POST /api/mcp/execute
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { toolName, params } = req.body

    if (!toolName) {
      return res.status(400).json({
        error: 'toolName é obrigatório'
      })
    }

    // Aqui você pode implementar a lógica de execução das ferramentas MCP
    // Por enquanto, retornamos uma resposta de exemplo
    return res.json({
      message: `Ferramenta ${toolName} executada com sucesso`,
      toolName,
      params,
      result: 'Implementação pendente',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao executar ferramenta MCP',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
})

export default router; 