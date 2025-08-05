//
// Quick Test: Verificar se dados fake estão funcionando
//

console.log('🔍 Iniciando teste rápido...');

// Aguardar alguns segundos e testar
setTimeout(() => {
    console.log('🔍 Procurando por badges na página...');
    
    // Procurar por badges na página (assumindo que têm texto como "0/3")
    const badges = document.querySelectorAll('[class*="badge"], [class*="rounded"], div[class*="px-2"], span[class*="px-2"]');
    
    console.log(`🔍 Encontradas ${badges.length} badges potenciais`);
    
    badges.forEach((badge, index) => {
        const text = badge.textContent?.trim();
        if (text && /\d+\/\d+/.test(text)) {
            console.log(`🎯 Badge ${index}: "${text}" (${badge.className})`);
        }
    });
    
    // Procurar especificamente por leads do pipeline new13
    const leadCards = document.querySelectorAll('[class*="card"], [class*="lead"], div[class*="bg-white"]');
    console.log(`🔍 Encontrados ${leadCards.length} cards potenciais`);
    
    leadCards.forEach((card, index) => {
        const text = card.textContent;
        if (text && text.includes('caca')) { // Nome do lead de teste
            console.log(`🎯 Card do lead 'caca' encontrado:`, {
                index,
                badges: card.querySelectorAll('[class*="px-2"]').length,
                text: text.substring(0, 200)
            });
        }
    });
    
}, 3000);

console.log('✅ Teste agendado para 3 segundos');