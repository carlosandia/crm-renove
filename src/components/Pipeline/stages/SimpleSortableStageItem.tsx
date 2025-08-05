import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit, 
  Trash2, 
  Info, 
  Lock,
  Crown,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Interface simplificada para etapas
interface StageData {
  name: string;
  order_index: number;
  color: string;
  is_system_stage?: boolean;
  description?: string;
  id?: string;
}

interface SimpleSortableStageItemProps {
  stage: StageData;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isSystemStage?: boolean;
  isDragging?: boolean; // ✅ CORREÇÃO: Adicionar prop isDragging opcional
}

// ✅ COMPONENTE SIMPLIFICADO: Sem drag and drop
export function SimpleSortableStageItem({ 
  stage, 
  index, 
  onEdit, 
  onDelete, 
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isSystemStage = false 
}: SimpleSortableStageItemProps) {

  // ✅ RENDERIZAÇÃO SIMPLIFICADA: Sem drag and drop
  return (
    <AnimatedCard className={`h-full border-solid transition-all duration-200 ${
      stage.is_system_stage 
        ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border-2 border-dashed border-blue-300 dark:border-blue-700 shadow-lg'
        : 'bg-white dark:bg-gray-900 hover:shadow-md'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Ícone de Sistema ou Controles de Ordem */}
            {stage.is_system_stage ? (
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 shadow-inner">
                <div className="absolute -top-1 -right-1 text-yellow-400">
                  <Sparkles className="h-3 w-3" />
                </div>
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveUp(index)}
                  disabled={!canMoveUp}
                  className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoveDown(index)}
                  disabled={!canMoveDown}
                  className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {/* Indicador de Cor */}
            <div
              className={`w-5 h-5 rounded-full border-2 shadow-md ${
                stage.is_system_stage ? 'border-white shadow-lg' : 'border-gray-200'
              }`}
              style={{ backgroundColor: stage.color }}
            />
            
            {/* Informações da Etapa */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium transition-colors duration-200 ${
                  stage.is_system_stage ? 'text-blue-900 dark:text-blue-100' : ''
                }`}>
                  {stage.name}
                </h4>
                {stage.is_system_stage && (
                  <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300 dark:from-blue-900/50 dark:to-indigo-900/50 dark:text-blue-200 shadow-sm">
                    <Crown className="h-3 w-3 mr-1" />
                    Sistema
                  </Badge>
                )}
              </div>
              {stage.description && (
                <p className={`text-sm mt-1 transition-colors duration-200 ${
                  stage.is_system_stage 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-muted-foreground'
                }`}>
                  {stage.description}
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {stage.is_system_stage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(index)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all duration-200"
              >
                <Info className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(index)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  );
}