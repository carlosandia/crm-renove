import React, { useState, useEffect } from 'react';
import { FormModal } from '../ui/form-modal';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { useAuth } from '../../providers/AuthProvider';
import { CrudModalProps } from '../../types/CommonProps';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  lead_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface Pipeline {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface LeadFormModalProps extends CrudModalProps<Lead> {
  lead?: Lead | null; // Mantido para compatibilidade
  onSave: () => void; // Mantido para compatibilidade 
  tenantId: string;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
  tenantId
}) => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userPipelines, setUserPipelines] = useState<Pipeline[]>([]);

  // ✅ REFATORAÇÃO TAREFA 5: Usar FormModal base
  const formSections = [
    {
      id: 'basic-info',
      title: 'Informações Básicas',
      fields: [
        {
          name: 'first_name',
          label: 'Nome',
          type: 'text' as const,
          required: true
        },
        {
          name: 'last_name', 
          label: 'Sobrenome',
          type: 'text' as const,
          required: true
        },
        {
          name: 'email',
          label: 'E-mail',
          type: 'email' as const,
          required: true
        },
        {
          name: 'phone',
          label: 'Telefone',
          type: 'tel' as const
        }
      ]
    },
    {
      id: 'origin-pipeline',
      title: 'Origem e Pipeline',
      fields: [
        {
          name: 'lead_source',
          label: 'Fonte do Lead',
          type: 'text' as const
        },
        {
          name: 'utm_source',
          label: 'UTM Source',
          type: 'text' as const
        },
        {
          name: 'utm_medium',
          label: 'UTM Medium',
          type: 'text' as const
        },
        {
          name: 'utm_campaign',
          label: 'UTM Campaign',
          type: 'text' as const
        },
        {
          name: 'pipeline_id',
          label: 'Pipeline',
          type: 'select' as const,
          options: (user?.role === 'member' ? userPipelines : pipelines).map(p => ({
            value: p.id,
            label: p.name
          })),
          required: true
        },
        {
          name: 'assigned_to',
          label: 'Responsável',
          type: 'select' as const,
          options: teamMembers.map(m => ({
            value: m.id,
            label: `${m.first_name} ${m.last_name}`
          })),
          required: user?.role !== 'member'
        }
      ]
    }
  ];

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (isOpen && user) {
      loadInitialData();
    }
  }, [isOpen, user]);

  const loadInitialData = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        await Promise.all([
          loadAdminPipelines(),
          loadTeamMembers()
        ]);
      } else {
        await loadMemberPipelines();
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadAdminPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', user?.tenant_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPipelines(data || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines admin:', error);
    }
  };

  const loadMemberPipelines = async () => {
    try {
      const { data: memberPipelineIds, error: memberError } = await supabase
        .from('pipeline_members')
        .select('pipeline_id')
        .eq('member_id', user?.id);

      if (memberError) throw memberError;

      if (!memberPipelineIds || memberPipelineIds.length === 0) {
        setUserPipelines([]);
        return;
      }

      const pipelineIds = memberPipelineIds.map(pm => pm.pipeline_id);
      const { data: pipelines, error: pipelineError } = await supabase
        .from('pipelines')
        .select('id, name')
        .in('id', pipelineIds)
        .eq('is_active', true)
        .order('name');

      if (pipelineError) throw pipelineError;

      const pipelineList = pipelines || [];
      setUserPipelines(pipelineList);
    } catch (error) {
      console.error('Erro ao carregar pipelines member:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', user?.tenant_id)
        .eq('role', 'member')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      const leadData = {
        ...formData,
        tenant_id: user?.tenant_id,
        created_by: user?.id
      };

      if (lead?.id) {
        // Editar lead existente
        const { error } = await supabase
          .from('leads_master')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;
        showSuccessToast('Lead atualizado com sucesso!');
      } else {
        // Criar novo lead
        const { error } = await supabase
          .from('leads_master')
          .insert([leadData]);

        if (error) throw error;
        showSuccessToast('Lead criado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar lead:', error);
      showErrorToast(error.message || 'Erro ao salvar lead');
      throw error;
    }
  };

  const validateForm = (formData: any): string[] | null => {
    const errors: string[] = [];

    if (!formData.first_name?.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (!formData.last_name?.trim()) {
      errors.push('Sobrenome é obrigatório');
    }

    if (!formData.email?.trim()) {
      errors.push('E-mail é obrigatório');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('E-mail inválido');
    }

    if (!formData.pipeline_id) {
      errors.push('Pipeline é obrigatória');
    }

    if (user?.role !== 'member' && !formData.assigned_to) {
      errors.push('Responsável é obrigatório');
    }

    return errors.length > 0 ? errors : null;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? 'Editar Lead' : 'Novo Lead'}
      mode={lead ? 'edit' : 'create'}
      initialData={lead ? {
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        lead_source: lead.lead_source || '',
        utm_source: lead.utm_source || '',
        utm_medium: lead.utm_medium || '',
        utm_campaign: lead.utm_campaign || '',
        pipeline_id: '',
        assigned_to: user?.role === 'member' ? user.id : ''
      } : {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        lead_source: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        pipeline_id: '',
        assigned_to: user?.role === 'member' ? user.id : ''
      }}
      sections={formSections}
      onSave={handleFormSubmit}
      onValidate={validateForm}
      onDelete={lead ? async () => {
        try {
          const { error } = await supabase
            .from('leads_master')
            .delete()
            .eq('id', lead.id);

          if (error) throw error;
          showSuccessToast('Lead excluído com sucesso!');
          onSave();
          onClose();
        } catch (error: any) {
          console.error('Erro ao excluir lead:', error);
          showErrorToast(error.message || 'Erro ao excluir lead');
          throw error;
        }
      } : undefined}
    >
      <div />
    </FormModal>
  );
};

export default LeadFormModal;
