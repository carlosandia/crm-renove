/**
 * ============================================
 * 🎨 TOKENS DE DESIGN PARA PIPELINE
 * ============================================
 * 
 * Constantes visuais para padronização UX do modal de pipeline
 * Seguindo padrões de mercado (Salesforce, HubSpot)
 */

export const PIPELINE_UI_CONSTANTS = {
  // 🎨 Cores Semânticas
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280', 
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
    // Cores específicas para etapas
    stages: {
      lead: '#3B82F6',      // Azul - entrada
      qualified: '#10B981',  // Verde - qualificado
      proposal: '#F59E0B',   // Amarelo - proposta
      negotiation: '#8B5CF6', // Roxo - negociação
      won: '#10B981',        // Verde - ganho
      lost: '#EF4444',       // Vermelho - perdido (compatibilidade)
      ganho: '#10B981',      // Verde - ganho (novo padrão)
      perdido: '#EF4444'     // Vermelho - perdido (novo padrão)
    }
  },

  // 📐 Espaçamentos Padronizados (Otimizados para Velocidade)
  spacing: {
    section: 'space-y-4',     // Entre seções principais (otimizado)
    card: 'space-y-4',        // Dentro de cards
    form: 'space-y-5 pt-4',   // Formulários (melhor respiração + padding superior)
    inline: 'space-y-3',      // Elementos inline
    tight: 'space-y-2',       // Elementos próximos
    cardPadding: 'p-6',       // Padding de cards
    cardContentPadding: 'p-4', // Padding de conteúdo
    labelSpacing: 'mb-2'      // Espaçamento específico para labels
  },

  // ✏️ Tipografia Hierárquica
  typography: {
    // Títulos principais de seção
    sectionTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
    // Títulos de cards/subseções  
    cardTitle: 'text-base font-medium text-gray-900 dark:text-gray-100',
    // Descrições e textos auxiliares
    description: 'text-sm text-muted-foreground',
    // Labels de formulário
    label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
    // Texto de ajuda/hint
    hint: 'text-xs text-muted-foreground'
  },

  // 🔘 Ícones Padronizados
  icons: {
    // Tamanho padrão para headers de seção
    sectionSize: 'h-5 w-5',
    // Tamanho padrão para elementos menores
    standardSize: 'h-4 w-4',
    // Tamanho para ícones pequenos
    smallSize: 'h-3 w-3'
  },

  // 🎭 Estados de Interação
  states: {
    active: 'bg-primary/10 border-primary/20 text-primary',
    inactive: 'bg-muted/30 border-muted text-muted-foreground',
    loading: 'animate-pulse bg-muted/50',
    error: 'border-destructive/50 bg-destructive/5 text-destructive',
    success: 'border-green-500/50 bg-green-50 text-green-700'
  },

  // 📱 Responsividade
  responsive: {
    gridCols: 'grid-cols-1 lg:grid-cols-2',
    flexResponsive: 'flex flex-col sm:flex-row',
    gapResponsive: 'gap-3 sm:gap-4 lg:gap-6'
  }
};

// 🏷️ Mapeamento de Ícones por Seção
export const SECTION_ICONS = {
  basic: 'Settings',
  stages: 'Workflow', 
  fields: 'Database',
  distribution: 'RotateCcw',
  cadence: 'Zap',
  qualification: 'TrendingUp',
  outcomes: 'Target'
} as const;

// 📊 Paleta de Cores para Etapas (usado no drag & drop)
export const STAGE_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500  
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1'  // indigo-500
];

// 🎯 Tipos TypeScript para melhor DX
export type SectionIconKey = keyof typeof SECTION_ICONS;
export type PipelineColorKey = keyof typeof PIPELINE_UI_CONSTANTS.colors.stages;