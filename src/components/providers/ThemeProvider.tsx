import * as React from "react"
import { motion } from "framer-motion"

type Theme = "dark" | "light" | "system"

interface ThemeProviderContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  currentTheme: "dark" | "light"
}

const ThemeProviderContext = React.createContext<ThemeProviderContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "crm-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  const getCurrentTheme = React.useCallback((): "dark" | "light" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return theme
  }, [theme])

  const [currentTheme, setCurrentTheme] = React.useState<"dark" | "light">(getCurrentTheme)

  React.useEffect(() => {
    const root = window.document.documentElement
    const newTheme = getCurrentTheme()
    
    root.classList.remove("light", "dark")
    root.classList.add(newTheme)
    
    setCurrentTheme(newTheme)
    localStorage.setItem(storageKey, theme)
  }, [theme, getCurrentTheme, storageKey])

  // Listen for system theme changes
  React.useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => {
        const newTheme = mediaQuery.matches ? "dark" : "light"
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add(newTheme)
        setCurrentTheme(newTheme)
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    return undefined; // ✅ CORREÇÃO TS7030: Retorno explícito para todos os caminhos
  }, [theme])

  const value = React.useMemo(() => ({
    theme,
    setTheme,
    currentTheme,
  }), [theme, currentTheme])

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Componente para toggle do tema
export function ThemeToggle() {
  const { theme, setTheme, currentTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getThemeIcon = () => {
    if (theme === "light") return "☀️"
    if (theme === "dark") return "🌙"
    return "🌓"
  }

  const getThemeLabel = () => {
    if (theme === "light") return "Claro"
    if (theme === "dark") return "Escuro"
    return "Sistema"
  }

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
      title={`Tema atual: ${getThemeLabel()}`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-xl block"
      >
        {getThemeIcon()}
      </motion.span>
    </motion.button>
  )
}