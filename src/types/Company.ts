// Tipos específicos para o módulo de empresas
import { CrudModalProps } from './CommonProps';
export interface CompanyAdmin {
  id: string;
  name?: string; // Campo composto (compatibilidade)
  first_name?: string; // Campo usado no backend
  last_name?: string; // Campo usado no backend
  email: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  activation_status?: 'pending' | 'sent' | 'activated' | 'expired' | 'inactive';
  invitation_id?: string;
  invitation_sent_at?: string;
  invitation_expires_at?: string;
  resend_count?: number;
}

export interface Company {
  id: string;
  name: string;
  segmento: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  expected_leads_monthly: number;
  expected_sales_monthly: number;
  expected_followers_monthly: number;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // ✅ UNIFICAÇÃO: Campo 'segment' removido - agora usamos apenas 'segmento'
  admin?: CompanyAdmin; // Mantido para compatibilidade
  admins?: CompanyAdmin[]; // Novo campo para múltiplos administradores
}

export interface CompanyFilters {
  searchTerm: string;
  status: string;
  segmento: string;
  adminStatus: string;
}

export interface CompanyFormData {
  name: string;
  segmento: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  expected_leads_monthly: number;
  expected_sales_monthly: number;
  expected_followers_monthly: number;
}

export interface EmailValidation {
  isChecking: boolean;
  exists: boolean;
  message: string;
}

export interface PasswordValidation {
  isValid: boolean;
  message: string;
  requirements: {
    length: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
  };
}

export interface PasswordChangeData {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeValidation extends PasswordValidation {
  passwordsMatch: boolean;
}

export interface Vendedor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  tenant_id: string;
  last_login?: string;
  last_login_formatted?: string;
  is_real_login?: boolean;
}

export interface CompanyModalTab {
  id: 'company' | 'expectations' | 'admin';
  label: string;
  icon: React.ComponentType<any>;
}

export interface IndustrySegment {
  value: string;
  label: string;
  description: string;
  category: string;
}

export interface CompanyModalProps extends Omit<CrudModalProps<Company>, 'onSave'> {
  onSuccess: () => void; // Mantido para compatibilidade
  company?: Company | null; // Mantido para compatibilidade
  onSave?: (item: Company) => Promise<void> | void; // Opcional para compatibilidade
}

// Interfaces para gerenciamento de múltiplos administradores
export interface AdminFormData {
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password?: string; // Senha para criação/edição
  confirmPassword?: string; // Confirmação de senha
}

export interface MultipleAdminsState {
  admins: CompanyAdmin[];
  isLoading: boolean;
  isAdding: boolean;
  editingAdminId: string | null;
  showAddForm: boolean;
}

export interface AdminOperations {
  addAdmin: (adminData: AdminFormData) => Promise<boolean>;
  removeAdmin: (adminId: string) => Promise<boolean>;
  updateAdmin: (adminId: string, adminData: AdminFormData) => Promise<boolean>;
  toggleAddForm: () => void;
  startEditingAdmin: (adminId: string) => void;
  stopEditingAdmin: () => void;
} 