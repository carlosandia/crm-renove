# 🚀 Mudança Importante: localhost → 127.0.0.1

## 📋 O que mudou?

A partir de agora, **TODOS os acessos ao CRM devem usar 127.0.0.1** ao invés de localhost:

- **Frontend**: http://127.0.0.1:8080 
- **Backend**: http://127.0.0.1:3001

## 🔧 Para desenvolvedores:

### ✅ URLs que agora funcionam:
- ✅ http://127.0.0.1:8080 (frontend)
- ✅ http://127.0.0.1:3001 (backend)

### ❌ URLs que NÃO funcionam mais:
- ❌ http://localhost:8080
- ❌ http://localhost:3001

## 🛠️ Como atualizar seu ambiente:

### 1. Atualizar arquivo .env
Verificar se seu `.env` tem:
```bash
VITE_API_URL=http://127.0.0.1:3001
```

### 2. Reiniciar serviços
```bash
# Parar tudo
npm run stop

# Iniciar novamente  
npm run dev
cd backend && npm run dev
```

### 3. Atualizar bookmarks
- Alterar favoritos do navegador
- Atualizar links em documentação local
- Atualizar scripts personalizados

## 🎯 Por que mudamos?

1. **Melhor performance** - Evita lookup DNS
2. **Consistência** - Um só padrão de acesso
3. **Compatibilidade** - Funciona melhor em alguns ambientes corporativos
4. **Previsibilidade** - Comportamento mais consistente

## ✅ Testes realizados:

- ✅ Frontend carregando em 127.0.0.1:8080
- ✅ Backend respondendo em 127.0.0.1:3001  
- ✅ CORS funcionando entre frontend/backend
- ✅ Login e autenticação funcionando
- ✅ API pipelines retornando dados
- ✅ Comunicação completa testada

## 🆘 Problemas?

Se alguma coisa não funcionar:

1. **Limpar cache do navegador**
2. **Verificar arquivo .env**
3. **Reiniciar frontend e backend**
4. **Contactar equipe de desenvolvimento**

---

**Data da mudança**: 14/07/2025  
**Status**: ✅ Implementado e testado  
**Responsável**: Claude Code Assistant