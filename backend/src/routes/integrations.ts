
import express from 'express';
import { supabase } from '../index';

const router = express.Router();

// Listar integrações
router.get('/', async (req, res) => {
  try {
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*');

    if (error) {
      throw error;
    }

    res.json({
      integrations: integrations || []
    });
  } catch (error) {
    console.error('Erro ao buscar integrações:', error);
    res.status(500).json({
      message: 'Erro ao buscar integrações',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Atualizar integração
router.put('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { google_ads_token, meta_ads_token, linkedin_ads_token } = req.body;

    const { data: integration, error } = await supabase
      .from('integrations')
      .upsert([{
        company_id: companyId,
        google_ads_token,
        meta_ads_token,
        linkedin_ads_token
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      integration
    });
  } catch (error) {
    console.error('Erro ao atualizar integração:', error);
    res.status(500).json({
      message: 'Erro ao atualizar integração',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
