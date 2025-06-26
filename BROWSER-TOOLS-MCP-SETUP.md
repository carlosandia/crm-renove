# 🚀 BROWSER TOOLS MCP - GUIA DE INSTALAÇÃO COMPLETO

## 📋 VISÃO GERAL

O Browser Tools MCP v1.2.0 é uma ferramenta poderosa que permite integração de AI com browser para:
- Captura automática de screenshots
- Análise de performance e SEO
- Debugging avançado
- Monitoramento de network requests
- Auditorias de acessibilidade

## 🔧 COMPONENTES NECESSÁRIOS

### 1. ✅ REPOSITÓRIO CLONADO
```bash
# Já executado
git clone https://github.com/AgentDeskAI/browser-tools-mcp.git
```

### 2. 🌐 BROWSER TOOLS SERVER (Middleware)
```bash
# Terminal 1 - Manter rodando
npx @agentdeskai/browser-tools-server@latest
```
**Status**: ✅ **RODANDO** (processo 30774)

### 3. 🤖 MCP SERVER (Protocolo AI)
```bash
# Para configurar no Cursor
npx @agentdeskai/browser-tools-mcp@latest
```

### 4. 🔌 CHROME EXTENSION
**Download**: [BrowserTools-1.2.0-extension.zip](https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip)

## 📦 INSTALAÇÃO PASSO A PASSO

### PASSO 1: INSTALAR CHROME EXTENSION

1. **Baixar extensão**:
   ```bash
   curl -L -o BrowserTools-1.2.0-extension.zip https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip
   ```

2. **Instalar no Chrome**:
   - Abrir Chrome → `chrome://extensions/`
   - Ativar "Modo de desenvolvedor"
   - Clicar "Carregar extensão sem compactação"
   - Selecionar pasta extraída da extensão

### PASSO 2: CONFIGURAR CURSOR MCP

1. **Abrir configurações Cursor**:
   - `Cmd+,` (macOS) ou `Ctrl+,` (Windows/Linux)
   - Ir para "Features" → "Model Context Protocol"

2. **Adicionar MCP Server**:
   ```json
   {
     "mcpServers": {
       "browser-tools": {
         "command": "npx",
         "args": ["@agentdeskai/browser-tools-mcp@latest"]
       }
     }
   }
   ```

### PASSO 3: VERIFICAR CONEXÕES

1. **Browser Tools Server**: ✅ Rodando na porta padrão
2. **Chrome Extension**: Instalar e ativar
3. **MCP Server**: Configurar no Cursor
4. **DevTools Panel**: Abrir Chrome DevTools → "BrowserToolsMCP"

## 🛠️ FERRAMENTAS DISPONÍVEIS

### 📊 AUDITORIAS
- **Accessibility**: Conformidade WCAG
- **Performance**: Análise Lighthouse
- **SEO**: Otimização para buscadores
- **Best Practices**: Práticas de desenvolvimento
- **NextJS**: Específico para NextJS

### 🔧 DEBUGGING
- **Screenshots**: Captura automática
- **Console Logs**: Monitoramento em tempo real
- **Network**: Análise de requests
- **DOM**: Inspeção de elementos

## 🎯 COMANDOS DE EXEMPLO

### Para usar no Cursor Chat:
```
"Tire um screenshot da página atual"
"Analise a performance desta página"
"Execute uma auditoria de SEO"
"Verifique acessibilidade desta página"
"Entre em modo debug"
"Execute audit mode completo"
```

## 🔄 INTEGRAÇÃO COM CRM

### CASOS DE USO ESPECÍFICOS:

1. **FormBuilder Testing**:
   ```
   "Tire screenshot do FormBuilder e analise UX"
   "Verifique performance do formulário público"
   "Auditoria de acessibilidade do formulário"
   ```

2. **Pipeline Debugging**:
   ```
   "Monitore requests do Kanban drag & drop"
   "Capture logs de erro do Pipeline"
   "Screenshot do estado atual do Pipeline"
   ```

3. **Performance Analysis**:
   ```
   "Análise completa de performance do CRM"
   "Verifique otimizações implementadas"
   "Compare antes/depois das melhorias"
   ```

## ⚠️ TROUBLESHOOTING

### Problemas Comuns:

1. **Extensão não conecta**:
   - Fechar completamente o Chrome
   - Reiniciar Browser Tools Server
   - Abrir apenas 1 instância do DevTools

2. **MCP não responde**:
   - Verificar configuração no Cursor
   - Reiniciar Cursor
   - Verificar se servidor está rodando

3. **Screenshots não funcionam**:
   - Ativar "Allow Auto-Paste" no DevTools panel
   - Focar no campo de chat do Cursor
   - Verificar permissões da extensão

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Browser Tools Server rodando (processo ativo)
- [ ] Chrome Extension instalada e ativa
- [ ] MCP Server configurado no Cursor
- [ ] DevTools panel BrowserToolsMCP visível
- [ ] Teste de screenshot funcionando
- [ ] Auditorias respondendo corretamente

## 🎯 STATUS ATUAL

- ✅ **Repositório clonado**
- ✅ **Browser Tools Server rodando**
- ⏳ **Chrome Extension**: Aguardando instalação
- ⏳ **Cursor MCP**: Aguardando configuração
- ⏳ **Testes**: Aguardando setup completo

## 📞 PRÓXIMOS PASSOS

1. Baixar e instalar Chrome Extension
2. Configurar MCP no Cursor
3. Testar integração com CRM
4. Documentar workflows específicos 