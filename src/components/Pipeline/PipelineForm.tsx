import React, { useState, useEffect } from 'react';
import { Edit, Plus, X } from 'lucide-react';
import { Pipeline } from '../../types/Pipeline';
import { User } from '../../hooks/useMembers';

interface PipelineFormProps {
  members: User[];
  pipeline?: Pipeline;
  onSubmit: (data: { name: string; description: string; member_ids?: string[] }) => void;
  onCancel: () => void;
  title: string;
  submitText: string;
}

const PipelineForm: React.FC<PipelineFormProps> = ({
  members,
  pipeline,
  onSubmit,
  onCancel,
  title,
  submitText,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    member_ids: [] as string[],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (pipeline) {
      setFormData({
        name: pipeline.name,
        description: pipeline.description || '',
        member_ids: pipeline.pipeline_members?.map(pm => pm.member_id) || [],
      });
    }
  }, [pipeline]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit(formData);
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId]
    }));
  };

  const isEditing = !!pipeline;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isEditing 
              ? 'bg-gradient-to-br from-orange-500 to-orange-600' 
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            {isEditing ? (
              <Edit className="w-4 h-4 text-white" />
            ) : (
              <Plus className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">
              {isEditing 
                ? `Modificar configurações da pipeline "${pipeline?.name}"` 
                : 'Preencha as informações para criar uma nova pipeline'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Nome da Pipeline */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Pipeline *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.name 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            placeholder="Ex: Pipeline Vendas B2B"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
              <X className="w-3 h-3" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Descrição */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva o objetivo desta pipeline..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
          />
        </div>

        {/* Seleção de Membros - apenas na criação */}
        {!pipeline && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Vendedores da Equipe
            </label>
            {members.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Nenhum vendedor disponível</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map(member => (
                  <label 
                    key={member.id} 
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.member_ids.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Selecione os vendedores que terão acesso a esta pipeline
            </p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PipelineForm; 