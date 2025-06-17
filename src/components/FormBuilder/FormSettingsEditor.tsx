
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings, Link, Users, Target } from 'lucide-react';

interface FormSettingsEditorProps {
  settings: {
    redirect_url: string;
    pipeline_id: string;
    assigned_to: string;
    qualification_rules: any;
  };
  onUpdate: (settings: any) => void;
  tenantId: string;
}

const FormSettingsEditor: React.FC<FormSettingsEditorProps> = ({
  settings,
  onUpdate,
  tenantId
}) => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    loadPipelines();
    loadMembers();
  }, [tenantId]);

  const loadPipelines = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('id, name')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Erro ao carregar pipelines:', error);
        return;
      }

      setPipelines(data || []);
    } catch (error) {
      console.error('Erro ao carregar pipelines:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', tenantId)
        .eq('role', 'member');

      if (error) {
        console.error('Erro ao carregar membros:', error);
        return;
      }

      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const updateSetting = (key: string, value: any) => {
    onUpdate({
      ...settings,
      [key]: value
    });
  };

  const updateQualificationRule = (field: string, value: any) => {
    const newRules = {
      ...settings.qualification_rules,
      [field]: value
    };
    updateSetting('qualification_rules', newRules);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        <Settings className="mr-2" size={20} />
        Configurações do Formulário
      </h3>

      {/* Redirecionamento */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Link className="mr-2" size={16} />
          Redirecionamento
        </h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de Redirecionamento (após envio)
          </label>
          <input
            type="url"
            value={settings.redirect_url || ''}
            onChange={(e) => updateSetting('redirect_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="https://exemplo.com/obrigado"
          />
          <p className="text-xs text-gray-500 mt-1">
            Deixe em branco para mostrar uma mensagem de sucesso padrão
          </p>
        </div>
      </div>

      {/* Integração com Pipeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Users className="mr-2" size={16} />
          Integração com Pipeline
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline de Destino
            </label>
            <select
              value={settings.pipeline_id || ''}
              onChange={(e) => updateSetting('pipeline_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecione um pipeline</option>
              {pipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leads capturados serão enviados para este pipeline
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atribuir Automaticamente Para
            </label>
            <select
              value={settings.assigned_to || ''}
              onChange={(e) => updateSetting('assigned_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Não atribuir automaticamente</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} ({member.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leads serão automaticamente atribuídos a este vendedor
            </p>
          </div>
        </div>
      </div>

      {/* Qualificação Automática */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Target className="mr-2" size={16} />
          Qualificação Automática de Leads
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Definir ICP (Ideal Customer Profile)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Configure regras para identificar automaticamente leads qualificados com base nas respostas do formulário.
            </p>
          </div>

          {/* Exemplo de regras de qualificação */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3">Regras de Qualificação</h5>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campo "Cargo" contém (separado por vírgula)
                </label>
                <input
                  type="text"
                  value={settings.qualification_rules?.job_titles || ''}
                  onChange={(e) => updateQualificationRule('job_titles', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Diretor, Gerente, CEO, Sócio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campo "Estado" contém (separado por vírgula)
                </label>
                <input
                  type="text"
                  value={settings.qualification_rules?.states || ''}
                  onChange={(e) => updateQualificationRule('states', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="SP, RJ, MG"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campo "Empresa" não está vazio
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.qualification_rules?.require_company || false}
                    onChange={(e) => updateQualificationRule('require_company', e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Exigir nome da empresa</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor mínimo estimado (se campo existir)
                </label>
                <input
                  type="number"
                  value={settings.qualification_rules?.min_value || ''}
                  onChange={(e) => updateQualificationRule('min_value', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="10000"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Como funciona:</strong> Quando um lead for enviado, o sistema verificará se as respostas atendem às regras acima. 
                Se sim, o lead será marcado como "qualificado" automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Configurações Avançadas</h4>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.qualification_rules?.capture_ip || false}
              onChange={(e) => updateQualificationRule('capture_ip', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Capturar endereço IP</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.qualification_rules?.capture_user_agent || false}
              onChange={(e) => updateQualificationRule('capture_user_agent', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Capturar informações do navegador</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.qualification_rules?.prevent_duplicates || false}
              onChange={(e) => updateQualificationRule('prevent_duplicates', e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-700">Prevenir envios duplicados (mesmo email)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FormSettingsEditor;
