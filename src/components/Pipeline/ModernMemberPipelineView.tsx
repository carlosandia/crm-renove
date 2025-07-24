import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { Target, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineData } from '../../hooks/usePipelineData';

// UI Components
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { BlurFade } from '../ui/blur-fade';

// Pipeline Components
// ✅ CORRIGIDO: Sistema usa @dnd-kit para drag and drop
import DraggableLeadCard from './DraggableLeadCard';
import DroppableStageArea from './DroppableStageArea';
import LeadDetailsModal from './LeadDetailsModal';

interface ModernMemberPipelineViewProps {
  className?: string;
}

const ModernMemberPipelineView: React.FC<ModernMemberPipelineViewProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    pipelines,
    selectedPipeline,
    leads,
    loading,
    error,
    setSelectedPipeline,
    updateLeadStage,
    refreshLeads,
  } = usePipelineData();

  // Estados para drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Estados para modal de detalhes
  const [showDealDetailsModal, setShowDealDetailsModal] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<any>(null);

  // Configuração dos sensores com threshold otimizado
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // ✅ Reduzido para resposta mais rápida
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Filtrar pipelines para member (apenas as que está vinculado)
  const memberPipelines = useMemo(() => {
    if (!pipelines || !user) return [];
    // Members veem apenas pipelines onde estão vinculados via pipeline_members
    return pipelines.filter(pipeline => 
      pipeline.pipeline_members?.some(member => member.member_id === user.id)
    );
  }, [pipelines, user]);

  // Pipeline selecionada ou primeira disponível
  const currentPipeline = useMemo(() => {
    if (selectedPipeline) return selectedPipeline;
    if (memberPipelines.length > 0) {
      setSelectedPipeline(memberPipelines[0]);
      return memberPipelines[0];
    }
    return null;
  }, [selectedPipeline, memberPipelines, setSelectedPipeline]);

  // Leads filtrados para o member - CORRIGIDO: Ver TODOS os leads da pipeline com acesso
  const memberLeads = useMemo(() => {
    if (!leads || !user || !currentPipeline) return [];
    
    // 1. Verificar se tem acesso à pipeline via pipeline_members (sistema já funciona)
    const hasAccess = currentPipeline.pipeline_members?.some(
      member => member.member_id === user.id
    );
    
    if (!hasAccess) return [];
    
    // 2. Se tem acesso, ver TODOS os leads da pipeline (como grandes CRMs)
    return leads.filter(lead => lead.pipeline_id === currentPipeline.id);
  }, [leads, user, currentPipeline]);

  // Stages da pipeline atual
  const pipelineStages = useMemo(() => {
    if (!currentPipeline?.pipeline_stages) return [];
    return currentPipeline.pipeline_stages.sort((a, b) => a.order_index - b.order_index);
  }, [currentPipeline]);

  // 🚀 NOVO: Listener global para refresh automático quando leads são editados no módulo
  useEffect(() => {
    const handleLeadDataUpdated = (event: CustomEvent) => {
      const { leadMasterId, pipelineLeadsUpdated, timestamp } = event.detail;
      
      console.log('📡 [ModernMemberPipelineView] Evento leadDataUpdated recebido:', {
        leadMasterId: leadMasterId?.substring(0, 8) + '...',
        pipelineLeadsCount: pipelineLeadsUpdated?.length || 0,
        timestamp,
        currentPipelineId: currentPipeline?.id
      });
      
      // Só fazer refresh se temos uma pipeline atual
      if (currentPipeline?.id) {
        console.log('🔄 [ModernMemberPipelineView] Fazendo refresh automático dos leads...');
        
        // Fazer refresh com delay para garantir que a sincronização terminou
        setTimeout(() => {
          refreshLeads();
        }, 300); // 300ms de delay
      } else {
        console.log('⚠️ [ModernMemberPipelineView] Nenhuma pipeline atual, ignorando refresh');
      }
    };

    // ✅ CORREÇÃO: Listener para leads criados
    const handleLeadCreated = (event: CustomEvent) => {
      const { leadId, pipelineId, stageId, leadData, timestamp } = event.detail;
      
      console.log('🆕 [ModernMemberPipelineView] Evento leadCreated recebido:', {
        leadId: leadId?.substring(0, 8) + '...',
        pipelineId: pipelineId?.substring(0, 8) + '...',
        stageId: stageId?.substring(0, 8) + '...',
        timestamp,
        currentPipelineId: currentPipeline?.id
      });
      
      // Só fazer refresh se o lead foi criado na pipeline atual
      if (currentPipeline?.id === pipelineId) {
        console.log('🔄 [ModernMemberPipelineView] Lead criado na pipeline atual, fazendo refresh...');
        
        // Fazer refresh imediato para mostrar o novo lead
        setTimeout(() => {
          refreshLeads();
        }, 100); // 100ms de delay menor para resposta mais rápida
      } else {
        console.log('⚠️ [ModernMemberPipelineView] Lead criado em pipeline diferente, ignorando refresh');
      }
    };

    // Adicionar listeners
    window.addEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
    window.addEventListener('leadCreated', handleLeadCreated as EventListener);
    console.log('👂 [ModernMemberPipelineView] Listeners registrados');

    // Cleanup
    return () => {
      window.removeEventListener('leadDataUpdated', handleLeadDataUpdated as EventListener);
      window.removeEventListener('leadCreated', handleLeadCreated as EventListener);
      console.log('🧹 [ModernMemberPipelineView] Listeners removidos');
    };
  }, [currentPipeline?.id, refreshLeads]);

  // Handlers do drag and drop
  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    setActiveId(event.active.id as string);
    console.log('🚀 Member Drag iniciado:', event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    setActiveId(null);
    
    const { active, over } = event;
    
    if (!over || !currentPipeline) {
      console.log('🚫 Drag cancelado: sem destino ou pipeline');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Extrair IDs reais
    const leadId = activeId.startsWith('lead-') ? activeId.replace('lead-', '') : activeId;
    const stageId = overId.startsWith('stage-') ? overId.replace('stage-', '') : overId;

    const activeLead = memberLeads.find(lead => lead.id === leadId);
    if (!activeLead) {
      console.log('🚫 Lead não encontrado:', leadId);
      return;
    }

    if (activeLead.stage_id === stageId) {
      console.log('🚫 Lead já está nesta etapa');
      return;
    }

    console.log('🎯 Member movendo lead:', {
      leadId,
      fromStage: activeLead.stage_id,
      toStage: stageId,
      leadName: activeLead.custom_data?.nome_lead || 'Lead'
    });

    try {
      await updateLeadStage(leadId, stageId);
      console.log('✅ Lead movido com sucesso');
      await refreshLeads();
    } catch (error) {
      console.error('❌ Erro ao mover lead:', error);
      await refreshLeads();
      alert('Erro ao mover lead. Tente novamente.');
    }
  };

  // Handlers do modal de detalhes
  const openDealDetailsModal = (lead: any) => {
    setSelectedLeadForDetails(lead);
    setShowDealDetailsModal(true);
  };

  const closeDealDetailsModal = () => {
    setShowDealDetailsModal(false);
    setSelectedLeadForDetails(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando pipeline...</span>
      </div>
    );
  }

  if (!currentPipeline) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Target className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma Pipeline Disponível</h3>
          <p className="text-gray-500">
            Você não está vinculado a nenhuma pipeline ativa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <BlurFade delay={0.05}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentPipeline.name}</h1>
          <p className="text-gray-600">{currentPipeline.description}</p>
        </div>
      </BlurFade>

      {/* Seletor de Pipeline */}
      {memberPipelines.length > 1 && (
        <BlurFade delay={0.1}>
          <div className="mb-6">
            <select
              value={currentPipeline.id}
              onChange={(e) => {
                const pipeline = memberPipelines.find(p => p.id === e.target.value);
                if (pipeline) setSelectedPipeline(pipeline);
              }}
              className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {memberPipelines.map(pipeline => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>
        </BlurFade>
      )}

      {/* Kanban Board */}
      <BlurFade delay={0.15}>
        <Card className="p-6 overflow-x-auto">
          {pipelineStages.length > 0 ? (
            <DndContext 
              sensors={sensors}
              onDragStart={handleDragStart} 
              onDragEnd={handleDragEnd}
            >
              <div 
                className={`flex gap-6 pb-4 transition-all duration-200 ${isDragging ? 'opacity-70' : ''}`} 
                style={{ minWidth: 'max-content', height: '70vh' }}
              >
                {pipelineStages.map((stage) => {
                  const stageLeads = memberLeads.filter(lead => lead.stage_id === stage.id);
                  
                  return (
                    <DroppableStageArea
                      key={stage.id}
                      stageId={stage.id}
                      stageName={stage.name}
                      stageColor={stage.color}
                      leadCount={stageLeads.length}
                    >
                      {/* Lista de Leads */}
                      {stageLeads.map((lead) => (
                        <div key={lead.id} className="mb-3">
                          <DraggableLeadCard
                            lead={lead}
                            userRole="member"
                            canEdit={true}
                            canTransfer={false}
                            canDelete={false}
                            canView={true}
                            canDrag={true}
                            onEdit={(lead) => {
                              console.log('Member editando lead:', lead.id);
                            }}
                            onViewDetails={openDealDetailsModal}
                            showVendorInfo={false}
                            showTemperature={true}
                            showActions={false}
                          />
                        </div>
                      ))}
                    </DroppableStageArea>
                  );
                })}
              </div>
              
              {/* ✅ DragOverlay PORTAL - Renderizado no Body */}
              {createPortal(
                <DragOverlay 
                  adjustScale={false} 
                  dropAnimation={null}
                  style={{ 
                    cursor: 'grabbing',
                    transformOrigin: '0 0'
                  }}
                >
                  {activeId ? (
                    (() => {
                      console.log('🎨 Member DragOverlay renderizando:', { 
                        activeId, 
                        activeIdProcessed: String(activeId).startsWith('lead-') ? String(activeId).replace('lead-', '') : activeId,
                        leadsAvailable: memberLeads.length
                      });
                      
                      const leadId = String(activeId).startsWith('lead-') ? String(activeId).replace('lead-', '') : String(activeId);
                      const activeLead = memberLeads.find(lead => lead.id === leadId);
                      
                      console.log('🔍 Member Lead encontrado:', { leadId, found: !!activeLead, leadName: activeLead?.custom_data?.nome_lead });
                      
                      if (!activeLead) {
                        // Fallback: Card simples
                        return (
                          <div className="bg-blue-500 text-white p-4 rounded-lg shadow-2xl ring-2 ring-blue-300 transform rotate-6 scale-105">
                            <div className="font-semibold">Movendo Lead...</div>
                            <div className="text-sm opacity-75">ID: {leadId}</div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="bg-white rounded-lg border-2 border-blue-500 shadow-2xl ring-2 ring-blue-500 ring-opacity-50 p-4 transform rotate-6 scale-105 max-w-xs">
                          <div className="font-semibold text-gray-900 mb-2">
                            {activeLead.custom_data?.nome_lead || activeLead.custom_data?.nome_oportunidade || 'Lead'}
                          </div>
                          {activeLead.custom_data?.email && (
                            <div className="text-sm text-gray-600 mb-1">
                              📧 {activeLead.custom_data.email}
                            </div>
                          )}
                          {activeLead.custom_data?.telefone && (
                            <div className="text-sm text-gray-600 mb-1">
                              📱 {activeLead.custom_data.telefone}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            ✊ Arrastando...
                          </div>
                        </div>
                      );
                    })()
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Target className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma etapa encontrada</h3>
                <p className="text-gray-500 text-sm">
                  Esta pipeline não possui etapas configuradas.
                </p>
              </div>
            </div>
          )}
        </Card>
      </BlurFade>

      {/* Modal de Detalhes do Lead */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          isOpen={showDealDetailsModal}
          onClose={closeDealDetailsModal}
          lead={selectedLeadForDetails}
          customFields={currentPipeline?.pipeline_custom_fields || []}
        />
      )}
    </div>
  );
};

export default ModernMemberPipelineView; 