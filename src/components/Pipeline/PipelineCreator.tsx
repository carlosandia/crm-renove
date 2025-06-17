
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PipelineFormWithStagesAndFields from './PipelineFormWithStagesAndFields';

interface PipelineFormData {
  name: string;
  description: string;
  member_ids: string[];
  stages: any[];
  custom_fields: any[];
}

interface PipelineCreatorProps {
  onCreateComplete: (data: PipelineFormData) => Promise<void>;
  onCancel: () => void;
}

const PipelineCreator: React.FC<PipelineCreatorProps> = ({
  onCreateComplete,
  onCancel
}) => {
  const { user } = useAuth();

  const handleCreateCompletePipeline = async (data: PipelineFormData) => {
    try {
      console.log('🚀 Iniciando criação de pipeline completa');
      
      if (!user?.email || !user?.tenant_id) {
        alert('Erro: Usuário não está logado corretamente');
        return;
      }

      if (!data.name || !data.name.trim()) {
        alert('Erro: Nome da pipeline é obrigatório');
        return;
      }

      await onCreateComplete(data);
    } catch (error) {
      console.error('💥 Erro:', error);
      alert('💥 Erro de conexão');
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '30px', 
      borderRadius: '8px', 
      border: '1px solid #e5e7eb',
      margin: '20px 0'
    }}>
      <h4 style={{ marginBottom: '20px' }}>🎛️ Criar Pipeline Completa</h4>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          member_ids: [],
          stages: [
            {
              name: "Novo Lead",
              temperature_score: 50,
              max_days_allowed: 7,
              color: "#3B82F6",
              order_index: 1
            },
            {
              name: "Oportunidade",
              temperature_score: 75,
              max_days_allowed: 10,
              color: "#10B981",
              order_index: 2
            }
          ],
          custom_fields: [
            {
              field_name: "nome",
              field_label: "Nome",
              field_type: "text",
              is_required: true,
              field_order: 1
            },
            {
              field_name: "email",
              field_label: "Email",
              field_type: "email",
              is_required: true,
              field_order: 2
            }
          ]
        };
        handleCreateCompletePipeline(data);
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Nome da Pipeline *
          </label>
          <input 
            type="text" 
            name="name" 
            required
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="Ex: Pipeline de Vendas"
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Descrição
          </label>
          <textarea 
            name="description"
            rows={3}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px',
              fontSize: '16px',
              resize: 'vertical'
            }}
            placeholder="Descreva o objetivo desta pipeline..."
          />
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#374151' }}>📋 Configuração Automática:</h5>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
            <li>2 etapas: "Novo Lead" e "Oportunidade"</li>
            <li>2 campos: "Nome" e "Email"</li>
            <li>Configurações padrão aplicadas</li>
          </ul>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚀 Criar Pipeline
          </button>
        </div>
      </form>
    </div>
  );
};

export default PipelineCreator;
