
import React from 'react';
import './App.css';
import AuthProvider from './providers/AuthProvider';
import AppContent from './components/AppContent';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
