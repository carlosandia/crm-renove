import React from 'react'

export default function TestApp() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>🚀 React App Funcionando!</h1>
      <p>Se você está vendo isso, o React está carregando corretamente.</p>
      <div style={{
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
        marginTop: '10px'
      }}>
        ✅ Componente React renderizado com sucesso
      </div>
    </div>
  )
}