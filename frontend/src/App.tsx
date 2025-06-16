import { Routes, Route, Navigate } from 'react-router-dom'
import AuthProvider from './providers/AuthProvider'
import LoginForm from './components/LoginForm'
import AppDashboard from './components/AppDashboard'
import ErrorBoundary from './utils/errorBoundary'
import { useAuth } from './contexts/AuthContext'
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginForm />} 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AppDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
