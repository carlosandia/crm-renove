#!/usr/bin/env node

/**
 * 🛠️ SUPABASE CLI TOOL
 * Ferramenta de linha de comando para operações Supabase
 * 
 * Uso:
 * node scripts/supabase-cli.js <comando> [opções]
 * 
 * Comandos disponíveis:
 * - status          : Verificar status da conexão
 * - tables          : Listar todas as tabelas  
 * - select <table>  : Buscar dados de uma tabela
 * - insert <table>  : Inserir dados em uma tabela
 * - sql <query>     : Executar SQL personalizado
 * - migrate <file>  : Executar arquivo de migração
 * - backup <table>  : Fazer backup de uma tabela
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuração
const API_BASE = 'http://localhost:3001/api/admin';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.cyan}📊 ${msg}${colors.reset}`)
};

// Funções utilitárias
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.data.error || error.response.statusText}`);
    } else {
      throw new Error(`Network Error: ${error.message}`);
    }
  }
}

// Comandos
const commands = {
  // Verificar status da conexão
  async status() {
    log.info('Verificando status da conexão...');
    
    try {
      const result = await makeRequest('/utils/status');
      
      if (result.connected) {
        log.success('Conexão com Supabase estabelecida!');
        log.data(`Database: ${result.database}`);
        log.data(`User: ${result.user}`);
        log.data(`Timestamp: ${result.timestamp}`);
        log.data(`Project ID: ${result.config.projectId}`);
      } else {
        log.error('Falha na conexão com Supabase');
        log.error(result.error);
      }
    } catch (error) {
      log.error(`Erro ao verificar status: ${error.message}`);
    }
  },

  // Listar tabelas
  async tables() {
    log.info('Listando tabelas do banco...');
    
    try {
      const result = await makeRequest('/utils/tables');
      
      log.success(`Encontradas ${result.count} tabelas:`);
      result.data.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table}`);
      });
    } catch (error) {
      log.error(`Erro ao listar tabelas: ${error.message}`);
    }
  },

  // Buscar dados de uma tabela
  async select(table, options = {}) {
    if (!table) {
      log.error('Nome da tabela é obrigatório');
      return;
    }

    log.info(`Buscando dados da tabela: ${table}`);
    
    try {
      let endpoint = `/crud/select/${table}`;
      
      // Adicionar parâmetros de query se fornecidos
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.orderBy) params.append('orderBy', options.orderBy);
      if (options.select) params.append('select', options.select);
      
      if (params.toString()) {
        endpoint += '?' + params.toString();
      }

      const result = await makeRequest(endpoint);
      
      log.success(`Encontrados ${result.count} registros:`);
      
      if (result.count > 0) {
        console.table(result.data.slice(0, 10)); // Mostrar apenas os primeiros 10
        
        if (result.count > 10) {
          log.info(`Mostrando apenas os primeiros 10 de ${result.count} registros`);
        }
      }
    } catch (error) {
      log.error(`Erro ao buscar dados: ${error.message}`);
    }
  },

  // Inserir dados em uma tabela
  async insert(table, data) {
    if (!table || !data) {
      log.error('Nome da tabela e dados são obrigatórios');
      return;
    }

    log.info(`Inserindo dados na tabela: ${table}`);
    
    try {
      let insertData;
      
      if (typeof data === 'string') {
        try {
          insertData = JSON.parse(data);
        } catch {
          log.error('Dados devem estar em formato JSON válido');
          return;
        }
      } else {
        insertData = data;
      }

      const result = await makeRequest('/crud/insert', 'POST', {
        table,
        data: insertData
      });
      
      log.success(`Dados inseridos com sucesso!`);
      log.data(`Registros inseridos: ${result.count}`);
      console.table(result.data);
    } catch (error) {
      log.error(`Erro ao inserir dados: ${error.message}`);
    }
  },

  // Executar SQL personalizado
  async sql(query) {
    if (!query) {
      log.error('Query SQL é obrigatória');
      return;
    }

    log.info('Executando query SQL...');
    log.data(`Query: ${query}`);
    
    try {
      const isSelect = query.toLowerCase().trim().startsWith('select');
      const endpoint = isSelect ? '/sql/select' : '/sql/execute';
      
      const result = await makeRequest(endpoint, 'POST', { query });
      
      if (isSelect) {
        log.success(`Query executada! Encontrados ${result.count} registros:`);
        if (result.data.length > 0) {
          console.table(result.data.slice(0, 20)); // Mostrar apenas os primeiros 20
        }
      } else {
        log.success('Query executada com sucesso!');
        if (result.data) {
          console.log(result.data);
        }
      }
    } catch (error) {
      log.error(`Erro ao executar SQL: ${error.message}`);
    }
  },

  // Executar migração
  async migrate(filePath) {
    if (!filePath) {
      log.error('Caminho do arquivo de migração é obrigatório');
      return;
    }

    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      log.error(`Arquivo não encontrado: ${fullPath}`);
      return;
    }

    log.info(`Executando migração: ${fullPath}`);
    
    try {
      const migrationSQL = fs.readFileSync(fullPath, 'utf8');
      const version = path.basename(filePath, '.sql');
      
      const result = await makeRequest('/migration/run', 'POST', {
        migrationSQL,
        version
      });
      
      log.success(`Migração ${version} executada com sucesso!`);
      log.data(`Executada em: ${result.executedAt}`);
    } catch (error) {
      log.error(`Erro na migração: ${error.message}`);
    }
  },

  // Fazer backup de tabela
  async backup(table, outputFile) {
    if (!table) {
      log.error('Nome da tabela é obrigatório');
      return;
    }

    log.info(`Fazendo backup da tabela: ${table}`);
    
    try {
      const result = await makeRequest(`/utils/backup/${table}`, 'POST');
      
      log.success(`Backup realizado! ${result.count} registros`);
      
      if (outputFile) {
        const backupData = {
          table: result.table,
          backedUpAt: result.backedUpAt,
          count: result.count,
          data: result.data
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2));
        log.success(`Backup salvo em: ${outputFile}`);
      } else {
        log.data('Dados do backup:');
        console.table(result.data.slice(0, 5)); // Mostrar apenas os primeiros 5
      }
    } catch (error) {
      log.error(`Erro no backup: ${error.message}`);
    }
  },

  // Mostrar ajuda
  help() {
    console.log(`
${colors.cyan}🛠️  SUPABASE CLI TOOL${colors.reset}

${colors.yellow}Comandos disponíveis:${colors.reset}

  ${colors.green}status${colors.reset}                    - Verificar status da conexão
  ${colors.green}tables${colors.reset}                    - Listar todas as tabelas
  ${colors.green}select <table>${colors.reset}            - Buscar dados de uma tabela
  ${colors.green}insert <table> <json>${colors.reset}     - Inserir dados em uma tabela
  ${colors.green}sql <query>${colors.reset}               - Executar SQL personalizado
  ${colors.green}migrate <file>${colors.reset}            - Executar arquivo de migração
  ${colors.green}backup <table> [file]${colors.reset}     - Fazer backup de uma tabela

${colors.yellow}Exemplos:${colors.reset}

  node scripts/supabase-cli.js status
  node scripts/supabase-cli.js tables
  node scripts/supabase-cli.js select users
  node scripts/supabase-cli.js sql "SELECT * FROM companies LIMIT 5"
  node scripts/supabase-cli.js insert users '{"name":"João","email":"joao@email.com"}'
  node scripts/supabase-cli.js migrate supabase/migrations/001_init.sql
  node scripts/supabase-cli.js backup users backup-users.json

${colors.yellow}Nota:${colors.reset} Certifique-se de que o backend está rodando em http://localhost:3001
    `);
  }
};

// Processar argumentos da linha de comando
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    commands.help();
    return;
  }

  const command = args[0];
  const params = args.slice(1);

  if (!commands[command]) {
    log.error(`Comando desconhecido: ${command}`);
    log.info('Use "help" para ver comandos disponíveis');
    return;
  }

  try {
    await commands[command](...params);
  } catch (error) {
    log.error(`Erro na execução: ${error.message}`);
  }
}

// Verificar se é execução direta
if (require.main === module) {
  main();
}

module.exports = { commands, makeRequest }; 