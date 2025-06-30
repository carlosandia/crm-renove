import React, { useMemo } from 'react';
import { 
  User, Mail, Phone, Building, Calendar, MapPin, 
  ExternalLink, Target, Tag, Clock, Activity, Globe, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { useInlineEditor } from '../editors/InlineEditor';

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

export interface LeadInfoDisplayProps {
  leadData: LeadMaster;
  localLeadData?: LeadMaster | null;
  onLeadUpdated?: (updatedLead: LeadMaster) => void;
  onLocalLeadDataUpdate?: (data: LeadMaster) => void;
  formatDate: (dateString?: string) => string;
  canEdit?: boolean;
}

// Hook simplificado
export const useLeadInfoDisplay = ({
  leadData,
  localLeadData,
  onLeadUpdated,
  onLocalLeadDataUpdate,
  formatDate,
  canEdit = true
}: LeadInfoDisplayProps) => {
  const currentLeadData = localLeadData || leadData;

  const { renderEditableField } = useInlineEditor({
    leadData,
    onLeadUpdated,
    localLeadData,
    onLocalLeadDataUpdate
  });

  const displayName = useMemo(() => {
    const name = `${currentLeadData.first_name || ''} ${currentLeadData.last_name || ''}`.trim();
    return name || 'Nome não informado';
  }, [currentLeadData.first_name, currentLeadData.last_name]);
  
  const displayJobTitle = useMemo(() => {
    return currentLeadData.job_title || currentLeadData.position || 'Não informado';
  }, [currentLeadData.job_title, currentLeadData.position]);
  
  const displaySource = useMemo(() => {
    return currentLeadData.lead_source || currentLeadData.source || 'Não informado';
  }, [currentLeadData.lead_source, currentLeadData.source]);

  const displayLocation = useMemo(() => {
    const parts = [currentLeadData.city, currentLeadData.state, currentLeadData.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Não informado';
  }, [currentLeadData.city, currentLeadData.state, currentLeadData.country]);

  const BasicInfoSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Informações Básicas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Nome</label>
          </div>
          <p className="text-sm text-gray-900">{displayName}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Email</label>
          </div>
          <p className="text-sm text-gray-900">{currentLeadData.email || 'Não informado'}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Telefone</label>
          </div>
          <p className="text-sm text-gray-900">{currentLeadData.phone || 'Não informado'}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Empresa</label>
          </div>
          <p className="text-sm text-gray-900">{currentLeadData.company || 'Não informado'}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Data de Criação</label>
          </div>
          <p className="text-sm text-gray-900">{formatDate(currentLeadData.created_at)}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Última Atualização</label>
          </div>
          <p className="text-sm text-gray-900">{formatDate(currentLeadData.updated_at)}</p>
        </div>
      </CardContent>
    </Card>
  );

  const UTMDataSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Dados de Rastreamento UTM
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">UTM Source</label>
          <p className="text-gray-900">{currentLeadData.utm_source || 'Não informado'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">UTM Medium</label>
          <p className="text-gray-900">{currentLeadData.utm_medium || 'Não informado'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">UTM Campaign</label>
          <p className="text-gray-900">{currentLeadData.utm_campaign || 'Não informado'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">UTM Term</label>
          <p className="text-gray-900">{currentLeadData.utm_term || 'Não informado'}</p>
        </div>
      </CardContent>
    </Card>
  );

  return {
    BasicInfoSection,
    UTMDataSection,
    displayName,
    displayJobTitle,
    displaySource,
    displayLocation
  };
};

export const LeadInfoDisplay: React.FC<LeadInfoDisplayProps> = (props) => {
  const { BasicInfoSection, UTMDataSection } = useLeadInfoDisplay(props);

  return (
    <div className="space-y-6">
      <BasicInfoSection />
      <UTMDataSection />
    </div>
  );
};

export default LeadInfoDisplay;
