/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@modelcontextprotocol/sdk']
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://marajvabdwkpgopytvhh.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  // Configurações para eliminar warnings e erros
  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  
  // Configurações de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  
  // Suprimir warnings de desenvolvimento
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Configurações para reduzir erros de console
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Configurações de webpack para suprimir warnings
  webpack: (config, { dev, isServer }) => {
    // Configurações para desenvolvimento
    if (dev) {
      config.devtool = 'cheap-module-source-map';
      
      // Suprimir warnings específicos
      config.infrastructureLogging = {
        level: 'error',
      };
      
      // Configurar stats para reduzir output
      config.stats = {
        ...config.stats,
        warnings: false,
        warningsFilter: [
          /Module not found/,
          /export .* was not found in/,
          /Critical dependency/,
          /the request of a dependency is an expression/
        ]
      };
    }
    
    // Configurações gerais
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig 