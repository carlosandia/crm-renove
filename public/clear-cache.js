// Script para limpar cache do navegador
console.log('🧹 Limpando cache do navegador...');

// Limpar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('✅ Service Worker removido');
    });
  });
}

// Limpar cache das APIs
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log('✅ Cache removido:', cacheName);
    });
  });
}

// Limpar localStorage
if (typeof localStorage !== 'undefined') {
  localStorage.clear();
  console.log('✅ localStorage limpo');
}

// Limpar sessionStorage
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.clear();
  console.log('✅ sessionStorage limpo');
}

// Recarregar página
setTimeout(() => {
  console.log('🔄 Recarregando página...');
  window.location.reload(true);
}, 1000);