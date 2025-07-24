# 🤖 Gemini CLI - Guia Rápido CRM RENOVE

## ✅ Status da Configuração
- **Gemini CLI**: v0.1.12 ✅ Instalado
- **API Key**: ✅ Configurada
- **MCP Servers**: ✅ 5 servidores ativos
- **Variáveis Ambiente**: ✅ Configuradas

## 🚀 Comandos Essenciais

### 🔍 Análise Rápida de Código
```bash
# Analisar um arquivo específico
gemini -p "Analise @src/components/Pipeline/PipelineKanbanBoard.tsx"

# Analisar diretório completo
gemini -p "Analise @src/hooks/ e sugira melhorias"

# Análise com modelo rápido (Flash)
gemini -m "gemini-2.5-flash" -p "Explique @package.json rapidamente"
```

### 🧪 Sandbox Mode (Testes Seguros)
```bash
# Criar e testar script Python
gemini -s -p "Crie um script Python que teste nossa API REST"

# Testar código JavaScript
gemini -s -p "Crie um teste para verificar autenticação JWT"
```

### 🏗️ Análise de Arquitetura
```bash
# Verificar segurança multi-tenant
gemini -p "Analise @src/providers/AuthProvider.tsx para segurança"

# Review de middleware
gemini -p "Revise @backend/src/middleware/auth.ts para bugs"

# Análise completa do projeto (cuidado!)
gemini -a -p "Gere relatório de arquitetura do CRM"
```

## 📊 MCP Servers Ativos

| Server | Função | Comando Exemplo |
|--------|--------|-----------------|
| **Supabase MCP** | Acesso direto ao DB | Consultas e análises de banco |
| **Browser MCP** | Testes E2E | Automação de navegador |
| **Gemini CLI** | IA Analysis | Análise de código e sandbox |
| **Sequential Thinking** | Raciocínio estruturado | Resolução de problemas complexos |
| **Context7** | Docs atualizadas | Documentação de bibliotecas |

## 🎯 Casos de Uso para CRM

### 🏢 Multi-Tenant
```bash
# Verificar isolamento de tenant
gemini -p "Analise @src/hooks/usePipelineData.ts para isolamento tenant_id"
```

### 🔄 Pipeline Management
```bash
# Otimizar componentes pipeline
gemini -p "Revise @src/components/Pipeline/ para performance"
```

### 🔐 Autenticação
```bash
# Debug problemas auth
gemini -p "Analise @backend/src/middleware/auth.ts para problemas JWT"
```

### 📊 Performance
```bash
# Análise de hooks customizados
gemini -p "Otimize @src/hooks/useSupabaseCrud.ts para performance"
```

## ⚡ Tips Importantes

### ✅ DO
- Use `@arquivo.tsx` para referenciar arquivos
- Use `-s` para testes seguros
- Use `-m gemini-2.5-flash` para análises rápidas
- Sempre revisar sugestões antes de aplicar

### ❌ DON'T
- Não use `-y` (YOLO mode) sem review
- Não use `-a` em projetos grandes sem necessidade
- Não compartilhe API keys
- Não aplique mudanças sem entender

## 🔧 Configuração

### API Key Location
- **Variável**: `GEMINI_API_KEY` 
- **Arquivo**: `~/.gemini/settings.json`
- **Shell**: `~/.zshrc` e `~/.bashrc`

### MCP Config
- **Arquivo**: `.mcp.json` (na raiz do projeto)
- **Versão**: 2.0.0 (atualizada)

## 🆘 Troubleshooting

### Problema: "API Key not found"
```bash
export GEMINI_API_KEY="your_api_key"
```

### Problema: "Command not found"
```bash
npm install -g @google/gemini-cli
```

### Problema: MCP not working
- Reinicie Claude Code
- Verifique `.mcp.json`
- Execute `/mcp` no Claude Code

---

**🎉 Gemini CLI está configurado e pronto para uso no CRM Renove!**

Para dúvidas: Consulte `CLAUDE.md` para documentação completa.