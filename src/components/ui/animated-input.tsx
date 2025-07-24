import * as React from "react"
import { motion } from "framer-motion"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  isLoading?: boolean
  showPasswordToggle?: boolean
}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ 
    label, 
    error, 
    isLoading, 
    showPasswordToggle = false,
    className,
    type = "text",
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)

    const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type
    
    const handleTogglePassword = () => {
      setShowPassword(!showPassword)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      if (props.onChange) {
        props.onChange(e)
      }
    }

    return (
      <div className="relative space-y-2">
        {label && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Label 
              htmlFor={props.id}
              className={cn(
                "text-sm font-medium transition-colors duration-200",
                error ? "text-red-500" : "text-gray-700",
                isFocused && !error && "text-blue-600"
              )}
            >
              {label}
            </Label>
          </motion.div>
        )}
        
        <div className="relative">
          <div>
            <input
              ref={ref}
              type={inputType}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                "relative transition-all duration-200 ease-in-out",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                isFocused && !error && "border-blue-500 shadow-lg shadow-blue-500/10",
                isLoading && "opacity-50 cursor-not-allowed",
                hasValue && "bg-blue-50/50",
                showPasswordToggle && "pr-12",
                className
              )}
              onFocus={(e) => {
                setIsFocused(true)
                if (props.onFocus) props.onFocus(e)
              }}
              onBlur={(e) => {
                setIsFocused(false)
                if (props.onBlur) props.onBlur(e)
              }}
              onChange={handleInputChange}
              disabled={isLoading}
              {...props}
            />
            
            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}
            
            {/* Password Toggle */}
            {showPasswordToggle && !isLoading && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTogglePassword}
                className="absolute right-2 inset-y-0 flex items-center justify-center w-10 h-10 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 z-10"
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                )}
              </motion.button>
            )}
          </div>
          
        </div>
        
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 30 }}
            >
              ⚠️
            </motion.span>
            {error}
          </motion.div>
        )}
        
        {/* Success State */}
        {hasValue && !error && !isFocused && !showPasswordToggle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </motion.div>
        )}
      </div>
    )
  }
)

AnimatedInput.displayName = "AnimatedInput"

export { AnimatedInput }