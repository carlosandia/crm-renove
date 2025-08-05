// Script para debug do login no navegador
// Execute no Console do DevTools na página http://127.0.0.1:8080/login

console.log('🚀 Debug Login - Iniciando testes...');

// Teste 1: Verificar se Supabase está disponível
if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    console.log('📍 Executando no frontend local');
    
    // Simular o que o AuthProvider deveria fazer
    async function testLoginProcess() {
        try {
            console.log('🔑 Simulando processo de login...');
            
            // Dados de teste
            const email = 'seraquevai@seraquevai.com';
            const password = 'abc12345!';
            
            // Simular chamada direta ao Supabase
            const response = await fetch('https://marajvabdwkpgopytvhh.supabase.co/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmFqdmFiZHdrcGdvcHl0dmhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjQwMDksImV4cCI6MjA2NTM0MDAwOX0.C_2W2u8JyApjbhqPJm1q1dFX82KoRSm3auBfE7IpmDU',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                console.log('✅ Login direto no Supabase funcionou!', {
                    email: result.user?.email,
                    access_token: result.access_token?.substring(0, 50) + '...'
                });
                
                // Testar backend
                const backendResponse = await fetch('http://127.0.0.1:3001/api/pipelines', {
                    headers: {
                        'Authorization': `Bearer ${result.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const backendResult = await backendResponse.json();
                
                if (backendResponse.ok) {
                    console.log('✅ Backend funcionou!', {
                        pipelines: backendResult.pipelines?.length || 0
                    });
                } else {
                    console.log('❌ Backend falhou:', backendResult);
                }
                
                return { success: true, token: result.access_token };
                
            } else {
                console.log('❌ Login direto falhou:', result);
                return { success: false, error: result };
            }
            
        } catch (error) {
            console.log('❌ Erro no teste:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Executar teste
    testLoginProcess().then(result => {
        console.log('🏁 Resultado final do teste:', result);
    });
    
} else {
    console.log('❌ Execute este script na página do frontend local');
}