import React, { useState, useEffect } from 'react';
import { X, Save, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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

interface LeadFormModalProps {
  lead?: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_source: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    pipeline_id: '',
    assigned_to: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userPipelines, setUserPipelines] = useState<Pipeline[]>([]);

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (isOpen && user) {
      loadInitialData();
    }
  }, [isOpen, user]);

  // Preencher formulário quando lead for fornecido
  useEffect(() => {
    if (lead) {
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        lead_source: lead.lead_source || '',
        utm_source: lead.utm_source || '',
        utm_medium: lead.utm_medium || '',
        utm_campaign: lead.utm_campaign || '',
        pipeline_id: '',
        assigned_to: ''
      });
    } else {
      // Reset form for new lead
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        lead_source: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        pipeline_id: '',
        assigned_to: ''
      });
    }
    setErrors({});
  }, [lead, isOpen]);

  const loadInitialData = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        // Admin: carregar todas pipelines do tenant e todos members
        await Promise.all([
          loadAdminPipelines(),
          loadTeamMembers()
        ]);
      } else {
        // Member: carregar apenas pipelines vinculadas
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
      // Primeiro buscar os pipeline_ids onde o member está vinculado
      const { data: memberPipelineIds, error: memberError } = await supabase
        .from('pipeline_members')
        .select('pipeline_id')
        .eq('member_id', user?.id);

      if (memberError) throw memberError;

      if (!memberPipelineIds || memberPipelineIds.length === 0) {
        setUserPipelines([]);
        return;
      }

      // Depois buscar as pipelines ativas com esses IDs
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
      
      // Auto-selecionar primeira pipeline se houver apenas uma
      if (pipelineList.length === 1) {
        setFormData(prev => ({
          ...prev,
          pipeline_id: pipelineList[0].id,
          assigned_to: user?.id || '' // Auto-atribuir ao member
        }));
      }
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.lead_source.trim()) {
      newErrors.lead_source = 'Origem é obrigatória';
    }

    // Validações por role
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      if (pipelines.length > 1 && !formData.pipeline_id) {
        newErrors.pipeline_id = 'Selecione uma pipeline';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const leadData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        lead_source: formData.lead_source.trim(),
        utm_source: formData.utm_source.trim() || null,
        utm_medium: formData.utm_medium.trim() || null,
        utm_campaign: formData.utm_campaign.trim() || null,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (lead) {
        // Atualizar lead existente
        const { error } = await supabase
          .from('leads_master')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;
        showSuccessToast('Lead atualizado', 'Lead atualizado com sucesso!');
      } else {
        // Criar novo lead
        let assignedTo = user?.id; // Padrão: auto-atribuir ao usuário logado
        
        // Para admin: usar o vendedor selecionado se especificado
        if ((user?.role === 'admin' || user?.role === 'super_admin') && formData.assigned_to) {
          assignedTo = formData.assigned_to;
        }

        const { error } = await supabase
          .from('leads_master')
          .insert({
            ...leadData,
            created_by: user?.id,
            assigned_to: assignedTo,
            status: 'active',
            lead_temperature: 'cold',
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        showSuccessToast('Lead criado', 'Lead criado com sucesso!');
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      showErrorToast('Erro ao salvar', 'Erro ao salvar lead. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const availablePipelines = user?.role === 'member' ? userPipelines : pipelines;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {lead ? 'Editar Lead' : 'Novo Lead'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                    placeholder="Nome do lead"
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Sobrenome do lead"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                    placeholder="email@exemplo.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={errors.phone ? 'border-red-500' : ''}
                    placeholder="(11) 99999-9999"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configurações por Role */}
            {isAdmin && !lead && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Administrativas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePipelines.length > 1 && (
                    <div>
                      <Label htmlFor="pipeline_id">Pipeline</Label>
                      <Select value={formData.pipeline_id} onValueChange={(value) => handleInputChange('pipeline_id', value)}>
                        <SelectTrigger className={errors.pipeline_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecione uma pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePipelines.map((pipeline) => (
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

                  <div>
                    <Label htmlFor="assigned_to">Atribuir a Vendedor</Label>
                    <Select value={formData.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um vendedor (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Member: Mostrar pipeline selecionada (readonly) */}
            {!isAdmin && userPipelines.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    Pipeline: <span className="font-medium">{userPipelines.find(p => p.id === formData.pipeline_id)?.name || userPipelines[0]?.name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Responsável: <span className="font-medium">Você</span>
                  </p>
                </div>
              </div>
            )}

            {/* Origem e Rastreamento */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Origem e Rastreamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="lead_source">Origem do Lead *</Label>
                  <Input
                    id="lead_source"
                    type="text"
                    value={formData.lead_source}
                    onChange={(e) => handleInputChange('lead_source', e.target.value)}
                    className={errors.lead_source ? 'border-red-500' : ''}
                    placeholder="Ex: Google Ads, Facebook, Indicação, etc."
                  />
                  {errors.lead_source && (
                    <p className="text-red-500 text-sm mt-1">{errors.lead_source}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="utm_source">UTM Source</Label>
                  <Input
                    id="utm_source"
                    type="text"
                    value={formData.utm_source}
                    onChange={(e) => handleInputChange('utm_source', e.target.value)}
                    placeholder="google, facebook, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="utm_medium">UTM Medium</Label>
                  <Input
                    id="utm_medium"
                    type="text"
                    value={formData.utm_medium}
                    onChange={(e) => handleInputChange('utm_medium', e.target.value)}
                    placeholder="cpc, social, email, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="utm_campaign">UTM Campaign</Label>
                  <Input
                    id="utm_campaign"
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
                    placeholder="Nome da campanha"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadFormModal;
