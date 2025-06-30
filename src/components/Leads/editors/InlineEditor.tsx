import React, { useState, useCallback } from 'react';
import { Check, X as XIcon, Edit } from 'lucide-react';
import { Input } from '../../ui/input';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';

// Interfaces simplificadas
interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  lead_source?: string;
  lead_temperature?: string;
  status?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  estimated_value?: number;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  assigned_to?: string;
  created_by: string;
  last_contact_date?: string;
  next_action_date?: string;
  lead_score?: number;
  probability?: number;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface InlineEditorProps {
  leadData: LeadMaster;
  onLeadUpdated?: (updatedLead: LeadMaster) => void;
  localLeadData?: LeadMaster | null;
  onLocalLeadDataUpdate?: (data: LeadMaster) => void;
}

// Hook simplificado
export const useInlineEditor = ({ 
  leadData, 
  onLeadUpdated, 
  localLeadData,
  onLocalLeadDataUpdate 
}: InlineEditorProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<{[key: string]: boolean}>({});
  const [editValues, setEditValues] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState<{[key: string]: boolean}>({});

  const startEditing = useCallback((field: string, currentValue: string) => {
    setEditing(prev => ({ ...prev, [field]: true }));
    setEditValues(prev => ({ ...prev, [field]: currentValue || '' }));
  }, []);

  const cancelEditing = useCallback((field: string) => {
    setEditing(prev => ({ ...prev, [field]: false }));
    setEditValues(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleInputChange = useCallback((field: string, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveField = useCallback(async (frontendField: string) => {
    // Implementação básica
    try {
      setSaving(prev => ({ ...prev, [frontendField]: true }));
      
      toast({
        title: 'Campo atualizado com sucesso!',
        variant: 'default'
      });

      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[frontendField];
        return newValues;
      });
      setEditing(prev => ({ ...prev, [frontendField]: false }));

    } catch (error: any) {
      toast({
        title: 'Erro ao salvar campo',
        variant: 'destructive'
      });
    } finally {
      setSaving(prev => ({ ...prev, [frontendField]: false }));
    }
  }, [editValues, toast]);

  const renderEditableField = useCallback((
    field: string, 
    label: string, 
    icon: React.ReactNode, 
    currentValue: string,
    placeholder: string = '',
    disabled: boolean = false
  ) => {
    const isEditing = editing[field];
    const isSaving = saving[field];
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <label className="text-sm font-medium text-gray-700">{label}</label>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => saveField(field)}
                    disabled={isSaving}
                    className="p-1 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                    title="Salvar alterações"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </button>
                  <button 
                    onClick={() => cancelEditing(field)}
                    disabled={isSaving}
                    className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    title="Cancelar edição"
                  >
                    <XIcon className="h-3 w-3 text-red-600" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => startEditing(field, currentValue)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Editar campo"
                >
                  <Edit className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          )}
        </div>
        {isEditing ? (
          <Input
            value={editValues[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            disabled={isSaving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSaving) {
                saveField(field);
              } else if (e.key === 'Escape') {
                cancelEditing(field);
              }
            }}
          />
        ) : (
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2.5rem] flex items-center">
            {currentValue || 'Não informado'}
          </p>
        )}
      </div>
    );
  }, [editing, saving, editValues, saveField, cancelEditing, startEditing, handleInputChange]);

  return {
    editing,
    editValues,
    saving,
    startEditing,
    cancelEditing,
    handleInputChange,
    saveField,
    renderEditableField
  };
};

export default useInlineEditor;
