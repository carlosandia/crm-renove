# 🔄 Módulo Criador de Pipeline - CRM Sistema

## 📋 Visão Geral

O **Módulo Criador de Pipeline** é uma funcionalidade exclusiva para administradores (`role = 'admin'`) que permite criar, gerenciar e configurar pipelines de vendas personalizadas para equipes de vendedores.

## 🎯 Funcionalidades Principais

### 1. **Criação de Pipelines**
- ✅ Criar pipelines com nome e descrição
- ✅ Vincular vendedores (`role = 'member'`) à pipeline
- ✅ Filtro automático por `tenant_id`
- ✅ Rastreamento de criador e datas

### 2. **Gerenciamento de Pipelines**
- ✅ Listar todas as pipelines da empresa
- ✅ Editar nome e descrição
- ✅ Excluir pipelines (com confirmação)
- ✅ Adicionar/remover vendedores a qualquer momento

### 3. **Etapas do Funil (Kanban)**
- ✅ Criar etapas personalizadas
- ✅ Definir temperatura (lead scoring 0-100%)
- ✅ Configurar máximo de dias por etapa
- ✅ Personalizar cores das etapas
- ✅ Reordenar etapas
- ✅ Excluir etapas

### 4. **Sequência de Follow-up**
- ✅ Configurar follow-ups por etapa
- ✅ Definir dias de offset
- ✅ Adicionar notas/lembretes
- ✅ Ativar/desativar follow-ups

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas:

```sql
-- Pipeline principal
pipelines (id, name, description, tenant_id, created_by, created_at, updated_at)

-- Relacionamento pipeline <-> vendedores
pipeline_members (id, pipeline_id, member_id, assigned_at)

-- Etapas do funil
pipeline_stages (id, pipeline_id, name, order_index, temperature_score, max_days_allowed, color)

-- Follow-ups automatizados
follow_ups (id, pipeline_id, stage_id, day_offset, note, is_active)
```

## 🚀 Como Usar

### **Passo 1: Executar SQL no Supabase**
1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `pipeline-simple.sql`

### **Passo 2: Acessar o Módulo**
1. Faça login como **admin** (admin@crm.com / 123456)
2. No menu lateral, clique em **"Criador de pipeline"**
3. O módulo será carregado automaticamente

### **Passo 3: Criar sua Primeira Pipeline**
1. Clique em **"➕ Criar Pipeline"**
2. Preencha nome e descrição
3. Selecione vendedores para vincular
4. Clique em **"Criar Pipeline"**

### **Passo 4: Configurar Etapas**
1. Na lista de pipelines, clique em **"+ Etapa"**
2. Configure nome, temperatura e dias máximos
3. Escolha uma cor para identificação
4. Salve a etapa

### **Passo 5: Adicionar Follow-ups**
1. Clique em **"📅 Adicionar Follow-up"**
2. Selecione a etapa
3. Defina quantos dias após entrada na etapa
4. Adicione uma nota/lembrete
5. Salve o follow-up

## 🎨 Interface do Usuário

### **Tela Principal**
- **Lista de Pipelines**: Cards com informações resumidas
- **Botões de Ação**: Editar, excluir, gerenciar equipe
- **Informações Exibidas**: Nome, descrição, vendedores, etapas, data de criação

### **Formulários**
- **Criação/Edição**: Campos limpos e validados
- **Seleção de Membros**: Checkboxes para múltipla seleção
- **Modais**: Para etapas e follow-ups

### **Gestão de Equipe**
- **Adicionar Vendedores**: Dropdown com membros disponíveis
- **Remover Vendedores**: Botão de remoção com confirmação
- **Visualização**: Lista clara dos membros vinculados

## 🔐 Controle de Acesso

### **Permissões por Role:**

| Role | Criar Pipeline | Editar Pipeline | Excluir Pipeline | Ver Pipelines |
|------|----------------|-----------------|------------------|---------------|
| `super_admin` | ❌ | ❌ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `member` | ❌ | ❌ | ❌ | ✅* |

*Members só veem pipelines às quais estão vinculados

### **Filtros de Segurança:**
- ✅ Todas as operações filtradas por `tenant_id`
- ✅ Admins só veem/editam pipelines da própria empresa
- ✅ Vendedores só acessam pipelines atribuídas
- ✅ Validação de permissões no backend

## 🛠️ Tecnologias Utilizadas

### **Frontend:**
- **React 18** com TypeScript
- **CSS Vanilla** com design responsivo
- **Hooks** para gerenciamento de estado
- **Fetch API** para comunicação com backend

### **Backend:**
- **Node.js + Express** com TypeScript
- **Supabase** como banco PostgreSQL
- **Rotas RESTful** para todas as operações
- **Validação** de dados e permissões

## 📱 Responsividade

- ✅ **Desktop**: Layout em grid com cards
- ✅ **Tablet**: Adaptação automática de colunas
- ✅ **Mobile**: Layout em coluna única
- ✅ **Modais**: Ajuste automático de tamanho

## 🔄 Fluxo de Dados

```
1. Admin cria pipeline → Salva no banco
2. Admin adiciona etapas → Vincula à pipeline
3. Admin configura follow-ups → Associa às etapas
4. Admin atribui vendedores → Cria relacionamento
5. Vendedores visualizam → Filtro por tenant_id
```

## 🚨 Próximos Passos

### **Funcionalidades Futuras:**
- 📊 **Dashboard de Métricas**: Conversão por etapa
- 🎨 **Templates Pré-definidos**: B2B, E-commerce, Consultoria
- 🔔 **Notificações**: Alertas de follow-up
- 📈 **Relatórios**: Performance de pipeline
- 🎯 **Automações**: Movimentação automática de leads

### **Melhorias Técnicas:**
- 🔍 **Busca e Filtros**: Por nome, vendedor, data
- 📤 **Exportação**: Dados em CSV/Excel
- 🔄 **Sincronização**: Real-time com WebSockets
- 📱 **App Mobile**: React Native

## 🐛 Solução de Problemas

### **Erro: "Pipeline não encontrada"**
- Verifique se o `tenant_id` está correto
- Confirme se o usuário tem permissão de admin

### **Erro: "Membro não pode ser adicionado"**
- Verifique se o usuário tem `role = 'member'`
- Confirme se pertence ao mesmo `tenant_id`

### **Erro: "Etapa não pode ser criada"**
- Verifique se a pipeline existe
- Confirme se os valores estão dentro dos limites

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Confirme se as tabelas foram criadas no Supabase
3. Teste as rotas da API diretamente
4. Verifique as permissões de usuário

---

**Desenvolvido com ❤️ para otimizar processos de vendas!**