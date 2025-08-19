/**
 * ============================================
 * 📊 ANALYTICS DE MOTIVOS DE GANHO/PERDIDO
 * ============================================
 * 
 * Dashboard analytics para motivos de ganho e perdido usando Recharts
 * AIDEV-NOTE: Segue padrões dos grandes CRMs como HubSpot e Pipedrive
 */

import React from 'react';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
// AIDEV-NOTE: Usando versão adaptada dos cards para compatibilidade
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}  
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className, ...props }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className || ''}`} {...props} />
);

const CardHeader: React.FC<CardHeaderProps> = ({ className, ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`} {...props} />
);

const CardTitle: React.FC<CardTitleProps> = ({ className, ...props }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className || ''}`} {...props} />
);

const CardDescription: React.FC<CardDescriptionProps> = ({ className, ...props }) => (
  <p className={`text-sm text-gray-600 ${className || ''}`} {...props} />
);

const CardContent: React.FC<CardContentProps> = ({ className, ...props }) => (
  <div className={`p-6 pt-0 ${className || ''}`} {...props} />
);
import { Badge } from '../ui/badge';

// ============================================
// INTERFACES
// ============================================

interface OutcomeReasonAnalyticsProps {
  pipelineId: string;
  tenantId: string;
  userRole?: 'admin' | 'member' | 'super_admin';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AnalyticsData {
  ganhoReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  perdidoReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  summary: {
    totalGanho: number;
    totalPerdido: number;
    conversionRate: number;
    topGanhoReason: string;
    topPerdidoReason: string;
  };
}

// ============================================
// CORES PADRÃO PARA GRÁFICOS
// ============================================

const GANHO_COLORS = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];
const PERDIDO_COLORS = ['#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D'];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const OutcomeReasonsAnalytics: React.FC<OutcomeReasonAnalyticsProps> = ({
  pipelineId,
  tenantId,
  userRole = 'member',
  dateRange
}) => {
  
  // ============================================
  // PERMISSÕES POR ROLE
  // ============================================

  // AIDEV-NOTE: Verificar se usuário tem permissão para ver analytics
  const canViewAnalytics = () => {
    switch (userRole) {
      case 'super_admin':
        return true; // Super admin vê tudo
      case 'admin':
        return pipelineId !== 'all'; // Admin vê apenas seus pipelines
      case 'member':
        return false; // Member não vê analytics
      default:
        return false;
    }
  };

  // Não mostrar analytics se usuário não tem permissão
  if (!canViewAnalytics()) {
    return (
      <div className="text-center py-8">
        <Target className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics Indisponível</h3>
        <p className="mt-1 text-sm text-gray-500">
          Você não tem permissão para visualizar analytics de motivos.
        </p>
      </div>
    );
  }
  
  // ============================================
  // DADOS MOCK PARA DEMONSTRAÇÃO
  // ============================================
  // AIDEV-NOTE: Em produção, buscar via useQuery + API
  
  const mockData: AnalyticsData = {
    ganhoReasons: [
      { reason: 'Preço competitivo', count: 45, percentage: 42.5 },
      { reason: 'Melhor proposta técnica', count: 32, percentage: 30.2 },
      { reason: 'Relacionamento/confiança', count: 18, percentage: 17.0 },
      { reason: 'Urgência do cliente', count: 8, percentage: 7.5 },
      { reason: 'Recomendação/indicação', count: 3, percentage: 2.8 }
    ],
    perdidoReasons: [
      { reason: 'Preço muito alto', count: 38, percentage: 45.2 },
      { reason: 'Concorrente escolhido', count: 22, percentage: 26.2 },
      { reason: 'Não era o momento', count: 12, percentage: 14.3 },
      { reason: 'Não há orçamento', count: 8, percentage: 9.5 },
      { reason: 'Não era fit para o produto', count: 4, percentage: 4.8 }
    ],
    summary: {
      totalGanho: 106,
      totalPerdido: 84,
      conversionRate: 55.8,
      topGanhoReason: 'Preço competitivo',
      topPerdidoReason: 'Preço muito alto'
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderMetricsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Ganhos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ganhos</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{mockData.summary.totalGanho}</div>
          <p className="text-xs text-gray-600">
            leads conquistados
          </p>
        </CardContent>
      </Card>

      {/* Total Perdidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Perdidos</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{mockData.summary.totalPerdido}</div>
          <p className="text-xs text-gray-600">
            leads perdidos
          </p>
        </CardContent>
      </Card>

      {/* Taxa Conversão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          <Target className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{mockData.summary.conversionRate}%</div>
          <p className="text-xs text-gray-600">
            ganho vs. total
          </p>
        </CardContent>
      </Card>

      {/* Principal Motivo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Principal Motivo</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-bold text-green-600">{mockData.summary.topGanhoReason}</div>
          <p className="text-xs text-gray-600">
            motivo mais frequente
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderGanhoChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Distribuição de Motivos de Ganho
        </CardTitle>
        <CardDescription>
          Principais razões para leads conquistados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={mockData.ganhoReasons}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ reason, percentage }) => `${reason} (${percentage}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {mockData.ganhoReasons.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={GANHO_COLORS[index % GANHO_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => [`${value} leads`, 'Quantidade']} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend personalizada */}
        <div className="flex flex-wrap gap-2 mt-4">
          {mockData.ganhoReasons.map((item, index) => (
            <Badge 
              key={item.reason} 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: GANHO_COLORS[index], color: GANHO_COLORS[index] }}
            >
              {item.reason}: {item.count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderPerdidoChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          Principais Motivos de Perdido
        </CardTitle>
        <CardDescription>
          Razões mais comuns para leads perdidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockData.perdidoReasons} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="reason" type="category" width={150} />
            <Tooltip formatter={(value: any) => [`${value} leads`, 'Quantidade']} />
            <Bar dataKey="count" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Insights */}
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Insight:</strong> {mockData.summary.topPerdidoReason} é responsável por{' '}
            {mockData.perdidoReasons[0]?.percentage}% dos perdidos. 
            Considere revisar estratégia de precificação.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics de Motivos</h2>
          <p className="text-gray-600">Análise detalhada de ganhos e perdidos</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          Dashboard
        </Badge>
      </div>

      {/* Métricas Cards */}
      {renderMetricsCards()}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderGanhoChart()}
        {renderPerdidoChart()}
      </div>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Ponto Forte</p>
                <p className="text-sm text-gray-600">
                  Preço competitivo é nosso principal diferencial, responsável por 42.5% dos ganhos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Oportunidade de Melhoria</p>
                <p className="text-sm text-gray-600">
                  45.2% dos perdidos são por preço alto. Considere estratégias de valor agregado.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutcomeReasonsAnalytics;