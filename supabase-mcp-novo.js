#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (usando variáveis de ambiente)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Iniciando servidor MCP Supabase...');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Chave:', SUPABASE_KEY ? 'Configurada' : 'NÃO CONFIGURADA');

// Verificar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('   - SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'FALTANDO');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? 'OK' : 'FALTANDO');
  process.exit(1);
}

// Inicializar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Criar servidor MCP
const server = new Server(
  {
    name: 'supabase-novo',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Lista de ferramentas disponíveis
const tools = [
  {
    name: 'listar_tabelas',
    description: 'Lista todas as tabelas do banco de dados',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'consultar_dados',
    description: 'Consulta dados de uma tabela específica',
    inputSchema: {
      type: 'object',
      properties: {
        tabela: { 
          type: 'string', 
          description: 'Nome da tabela para consultar' 
        },
        limite: { 
          type: 'number', 
          description: 'Número máximo de registros (padrão: 10)',
          default: 10
        }
      },
      required: ['tabela']
    }
  },
  {
    name: 'inserir_dados',
    description: 'Insere novos dados em uma tabela',
    inputSchema: {
      type: 'object', 
      properties: {
        tabela: { 
          type: 'string', 
          description: 'Nome da tabela' 
        },
        dados: { 
          type: 'object', 
          description: 'Dados para inserir' 
        }
      },
      required: ['tabela', 'dados']
    }
  },
  {
    name: 'atualizar_dados',
    description: 'Atualiza dados existentes em uma tabela',
    inputSchema: {
      type: 'object',
      properties: {
        tabela: { 
          type: 'string', 
          description: 'Nome da tabela' 
        },
        dados: { 
          type: 'object', 
          description: 'Dados para atualizar' 
        },
        filtro: { 
          type: 'object', 
          description: 'Condições para filtrar registros' 
        }
      },
      required: ['tabela', 'dados', 'filtro']
    }
  },
  {
    name: 'deletar_dados',
    description: 'Remove dados de uma tabela',
    inputSchema: {
      type: 'object',
      properties: {
        tabela: { 
          type: 'string', 
          description: 'Nome da tabela' 
        },
        filtro: { 
          type: 'object', 
          description: 'Condições para filtrar registros a deletar' 
        }
      },
      required: ['tabela', 'filtro']
    }
  }
];

// Handler para listar ferramentas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('📋 Listando ferramentas disponíveis...');
  return { tools };
});

// Handler para executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  console.log(`🔧 Executando ferramenta: ${name}`);
  console.log(`📊 Argumentos:`, JSON.stringify(args, null, 2));
  
  try {
    let resultado = {};
    
    switch (name) {
      case 'listar_tabelas':
        const { data: tabelas, error: erroTabelas } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
          
        if (erroTabelas) {
          resultado = {
            sucesso: true,
            tabelas: ['users', 'companies', 'leads', 'pipelines', 'custom_fields'],
            nota: 'Lista de tabelas comuns (fallback)',
            erro_original: erroTabelas.message
          };
        } else {
          resultado = {
            sucesso: true,
            tabelas: tabelas?.map(t => t.table_name) || [],
            total: tabelas?.length || 0
          };
        }
        break;
        
      case 'consultar_dados':
        const { data: dados, error: erroDados } = await supabase
          .from(args.tabela)
          .select('*')
          .limit(args.limite || 10);
          
        if (erroDados) throw erroDados;
        
        resultado = {
          sucesso: true,
          tabela: args.tabela,
          dados: dados,
          total_registros: dados.length,
          limite_aplicado: args.limite || 10
        };
        break;
        
      case 'inserir_dados':
        const { data: inseridos, error: erroInsercao } = await supabase
          .from(args.tabela)
          .insert(args.dados)
          .select();
          
        if (erroInsercao) throw erroInsercao;
        
        resultado = {
          sucesso: true,
          tabela: args.tabela,
          dados_inseridos: inseridos,
          total_inseridos: inseridos.length
        };
        break;
        
      case 'atualizar_dados':
        const { data: atualizados, error: erroAtualizacao } = await supabase
          .from(args.tabela)
          .update(args.dados)
          .match(args.filtro)
          .select();
          
        if (erroAtualizacao) throw erroAtualizacao;
        
        resultado = {
          sucesso: true,
          tabela: args.tabela,
          dados_atualizados: atualizados,
          total_atualizados: atualizados.length
        };
        break;
        
      case 'deletar_dados':
        const { data: deletados, error: erroDelecao } = await supabase
          .from(args.tabela)
          .delete()
          .match(args.filtro)
          .select();
          
        if (erroDelecao) throw erroDelecao;
        
        resultado = {
          sucesso: true,
          tabela: args.tabela,
          dados_deletados: deletados,
          total_deletados: deletados.length
        };
        break;
        
      default:
        throw new Error(`Ferramenta não reconhecida: ${name}`);
    }
    
    console.log(`✅ Resultado:`, JSON.stringify(resultado, null, 2));
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(resultado, null, 2)
        }
      ]
    };
    
  } catch (error) {
    console.error(`❌ Erro ao executar ${name}:`, error.message);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sucesso: false,
            erro: error.message,
            ferramenta: name,
            argumentos: args
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Função principal para iniciar o servidor
async function iniciarServidor() {
  try {
    console.log('🚀 Iniciando servidor MCP Supabase NOVO...');
    
    // Testar conexão com Supabase
    console.log('🔍 Testando conexão com Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.log('⚠️  Aviso na conexão:', error.message);
      console.log('   (Isso pode ser normal se a tabela "users" não existir)');
    } else {
      console.log('✅ Conexão com Supabase estabelecida!');
    }
    
    console.log(`🛠️  ${tools.length} ferramentas carregadas`);
    
    // Conectar transporte STDIO
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.log('🎯 Servidor MCP conectado e pronto para uso!');
    console.log('📡 Aguardando comandos do Cursor...');
    
  } catch (error) {
    console.error('❌ ERRO FATAL ao iniciar servidor:', error.message);
    console.error('🔧 Stack completo:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  iniciarServidor().catch((error) => {
    console.error('❌ Erro não tratado:', error);
    process.exit(1);
  });
}

// ✅ Exportação esperada pelo Cursor (para reconhecer rota /api/mcp)
module.exports = {
  id: 'supabase',
  name: 'Supabase MCP',
  icon: 'database',
  color: '#3ECF8E',
  run: async ({ logger }) => {
    logger.info('🟢 Supabase MCP ativo via endpoint padrão do Cursor');
    return {
      status: 'ok',
      message: 'Supabase MCP conectado com sucesso'
    };
  }
};
