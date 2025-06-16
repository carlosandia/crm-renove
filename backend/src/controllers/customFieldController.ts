import { Request, Response } from 'express';
import { CustomFieldService } from '../services/customFieldService';

export class CustomFieldController {
  static async getCustomFields(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;

      if (!pipeline_id) {
        return res.status(400).json({ error: 'pipeline_id é obrigatório' });
      }

      const fields = await CustomFieldService.getCustomFieldsByPipeline(pipeline_id);
      res.json({ fields });
    } catch (error) {
      console.error('Erro ao buscar campos customizados:', error);
      res.status(500).json({ 
        error: 'Erro ao buscar campos customizados',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async createCustomField(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { field_name, field_label, field_type, field_options, is_required, placeholder } = req.body;

      if (!field_name || !field_label || !field_type) {
        return res.status(400).json({ 
          error: 'field_name, field_label e field_type são obrigatórios' 
        });
      }

      const field = await CustomFieldService.createCustomField({
        pipeline_id,
        field_name,
        field_label,
        field_type,
        field_options,
        is_required,
        placeholder
      });

      res.status(201).json({ 
        message: 'Campo customizado criado com sucesso',
        field 
      });
    } catch (error) {
      console.error('Erro ao criar campo customizado:', error);
      res.status(500).json({ 
        error: 'Erro ao criar campo customizado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async updateCustomField(req: Request, res: Response) {
    try {
      const { field_id } = req.params;
      const { field_label, field_type, field_options, is_required, placeholder } = req.body;

      const field = await CustomFieldService.updateCustomField(field_id, {
        field_label,
        field_type,
        field_options,
        is_required,
        placeholder
      });

      res.json({ 
        message: 'Campo customizado atualizado com sucesso',
        field 
      });
    } catch (error) {
      console.error('Erro ao atualizar campo customizado:', error);
      res.status(500).json({ 
        error: 'Erro ao atualizar campo customizado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async deleteCustomField(req: Request, res: Response) {
    try {
      const { field_id } = req.params;

      await CustomFieldService.deleteCustomField(field_id);

      res.json({ message: 'Campo customizado excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir campo customizado:', error);
      res.status(500).json({ 
        error: 'Erro ao excluir campo customizado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  static async reorderFields(req: Request, res: Response) {
    try {
      const { pipeline_id } = req.params;
      const { field_orders } = req.body; // Array de { id, field_order }

      if (!Array.isArray(field_orders)) {
        return res.status(400).json({ error: 'field_orders deve ser um array' });
      }

      await CustomFieldService.reorderFields(pipeline_id, field_orders);

      res.json({ message: 'Campos reordenados com sucesso' });
    } catch (error) {
      console.error('Erro ao reordenar campos:', error);
      res.status(500).json({ 
        error: 'Erro ao reordenar campos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
} 