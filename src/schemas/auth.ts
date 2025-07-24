import { z } from "zod"

// Schema de validação para login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(6, "Senha deve ter pelo menos 6 caracteres"),
})

// Schema de validação para registro
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  confirmPassword: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
  firstName: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z
    .string()
    .min(1, "Sobrenome é obrigatório")
    .min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  companyName: z
    .string()
    .min(1, "Nome da empresa é obrigatório")
    .min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

// Schema de validação para recuperação de senha
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .toLowerCase(),
})

// Schema de validação para redefinição de senha
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Token é obrigatório"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  confirmPassword: z
    .string()
    .min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

// Tipos inferidos dos schemas
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Credenciais de teste pré-definidas
export const testCredentials = {
  superAdmin: {
    email: "superadmin@crm.com",
    password: "SuperAdmin123!",
    role: "super_admin" as const,
    label: "Super Admin",
    description: "Acesso total ao sistema"
  },
  admin: {
    email: "seraquevai@seraquevai.com",
    password: "abc12345!",
    role: "admin" as const,
    label: "Admin",
    description: "Gerenciamento de empresa"
  },
  member: {
    email: "membro@teste.com",
    password: "membro123!",
    role: "member" as const,
    label: "Member",
    description: "Operador comercial"
  }
} as const

// Função para validar credenciais de teste
export const validateTestCredentials = (email: string, password: string) => {
  const credentials = Object.values(testCredentials).find(
    cred => cred.email === email && cred.password === password
  )
  
  if (credentials) {
    return {
      isValid: true,
      user: {
        email: credentials.email,
        role: credentials.role,
        tenant_id: credentials.role === "super_admin" ? "global" : "d7caffc1-c923-47c8-9301-ca9eeff1a243",
        first_name: credentials.role === "super_admin" ? "Super" : 
                   credentials.role === "admin" ? "Admin" : "Member",
        last_name: "User",
        company_name: credentials.role === "super_admin" ? "CRM System" : "Teste Company"
      }
    }
  }
  
  return {
    isValid: false,
    user: null
  }
}