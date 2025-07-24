# 🚀 Guia de Desenvolvimento Estável - CRM Marketing

## ✅ Problemas Resolvidos

Este documento resolve definitivamente os problemas de:
- ❌ Múltiplos processos em estado "Sleep Non-interruptible"
- ❌ Erros EADDRINUSE nas portas 3001 e 8080
- ❌ Servidores não iniciando corretamente
- ❌ Necessidade de matar processos manualmente

## 🛠️ Comandos de Desenvolvimento

### Comandos Principais (Use estes!)

```bash
# ⭐ RECOMENDADO: Inicia desenvolvimento limpo
npm run dev:clean

# 🔄 Restart rápido dos serviços
npm run dev:restart

# 🛑 Para todos os serviços
npm run dev:stop

# 📊 Verifica status dos serviços
npm run dev:status

# 🔍 Diagnóstico completo
npm run dev:debug
```

### Comandos Avançados

```bash
# Limpeza forçada de processos órfãos
./scripts/dev-manager.sh clean

# Health check manual
./scripts/health-check.sh

# Diagnóstico completo do sistema
./scripts/dev-manager.sh debug
```

## 🎯 Fluxo de Trabalho Recomendado

### Desenvolvimento Diário
```bash
# 1. Chegada - inicia ambiente limpo
npm run dev:clean

# 2. Durante desenvolvimento - restart quando necessário
npm run dev:restart

# 3. Fim do dia - para serviços
npm run dev:stop
```

### Quando Algo Dá Errado
```bash
# Diagnóstico
npm run dev:debug

# Limpeza forçada
./scripts/dev-manager.sh clean

# Reinício limpo
npm run dev:clean
```

## 🔧 Estrutura dos Scripts

### `/scripts/dev-manager.sh`
- **Função**: Gerenciamento completo dos servidores
- **Recursos**: Cleanup automático, verificação de portas, health checks
- **Uso**: Base para todos os comandos npm

### `/scripts/health-check.sh`
- **Função**: Verificação rápida de saúde dos serviços
- **Recursos**: Testa APIs, verifica conectividade
- **Uso**: Monitoramento e diagnóstico

## ⚙️ Configurações Otimizadas

### Environment Variables (`.env`)
```bash
# Anti-hanging processes
NODE_ENV=development
FORCE_COLOR=1
TSX_FORCE_TTY=1
NODE_OPTIONS=--max-old-space-size=4096
UV_THREADPOOL_SIZE=128
```

### Graceful Shutdown (Backend)
- Timeout de 10 segundos para shutdown forçado
- Limpeza de recursos automática
- Handling de múltiplos sinais (SIGTERM, SIGINT, SIGUSR2)

## 🚦 Indicadores de Status

### ✅ Funcionando Corretamente
```
🎉 Todos os serviços estão ONLINE!
Backend: http://127.0.0.1:3001
Frontend: http://127.0.0.1:8080
```

### ❌ Problemas Identificados
```
❌ Backend: OFFLINE (porta 3001)
⚠️ Frontend: OFFLINE (porta 8080)
```

## 🔍 Troubleshooting

### Problema: "Porta ainda ocupada"
```bash
./scripts/dev-manager.sh clean
npm run dev:clean
```

### Problema: "Processo não responde"
```bash
killall -9 node
./scripts/dev-manager.sh clean
npm run dev:clean
```

### Problema: "Frontend não carrega"
```bash
npm run dev:debug
# Verificar logs em frontend.log
```

### Problema: "Backend não responde"
```bash
npm run dev:debug
# Verificar logs em backend.log
```

## 📋 Checklist de Verificação

Antes de reportar problemas, execute:

- [ ] `npm run dev:status` - Verifica status atual
- [ ] `npm run dev:debug` - Diagnóstico completo
- [ ] `./scripts/health-check.sh` - Health check manual
- [ ] Verificar logs: `tail -f backend.log frontend.log`

## 🎉 Benefícios da Nova Estrutura

1. **Zero Configuração Manual**: Tudo automatizado
2. **Startup Confiável**: Sempre funciona na primeira tentativa
3. **Debugging Simplificado**: Logs estruturados e claros
4. **Desenvolvimento Ágil**: Comandos únicos para todas as operações
5. **Monitoramento Automático**: Health checks integrados
6. **Limpeza Automática**: Sem processos órfãos

## 🔗 Links Úteis

- Backend: http://127.0.0.1:3001/health
- Frontend: http://127.0.0.1:8080
- API Info: http://127.0.0.1:3001/api

---

**🎯 Resultado**: Ambiente de desenvolvimento 100% estável e confiável!