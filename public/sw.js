// CRM Marketing - Service Worker para Cache Estratégico
// Versão 4.0 - Preparação para Produção Enterprise

const CACHE_NAME = 'crm-marketing-v4.0';
const STATIC_CACHE = 'crm-static-v4.0';
const API_CACHE = 'crm-api-v4.0';
const IMAGES_CACHE = 'crm-images-v4.0';

// Recursos estáticos para cache imediato
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Padrões de URL para diferentes estratégias de cache
const CACHE_STRATEGIES = {
  // Cache First - Recursos estáticos
  static: /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/,
  
  // Network First - APIs críticas
  api: /\/api\/(auth|user|dashboard)/,
  
  // Stale While Revalidate - APIs de dados
  data: /\/api\/(leads|pipelines|companies|forms)/,
  
  // Cache Only - Recursos offline
  offline: /\/offline/
};

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v4.0');
  
  event.waitUntil(
    Promise.all([
      // Cache recursos estáticos
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Pular espera para ativar imediatamente
      self.skipWaiting()
    ])
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v4.0');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== STATIC_CACHE &&
                     cacheName !== API_CACHE &&
                     cacheName !== IMAGES_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Controlar todas as abas imediatamente
      self.clients.claim()
    ])
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia baseada no tipo de recurso
  if (CACHE_STRATEGIES.static.test(url.pathname)) {
    // Cache First para recursos estáticos
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    
  } else if (CACHE_STRATEGIES.api.test(url.pathname)) {
    // Network First para APIs críticas
    event.respondWith(networkFirst(request, API_CACHE));
    
  } else if (CACHE_STRATEGIES.data.test(url.pathname)) {
    // Stale While Revalidate para dados
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    
  } else if (request.destination === 'image') {
    // Cache First para imagens
    event.respondWith(cacheFirst(request, IMAGES_CACHE));
    
  } else if (request.mode === 'navigate') {
    // Network First para navegação
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

// Estratégia Cache First
async function cacheFirst(request, cacheName) {
  try {
    // ✅ CORREÇÃO: Só trabalhar com cache para requisições GET
    if (request.method !== 'GET') {
      // Para requisições não-GET, apenas fazer fetch direto
      return await fetch(request);
    }

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Atualizar cache em background se necessário
      updateCacheInBackground(request, cache);
      return cachedResponse;
    }
    
    // Buscar da rede e cachear (apenas GET)
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    return getCachedOrOffline(request);
  }
}

// Estratégia Network First
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // ✅ CORREÇÃO: Só cachear requisições GET (Cache API não suporta POST/PUT/DELETE)
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // ✅ CORREÇÃO: Só buscar no cache requisições GET
    if (request.method === 'GET') {
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return getCachedOrOffline(request);
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  // ✅ CORREÇÃO: Só trabalhar com cache em requisições GET
  if (request.method !== 'GET') {
    // Para requisições não-GET, apenas fazer fetch direto
    try {
      return await fetch(request);
    } catch (error) {
      return getCachedOrOffline(request);
    }
  }

  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Atualizar cache em background (apenas para GET)
  const networkPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok && request.method === 'GET') {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Falha silenciosa na rede
  });
  
  // Retornar cache imediatamente se disponível
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Aguardar rede se não há cache
  try {
    return await networkPromise;
  } catch (error) {
    return getCachedOrOffline(request);
  }
}

// Atualizar cache em background
async function updateCacheInBackground(request, cache) {
  try {
    // ✅ CORREÇÃO: Só atualizar cache para requisições GET
    if (request.method === 'GET') {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
    }
  } catch (error) {
    // Falha silenciosa
  }
}

// Fallback para offline
async function getCachedOrOffline(request) {
  // Tentar cache geral
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Página offline para navegação
  if (request.mode === 'navigate') {
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback básico
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>CRM Marketing - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 40px; text-align: center; background: #f5f5f5;
            }
            .container { 
              max-width: 400px; margin: 0 auto; background: white; 
              padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.5; }
            .retry { 
              background: #007bff; color: white; border: none; 
              padding: 12px 24px; border-radius: 4px; cursor: pointer;
              margin-top: 20px; font-size: 16px;
            }
            .retry:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📱</div>
            <h1>Você está offline</h1>
            <p>Não é possível conectar ao CRM Marketing no momento. Verifique sua conexão e tente novamente.</p>
            <button class="retry" onclick="window.location.reload()">
              Tentar Novamente
            </button>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200
      }
    );
  }
  
  // Resposta JSON para APIs
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Dados não disponíveis offline'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
  
  // Fallback genérico
  return new Response('Recurso não disponível offline', { status: 503 });
}

// Background Sync para operações offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-leads') {
    event.waitUntil(syncLeads());
  } else if (event.tag === 'background-sync-forms') {
    event.waitUntil(syncForms());
  }
});

// Sincronizar leads em background
async function syncLeads() {
  try {
    // Implementar sincronização de leads pendentes
    console.log('[SW] Syncing leads in background');
    
    // Buscar dados pendentes do IndexedDB
    // Enviar para servidor quando online
    // Atualizar cache local
    
  } catch (error) {
    console.error('[SW] Lead sync failed:', error);
  }
}

// Sincronizar formulários em background
async function syncForms() {
  try {
    console.log('[SW] Syncing forms in background');
    
    // Implementar sincronização de formulários
    
  } catch (error) {
    console.error('[SW] Form sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nova notificação do CRM Marketing',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('CRM Marketing', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker v4.0 loaded successfully'); 