
import { useState } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { logger } from '../lib/logger';
import { Lead } from '../types/Pipeline';

export const usePipelineDragDrop = (leads: Lead[], updateLeadStage: (leadId: string, newStageId: string) => void) => {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;
    
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    updateLeadStage(leadId, newStageId);
    logger.info('✅ Lead movido com sucesso');
  };

  return {
    activeLead,
    handleDragStart,
    handleDragEnd
  };
};
