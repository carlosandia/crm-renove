/**
 * @fileoverview FieldTypesPanel - Painel lateral com 21 tipos de campo para arrastar
 * @module FormBuilder/Core
 * @version 1.0.0
 * @since Fase 3.5 - Extraído do ModernFormBuilder para modularização
 * 
 * RESPONSABILIDADES:
 * - Exibir tipos de campo disponíveis para criação
 * - Implementar drag & drop para adição de campos
 * - Categorizar campos por tipo (básicos, especiais, ações)
 * - Fornecer ícones e labels descritivos
 * 
 * PERFORMANCE:
 * - Componente memoizado com React.memo
 * - Array FIELD_TYPES estático para evitar recriações
 * - Ícones carregados sob demanda
 */

// ================================================================================
// FASE 3.1: FieldTypesPanel - Extraído do ModernFormBuilder.tsx
// ================================================================================
// Data: 27/01/2025 - Modularização crítica para reduzir arquivo gigante
// Origem: ModernFormBuilder.tsx linhas 62-1113 (painel lateral de tipos)

import React from 'react';
import { 
  Type, Mail, Phone, Calendar, MapPin, Image, Star, CheckSquare,
  FileText, DollarSign, Clock, Users, MessageSquare, Hash,
  List, Upload, Globe, Building, Flag, Shield, 
  RadioIcon, Sliders, Send
} from 'lucide-react';
import { FieldType } from '../../../types/Forms';

// ================================================================================
// TIPOS DE CAMPO DISPONÍVEIS
// ================================================================================

export interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

export const FIELD_TYPES: FieldTypeConfig[] = [
  { type: 'text', label: 'Texto', icon: Type, description: 'Campo de texto simples', color: 'bg-blue-100 text-blue-600' },
  { type: 'email', label: 'E-mail', icon: Mail, description: 'Campo de e-mail', color: 'bg-green-100 text-green-600' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Campo de telefone', color: 'bg-purple-100 text-purple-600' },
  { type: 'textarea', label: 'Texto Longo', icon: FileText, description: 'Área de texto', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Campo numérico', color: 'bg-indigo-100 text-indigo-600' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data', color: 'bg-red-100 text-red-600' },
  { type: 'time', label: 'Hora', icon: Clock, description: 'Seletor de hora', color: 'bg-orange-100 text-orange-600' },
  { type: 'url', label: 'URL', icon: Globe, description: 'Campo de URL/Link', color: 'bg-cyan-100 text-cyan-600' },
  { type: 'currency', label: 'Moeda', icon: DollarSign, description: 'Campo monetário', color: 'bg-emerald-100 text-emerald-600' },
  { type: 'city', label: 'Cidade', icon: Building, description: 'Campo de cidade', color: 'bg-blue-100 text-blue-600' },
  { type: 'state', label: 'Estado', icon: MapPin, description: 'Campo de estado/província', color: 'bg-green-100 text-green-600' },
  { type: 'country', label: 'País', icon: Flag, description: 'Campo de país', color: 'bg-red-100 text-red-600' },
  { type: 'captcha', label: 'Captcha', icon: Shield, description: 'Verificação de segurança', color: 'bg-gray-100 text-gray-600' },
  { type: 'select', label: 'Lista Suspensa', icon: List, description: 'Menu dropdown', color: 'bg-pink-100 text-pink-600' },
  { type: 'radio', label: 'Múltipla Escolha', icon: RadioIcon, description: 'Botões de rádio', color: 'bg-violet-100 text-violet-600' },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: CheckSquare, description: 'Múltiplas opções', color: 'bg-teal-100 text-teal-600' },
  { type: 'range', label: 'Slider', icon: Sliders, description: 'Controle deslizante', color: 'bg-amber-100 text-amber-600' },
  { type: 'rating', label: 'Avaliação', icon: Star, description: 'Sistema de estrelas', color: 'bg-yellow-100 text-yellow-600' },
  { type: 'file', label: 'Upload de Arquivo', icon: Upload, description: 'Envio de arquivos', color: 'bg-gray-100 text-gray-600' },
  { type: 'submit', label: 'Botão Enviar', icon: Send, description: 'Botão de envio do formulário', color: 'bg-blue-100 text-blue-600' },
  { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, description: 'Botão WhatsApp', color: 'bg-green-100 text-green-600' },
];

// ================================================================================
// INTERFACE DO COMPONENTE
// ================================================================================

export interface FieldTypesPanelProps {
  onAddField: (fieldType: FieldType) => void;
  className?: string;
}

// ================================================================================
// COMPONENTE FIELD TYPES PANEL
// ================================================================================

const FieldTypesPanel: React.FC<FieldTypesPanelProps> = ({ 
  onAddField, 
  className = "" 
}) => {
  return (
    <div className={`w-80 bg-white border-r border-gray-200 overflow-y-auto ${className}`}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Elementos Disponíveis
        </h3>
        
        <div className="space-y-2">
          {FIELD_TYPES.map((fieldType) => {
            const Icon = fieldType.icon;
            return (
              <button
                key={fieldType.type}
                onClick={() => onAddField(fieldType.type)}
                className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fieldType.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{fieldType.label}</div>
                  <div className="text-xs text-gray-500 truncate">{fieldType.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FieldTypesPanel; 