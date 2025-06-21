import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Smartphone, Tablet, Monitor, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, Controller } from 'react-hook-form';
import { HexColorPicker } from 'react-colorful';

// Tipos de campos disponíveis
const FIELD_TYPES = [
  { id: 'text', label: 'Texto', icon: '📝', category: 'basic' },
  { id: 'email', label: 'E-mail', icon: '📧', category: 'basic' },
  { id: 'phone', label: 'Telefone', icon: '📞', category: 'basic' },
  { id: 'textarea', label: 'Texto Longo', icon: '📄', category: 'basic' },
  { id: 'number', label: 'Número', icon: '🔢', category: 'basic' },
  { id: 'select', label: 'Lista', icon: '📋', category: 'basic' },
  { id: 'radio', label: 'Opção Única', icon: '🔘', category: 'basic' },
  { id: 'checkbox', label: 'Múltipla Escolha', icon: '☑️', category: 'basic' },
  { id: 'date', label: 'Data', icon: '📅', category: 'basic' },
  { id: 'file', label: 'Arquivo', icon: '📁', category: 'advanced' },
  { id: 'rating', label: 'Avaliação', icon: '⭐', category: 'advanced' },
  { id: 'slider', label: 'Controle', icon: '🎚️', category: 'advanced' }
];

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: any;
  styling?: any;
  leadScore?: number;
}

interface FormBuilderModalProps {
  form: any;
  onSave: () => void;
  onCancel: () => void;
  tenantId: string;
}

// Componente para campo arrastável
const SortableField: React.FC<{ field: FormField; onEdit: (field: FormField) => void; onDelete: (id: string) => void }> = ({ field, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-4 group">
      <div className="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-500 transition-colors">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(field)} className="text-blue-500 hover:text-blue-700">
              <Settings size={14} />
            </button>
            <button onClick={() => onDelete(field.id)} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        </div>
        {renderPreviewField(field)}
      </div>
    </div>
  );
};

