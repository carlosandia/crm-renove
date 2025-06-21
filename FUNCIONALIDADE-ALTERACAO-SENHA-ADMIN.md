# 🔐 Funcionalidade de Alteração de Senha do Admin

## 📋 Descrição

Foi implementada uma funcionalidade completa para alterar a senha de usuários administradores através do módulo **Empresas** quando logado como **Super Admin**.

## 🎯 Características

### ✅ O que foi implementado:

1. **Interface de Alteração de Senha**
   - Seção dedicada no formulário de edição de empresa
   - Campos para nova senha e confirmação
   - Validação em tempo real dos requisitos de senha
   - Botão para ativar/desativar o modo de alteração

2. **Validação Robusta**
   - Mínimo 6 caracteres
   - Pelo menos 1 letra
   - Pelo menos 1 número
   - Confirmação de senha deve coincidir
   - Indicadores visuais de requisitos atendidos

3. **Segurança**
   - Confirmação antes de alterar senha
   - Atualização direta no banco de dados
   - Validação de permissões (apenas Super Admin)
   - Logs de auditoria

4. **Sistema de Login Atualizado**
   - Validação via coluna `password_hash` no banco
   - Fallback para credenciais de demonstração
   - Suporte a backend alternativo

## 🚀 Como Usar

### 1. Preparação do Banco de Dados

Execute o script SQL para adicionar a coluna de senha:

```sql
-- Execute este script no Supabase
-- Arquivo: ADD-PASSWORD-HASH-COLUMN.sql
```

### 2. Acessar a Funcionalidade

1. **Login como Super Admin**
   - Email: `superadmin@crm.com`
   - Senha: `SuperAdmin123!`

2. **Navegar para Empresas**
   - Menu lateral → Clientes → Empresas

3. **Editar uma Empresa**
   - Clique no botão "Editar" (ícone de lápis) de uma empresa que tenha admin

### 3. Alterar Senha do Admin

1. **Localizar a Seção**
   - No formulário de edição, encontre: "Alterar Senha do Administrador"

2. **Ativar Alteração**
   - Clique em "Alterar Senha" para abrir os campos

3. **Preencher Nova Senha**
   - Digite a nova senha (mín. 6 caracteres, com letras e números)
   - Confirme a senha no segundo campo
   - Observe os indicadores de validação

4. **Confirmar Alteração**
   - Clique em "Alterar Senha do Admin"
   - Confirme na caixa de diálogo
   - Aguarde a confirmação de sucesso

## 🔧 Estrutura Técnica

### Arquivos Modificados:

1. **`src/components/EmpresasModule.tsx`**
   - Adicionado estados para alteração de senha
   - Interface de alteração de senha
   - Função `handleChangeAdminPassword()`
   - Validação `validatePasswordChange()`

2. **`src/providers/AuthProvider.tsx`**
   - Login via Supabase com validação de `password_hash`
   - Fallback para backend se necessário

3. **`ADD-PASSWORD-HASH-COLUMN.sql`**
   - Script para adicionar coluna `password_hash`
   - Senhas padrão para usuários existentes

### Estados Implementados:

```typescript
// Estados para alteração de senha
const [showPasswordChange, setShowPasswordChange] = useState(false);
const [passwordChangeData, setPasswordChangeData] = useState({
  newPassword: '',
  confirmPassword: ''
});
const [passwordChangeValidation, setPasswordChangeValidation] = useState({
  isValid: false,
  message: '',
  passwordsMatch: false,
  requirements: {
    length: false,
    hasLetter: false,
    hasNumber: false
  }
});
```

## 🧪 Como Testar

### 1. Teste Automatizado

Execute o script de teste:

```bash
node test-password-system.js
```

### 2. Teste Manual

1. **Criar uma empresa com admin**
2. **Editar a empresa**
3. **Alterar senha do admin**
4. **Fazer logout**
5. **Tentar login com nova senha**

### 3. Cenários de Teste

- ✅ Senha com requisitos válidos
- ❌ Senha muito curta (< 6 caracteres)
- ❌ Senha sem letras
- ❌ Senha sem números
- ❌ Confirmação de senha diferente
- ✅ Login com nova senha
- ❌ Login com senha antiga

## 🔒 Segurança

### Medidas Implementadas:

1. **Validação de Permissões**
   - Apenas Super Admin pode alterar senhas
   - Verificação de role no frontend e backend

2. **Validação de Dados**
   - Requisitos mínimos de senha
   - Sanitização de entrada
   - Validação de existência do usuário

3. **Auditoria**
   - Logs de alteração de senha
   - Registro de quem alterou
   - Timestamp das alterações

4. **Confirmação**
   - Diálogo de confirmação antes da alteração
   - Mensagem de sucesso/erro clara

## 📊 Senhas Padrão

Após executar o script SQL:

- **Admins**: `123456`
- **Super Admin**: `admin123`

## 🚨 Pontos Importantes

1. **Backup**: Sempre faça backup antes de executar scripts SQL
2. **Teste**: Teste em ambiente de desenvolvimento primeiro
3. **Senhas**: Altere as senhas padrão imediatamente
4. **Permissões**: Apenas Super Admins podem alterar senhas
5. **Logs**: Monitore os logs para auditoria

## 🔄 Fluxo Completo

```
Super Admin → Empresas → Editar Empresa → 
Alterar Senha do Admin → Validar → Confirmar → 
Atualizar Banco → Testar Login
```

## 📝 Próximos Passos

1. Implementar hash de senhas (bcrypt)
2. Adicionar política de senhas mais robusta
3. Implementar expiração de senhas
4. Adicionar histórico de senhas
5. Implementar recuperação de senha

---

**✅ Funcionalidade implementada e testada com sucesso!** 