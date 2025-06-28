import React from 'react';
import { Building2, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EmptyState } from '../ui/empty-state';

interface CompanyPerformance {
  company_id: string;
  company_name: string;
  city: string;
  state: string;
  industry: string;
  expected_leads_monthly: number;
  leads_received: number;
  expected_sales_monthly: number;
  sales_closed: number;
  expected_followers_monthly: number;
  conversion_rate: number;
  avg_ticket: number;
  origem_breakdown: Record<string, number>;
  time_to_mql_days: number;
  time_to_close_days: number;
  stalled_leads: number;
}

interface ReportsTableProps {
  companies: CompanyPerformance[];
  totalCompanies: number;
  onViewDetails: (company: CompanyPerformance) => void;
  onRefresh: () => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({
  companies,
  totalCompanies,
  onViewDetails,
  onRefresh
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getOrigemLabel = (origem: string) => {
    const labels: Record<string, string> = {
      Meta: 'Meta',
      Google: 'Google',
      LinkedIn: 'LinkedIn',
      Manual: 'Manual',
      Webhook: 'API'
    };
    return labels[origem] || origem;
  };

  const getConversionStatus = (rate: number) => {
    if (rate >= 20) return { text: 'Excelente', color: 'bg-green-100 text-green-800' };
    if (rate >= 10) return { text: 'Bom', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Precisa melhorar', color: 'bg-red-100 text-red-800' };
  };

  const getGoalStatus = (expected: number, actual: number) => {
    const achieved = actual >= expected;
    return {
      text: achieved ? 'Meta atingida' : 'Abaixo da meta',
      color: achieved ? 'text-green-600' : 'text-orange-600'
    };
  };

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            variant="generic"
            title="Nenhum relatório encontrado"
            description="Não há dados de relatório para exibir no momento."
            actionLabel="Atualizar"
            onAction={onRefresh}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Empresa</CardTitle>
        <p className="text-sm text-gray-600">
          Mostrando {companies.length} de {totalCompanies} empresas
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Leads (Exp/Real)</TableHead>
                <TableHead className="text-center">Vendas (Exp/Real)</TableHead>
                <TableHead className="text-center">Conversão</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead>Principais Canais</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const conversionStatus = getConversionStatus(company.conversion_rate);
                const leadsStatus = getGoalStatus(company.expected_leads_monthly, company.leads_received);
                const salesStatus = getGoalStatus(company.expected_sales_monthly, company.sales_closed);
                
                return (
                  <TableRow key={company.company_id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{company.company_name}</div>
                          <div className="text-sm text-gray-500">{company.industry}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="text-sm text-gray-900">{company.city}</div>
                        <div className="text-sm text-gray-500">{company.state}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="font-medium text-gray-900">
                        {company.expected_leads_monthly} / {company.leads_received}
                      </div>
                      <div className={`text-xs ${leadsStatus.color}`}>
                        {leadsStatus.text}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="font-medium text-gray-900">
                        {company.expected_sales_monthly} / {company.sales_closed}
                      </div>
                      <div className={`text-xs ${salesStatus.color}`}>
                        {salesStatus.text}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {formatPercentage(company.conversion_rate)}
                      </div>
                      <Badge variant="secondary" className={conversionStatus.color}>
                        {conversionStatus.text}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(company.avg_ticket)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total: {formatCurrency(company.expected_sales_monthly * company.avg_ticket)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(company.origem_breakdown || {})
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 2)
                          .map(([origem, count]) => (
                            <Badge key={origem} variant="secondary" className="bg-blue-100 text-blue-800">
                              {getOrigemLabel(origem)}: {count}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(company)}
                        className="h-8"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsTable; 