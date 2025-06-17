interface PipelineViewHeaderProps {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  onPipelineChange: (pipeline: Pipeline | null) => void;
  onAddLead: () => void;
  totalLeads: number;
  totalRevenue: number;
  closedDeals: number;
  conversionRate?: number;
  averageTicket?: number;
  averageCycleTime?: string;
  loading?: boolean;
}

const PipelineViewHeader: React.FC<PipelineViewHeaderProps> = ({
  pipelines,
  selectedPipeline,
  onPipelineChange,
  onAddLead,
  totalLeads,
  totalRevenue,
  closedDeals,
  conversionRate = 0,
  averageTicket = 0,
  averageCycleTime = '0 dias',
  loading = false
}) => {
  // Calcular ticket médio se não fornecido
  const averageDealSize = averageTicket || (closedDeals > 0 ? totalRevenue / closedDeals : 0);

  // ... existing code ...

          {/* Estatísticas em linha horizontal compacta */}
          <div className="w-full">
            <PipelineStats
              totalLeads={totalLeads}
              totalRevenue={totalRevenue}
              closedDeals={closedDeals}
              conversionRate={conversionRate}
              averageDealSize={averageDealSize}
              averageCycleTime={averageCycleTime}
              loading={loading}
            />
          </div>

  // ... existing code ...
} 