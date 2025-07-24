import React from 'react'
import ReactDOM from 'react-dom/client'
import TestApp from './TestApp'

console.log('🚀 main-test.tsx carregado')

const root = document.getElementById('root')
if (root) {
  console.log('✅ Elemento root encontrado')
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  )
} else {
  console.error('❌ Elemento root não encontrado')
}