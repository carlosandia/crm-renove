// =====================================================================================
// COMPONENT: Aba de Anotações - Interface Ultra-Simples (Estilo Moskit)
// Autor: Claude (Arquiteto Sênior)
// Descrição: Interface minimalista para anotações sem complexidade visual
// =====================================================================================

import React, { useState } from 'react';
import { useAnnotations } from '../../hooks/useAnnotations';
import { useAuth } from '../../providers/AuthProvider';
import { SimpleAnnotationEditor } from './SimpleAnnotationEditor';
import { SimpleAnnotationTimeline } from './SimpleAnnotationTimeline';

interface AnnotationsTabProps {
  leadId: string;
  leadType: 'pipeline_lead' | 'lead_master';
  leadName?: string;
  companyName?: string;
  className?: string;
}

export const AnnotationsTab: React.FC<AnnotationsTabProps> = ({
  leadId,
  leadType,
  leadName = 'Lead',
  companyName,
  className = ""
}) => {
  const { user } = useAuth();
  
  // Query para buscar anotações
  const { data: annotationsData, refetch } = useAnnotations(leadId, leadType, { limit: 50 });

  const handleAnnotationSaved = () => {
    refetch(); // Atualizar timeline após salvar
  };

  return (
    <div className={`annotations-simple-container ${className} space-y-4`}>
      {/* Editor Simples */}
      <SimpleAnnotationEditor
        leadId={leadId}
        leadType={leadType}
        onSave={handleAnnotationSaved}
        user={user}
      />

      {/* Timeline */}
      <SimpleAnnotationTimeline
        annotations={annotationsData?.data || []}
        isLoading={annotationsData === undefined}
        onRefetch={refetch}
      />
    </div>
  );
};