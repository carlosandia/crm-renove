import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Info, User, Building, Mail, Phone, MapPin, Calendar, DollarSign, Eye, EyeOff } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  field_order: number;
  show_in_card?: boolean;
  field_options?: any[];
}

interface Lead {
  id: string;
  pipeline_id: string;
  stage_id: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  moved_at?: string;
}

interface LeadEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  customFields: CustomField[];
  onUpdate?: (updatedData: any) => void; onSave?: (updatedData: any) => void;
}

const LeadEditModal: React.FC<LeadEditModalProps> = ({
  isOpen,
  onClose,
  lead,
  customFields,
  onUpdate, onSave
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'display'>('info');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldDisplaySettings, setFieldDisplaySettings] = useState<Record<string, boolean>>({});
  const [loading, setSaving] = useState(false);

  // Inicializar dados do formulário
  useEffect(() => {
    if (isOpen && lead) {
      setFormData({ ...lead.custom_data });
      
      // Inicializar configurações de exibição
      const displaySettings: Record<string, boolean> = {};
      customFields.forEach(field => {
        displaySettings[field.field_name] = field.show_in_card || 
          ['nome', 'email', 'telefone', 'valor', 'empresa'].some(key => field.field_name.includes(key));
      });
      setFieldDisplaySettings(displaySettings);
    }
  }, [isOpen, lead, customFields]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleDisplaySettingChange = (fieldName: string, show: boolean) => {
    setFieldDisplaySettings(prev => ({
      ...prev,
      [fieldName]: show
    }));
  };

  const getFieldIcon = (fieldType: string, fieldName: string) => {
    // Ícones específicos por nome do campo
    if (fieldName.includes('nome')) return <User className="w-4 h-4 text-gray-500" />;
    if (fieldName.includes('email')) return <Mail className="w-4 h-4 text-gray-500" />;
    if (fieldName.includes('telefone') || fieldName.includes('phone')) return <Phone className="w-4 h-4 text-gray-500" />;
    if (fieldName.includes('empresa') || fieldName.includes('company')) return <Building className="w-4 h-4 text-gray-500" />;
    if (fieldName.includes('endereco') || fieldName.includes('address')) return <MapPin className="w-4 h-4 text-gray-500" />;
    if (fieldName.includes('valor') || fieldName.includes('value')) return <DollarSign className="w-4 h-4 text-gray-500" />;
    
    // Ícones por tipo de campo
    switch (fieldType) {
      case 'email': return <Mail className="w-4 h-4 text-gray-500" />;
      case 'phone': return <Phone className="w-4 h-4 text-gray-500" />;
      case 'number': return <DollarSign className="w-4 h-4 text-gray-500" />;
      case 'date': return <Calendar className="w-4 h-4 text-gray-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simular salvamento (aqui você faria a chamada para a API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar dados do lead
      const updatedData = {
        custom_data: formData,
        updated_at: new Date().toISOString()
      };

      // Aqui você salvaria as configurações de exibição dos campos na pipeline
      // Por exemplo, atualizando os campos customizados da pipeline
      console.log('Configurações de exibição dos campos:', fieldDisplaySettings);
      
      // TODO: Implementar salvamento das configurações show_in_card
      // Isso seria feito através de uma API que atualiza a pipeline_custom_fields
      
      if (onUpdate) onUpdate(updatedData); if (onSave) onSave(updatedData);
      
      // Mostrar feedback de sucesso
      showSuccessToast('Alterações salvas', 'Alterações salvas com sucesso!');
    } catch (error) {
      // ✅ CORREÇÃO: Uso consolidado de logs para evitar spam no console
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [LeadEditModal] Erro ao salvar:', error);
      }
      showErrorToast('Erro ao salvar', 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  const leadName = formData?.nome || formData?.nome_cliente || formData?.name || 'Lead sem nome';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">Editar Lead</DialogTitle>
                <p className="text-gray-500 text-sm mt-1">{leadName}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'info'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4" />
                <span>Informações</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('display')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'display'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Exibição no Card</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Lead</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields
                    .sort((a, b) => a.field_order - b.field_order)
                    .map((field) => (
                      <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
                        <Label>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400">
                              {getFieldIcon(field.field_type, field.field_name)}
                            </span>
                            <span>{field.field_label}</span>
                            {field.is_required && <span className="text-red-500">*</span>}
                          </div>
                        </Label>
                        
                        {field.field_type === 'textarea' ? (
                          <textarea
                            value={formData[field.field_name] || ''}
                            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                            required={field.is_required}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={formData[field.field_name] || ''}
                            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                            required={field.is_required}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Selecione...</option>
                            {(field.field_options || []).map((option, index) => (
                              <option key={index} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={field.field_type}
                            value={formData[field.field_name] || ''}
                            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                            required={field.is_required}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Configurar Exibição no Card</h3>
                <p className="text-gray-600 mb-6">
                  Selecione quais campos devem aparecer no card do lead no kanban. 
                  Recomendamos no máximo 4 campos para melhor visualização.
                </p>
                
                <div className="space-y-4">
                  {customFields
                    .sort((a, b) => a.field_order - b.field_order)
                    .map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400">
                            {getFieldIcon(field.field_type, field.field_name)}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{field.field_label}</div>
                            <div className="text-sm text-gray-500">
                              {field.field_type} • {field.is_required ? 'Obrigatório' : 'Opcional'}
                            </div>
                          </div>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldDisplaySettings[field.field_name] || false}
                            onChange={(e) => handleDisplaySettingChange(field.field_name, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Dica</h4>
                  <p className="text-sm text-blue-700">
                    Os campos mais utilizados no mercado de CRM são: Nome, E-mail, Telefone, Empresa e Valor. 
                    Estes campos já são sugeridos automaticamente para exibição no card.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadEditModal; 