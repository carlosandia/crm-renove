# 📧 CONFIGURAÇÃO COMPLETA DO MAILTRAP - CRM MARKETING

## ✅ STATUS ATUAL DA INSTALAÇÃO

O sistema **já possui conexão completa com Mailtrap** implementada! Precisamos apenas configurar as credenciais.

### 📋 O que já está implementado:

1. **EmailService completo** (`src/services/emailService.ts`)
   - Suporte nativo ao Mailtrap
   - Fallback para outros provedores (Resend, Gmail)
   - Sistema de templates de email
   - Verificação de conexão

2. **Rotas de teste** (`src/routes/emailTest.ts`)
   - `/api/email-test/health` - Verificar saúde do serviço
   - `/api/email-test/send` - Enviar email de teste
   - `/api/email-test/invitation` - Testar email de convite
   - `/api/email-test/config` - Mostrar configuração atual

3. **Dependências instaladas**
   - `nodemailer` v7.0.3
   - `@types/nodemailer` v6.4.17

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### Passo 1: Criar conta no Mailtrap (se não tiver)

1. Acesse: https://mailtrap.io
2. Crie uma conta gratuita
3. Crie um novo "Inbox" para desenvolvimento

### Passo 2: Obter credenciais SMTP

1. No Mailtrap, acesse seu Inbox
2. Clique em "SMTP Settings" 
3. Copie as credenciais mostradas

### Passo 3: Criar arquivo .env no backend

Crie o arquivo `backend/.env` com o seguinte conteúdo:

```bash
# =====================================================
# SUPABASE CONFIGURATION
# =====================================================
SUPABASE_URL=https://marajvabdwkpgopytvhh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NjAwMTksImV4cCI6MjA1MTUzNjAxOX0.RI7R_5SQ3LvJqm6Q3LVnUB1L29gRaVrqgm7VKnNGkh0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTk2MDAxOSwiZXhwIjoyMDUxNTM2MDE5fQ.KZJGKtQaKPv8Q3cOEaYbCJ1I7RBh-TySTH7TbRk_Y0M

# =====================================================
# JWT CONFIGURATION
# =====================================================
JWT_SECRET=b8JJePxoHsEJnrNJJnjGryTttSMkkrvQenegQJ2Y3IOfWJNZ9TW7nMvfz0hEWxR4ElhENzpyNzJT3mIcgNlSGg==

# =====================================================
# EMAIL CONFIGURATION (MAILTRAP)
# =====================================================
EMAIL_PROVIDER=mailtrap

# MAILTRAP SMTP SETTINGS - SUBSTITUA PELOS SEUS DADOS
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=SEU_USERNAME_AQUI
MAILTRAP_PASS=SUA_PASSWORD_AQUI

# Aliases for compatibility
MAILTRAP_USERNAME=SEU_USERNAME_AQUI
MAILTRAP_PASSWORD=SUA_PASSWORD_AQUI

# =====================================================
# APPLICATION SETTINGS
# =====================================================
APP_URL=http://localhost:8080
COMPANY_NAME=CRM Marketing
NODE_ENV=development
PORT=3001

# =====================================================
# SMTP FALLBACK (for notifications)
# =====================================================
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=SEU_USERNAME_AQUI
SMTP_PASS=SUA_PASSWORD_AQUI

# =====================================================
# LOGGING
# =====================================================
LOG_LEVEL=info
```

### Passo 4: Reiniciar o backend

```bash
cd backend
npm run dev
```

## 🧪 COMANDOS DE TESTE

### 1. Verificar configuração atual
```bash
curl -X GET http://localhost:3001/api/email-test/config
```

### 2. Testar conexão (com token JWT)
```bash
curl -X POST http://localhost:3001/api/email-test/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{"to": "test@example.com"}'
```

### 3. Verificar saúde do serviço
```bash
curl -X GET http://localhost:3001/api/email-test/health
```

## 📊 FUNCIONALIDADES DISPONÍVEIS

### ✅ Já implementadas:

1. **Envio de emails de ativação de admin**
2. **Sistema de convites para empresas**
3. **Templates de email profissionais**
4. **Verificação de conexão SMTP**
5. **Fallback para outros provedores**
6. **Logs detalhados de email**
7. **Sistema de retry automático**
8. **Suporte a HTML e texto simples**

### 🎯 Rotas principais:

- `POST /api/admin-invitations/send` - Enviar convite de ativação
- `GET /api/email-test/health` - Status do serviço
- `POST /api/email-test/send` - Teste de envio
- `GET /api/email-test/config` - Configuração atual

## 🔄 PRÓXIMOS PASSOS

1. Configurar credenciais do Mailtrap no .env
2. Reiniciar o backend
3. Testar envio de emails
4. Validar templates de convite
5. Configurar emails de produção (Resend/SendGrid quando necessário)

## 🛠️ TROUBLESHOOTING

### Email não está sendo enviado:
1. Verificar se as credenciais estão corretas no .env
2. Verificar se o backend foi reiniciado após alterar o .env
3. Verificar logs do backend
4. Testar conexão com `/api/email-test/health`

### Erro de autenticação:
1. Verificar se MAILTRAP_USER e MAILTRAP_PASS estão corretos
2. Verificar se o inbox no Mailtrap está ativo
3. Verificar se não há caracteres especiais nas credenciais

## 📧 ESTRUTURA DO SISTEMA

```
EmailService (emailService.ts)
├── createMailtrapTransporter() ✅
├── sendAdminInvitation() ✅
├── sendTestEmail() ✅
├── verifyConnection() ✅
└── Templates profissionais ✅

Rotas de Teste (emailTest.ts)
├── GET /health ✅
├── POST /send ✅
├── POST /invitation ✅
└── GET /config ✅
```

## 🎉 CONCLUSÃO

O sistema está **100% pronto** para usar o Mailtrap! Apenas configure as credenciais no arquivo .env e teste a conexão. 