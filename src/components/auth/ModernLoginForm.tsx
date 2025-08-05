import * as React from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
// import { useNavigate } from "react-router-dom" // Removido para evitar warnings v7
import { AnimatedLoginCard } from "../ui/animated-login-card"
import { AnimatedInput } from "../ui/animated-input"
import { AnimatedLoginButton } from "../ui/animated-login-button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form"
import { Separator } from "../ui/separator"
import { loginSchema, type LoginInput, testCredentials } from "../../schemas/auth"
import { Shield, User, Crown, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "../../providers/AuthProvider"

interface ModernLoginFormProps {
  className?: string
}

const ModernLoginForm: React.FC<ModernLoginFormProps> = ({
  className
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [loginError, setLoginError] = React.useState<string | null>(null)
  // const navigate = useNavigate() // Removido para evitar warnings v7
  const { login } = useAuth()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setLoginError(null)

    try {
      console.log('🔐 ModernLoginForm - Iniciando login:', data.email)
      
      // Usar AuthProvider para login real
      const loginResult = await login(data.email, data.password)
      
      if (loginResult.success) {
        console.log('✅ ModernLoginForm - Login bem-sucedido!')
        setIsSuccess(true)
        
        // O AuthProvider vai gerenciar o redirecionamento automaticamente
        // através do onAuthStateChange listener
      } else {
        console.log('❌ ModernLoginForm - Login falhou:', loginResult.message)
        setLoginError(loginResult.message || "Credenciais inválidas. Verifique email e senha.")
      }
    } catch (error) {
      console.error('❌ ModernLoginForm - Erro no login:', error)
      setLoginError("Erro ao fazer login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async (role: "super_admin" | "admin") => {
    setIsLoading(true)
    setLoginError(null)

    try {
      console.log('⚡ ModernLoginForm - Login rápido para:', role)
      
      // 🔧 CORREÇÃO: Mapear role para propriedade correta do testCredentials
      const roleMap = {
        "super_admin": "superAdmin",
        "admin": "admin"
      } as const
      
      const credentialKey = roleMap[role]
      const credentials = testCredentials[credentialKey]
      
      if (!credentials) {
        throw new Error(`Credenciais não encontradas para o role: ${role}`)
      }
      
      // Usar AuthProvider para login real
      const loginResult = await login(credentials.email, credentials.password)
      
      if (loginResult.success) {
        console.log('✅ ModernLoginForm - Login rápido bem-sucedido!')
        setIsSuccess(true)
        
        // O AuthProvider vai gerenciar o redirecionamento automaticamente
      } else {
        console.log('❌ ModernLoginForm - Login rápido falhou:', loginResult.message)
        setLoginError(loginResult.message || "Erro no login rápido. Tente novamente.")
      }
    } catch (error) {
      console.error('❌ ModernLoginForm - Erro no login rápido:', error)
      setLoginError("Erro ao fazer login rápido. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const actualLoading = isLoading

  return (
    <div className={cn("w-full", className)}>
      <AnimatedLoginCard
        className="w-full max-w-md"
      >
        <div className="space-y-6">
          {/* Botões de Acesso Rápido */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-medium text-gray-700 text-center mb-3">
                Acesso Rápido
              </h3>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickLogin("super_admin")}
                disabled={actualLoading}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed",
                  "border-purple-300 hover:border-purple-500 hover:bg-purple-50",
                  "transition-all duration-200 group",
                  actualLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Crown className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-purple-700">
                  Super Admin
                </span>
                <span className="text-xs text-gray-500">
                  Acesso total
                </span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickLogin("admin")}
                disabled={actualLoading}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed",
                  "border-blue-300 hover:border-blue-500 hover:bg-blue-50",
                  "transition-all duration-200 group",
                  actualLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Shield className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-blue-700">
                  Admin
                </span>
                <span className="text-xs text-gray-500">
                  Gerenciamento
                </span>
              </motion.button>
            </div>
          </div>

          {/* Separador */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <Separator className="my-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-3 text-xs text-gray-500">
                ou entre manualmente
              </span>
            </div>
          </motion.div>

          {/* Formulário de Login */}
          <Form {...form}>
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AnimatedInput
                        {...field}
                        type="email"
                        label="Email"
                        placeholder="seu@email.com"
                        isLoading={actualLoading}
                        error={form.formState.errors.email?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AnimatedInput
                        {...field}
                        type="password"
                        label="Senha"
                        placeholder="••••••••"
                        showPasswordToggle
                        isLoading={actualLoading}
                        error={form.formState.errors.password?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Erro Geral */}
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-md bg-red-50 border border-red-200"
                >
                  <p className="text-sm text-red-600">
                    {loginError}
                  </p>
                </motion.div>
              )}

              {/* Botão de Login */}
              <AnimatedLoginButton
                type="submit"
                isLoading={actualLoading}
                isSuccess={isSuccess}
                className="w-full"
                size="lg"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </AnimatedLoginButton>
            </motion.form>
          </Form>

          {/* Credenciais de Teste */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Credenciais de Teste:
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>
                <strong>Super Admin:</strong> superadmin@crm.com / SuperAdmin123!
              </div>
              <div>
                <strong>Admin:</strong> seraquevai@seraquevai.com / abc12345!
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedLoginCard>
    </div>
  )
}

export { ModernLoginForm }