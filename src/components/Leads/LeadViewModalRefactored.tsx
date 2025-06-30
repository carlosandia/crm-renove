import React, { useState, useEffect, useMemo } from 'react';
import { Eye, X, Info, Activity, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DetailsModalProps } from '../../types/CommonProps';

// Imports dos subcomponentes extraídos
import { useLeadInfoDisplay } from './display/LeadInfoDisplay';
import { OpportunitiesHistory } from './opportunities/OpportunitiesHistory';
import { useLeadFormatters } from './utils/LeadFormatters';

// Interface compatível
interface LeadMaster {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  position?: string;
  lead_source?: string;
  source?: string;
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

interface LeadViewModalRefactoredProps extends Omit<DetailsModalProps<LeadMaster>, 'item'> {
  leadData: LeadMaster | null;
  item?: LeadMaster | null;
  onLeadUpdated?: (updatedLead: LeadMaster) => void;
}

const LeadViewModalRefactored: React.FC<LeadViewModalRefactoredProps> = ({
  leadData,
  item,
  isOpen,
  onClose,
  onLeadUpdated,
  title,
  loading,
  canEdit = true,
  canDelete = false,
  ...modalProps
}) => {
  const lead = item || leadData;
  const [activeTab, setActiveTab] = useState('info');
  const [localLeadData, setLocalLeadData] = useState<LeadMaster | null>(null);

  const {
    formatDate,
    formatCurrency,
    getTemperatureColor,
    getStatusColor,
    getOpportunityStatusColor,
    getOpportunityStatusText,
    formatFullName
  } = useLeadFormatters();

  if (!isOpen || !lead) {
    return null;
  }

  const currentLeadData = localLeadData || lead;

  const displayName = useMemo(() => {
    const name = formatFullName(currentLeadData.first_name, currentLeadData.last_name);
    return name;
  }, [currentLeadData.first_name, currentLeadData.last_name, formatFullName]);

  useEffect(() => {
    if (lead) {
      setLocalLeadData({ ...lead });
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
    }
  }, [isOpen]);

  const handleLocalLeadDataUpdate = (updatedData: LeadMaster) => {
    setLocalLeadData(updatedData);
  };

  const { BasicInfoSection, UTMDataSection } = useLeadInfoDisplay({
    leadData: lead,
    localLeadData,
    onLeadUpdated,
    onLocalLeadDataUpdate: handleLocalLeadDataUpdate,
    formatDate,
    canEdit
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Detalhes do Lead
          </DialogTitle>
          <DialogDescription>
            Informações completas do lead "{displayName}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Informações Básicas
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dados de Rastreamento
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Oportunidades
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="info" className="space-y-6 m-0">
              <BasicInfoSection />
            </TabsContent>

            <TabsContent value="tracking" className="space-y-6 m-0">
              <UTMDataSection />
            </TabsContent>

            <TabsContent value="history" className="space-y-6 m-0">
              <OpportunitiesHistory
                leadData={lead}
                localLeadData={localLeadData}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                getOpportunityStatusColor={getOpportunityStatusColor}
                getOpportunityStatusText={getOpportunityStatusText}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end p-4 border-t">
          <Button onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadViewModalRefactored;
