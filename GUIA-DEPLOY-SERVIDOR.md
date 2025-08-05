# 🚀 GUIA COMPLETO DE DEPLOY - CRM RENOVE Multi-Tenant

## 📊 STATUS ATUAL - FASE 1 CONCLUÍDA ✅

### ✅ PREPARAÇÃO LOCAL FINALIZADA:
- **URLs hardcoded**: 173 → 149 (✅ Redução de 24 críticos)
- **Git**: Commit realizado, tag v1.0.0-pre-production criada
- **Scripts**: Deploy automatizado pronto
- **Configurações**: Nginx, PM2, ambiente configurados
- **Validação**: Build de produção testado

## 🎯 PRÓXIMOS PASSOS - FASE 2

### 📋 CONFIGURAÇÃO DE ACESSO SSH

**1. Configurar Chaves SSH:**
```bash
# No servidor Hostinger (via painel ou SSH inicial)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# No seu computador local
ssh-copy-id root@168.231.99.133

# OU copiar manualmente a chave pública
cat ~/.ssh/id_rsa.pub | ssh root@168.231.99.133 "cat >> ~/.ssh/authorized_keys"
```

**2. Testar Conectividade:**
```bash
ssh root@168.231.99.133 "echo 'SSH funcionando'; uname -a"
```

### 🛠️ PREPARAÇÃO DO SERVIDOR UBUNTU 22.04

**3. Atualizar Sistema:**
```bash
ssh root@168.231.99.133 "
  apt update && apt upgrade -y
  apt install -y curl wget git software-properties-common
"
```

**4. Instalar Node.js 22.x:**
```bash
ssh root@168.231.99.133 "
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
  node --version
  npm --version
"
```

**5. Instalar Nginx e PM2:**
```bash
ssh root@168.231.99.133 "
  apt install -y nginx
  npm install -g pm2
  systemctl enable nginx
  systemctl start nginx
"
```

**6. Configurar Firewall:**
```bash
ssh root@168.231.99.133 "
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  ufw status
"
```

### 🚀 DEPLOY DA APLICAÇÃO

**7. Executar Deploy Automatizado:**
```bash
# Do seu computador local
./deploy.sh root@168.231.99.133
```

**8. Configurar SSL (Let's Encrypt):**
```bash
ssh root@168.231.99.133 "
  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d crm.renovedigital.com.br --non-interactive --agree-tos --email seu-email@dominio.com
  systemctl enable certbot.timer
"
```

### 🌐 CONFIGURAÇÃO DNS

**9. Configurar DNS (no Hostinger):**
- **Tipo A**: `crm.renovedigital.com.br` → `168.231.99.133`
- **Tipo CNAME**: `www.crm.renovedigital.com.br` → `crm.renovedigital.com.br`

### ✅ VALIDAÇÃO FINAL

**10. Testes de Produção:**
```bash
# Conectividade
curl -I https://crm.renovedigital.com.br

# API Health
curl https://crm.renovedigital.com.br/api/health

# Frontend
curl -s https://crm.renovedigital.com.br | grep "<title>"
```

## 🚨 COMANDOS PRONTOS PARA EXECUÇÃO

### Comando Único para Servidor:
```bash
# Executar no servidor após SSH configurado
ssh root@168.231.99.133 "
  set -e
  echo '📋 Atualizando sistema...'
  apt update && apt upgrade -y
  apt install -y curl wget git software-properties-common nginx
  
  echo '📦 Instalando Node.js 22.x...'
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
  
  echo '🔧 Instalando PM2...'
  npm install -g pm2
  
  echo '🔥 Configurando firewall...'
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
  ufw --force enable
  
  echo '🚀 Habilitando serviços...'
  systemctl enable nginx && systemctl start nginx
  
  echo '✅ Servidor preparado para deploy!'
  echo 'Node.js:' && node --version
  echo 'NPM:' && npm --version
  echo 'PM2:' && pm2 --version
"
```

### Deploy Automatizado:
```bash
# Do computador local (após servidor preparado)
./deploy.sh root@168.231.99.133
```

## 📞 SUPORTE

Se encontrar problemas:
1. **SSH**: Verificar chaves e permissões
2. **DNS**: Aguardar propagação (até 24h)
3. **SSL**: Verificar apontamento DNS antes do Certbot
4. **Aplicação**: Logs em `/var/log/pm2/`

---

**Status**: ✅ Fase 1 completa, pronto para Fase 2
**Próximo**: Configurar SSH e executar comandos do servidor