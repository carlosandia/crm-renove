'use client'

import { useEffect, useState, useCallback, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

const ClientOnly = ({ children, fallback = null }: ClientOnlyProps) => {
  const [hasMounted, setHasMounted] = useState(false)

  const handleMount = useCallback(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    // Garantir que a hidratação aconteça de forma segura
    const timer = setTimeout(handleMount, 0)

    return () => clearTimeout(timer)
  }, [handleMount])

  // Durante a hidratação, renderizar o fallback
  if (!hasMounted) {
    return <>{fallback}</>
  }

  // Após a hidratação, renderizar os children
  return <>{children}</>
}

export default ClientOnly 