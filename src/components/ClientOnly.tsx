'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

const ClientOnly = ({ children, fallback = null }: ClientOnlyProps) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // Garantir que a hidratação aconteça de forma segura
    const timer = setTimeout(() => {
      setHasMounted(true)
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  // Durante a hidratação, renderizar o fallback
  if (!hasMounted) {
    return <>{fallback}</>
  }

  // Após a hidratação, renderizar os children
  return <>{children}</>
}

export default ClientOnly 