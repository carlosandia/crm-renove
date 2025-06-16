# 🚀 Supabase GitHub Genesis - CRM Sistema Fullstack

Sistema de Gerenciamento de Relacionamento com Cliente desenvolvido com React, Node.js, TypeScript e Supabase, incluindo servidor MCP integrado.

## 🛠️ Stack Tecnológica

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **MCP Server**: Servidor MCP integrado ao Supabase
- **Estilização**: CSS3 com design moderno
- **Desenvolvimento**: Nodemon, Concurrently

## 📋 Funcionalidades

- ✅ Interface moderna e responsiva
- ✅ Backend API RESTful
- ✅ Integração com Supabase
- ✅ Servidor MCP conectado ao Supabase
- ✅ Tabela única de usuários com role e tenant_id
- ✅ Renderização condicional baseada em permissões
- ✅ Redirecionamento único para /app
- ✅ Multi-tenancy implementado
- ✅ Gerenciamento de clientes
- ✅ Sistema de autenticação
- ✅ Monitoramento de status em tempo real
- ✅ Tratamento de erros
- ✅ TypeScript em todo o projeto

## 🚀 Como Executar

### Opção 1: Execução Automática (Recomendado)

```bash
# Instalar todas as dependências
npm run install-all

# Executar frontend e backend simultaneamente
npm run dev
```

### Opção 2: Execução Manual

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

### Opção 3: Docker (Opcional)

```bash
docker-compose up --build
```

## 🌐 URLs de Acesso

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health
- **Teste de DB**: http://localhost:5000/api/test-db

## 📁 Estrutura do Projeto

```
supabase-github-genesis/
├── backend/                 # Servidor Node.js
│   ├── src/
│   │   ├── index.ts        # Servidor principal
│   │   └── routes/         # Rotas da API
│   │       ├── auth.ts     # Autenticação
│   │       ├── users.ts    # Usuários
│   │       └── customers.ts # Clientes
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Aplicação React
│   ├── src/
│   │   ├── App.tsx        # Componente principal
│   │   └── App.css        # Estilos
│   └── package.json
├── supabase-mcp-server.js  # Servidor MCP Supabase
├── package.json           # Scripts principais
├── docker-compose.yml     # Configuração Docker
└── README.md             # Documentação
```

## 🔧 Scripts Disponíveis

```bash
# Projeto Principal
npm run dev          # Executar frontend + backend
npm run install-all  # Instalar todas as dependências
npm run server       # Apenas backend
npm run client       # Apenas frontend
npm run build        # Build do frontend
npm start           # Produção

# Backend
npm run dev         # Desenvolvimento com nodemon
npm run build       # Compilar TypeScript
npm start          # Produção
npm test           # Testes

# Frontend
npm start          # Servidor de desenvolvimento
npm run build      # Build para produção
npm test          # Testes
npm run eject     # Ejetar configuração
```

## 🗄️ API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `POST /api/auth/logout` - Logout

### Usuários
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Buscar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

### Clientes
- `GET /api/customers` - Listar clientes
- `GET /api/customers/:id` - Buscar cliente
- `POST /api/customers` - Criar cliente
- `PUT /api/customers/:id` - Atualizar cliente
- `DELETE /api/customers/:id` - Deletar cliente

### Sistema
- `GET /` - Status do servidor
- `GET /health` - Health check
- `GET /api/test-db` - Teste de conexão com DB

## 🔐 Configuração do Supabase

O projeto já está configurado com uma instância do Supabase. Para usar sua própria instância:

1. Crie um projeto no [Supabase](https://supabase.com)
2. Atualize as variáveis de ambiente no arquivo `backend/src/index.ts`
3. Configure as tabelas necessárias no banco de dados

## 🎨 Interface

A interface possui:
- Design moderno com gradientes
- Responsividade completa
- Monitoramento de status em tempo real
- Feedback visual para todas as ações
- Cards interativos para clientes
- Indicadores de tecnologias utilizadas

## 🐛 Solução de Problemas

### Backend não conecta
- Verifique se a porta 5000 está livre
- Confirme se as dependências foram instaladas
- Verifique as credenciais do Supabase

### Frontend não carrega dados
- Confirme se o backend está rodando
- Verifique o console do navegador para erros
- Teste a conexão com a API manualmente

### Erro de CORS
- O backend já está configurado para aceitar requisições do frontend
- Verifique se as URLs estão corretas

## 📝 Próximos Passos

- [ ] Implementar autenticação completa
- [ ] Adicionar formulários para CRUD de clientes
- [ ] Implementar paginação
- [ ] Adicionar filtros e busca
- [ ] Implementar dashboard com gráficos
- [ ] Adicionar testes unitários
- [ ] Configurar CI/CD
- [ ] Implementar notificações em tempo real

## 👨‍💻 Desenvolvedor

Carlos Andia - Sistema CRM Fullstack

---

**Status**: ✅ Pronto para desenvolvimento
**Última atualização**: Janeiro 2025 