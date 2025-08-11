import React, { useState, useRef, useCallback } from 'react';
import { 
  Search, X, Calendar, Plus, ChevronDown, 
  Edit3, Archive, Eye, Folder, Settings, Play 
} from 'lucide-react'; // ✅ FASE 3.1: Novos ícones
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MetricsFilterButton from './MetricsFilterButton';

// ============================================
// INTERFACES E TIPOS
// ============================================

// ✅ FASE 3.1: Interface expandida para pipeline com status de arquivamento
interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ✅ FASE 3.1: Props expandidas para novas funcionalidades
export interface PipelineSpecificSubHeaderProps {
  selectedPipeline: Pipeline | null;
  pipelines: Pipeline[];
  onPipelineChange: (pipeline: Pipeline) => void;
  onSearchChange?: (value: string) => void;
  onDateRangeChange?: (dateRange: { start: Date | null; end: Date | null }) => void;
  onCreateOpportunity: () => void;
  // ✅ FASE 3.1: Novos handlers
  onCreatePipeline?: () => void;
  onEditPipeline?: (pipeline: Pipeline) => void;
  onArchivePipeline?: (pipeline: Pipeline) => void;
  onUnarchivePipeline?: (pipeline: Pipeline) => void;
  // Configurações de visualização
  searchValue?: string;
  searchPlaceholder?: string;
  showArchivedPipelines?: boolean;
  className?: string;
  // ✅ NOVO: Estado de carregamento
  isLoading?: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PipelineSpecificSubHeader: React.FC<PipelineSpecificSubHeaderProps> = ({
  selectedPipeline,
  pipelines,
  onPipelineChange,
  onSearchChange,
  onDateRangeChange,
  onCreateOpportunity,
  // ✅ FASE 3.1: Novos props
  onCreatePipeline,
  onEditPipeline,
  onArchivePipeline,
  onUnarchivePipeline,
  searchValue = "",
  isLoading = false,
  searchPlaceholder = "Buscar oportunidades...",
  showArchivedPipelines = false,
  className = ""
}) => {
  // ============================================
  // ESTADOS
  // ============================================
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // ✅ FASE 3.1: Novos estados para o dropdown avançado
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<'all' | 'active' | 'archived'>('active');

  // ✅ OTIMIZAÇÃO: Sistema de throttling para logs (5 segundos)
  const lastLogTime = useRef<{[key: string]: number}>({});
  const throttleLog = useCallback((key: string, logFn: () => void, throttleMs: number = 5000) => {
    const now = Date.now();
    const lastTime = lastLogTime.current[key] || 0;
    
    if (now - lastTime >= throttleMs) {
      lastLogTime.current[key] = now;
      if (process.env.NODE_ENV === 'development') {
        logFn();
      }
    }
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSearchToggle = () => {
    if (isSearchExpanded && searchValue) {
      // Se está expandido e tem texto, limpa primeiro
      onSearchChange?.("");
    } else if (isSearchExpanded) {
      // Se está expandido sem texto, contrai
      setIsSearchExpanded(false);
    } else {
      // Se não está expandido, expande
      setIsSearchExpanded(true);
    }
  };

  const handleSearchChange = (value: string) => {
    throttleLog('search', () => {
      console.log('🔍 [PipelineSpecificSubHeader] Busca alterada:', value);
    });
    onSearchChange?.(value);
  };

  const handlePipelineSelect = (pipelineId: string) => {
    throttleLog('pipeline-select', () => {
      console.log('🔄 [PipelineSpecificSubHeader] Pipeline selecionada:', pipelineId);
    });
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (pipeline) {
      throttleLog('pipeline-change', () => {
        console.log('✅ [PipelineSpecificSubHeader] Chamando onPipelineChange:', pipeline.name);
      });
      onPipelineChange(pipeline);
    } else {
      console.error('❌ [PipelineSpecificSubHeader] Pipeline não encontrada:', pipelineId);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    throttleLog('date-select', () => {
      console.log('🗓️ [PipelineSpecificSubHeader] Data selecionada:', date);
    });
    if (!date) return;
    
    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      // Primeira data ou resetar
      const newRange = { start: date, end: null };
      throttleLog('date-first-range', () => {
        console.log('📅 [PipelineSpecificSubHeader] Definindo primeiro range');
      });
      setDateRange(newRange);
      onDateRangeChange?.(newRange);
    } else {
      // Segunda data
      const newRange = { 
        start: dateRange.start, 
        end: date > dateRange.start ? date : dateRange.start 
      };
      if (date < dateRange.start) {
        newRange.start = date;
        newRange.end = dateRange.start;
      }
      throttleLog('date-second-range', () => {
        console.log('📅 [PipelineSpecificSubHeader] Range completo definido');
      });
      setDateRange(newRange);
      onDateRangeChange?.(newRange);
      setIsDatePickerOpen(false);
    }
  };

  const clearDateFilter = () => {
    const newRange = { start: null, end: null };
    setDateRange(newRange);
    onDateRangeChange?.(newRange);
  };

  // ✅ FASE 3.1: Novos handlers para dropdown avançado
  const handleCreatePipeline = () => {
    throttleLog('create-pipeline', () => {
      console.log('➕ [PipelineSpecificSubHeader] Criando nova pipeline');
    });
    setIsPipelineDropdownOpen(false);
    onCreatePipeline?.();
  };

  const handleEditPipeline = (pipeline: Pipeline, event: React.MouseEvent) => {
    event.stopPropagation(); // Previne fechamento do dropdown
    throttleLog('edit-pipeline', () => {
      console.log('✏️ [PipelineSpecificSubHeader] Editando pipeline:', pipeline.name);
    });
    setIsPipelineDropdownOpen(false);
    onEditPipeline?.(pipeline);
  };

  const handleArchivePipeline = (pipeline: Pipeline, event: React.MouseEvent) => {
    event.stopPropagation();
    throttleLog('archive-pipeline', () => {
      console.log('📦 [PipelineSpecificSubHeader] Arquivando pipeline:', {
        name: pipeline.name, 
        id: pipeline.id.substring(0, 8)
      });
    });
    setIsPipelineDropdownOpen(false);
    onArchivePipeline?.(pipeline);
  };

  const handleUnarchivePipeline = (pipeline: Pipeline, event: React.MouseEvent) => {
    event.stopPropagation();
    throttleLog('unarchive-pipeline', () => {
      console.log('📤 [PipelineSpecificSubHeader] Desarquivando pipeline:', {
        name: pipeline.name, 
        id: pipeline.id.substring(0, 8)
      });
    });
    setIsPipelineDropdownOpen(false);
    onUnarchivePipeline?.(pipeline);
  };

  // ============================================
  // RENDERIZAÇÃO AUXILIAR
  // ============================================

  const formatDateRange = () => {
    if (!dateRange.start && !dateRange.end) return "Período";
    if (dateRange.start && !dateRange.end) {
      return format(dateRange.start, "dd/MM", { locale: ptBR });
    }
    if (dateRange.start && dateRange.end) {
      return `${format(dateRange.start, "dd/MM", { locale: ptBR })} - ${format(dateRange.end, "dd/MM", { locale: ptBR })}`;
    }
    return "Período";
  };

  // ✅ FASE 3.1: Filtrar pipelines por status
  const getFilteredPipelines = () => {
    switch (pipelineFilter) {
      case 'active':
        return pipelines.filter(p => p.is_active !== false && !p.archived_at);
      case 'archived':
        return pipelines.filter(p => p.archived_at || p.is_active === false);
      case 'all':
      default:
        return pipelines;
    }
  };

  const filteredPipelines = getFilteredPipelines();

  // ✅ FASE 3.1: Contar pipelines por status
  const pipelineCounts = {
    active: pipelines.filter(p => p.is_active !== false && !p.archived_at).length,
    archived: pipelines.filter(p => p.archived_at || p.is_active === false).length,
    total: pipelines.length
  };

  // ============================================
  // RENDERIZAÇÃO PRINCIPAL
  // ============================================

  return (
    <div className={`
      h-[50px] bg-gray-50/80 border-t border-gray-100 border-b border-gray-200 shadow-sm sticky top-[60px] z-[9999]
      ${className}
    `}>
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        
        {/* LADO ESQUERDO: Nome da Pipeline */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          <h1 className="text-sm text-gray-700 truncate">
            <span className="font-semibold">Negócio:</span>{" "}
            <span className="font-normal">{selectedPipeline?.name || "Sem nome"}</span>
          </h1>
        </div>

        {/* LADO DIREITO: Controles */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          
          {/* Busca Expansível */}
          <div className={`
            relative transition-all duration-300 ease-in-out
            ${isSearchExpanded ? 'w-80' : 'w-auto'}
          `}>
            {isSearchExpanded ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 h-9"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchToggle}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 border-0 bg-transparent hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSearchToggle}
                className="h-8 px-2.5 gap-2 border-0 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            )}
          </div>

          {/* ✅ FASE 3.1: Dropdown Avançado de Pipeline */}
          <Popover open={isPipelineDropdownOpen} onOpenChange={setIsPipelineDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-48 justify-between bg-gray-50 border-0 hover:bg-gray-100 text-gray-700"
              >
                <span className="truncate">
                  {selectedPipeline?.name || "Selecionar pipeline"}
                </span>
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
              <div className="p-3">
                {/* Header com botão Nova Pipeline */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Pipelines</h4>
                  {onCreatePipeline && (
                    <Button
                      onClick={handleCreatePipeline}
                      size="sm"
                      className="h-7 px-2 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-3 h-3" />
                      Nova Pipeline
                    </Button>
                  )}
                </div>

                {/* Filtros de visualização */}
                <div className="flex items-center space-x-1 mb-3 p-1 bg-gray-50 rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPipelineFilter('active')}
                    className={`h-6 px-2 text-xs font-medium ${
                      pipelineFilter === 'active' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Ativas ({pipelineCounts.active})
                  </Button>
                  {pipelineCounts.archived > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPipelineFilter('archived')}
                      className={`h-6 px-2 text-xs font-medium ${
                        pipelineFilter === 'archived' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Arquivadas ({pipelineCounts.archived})
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPipelineFilter('all')}
                    className={`h-6 px-2 text-xs font-medium ${
                      pipelineFilter === 'all' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Todas ({pipelineCounts.total})
                  </Button>
                </div>

                {/* Lista de pipelines */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredPipelines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <Folder className="w-8 h-8 mb-2" />
                      <p className="text-sm">
                        {pipelineFilter === 'archived' ? 'Nenhuma pipeline arquivada' : 'Nenhuma pipeline encontrada'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredPipelines.map((pipeline) => {
                        const isSelected = selectedPipeline?.id === pipeline.id;
                        const isArchived = pipeline.archived_at || pipeline.is_active === false;
                        
                        return (
                          <div
                            key={pipeline.id}
                            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border border-blue-200' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handlePipelineSelect(pipeline.id)}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {isArchived ? (
                                <Archive className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <Play className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                  isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {pipeline.name}
                                </p>
                                {pipeline.description && (
                                  <p className="text-xs text-gray-500 truncate">
                                    {pipeline.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Ações da pipeline (hover) */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onEditPipeline && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleEditPipeline(pipeline, e)}
                                  className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                                  title="Editar pipeline"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {/* Arquivar/Desarquivar */}
                              {isArchived ? (
                                onUnarchivePipeline && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoading}
                                    onClick={(e) => handleUnarchivePipeline(pipeline, e)}
                                    className={`h-6 w-6 p-0 ${
                                      isLoading 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : 'hover:bg-green-100 hover:text-green-600'
                                    }`}
                                    title={isLoading ? "Aguarde o carregamento..." : "Desarquivar pipeline"}
                                  >
                                    <Folder className="w-3 h-3" />
                                  </Button>
                                )
                              ) : (
                                onArchivePipeline && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoading}
                                    onClick={(e) => handleArchivePipeline(pipeline, e)}
                                    className={`h-6 w-6 p-0 ${
                                      isLoading 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : 'hover:bg-orange-100 hover:text-orange-600'
                                    }`}
                                    title={isLoading ? "Aguarde o carregamento..." : "Arquivar pipeline"}
                                  >
                                    <Archive className="w-3 h-3" />
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer com informações */}
                {pipelineCounts.total > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">
                      {pipelineFilter === 'all' 
                        ? `${pipelineCounts.total} pipeline${pipelineCounts.total > 1 ? 's' : ''} no total`
                        : `Exibindo ${filteredPipelines.length} de ${pipelineCounts.total}`
                      }
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de Métricas - Pipeline Específico */}
          <MetricsFilterButton 
            pipelineId={selectedPipeline?.id}
            showPipelineMetrics={true}
            showGlobalMetrics={false}
          />

          {/* Filtro de Data */}
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2.5 gap-2 border-0 transition-all duration-200 ${
                  dateRange.start && dateRange.end 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 shadow-sm hover:shadow-md' 
                    : dateRange.start 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 shadow-sm hover:shadow-md animate-pulse' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Calendar className={`w-4 h-4 ${
                  dateRange.start && dateRange.end 
                    ? 'text-green-600' 
                    : dateRange.start 
                      ? 'text-blue-600' 
                      : 'text-gray-500'
                }`} />
                <span className="hidden sm:inline font-medium">{formatDateRange()}</span>
                {(dateRange.start && dateRange.end) && (
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-1" />
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end" sideOffset={8}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Filtrar por período</h4>
                  {(dateRange.start || dateRange.end) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                      className="h-6 px-2 text-xs"
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {/* ✅ PERÍODOS RÁPIDOS - SEMPRE VISÍVEL */}
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2 font-medium">Seleção rápida:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        const newRange = { start: weekAgo, end: today };
                        setDateRange(newRange);
                        onDateRangeChange?.(newRange);
                      }}
                      className="h-7 px-2 text-xs text-gray-700 hover:text-blue-700 hover:bg-blue-50 bg-white border border-gray-200"
                    >
                      7 dias
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        const newRange = { start: monthAgo, end: today };
                        setDateRange(newRange);
                        onDateRangeChange?.(newRange);
                      }}
                      className="h-7 px-2 text-xs text-gray-700 hover:text-blue-700 hover:bg-blue-50 bg-white border border-gray-200"
                    >
                      30 dias
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                        const newRange = { start: threeMonthsAgo, end: today };
                        setDateRange(newRange);
                        onDateRangeChange?.(newRange);
                      }}
                      className="h-7 px-2 text-xs text-gray-700 hover:text-blue-700 hover:bg-blue-50 bg-white border border-gray-200"
                    >
                      90 dias
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                        const newRange = { start: oneYearAgo, end: today };
                        setDateRange(newRange);
                        onDateRangeChange?.(newRange);
                      }}
                      className="h-7 px-2 text-xs text-gray-700 hover:text-blue-700 hover:bg-blue-50 bg-white border border-gray-200"
                    >
                      1 ano
                    </Button>
                  </div>
                </div>

                <CalendarComponent
                  mode="single"
                  selected={dateRange.start || undefined}
                  onSelect={handleDateSelect}
                  className="rounded-md border-0"
                  locale={ptBR}
                />
                
                {/* ✅ MELHOR UX: Feedback visual aprimorado para range selection */}
                {dateRange.start && (
                  <div className="mt-3 space-y-2">
                    {/* Status indicator com melhor visual */}
                    <div className={`
                      p-3 rounded-lg border transition-all duration-200
                      ${dateRange.end 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800' 
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800'
                      }
                    `}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`
                          w-2 h-2 rounded-full
                          ${dateRange.end ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}
                        `} />
                        <span className="text-xs font-medium">
                          {dateRange.end ? 'Período Selecionado' : 'Selecionando Período'}
                        </span>
                      </div>
                      
                      <div className="text-sm font-medium">
                        {dateRange.end ? (
                          // Range completo com melhor formatação
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-white/60 rounded text-xs">
                              {format(dateRange.start, "dd 'de' MMM", { locale: ptBR })}
                            </span>
                            <span className="text-gray-500">até</span>  
                            <span className="px-2 py-1 bg-white/60 rounded text-xs">
                              {format(dateRange.end, "dd 'de' MMM", { locale: ptBR })}
                            </span>
                          </div>
                        ) : (
                          // Estado intermediário com instrução clara
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-white/60 rounded text-xs">
                                {format(dateRange.start, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                              <span className="text-blue-600">→ ?</span>
                            </div>
                            <p className="text-xs opacity-80 italic">
                              Clique em outra data para definir o período final
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status do filtro aplicado */}
                    {dateRange.end && (
                      <div className="flex items-center justify-center pt-1 border-t border-gray-100">
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          ✓ Filtro aplicado
                        </span>
                      </div>
                    )}
                  </div>
                )}
            </PopoverContent>
          </Popover>

          {/* Botão Nova Oportunidade */}
          <Button
            onClick={onCreateOpportunity}
            size="sm"
            className="h-8 px-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Oportunidade</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PipelineSpecificSubHeader;