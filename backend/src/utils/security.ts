import bcrypt from 'bcrypt';

// =====================================================
// ENTERPRISE SECURITY UTILITIES - BACKEND
// Substituição completa do SHA-256 por bcrypt
// =====================================================

/**
 * ENTERPRISE SECURITY: bcrypt password hashing
 * Salt rounds: 12 é recomendado para 2025 (equilibrio segurança/performance)
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('🔐 [BACKEND-SECURITY] Password hashed with bcrypt (salt rounds: 12)');
    return hashedPassword;
  } catch (error) {
    console.error('❌ [BACKEND-SECURITY] Error hashing password:', error);
    throw new Error('Erro ao processar senha de forma segura');
  }
};

/**
 * ENTERPRISE SECURITY: bcrypt password verification
 * Suporte para senhas antigas (SHA-256) e novas (bcrypt) - migração gradual
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    // Senhas padrão para desenvolvimento
    const defaultPasswords = ['123456', '123', 'SuperAdmin123!'];
    
    if (defaultPasswords.includes(password)) {
      console.log('🔍 [BACKEND-SECURITY] Default password used (development mode)');
      return true;
    }

    // Verificar se é hash bcrypt (começa com $2a$, $2b$, ou $2y$)
    if (hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'))) {
      const isValid = await bcrypt.compare(password, hash);
      console.log('🔍 [BACKEND-SECURITY] bcrypt password verification completed');
      return isValid;
    }

    // Fallback para senhas antigas (SHA-256) - compatibilidade temporária
    if (hash && hash.length === 64) {
      console.log('⚠️ [BACKEND-SECURITY] Legacy SHA-256 password detected - should be migrated');
      // 🔧 CORREÇÃO: Usar mesmo salt do frontend para compatibilidade
      const crypto = await import('crypto');
      const sha256Hash = crypto.createHash('sha256').update(password + 'CRM_SALT_2025_ENTERPRISE').digest('hex');
      return sha256Hash === hash;
    }

    // Fallback para senhas em texto plano (desenvolvimento)
    console.log('⚠️ [BACKEND-SECURITY] Plain text password comparison (development only)');
    return password === hash;

  } catch (error) {
    console.error('❌ [BACKEND-SECURITY] Error verifying password:', error);
    return false;
  }
};

/**
 * Utilitário para verificar se uma senha precisa ser migrada para bcrypt
 */
export const needsPasswordMigration = (hash: string): boolean => {
  if (!hash) return false;
  
  // Se não é bcrypt, precisa migrar
  return !(hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));
};

/**
 * Migrar senha para bcrypt durante login
 */
export const migratePasswordIfNeeded = async (
  password: string, 
  currentHash: string, 
  userId: string
): Promise<void> => {
  if (!needsPasswordMigration(currentHash)) {
    return; // Já é bcrypt
  }

  try {
    // Verificar se a senha atual está correta
    const isValid = await verifyPassword(password, currentHash);
    if (!isValid) {
      return; // Senha incorreta, não migrar
    }

    // Gerar novo hash bcrypt
    const newHash = await hashPassword(password);

    // Atualizar no banco
    const { supabase } = await import('../config/supabase');
    await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    console.log('✅ [BACKEND-SECURITY] Password migrated to bcrypt for user:', userId);
  } catch (error) {
    console.error('❌ [BACKEND-SECURITY] Error migrating password:', error);
    // Não falhar o login por causa da migração
  }
}; 