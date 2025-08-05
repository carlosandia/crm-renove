import React from 'react';
import { TabName, TabStates } from '../../hooks/useSmartAutoSave';

// AIDEV-NOTE: Componente para gerenciar abas com indicadores visuais de dirty state
// Inspirado em padrões do Salesforce e HubSpot

interface SmartTabsManagerProps {
  currentTab: TabName;
  tabStates: TabStates;
  onTabChange: (tab: TabName) => Promise<boolean>;
  isSaving?: boolean;
  className?: string;
}

const SmartTabsManager: React.FC<SmartTabsManagerProps> = ({
  currentTab,
  tabStates,
  onTabChange,
  isSaving = false,
  className = ''
}) => {
  const tabs: Array<{ key: TabName; label: string; description: string }> = [
    { key: 'basic', label: 'Básico', description: 'Informações gerais da pipeline' },
    { key: 'stages', label: 'Etapas', description: 'Configuração das etapas do funil' },
    { key: 'fields', label: 'Campos', description: 'Campos customizados do lead' },
    { key: 'distribution', label: 'Distribuição', description: 'Regras de distribuição de leads' },
    { key: 'cadence', label: 'Cadência', description: 'Automações e follow-ups' },
    { key: 'qualification', label: 'Qualificação', description: 'Regras de qualificação MQL/SQL' },
    { key: 'motives', label: 'Motivos', description: 'Motivos de ganho e perda' }
  ];

  const handleTabClick = async (tabKey: TabName) => {
    if (isSaving) return; // Prevenir mudança durante salvamento
    
    const success = await onTabChange(tabKey);
    if (!success) {
      // Se falhou, mantém na aba atual
      console.warn(`Falha ao mudar para aba ${tabKey}`);
    }
  };

  const getTabStatusIcon = (tabKey: TabName) => {
    const state = tabStates[tabKey];
    if (!state) return null;

    if (state.errorCount > 0) {
      return (
        <span 
          className="inline-flex items-center justify-center w-4 h-4 ml-1 text-xs text-red-600"
          title={`Erro ao salvar (${state.errorCount} tentativas)`}
        >
          ⚠️
        </span>
      );
    }

    if (state.hasChanges) {
      return (
        <span 
          className="inline-flex items-center justify-center w-4 h-4 ml-1 text-xs text-orange-600"
          title="Mudanças não salvas"
        >
          ●
        </span>
      );
    }

    if (state.lastSaved) {
      return (
        <span 
          className="inline-flex items-center justify-center w-4 h-4 ml-1 text-xs text-green-600"
          title={`Salvo em ${state.lastSaved.toLocaleTimeString()}`}
        >
          ✓
        </span>
      );
    }

    return null;
  };

  const getTabClassName = (tabKey: TabName) => {
    const state = tabStates[tabKey];
    const isActive = currentTab === tabKey;
    const hasChanges = state?.hasChanges || false;
    const hasError = (state?.errorCount || 0) > 0;

    let baseClasses = 'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2';
    
    if (isActive) {
      if (hasError) {
        baseClasses += ' bg-red-100 text-red-700 border-2 border-red-300';
      } else if (hasChanges) {
        baseClasses += ' bg-orange-100 text-orange-700 border-2 border-orange-300';
      } else {
        baseClasses += ' bg-blue-100 text-blue-700 border-2 border-blue-300';
      }
    } else {
      if (hasError) {
        baseClasses += ' bg-red-50 text-red-600 border border-red-200 hover:bg-red-100';
      } else if (hasChanges) {
        baseClasses += ' bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100';
      } else {
        baseClasses += ' bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100';
      }
    }

    if (isSaving) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    } else {
      baseClasses += ' cursor-pointer';
    }

    return baseClasses;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Indicador de estado geral */}
      {isSaving && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Salvando automaticamente...</span>
          <span className="text-xs text-blue-600 ml-auto">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Abas */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(tab => {
          const state = tabStates[tab.key];
          const isDisabled = isSaving;

          return (
            <button
              key={tab.key}
              onClick={() => !isDisabled && handleTabClick(tab.key)}
              disabled={isDisabled}
              className={getTabClassName(tab.key)}
              title={tab.description}
            >
              <span>{tab.label}</span>
              {getTabStatusIcon(tab.key)}
              
              {/* Indicador de aba ativa */}
              {currentTab === tab.key && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-current rounded-full opacity-60"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda dos indicadores */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-green-600">✓</span>
          <span>Salvo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-orange-600">●</span>
          <span>Não salvo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-600">⚠️</span>
          <span>Erro ao salvar</span>
        </div>
      </div>

      {/* Aviso de mudanças não salvas */}
      {Object.values(tabStates).some(state => state.hasChanges) && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                Você tem mudanças não salvas
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                As mudanças serão salvas automaticamente ao trocar de aba ou fechar o modal.
              </p>
              {/* ✅ NOVO: Mostrar última vez que foi salvo */}
              {Object.values(tabStates).some(state => state.lastSaved) && (
                <p className="text-xs text-yellow-600 mt-1">
                  Último salvamento: {
                    Object.values(tabStates)
                      .filter(state => state.lastSaved)
                      .sort((a, b) => (b.lastSaved?.getTime() || 0) - (a.lastSaved?.getTime() || 0))[0]
                      ?.lastSaved?.toLocaleTimeString()
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NOVO: Toast discreto de sucesso */}
      {!isSaving && Object.values(tabStates).some(state => 
        state.lastSaved && 
        (Date.now() - state.lastSaved.getTime()) < 3000 // Mostrar por 3 segundos
      ) && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 animate-fade-in">
          <span className="text-green-600">✅</span>
          <span className="text-sm text-green-700">
            Mudanças salvas automaticamente
          </span>
          <span className="text-xs text-green-600 ml-auto">
            {Object.values(tabStates)
              .filter(state => state.lastSaved && (Date.now() - state.lastSaved.getTime()) < 3000)
              .sort((a, b) => (b.lastSaved?.getTime() || 0) - (a.lastSaved?.getTime() || 0))[0]
              ?.lastSaved?.toLocaleTimeString()
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartTabsManager;