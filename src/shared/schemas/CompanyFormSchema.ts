import { z } from 'zod';
import { FORM_VALIDATION, REGEX_PATTERNS } from '../../utils/constants';

// AIDEV-NOTE: Schema Zod para validação do formulário de empresa seguindo padrões CLAUDE.md

export const CompanyFormSchema = z.object({
  // Dados da empresa
  name: z
    .string()
    .min(1, 'Nome da empresa é obrigatório')
    .max(FORM_VALIDATION.MAX_NAME_LENGTH, `Nome deve ter no máximo ${FORM_VALIDATION.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  segmento: z
    .string()
    .min(1, 'Segmento é obrigatório'),
  
  website: z
    .string()
    .url('Website deve ser uma URL válida')
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .regex(REGEX_PATTERNS.PHONE_BR, 'Telefone deve estar no formato brasileiro')
    .optional()
    .or(z.literal('')),
  
  email: z
    .string()
    .email('Email inválido')
    .max(FORM_VALIDATION.MAX_EMAIL_LENGTH, `Email deve ter no máximo ${FORM_VALIDATION.MAX_EMAIL_LENGTH} caracteres`)
    .optional()
    .or(z.literal('')),
  
  // Localização
  address: z
    .string()
    .max(FORM_VALIDATION.MAX_DESCRIPTION_LENGTH, `Endereço deve ter no máximo ${FORM_VALIDATION.MAX_DESCRIPTION_LENGTH} caracteres`)
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .min(1, 'Cidade é obrigatória')
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .trim(),
  
  state: z
    .string()
    .min(2, 'Estado é obrigatório')
    .max(2, 'Estado deve ter 2 caracteres')
    .regex(/^[A-Z]{2}$/, 'Estado deve estar no formato UF (ex: SP)'),
  
  // Metas numéricas
  expected_leads_monthly: z
    .number()
    .min(0, 'Valor deve ser positivo')
    .max(100000, 'Valor muito alto')
    .optional()
    .default(0),
  
  expected_sales_monthly: z
    .number()
    .min(0, 'Valor deve ser positivo')
    .max(10000, 'Valor muito alto')
    .optional()
    .default(0),
  
  expected_followers_monthly: z
    .number()
    .min(0, 'Valor deve ser positivo')
    .max(1000000, 'Valor muito alto')
    .optional()
    .default(0),
});

export const AdminFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do administrador é obrigatório')
    .max(FORM_VALIDATION.MAX_NAME_LENGTH, `Nome deve ter no máximo ${FORM_VALIDATION.MAX_NAME_LENGTH} caracteres`)
    .trim(),
  
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(FORM_VALIDATION.MAX_EMAIL_LENGTH, `Email deve ter no máximo ${FORM_VALIDATION.MAX_EMAIL_LENGTH} caracteres`)
    .toLowerCase()
    .trim(),
  
  phone: z
    .string()
    .regex(REGEX_PATTERNS.PHONE_BR, 'Telefone deve estar no formato brasileiro')
    .optional()
    .or(z.literal('')),
  
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(50, 'Senha deve ter no máximo 50 caracteres')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Senha deve conter pelo menos 1 letra e 1 número'),
  
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

// Schema combinado para validação completa
export const CompleteCompanyFormSchema = z.object({
  company: CompanyFormSchema,
  admin: AdminFormSchema,
});

// Tipos inferidos dos schemas
export type CompanyFormData = z.infer<typeof CompanyFormSchema>;
export type AdminFormData = z.infer<typeof AdminFormSchema>;
export type CompleteCompanyFormData = z.infer<typeof CompleteCompanyFormSchema>;

// Função de validação por etapas (seguindo padrão StepLeadModal)
export const validateCompanyFormStep = (
  step: number,
  companyData: Partial<CompanyFormData>,
  adminData: Partial<AdminFormData>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  try {
    switch (step) {
      case 1:
        // Validar apenas campos obrigatórios da empresa
        const step1Schema = CompanyFormSchema.pick({
          name: true,
          segmento: true,
        }).merge(
          CompanyFormSchema.pick({
            website: true,
            phone: true,
            email: true,
          }).partial()
        );
        
        step1Schema.parse(companyData);
        break;
        
      case 2:
        // Validar localização
        const step2Schema = CompanyFormSchema.pick({
          city: true,
          state: true,
        }).merge(
          CompanyFormSchema.pick({
            address: true,
            expected_leads_monthly: true,
            expected_sales_monthly: true,
            expected_followers_monthly: true,
          }).partial()
        );
        
        step2Schema.parse(companyData);
        break;
        
      case 3:
        // Validar administrador
        AdminFormSchema.parse(adminData);
        break;
        
      case 4:
        // Validação final completa
        CompanyFormSchema.parse(companyData);
        AdminFormSchema.parse(adminData);
        break;
    }
    
    return { isValid: true, errors: {} };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
    }
    
    return { isValid: false, errors };
  }
};