import * as React from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
// import { useNavigate } from "react-router-dom" // Removido para evitar warnings v7
import { AnimatedLoginCard } from "../ui/animated-login-card"
import { AnimatedInput } from "../ui/animated-input"
import { AnimatedLoginButton } from "../ui/animated-login-button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../ui/form"
import { loginSchema, type LoginInput } from "../../schemas/auth"
import { LogIn } from "lucide-react"
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


  const actualLoading = isLoading

  return (
    <div className={cn("w-full", className)}>
      <AnimatedLoginCard
        className="w-full max-w-md"
      >
        <div className="space-y-6">

          {/* Formulário de Login */}
          <Form {...form}>
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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
        </div>
      </AnimatedLoginCard>
    </div>
  )
}

export { ModernLoginForm }