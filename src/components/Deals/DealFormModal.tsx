import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { Deal, DealCreateRequest, DealUpdateRequest } from '../../types/deals';

interface DealFormModalProps {
  deal?: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealData: DealCreateRequest | DealUpdateRequest) => Promise<void>;
}

export const DealFormModal: React.FC<DealFormModalProps> = ({
  deal,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    deal_name: '',
    company_name: '',
    contact_id: '',
    pipeline_id: '1',
    stage_id: '1',
    amount: '',
    close_date: '',
    probability: '',
    owner_id: '',
    description: '',
    next_step: '',
    source: '',
    status: 'open' as 'open' | 'won' | 'lost'
  });

  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (deal) {
      setFormData({
        deal_name: deal.deal_name || '',
        company_name: deal.company_name || '',
        contact_id: deal.contact_id || '',
        pipeline_id: deal.pipeline_id || '1',
        stage_id: deal.stage_id || '1',
        amount: deal.amount?.toString() || '',
        close_date: deal.close_date ? deal.close_date.split('T')[0] : '',
        probability: deal.probability?.toString() || '',
        owner_id: deal.owner_id || '',
        description: deal.description || '',
        next_step: deal.next_step || '',
        source: deal.source || '',
        status: deal.status || 'open'
      });
    } else {
      setFormData({
        deal_name: '',
        company_name: '',
        contact_id: '',
        pipeline_id: '1',
        stage_id: '1',
        amount: '',
        close_date: '',
        probability: '',
        owner_id: '',
        description: '',
        next_step: '',
        source: '',
        status: 'open'
      });
    }
    setErrors({});
  }, [deal, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.deal_name.trim()) {
      newErrors.deal_name = 'Nome do deal é obrigatório';
    }

    if (!formData.pipeline_id) {
      newErrors.pipeline_id = 'Pipeline é obrigatório';
    }

    if (!formData.stage_id) {
      newErrors.stage_id = 'Estágio é obrigatório';
    }

    if (formData.amount && isNaN(Number(formData.amount))) {
      newErrors.amount = 'Valor deve ser um número válido';
    }

    if (formData.probability && (isNaN(Number(formData.probability)) || Number(formData.probability) < 0 || Number(formData.probability) > 100)) {
      newErrors.probability = 'Probabilidade deve ser um número entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      const dealData = {
        deal_name: formData.deal_name.trim(),
        company_name: formData.company_name.trim() || undefined,
        contact_id: formData.contact_id || undefined,
        pipeline_id: formData.pipeline_id,
        stage_id: formData.stage_id,
        amount: formData.amount ? Number(formData.amount) : undefined,
        close_date: formData.close_date || undefined,
        probability: formData.probability ? Number(formData.probability) : undefined,
        owner_id: formData.owner_id || undefined,
        description: formData.description.trim() || undefined,
        next_step: formData.next_step.trim() || undefined,
        source: formData.source.trim() || undefined,
        status: formData.status
      };

      await onSave(dealData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar deal:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {deal ? 'Editar Deal' : 'Novo Deal'}
              </h2>
              <p className="text-sm text-slate-500">
                {deal ? 'Atualize as informações do deal' : 'Crie um novo deal no pipeline'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Deal *
                </label>
                <input
                  type="text"
                  value={formData.deal_name}
                  onChange={(e) => handleInputChange('deal_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.deal_name ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="Ex: Venda Sistema CRM"
                />
                {errors.deal_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.deal_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pipeline *
                </label>
                <select
                  value={formData.pipeline_id}
                  onChange={(e) => handleInputChange('pipeline_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.pipeline_id ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="1">Vendas</option>
                  <option value="2">Parcerias</option>
                  <option value="3">Upsell</option>
                </select>
                {errors.pipeline_id && (
                  <p className="text-red-600 text-xs mt-1">{errors.pipeline_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Estágio *
                </label>
                <select
                  value={formData.stage_id}
                  onChange={(e) => handleInputChange('stage_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stage_id ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="1">Qualificação</option>
                  <option value="2">Proposta</option>
                  <option value="3">Negociação</option>
                  <option value="4">Fechamento</option>
                </select>
                {errors.stage_id && (
                  <p className="text-red-600 text-xs mt-1">{errors.stage_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900">
              Informações Financeiras
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.amount ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="0,00"
                />
                {errors.amount && (
                  <p className="text-red-600 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Probabilidade (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => handleInputChange('probability', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.probability ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="50"
                />
                {errors.probability && (
                  <p className="text-red-600 text-xs mt-1">{errors.probability}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data de Fechamento
                </label>
                <input
                  type="date"
                  value={formData.close_date}
                  onChange={(e) => handleInputChange('close_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="open">Aberto</option>
                  <option value="won">Ganho</option>
                  <option value="lost">Perdido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900">
              Informações Adicionais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Responsável
                </label>
                <select
                  value={formData.owner_id}
                  onChange={(e) => handleInputChange('owner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar responsável</option>
                  <option value="1">João Silva</option>
                  <option value="2">Maria Santos</option>
                  <option value="3">Pedro Costa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Origem
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => handleInputChange('source', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecionar origem</option>
                  <option value="website">Website</option>
                  <option value="referral">Indicação</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="social_media">Redes Sociais</option>
                  <option value="event">Evento</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descreva os detalhes do deal..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Próxima Ação
              </label>
              <input
                type="text"
                value={formData.next_step}
                onChange={(e) => handleInputChange('next_step', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Enviar proposta comercial"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
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
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Salvando...' : 'Salvar Deal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 