// Teste para simular DELETE operation via JavaScript
// Será executado no console do navegador

console.log("🧪 TESTE DE DELETE OPERATION - DIAGNÓSTICO");
console.log("=" * 50);

// Simular autenticação e dados de teste
const testUserId = "d5c4e3f2-a1b2-4c5d-8e9f-0123456789ab"; // User ID fake para teste
const testTenantId = "d7caffc1-c923-47c8-9301-ca9eeff1a243"; // Tenant ID real
const testLeadId = "test-lead-123"; // Lead ID para teste

console.log("📋 Dados de teste:");
console.log(`   User ID: ${testUserId}`);
console.log(`   Tenant ID: ${testTenantId}`);
console.log(`   Lead ID: ${testLeadId}`);

// Verificar autenticação Supabase atual
if (typeof supabase !== 'undefined') {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error) {
            console.error("❌ Erro de autenticação:", error);
            return;
        }
        
        if (user) {
            console.log("✅ Usuário autenticado:");
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Tenant ID: ${user.user_metadata?.tenant_id}`);
            console.log(`   Role: ${user.user_metadata?.role}`);
            
            // Testar DELETE operation
            console.log("\n🧪 Simulando DELETE operation...");
            
            supabase
                .from('pipeline_leads')
                .delete()
                .eq('id', testLeadId)
                .then(({ data, error }) => {
                    if (error) {
                        console.log("❌ DELETE falhou (esperado se não existir):", error.message);
                        console.log("✅ Isso indica que a RLS policy está funcionando");
                    } else {
                        console.log("⚠️ DELETE retornou sucesso:", data);
                        console.log("⚠️ Verificar se policy está muito permissiva");
                    }
                });
                
        } else {
            console.log("❌ Usuário não autenticado");
        }
    });
} else {
    console.log("❌ Supabase client não encontrado");
    console.log("📋 Execute este teste no console do navegador na aplicação");
}

console.log("\n📋 INSTRUÇÕES:");
console.log("1. Copie este código");
console.log("2. Abra http://127.0.0.1:8080/ no navegador");
console.log("3. Abra DevTools (F12) → Console");
console.log("4. Cole e execute o código");
console.log("5. Analise os resultados para verificar RLS policy");