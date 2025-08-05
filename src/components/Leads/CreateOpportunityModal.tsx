import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Target, DollarSign, Loader2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { BaseModalProps } from '../../types/CommonProps';
import { useArrayState } from '../../hooks/useArrayState';
import { useAsyncState } from '../../hooks/useAsyncState';

interface Pipeline {
  id: string;
  name: string;
}

interface PipelineStage {
  id: string;
  name: string;
  pipeline_id: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CreateOpportunityModalProps extends BaseModalProps {
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

const CreateOpportunityModal: React.FC<CreateOpportunityModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess
}) => {
  const { user } = useAuth();
  
  // ✅ REFATORAÇÃO TAREFA 1: Estados com hooks reutilizáveis
  const {
    loading,
    execute: executeAction,
    isIdle
  } = useAsyncState();

  const {
    items: pipelines,
    replaceAll: setPipelines,
    isEmpty: hasNoPipelines
  } = useArrayState<Pipeline>([]);

  const {
    items: stages,
    replaceAll: setStages
  } = useArrayState<PipelineStage>([]);

  const {
    items: teamMembers,
    replaceAll: setTeamMembers
  } = useArrayState<TeamMember>([]);

  // Estados específicos do modal mantidos
  const [formData, setFormData] = useState({
    nome_oportunidade: '',
    valor: '',
    pipeline_id: '',
    responsavel_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados iniciais
  useEffect(() => {
    if (isOpen && user?.tenant_id) {
      loadInitialData();
    }
  }, [isOpen, user?.tenant_id]);

  // Carregar estágios quando pipeline for selecionada
  useEffect(() => {
    if (formData.pipeline_id) {
      loadStages(formData.pipeline_id);
    }
  }, [formData.pipeline_id]);

  // Preencher nome da oportunidade baseado no lead
  useEffect(() => {
    if (isOpen && leadName) {
      setFormData(prev => ({
        ...prev,
        nome_oportunidade: `Proposta - ${leadName}`,
        responsavel_id: user?.id || '' // Auto-selecionar usuário atual
      }));
    }
  }, [isOpen, leadName, user?.id]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadPipelines(),
        loadTeamMembers()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', user?.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const pipelineList = data || [];
      setPipelines(pipelineList);
      
      // Auto-selecionar se há apenas uma pipeline
      if (pipelineList.length === 1) {
        setFormData(prev => ({
          ...prev,
          pipeline_id: pipelineList[0].id
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
      showErrorToast('Erro ao carregar pipelines');
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', user?.tenant_id)
        .in('role', ['admin', 'member'])
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
    }
  };

  const loadStages = async (pipelineId: string) => {
    try {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('id, name, pipeline_id')
        .eq('pipeline_id', pipelineId)
        .order('order_index');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Erro ao carregar estágios:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const applyCurrencyMask = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Converte para formato monetário
    if (numbers === '') return '';
    
    const amount = parseInt(numbers) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome_oportunidade.trim()) {
      newErrors.nome_oportunidade = 'Nome da oportunidade é obrigatório';
    }

    if (pipelines.length > 1 && !formData.pipeline_id) {
      newErrors.pipeline_id = 'Selecione uma pipeline';
    }

    if (!formData.responsavel_id) {
      newErrors.responsavel_id = 'Selecione um responsável';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    executeAction(async () => {
      try {
        // Buscar dados do lead
        const { data: leadData, error: leadError } = await supabase
          .from('leads_master')
          .select('*')
          .eq('id', leadId)
          .single();

        if (leadError) throw leadError;

        // Selecionar pipeline (primeira se não especificada)
        const selectedPipelineId = formData.pipeline_id || pipelines[0]?.id;
        
        if (!selectedPipelineId) {
          throw new Error('Nenhuma pipeline disponível');
        }

        // Buscar primeiro estágio da pipeline
        const firstStage = stages.find(stage => stage.pipeline_id === selectedPipelineId);
        
        if (!firstStage) {
          throw new Error('Pipeline não possui estágios configurados');
        }

        // Processar valor
        const valorNumerico = formData.valor 
          ? parseFloat(formData.valor.replace(/[^\d,]/g, '').replace(',', '.'))
          : 0;

        // Criar oportunidade na pipeline
        const { error: pipelineError } = await supabase
          .from('pipeline_leads')
          .insert({
            pipeline_id: selectedPipelineId,
            stage_id: firstStage.id,
            assigned_to: formData.responsavel_id, // Usar responsável selecionado
            created_by: user?.id,
            lead_master_id: leadId, // ✅ VINCULAÇÃO DIRETA COM LEADS_MASTER
            custom_data: {
              // ✅ ETAPA 1: DADOS DA OPORTUNIDADE
              nome_oportunidade: formData.nome_oportunidade,
              valor: valorNumerico.toString(),
              
              // ✅ ETAPA 1: DADOS COMPLETOS DO LEAD DE LEADS_MASTER (FONTE ÚNICA)
              nome_lead: leadData.first_name && leadData.last_name 
                ? `${leadData.first_name} ${leadData.last_name}`.trim()
                : leadData.first_name || 'Lead sem nome',
              
              // ✅ CAMPOS DE CONTATO - SEMPRE DE LEADS_MASTER
              email: leadData.email || '',
              telefone: leadData.phone || '',
              
              // ✅ CAMPOS PROFISSIONAIS - SEMPRE DE LEADS_MASTER
              empresa: leadData.company || '',
              cargo: leadData.job_title || '',
              
              // ✅ CAMPOS DE ORIGEM E STATUS - SEMPRE DE LEADS_MASTER
              origem: leadData.lead_source || '',
              temperatura: leadData.lead_temperature || 'warm',
              status: leadData.status || 'active',
              
              // ✅ CAMPOS DE VALOR E CAMPANHA - SEMPRE DE LEADS_MASTER
              campanha: leadData.campaign_name || '',
              
              // ✅ CAMPOS UTM - SEMPRE DE LEADS_MASTER
              utm_source: leadData.utm_source || '',
              utm_medium: leadData.utm_medium || '',
              utm_campaign: leadData.utm_campaign || '',
              utm_term: leadData.utm_term || '',
              utm_content: leadData.utm_content || '',
              
              // ✅ CAMPOS DE LOCALIZAÇÃO - SEMPRE DE LEADS_MASTER
              cidade: leadData.city || '',
              estado: leadData.state || '',
              pais: leadData.country || '',
              
              // ✅ CAMPOS DE OBSERVAÇÕES - SEMPRE DE LEADS_MASTER
              observacoes: leadData.notes || '',
              
              // ✅ VINCULAÇÃO E METADADOS
              lead_master_id: leadId,
              data_source: 'leads_master',
              created_via: 'CreateOpportunityModal',
              last_sync_at: new Date().toISOString()
            }
          });

        if (pipelineError) throw pipelineError;

        // Atualizar status do lead para indicar que tem oportunidade
        await supabase
          .from('leads_master')
          .update({ 
            status: 'converted',
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        showSuccessToast('Oportunidade criada com sucesso!');
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Erro ao criar oportunidade:', error);
        showErrorToast('Erro ao criar oportunidade');
      }
    });
  };

  const handleClose = () => {
    setFormData({
      nome_oportunidade: '',
      valor: '',
      pipeline_id: '',
      responsavel_id: ''
    });
    setErrors({});
    onClose();
  };

  const getResponsavelName = (responsavelId: string) => {
    const responsavel = teamMembers.find(member => member.id === responsavelId);
    return responsavel ? `${responsavel.first_name} ${responsavel.last_name}` : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Criar Nova Oportunidade</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome da Oportunidade */}
          <div>
            <Label htmlFor="nome_oportunidade">Nome da Oportunidade *</Label>
            <Input
              id="nome_oportunidade"
              value={formData.nome_oportunidade}
              onChange={(e) => handleInputChange('nome_oportunidade', e.target.value)}
              placeholder="Ex: Proposta de Sistema - Empresa XYZ"
              className={errors.nome_oportunidade ? 'border-red-500' : ''}
            />
            {errors.nome_oportunidade && (
              <p className="text-red-500 text-sm mt-1">{errors.nome_oportunidade}</p>
            )}
          </div>

          {/* Valor */}
          <div>
            <Label htmlFor="valor">Valor Estimado</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="valor"
                value={formData.valor}
                onChange={(e) => handleInputChange('valor', applyCurrencyMask(e.target.value))}
                placeholder="R$ 0,00"
                className="pl-10"
              />
            </div>
          </div>

          {/* Responsável */}
          <div>
            <Label htmlFor="responsavel_id">Responsável *</Label>
            <Select 
              value={formData.responsavel_id} 
              onValueChange={(value) => handleInputChange('responsavel_id', value)}
            >
              <SelectTrigger className={errors.responsavel_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione um responsável">
                  {formData.responsavel_id && (
                    <div className="flex items-center space-x-2">
                      <User size={16} />
                      <span>{getResponsavelName(formData.responsavel_id)}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center space-x-2">
                      <User size={16} />
                      <div>
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.responsavel_id && (
              <p className="text-red-500 text-sm mt-1">{errors.responsavel_id}</p>
            )}
          </div>

          {/* Pipeline (só mostrar se houver mais de uma) */}
          {pipelines.length > 1 && (
            <div>
              <Label htmlFor="pipeline_id">Pipeline *</Label>
              <Select 
                value={formData.pipeline_id} 
                onValueChange={(value) => handleInputChange('pipeline_id', value)}
              >
                <SelectTrigger className={errors.pipeline_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione uma pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pipeline_id && (
                <p className="text-red-500 text-sm mt-1">{errors.pipeline_id}</p>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Oportunidade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOpportunityModal; 