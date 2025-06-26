-- Script de teste para ETAPA 1: Documentos, Links e Notas
-- Adicionar dados de exemplo em um lead existente

-- Primeiro, vamos buscar um lead existente
DO $$
DECLARE
    test_lead_id UUID;
    current_data JSONB;
BEGIN
    -- Buscar o primeiro lead disponível
    SELECT id, COALESCE(custom_data, lead_data, '{}'::jsonb) 
    INTO test_lead_id, current_data
    FROM pipeline_leads 
    LIMIT 1;
    
    IF test_lead_id IS NOT NULL THEN
        -- Adicionar dados de teste para os novos campos
        UPDATE pipeline_leads 
        SET custom_data = current_data || jsonb_build_object(
            'documentos_anexos', jsonb_build_array(
                jsonb_build_object(
                    'name', 'Proposta Comercial.pdf',
                    'url', 'https://exemplo.com/proposta.pdf',
                    'type', 'PDF'
                ),
                jsonb_build_object(
                    'name', 'Apresentação do Produto.pptx',
                    'url', 'https://exemplo.com/apresentacao.pptx',
                    'type', 'PowerPoint'
                )
            ),
            'links_oportunidade', jsonb_build_array(
                jsonb_build_object(
                    'title', 'Site da Empresa',
                    'url', 'https://empresa-cliente.com.br',
                    'description', 'Website institucional do cliente'
                ),
                jsonb_build_object(
                    'title', 'LinkedIn da Empresa',
                    'url', 'https://linkedin.com/company/empresa-cliente',
                    'description', 'Perfil no LinkedIn'
                ),
                jsonb_build_object(
                    'title', 'Portal de Compras',
                    'url', 'https://compras.empresa-cliente.com.br',
                    'description', 'Sistema interno de compras'
                )
            ),
            'notas_oportunidade', 'Cliente demonstrou muito interesse no produto premium. Mencionou que tem orçamento aprovado para Q1 2025. Próxima reunião agendada para 15/01 às 14h para apresentação técnica detalhada.

Pontos importantes:
- Decisor principal: João Silva (Diretor de TI)
- Budget aprovado: R$ 150.000
- Implementação desejada: Março 2025
- Concorrente principal: SoftwareCorp
- Diferencial nosso: Integração com sistema legado

Próximos passos:
1. Enviar proposta técnica
2. Agendar demo personalizada
3. Preparar estudo de caso similar'
        )
        WHERE id = test_lead_id;
        
        RAISE NOTICE 'Dados de teste adicionados ao lead: %', test_lead_id;
        RAISE NOTICE 'Acesse o sistema e abra o modal de detalhes para ver os novos campos!';
    ELSE
        RAISE NOTICE 'Nenhum lead encontrado. Crie um lead primeiro através do sistema.';
    END IF;
END $$; 