// Função para renderizar campo no preview
const renderPreviewField = (field: FormField) => {
  const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <input
          type={field.type}
          placeholder={field.placeholder}
          className={baseClasses}
          required={field.required}
          disabled
        />
      );
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder}
          className={baseClasses}
          rows={3}
          required={field.required}
          disabled
        />
      );
    case 'number':
      return (
        <input
          type="number"
          placeholder={field.placeholder}
          className={baseClasses}
          required={field.required}
          disabled
        />
      );
    case 'select':
      return (
        <select className={baseClasses} required={field.required} disabled>
          <option>Selecione uma opção</option>
          {field.options?.map((option, idx) => (
            <option key={idx} value={option}>{option}</option>
          ))}
        </select>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option, idx) => (
            <label key={idx} className="flex items-center">
              <input type="radio" name={field.id} className="mr-2" disabled />
              {option}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map((option, idx) => (
            <label key={idx} className="flex items-center">
              <input type="checkbox" className="mr-2" disabled />
              {option}
            </label>
          ))}
        </div>
      );
    case 'date':
      return (
        <input
          type="date"
          className={baseClasses}
          required={field.required}
          disabled
        />
      );
    case 'file':
      return (
        <input
          type="file"
          className={baseClasses}
          required={field.required}
          disabled
        />
      );
    case 'rating':
      return (
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-yellow-400 text-xl">⭐</span>
          ))}
        </div>
      );
    case 'slider':
      return (
        <input
          type="range"
          className="w-full"
          min="0"
          max="100"
          disabled
        />
      );
    default:
      return <div className="p-2 bg-gray-100 rounded">Campo {field.type}</div>;
  }
};

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({ form, onSave, onCancel, tenantId }) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [formSettings, setFormSettings] = useState({
    name: form?.name || '',
    slug: form?.slug || '',
    description: form?.description || '',
    submitButton: {
      text: 'Enviar',
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      borderColor: '#3B82F6',
      borderRadius: '8px',
      padding: '12px 24px'
    },
    styling: {
      backgroundColor: '#FFFFFF',
      fontFamily: 'system-ui',
      primaryColor: '#3B82F6'
    },
    leadScoring: {
      enabled: true,
      qualificationThreshold: 70
    }
  });

  // Carregar dados do formulário se estiver editando
  useEffect(() => {
    if (form?.formio_schema) {
      try {
        const schema = typeof form.formio_schema === 'string' 
          ? JSON.parse(form.formio_schema) 
          : form.formio_schema;
        
        if (schema.fields && Array.isArray(schema.fields)) {
          setFields(schema.fields);
        }
        
        if (schema.submitButton) {
          setFormSettings(prev => ({
            ...prev,
            submitButton: { ...prev.submitButton, ...schema.submitButton }
          }));
        }
        
        if (schema.styling) {
          setFormSettings(prev => ({
            ...prev,
            styling: { ...prev.styling, ...schema.styling }
          }));
        }
        
        if (schema.leadScoring) {
          setFormSettings(prev => ({
            ...prev,
            leadScoring: { ...prev.leadScoring, ...schema.leadScoring }
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar schema do formulário:', error);
      }
    }
  }, [form]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedField(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedField(null);

    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (fieldType: string) => {
    try {
      const fieldConfig = FIELD_TYPES.find(f => f.id === fieldType);
      if (!fieldConfig) {
        console.error('Tipo de campo não encontrado:', fieldType);
        return;
      }

      const newField: FormField = {
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: fieldType,
        label: fieldConfig.label,
        placeholder: `Digite seu ${fieldConfig.label.toLowerCase()}`,
        required: false,
        options: ['select', 'radio', 'checkbox'].includes(fieldType) ? ['Opção 1', 'Opção 2', 'Opção 3'] : undefined,
        leadScore: 10
      };

      setFields(prev => [...prev, newField]);
    } catch (error) {
      console.error('Erro ao adicionar campo:', error);
    }
  };

  const updateField = (updatedField: FormField) => {
    try {
      setFields(prev => prev.map(f => f.id === updatedField.id ? updatedField : f));
      setActiveField(updatedField);
    } catch (error) {
      console.error('Erro ao atualizar campo:', error);
    }
  };

  const deleteField = (fieldId: string) => {
    try {
      setFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (error) {
      console.error('Erro ao deletar campo:', error);
    }
  };

  const getViewportClass = () => {
    switch (viewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-md';
      case 'desktop': return 'max-w-2xl';
      default: return 'max-w-2xl';
    }
  };

  const handleSaveForm = async () => {
    try {
      if (!formSettings.name.trim()) {
        alert('Por favor, digite um nome para o formulário');
        return;
      }

      if (!formSettings.slug.trim()) {
        alert('Por favor, digite um slug para o formulário');
        return;
      }

      const formData = {
        name: formSettings.name.trim(),
        slug: formSettings.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: formSettings.description.trim(),
        is_active: true,
        formio_schema: {
          fields,
          submitButton: formSettings.submitButton,
          styling: formSettings.styling,
          leadScoring: formSettings.leadScoring
        }
      };

      const userData = localStorage.getItem('crm_user');
      const user = userData ? JSON.parse(userData) : null;

      if (form?.id) {
        const { error } = await supabase
          .from('custom_forms')
          .update(formData)
          .eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_forms')
          .insert({
            ...formData,
            tenant_id: tenantId || 'default',
            created_by: user?.id || 'system'
          });
        if (error) throw error;
      }

      alert('Formulário salvo com sucesso!');
      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar formulário:', error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const generateEmbedCode = () => {
    if (!formSettings.slug) return '';
    const embedUrl = `${window.location.origin}/form/${formSettings.slug}`;
    return `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const generateFormLink = () => {
    if (!formSettings.slug) return '';
    return `${window.location.origin}/form/${formSettings.slug}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full h-full max-w-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Form Builder Avançado</h2>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formSettings.name}
                onChange={(e) => setFormSettings(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do formulário"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={formSettings.slug}
                onChange={(e) => setFormSettings(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="slug-do-formulario"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Viewport toggles */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 ${viewMode === 'desktop' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`p-2 ${viewMode === 'tablet' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              >
                <Tablet size={16} />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 ${viewMode === 'mobile' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              >
                <Smartphone size={16} />
              </button>
            </div>

            <button
              onClick={handleSaveForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save size={16} className="inline mr-2" />
              Salvar
            </button>
            <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar com campos */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Componentes</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Campos Básicos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_TYPES.filter(f => f.category === 'basic').map(field => (
                    <button
                      key={field.id}
                      onClick={() => addField(field.id)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-white transition-colors text-left"
                    >
                      <div className="text-lg mb-1">{field.icon}</div>
                      <div className="text-xs font-medium">{field.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Campos Avançados</h4>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_TYPES.filter(f => f.category === 'advanced').map(field => (
                    <button
                      key={field.id}
                      onClick={() => addField(field.id)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-white transition-colors text-left"
                    >
                      <div className="text-lg mb-1">{field.icon}</div>
                      <div className="text-xs font-medium">{field.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurações do botão de envio */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Botão de Envio</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formSettings.submitButton.text}
                    onChange={(e) => setFormSettings(prev => ({
                      ...prev,
                      submitButton: { ...prev.submitButton, text: e.target.value }
                    }))}
                    placeholder="Texto do botão"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={formSettings.submitButton.backgroundColor}
                      onChange={(e) => setFormSettings(prev => ({
                        ...prev,
                        submitButton: { ...prev.submitButton, backgroundColor: e.target.value }
                      }))}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                    <input
                      type="color"
                      value={formSettings.submitButton.textColor}
                      onChange={(e) => setFormSettings(prev => ({
                        ...prev,
                        submitButton: { ...prev.submitButton, textColor: e.target.value }
                      }))}
                      className="w-full h-8 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Scoring */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Lead Scoring</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formSettings.leadScoring.enabled}
                      onChange={(e) => setFormSettings(prev => ({
                        ...prev,
                        leadScoring: { ...prev.leadScoring, enabled: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-xs">Ativar Lead Scoring</span>
                  </label>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Limite de Qualificação</label>
                    <input
                      type="number"
                      value={formSettings.leadScoring.qualificationThreshold}
                      onChange={(e) => setFormSettings(prev => ({
                        ...prev,
                        leadScoring: { ...prev.leadScoring, qualificationThreshold: parseInt(e.target.value) || 70 }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
            <div className={`mx-auto bg-white rounded-lg shadow-lg p-8 transition-all duration-300 ${getViewportClass()}`}>
              <h3 className="text-xl font-semibold mb-6">{formSettings.name || 'Preview do Formulário'}</h3>
              
              <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {fields.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <p>Arraste campos da sidebar para começar</p>
                      </div>
                    ) : (
                      fields.map(field => (
                        <SortableField
                          key={field.id}
                          field={field}
                          onEdit={(field) => {
                            setActiveField(field);
                            setShowFieldEditor(true);
                          }}
                          onDelete={deleteField}
                        />
                      ))
                    )}
                    
                    {/* Botão de envio personalizado */}
                    {fields.length > 0 && (
                      <button
                        style={{
                          backgroundColor: formSettings.submitButton.backgroundColor,
                          color: formSettings.submitButton.textColor,
                          borderColor: formSettings.submitButton.borderColor,
                          borderRadius: formSettings.submitButton.borderRadius,
                          padding: formSettings.submitButton.padding
                        }}
                        className="w-full border transition-colors hover:opacity-90"
                      >
                        {formSettings.submitButton.text}
                      </button>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Embed Code e Link */}
            {formSettings.slug && (
              <div className="mt-6 space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium mb-2">Código de Incorporação</h4>
                  <textarea
                    value={generateEmbedCode()}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                    rows={3}
                  />
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium mb-2">Link do Formulário</h4>
                  <input
                    value={generateFormLink()}
                    readOnly
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Field Editor Modal */}
        {showFieldEditor && activeField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Configurar Campo</h3>
                <button
                  onClick={() => setShowFieldEditor(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={activeField.label}
                    onChange={(e) => updateField({ ...activeField, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={activeField.placeholder || ''}
                    onChange={(e) => updateField({ ...activeField, placeholder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pontuação Lead Scoring</label>
                  <input
                    type="number"
                    value={activeField.leadScore || 0}
                    onChange={(e) => updateField({ ...activeField, leadScore: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activeField.required}
                      onChange={(e) => updateField({ ...activeField, required: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Campo obrigatório</span>
                  </label>
                </div>

                {(activeField.type === 'select' || activeField.type === 'radio' || activeField.type === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opções</label>
                    {activeField.options?.map((option, idx) => (
                      <div key={idx} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(activeField.options || [])];
                            newOptions[idx] = e.target.value;
                            updateField({ ...activeField, options: newOptions });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => {
                            const newOptions = activeField.options?.filter((_, i) => i !== idx);
                            updateField({ ...activeField, options: newOptions });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [...(activeField.options || []), `Opção ${(activeField.options?.length || 0) + 1}`];
                        updateField({ ...activeField, options: newOptions });
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Adicionar opção
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowFieldEditor(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilderModal;
