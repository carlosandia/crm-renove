// ============================================
// UTILITÁRIOS DE CONTROLE DE LOGS PARA CONSOLE
// ============================================
// Para usar no console do navegador:
// window.logControls.reducePipelineLogs()
// window.logControls.debugMode()
// etc.

import { logger, smartLogControl, showLoggerStatus, resetToDefaults } from './logger';

declare global {
  interface Window {
    logControls: typeof logControls;
    logger: typeof logger;
  }
}

// ✅ CONTROLES PRINCIPAIS DE LOGGING
export const logControls = {
  // Controles de nível
  silent: () => {
    logger.setLevel('none');
    console.log('🔇 SILÊNCIO TOTAL - Todos os logs desabilitados');
  },
  
  errorsOnly: () => {
    logger.setLevel('error');
    console.log('🚨 APENAS ERRORS - Nível de log mais restritivo');
  },
  
  warningsOnly: () => {
    logger.setLevel('warn');
    console.log('⚠️ WARNINGS E ERRORS - Nível balanceado para produção');
  },
  
  infoMode: () => {
    logger.setLevel('info');
    console.log('ℹ️ INFO MODE - Informações importantes + warnings + errors');
  },
  
  debugMode: () => {
    logger.setLevel('debug');
    console.log('🐛 DEBUG MODE - Logs detalhados para desenvolvimento');
  },
  
  verboseMode: () => {
    logger.setLevel('silly');
    console.log('🔧 VERBOSE MODE - Todos os logs incluindo internos');
  },
  
  // Controles específicos para problemas
  reducePipelineLogs: smartLogControl.reducePipelineLogs,
  cleanDevMode: smartLogControl.cleanDevMode,
  debugApiIssues: smartLogControl.debugApiIssues,
  temporarySilence: smartLogControl.temporarySilence,
  
  // Controles para situações específicas
  onlyShowErrors: () => {
    logger.setLevel('error');
    console.log('🚨 Apenas ERRORS visíveis - para focar em problemas críticos');
  },
  
  showImportantOnly: () => {
    logger.setLevel('warn');
    console.log('📢 Apenas logs IMPORTANTES - warnings e errors');
  },
  
  normalMode: () => {
    logger.setLevel('info');
    console.log('✅ MODO NORMAL - info, warnings e errors');
  },
  
  // Utilitários
  status: showLoggerStatus,
  reset: resetToDefaults,
  
  // Para debugging de componentes específicos
  debugPipeline: () => {
    logger.setLevel('debug');
    console.log('🏗️ DEBUG PIPELINE - Logs detalhados para módulo de pipeline');
  },
  
  debugLeadTasks: () => {
    logger.setLevel('debug');
    console.log('📋 DEBUG LEAD TASKS - Logs detalhados para tarefas de leads');
  },
  
  debugCORS: () => {
    logger.setLevel('debug');
    console.log('🌐 DEBUG CORS - Logs detalhados para problemas de CORS/API');
  },
  
  // Controle de emergency
  emergency: () => {
    logger.setLevel('error');
    console.log('🆘 MODO EMERGÊNCIA - Apenas errors críticos, máxima performance');
  },
  
  // Para demonstrações ou apresentações
  presentationMode: () => {
    logger.setLevel('none');
    console.log('🎯 MODO APRESENTAÇÃO - Console limpo para demos');
  },
  
  // Helpers
  help: () => {
    console.log(`
🎛️ CONTROLES DE LOG DISPONÍVEIS:

📊 NÍVEIS:
  logControls.silent()         - Sem logs
  logControls.errorsOnly()     - Apenas errors
  logControls.warningsOnly()   - Warnings + errors  
  logControls.infoMode()       - Info + warnings + errors
  logControls.debugMode()      - Debug detalhado
  logControls.verboseMode()    - Tudo incluindo internos

🔧 ESPECÍFICOS:
  logControls.debugPipeline()  - Debug módulo pipeline
  logControls.debugCORS()      - Debug problemas CORS/API
  logControls.cleanDevMode()   - Desenvolvimento limpo
  
⚡ UTILITÁRIOS:
  logControls.status()         - Ver configuração atual
  logControls.reset()          - Voltar ao padrão
  logControls.emergency()      - Modo emergência
  logControls.presentationMode() - Console limpo

🎯 TEMPORÁRIOS:
  logControls.temporarySilence(60000) - Silenciar por 1min
    `);
  }
};

// ✅ DISPONIBILIZAR NO WINDOW PARA ACESSO VIA CONSOLE
if (typeof window !== 'undefined') {
  window.logControls = logControls;
  window.logger = logger;
  
  // ✅ CONFIGURAÇÃO INICIAL INTELIGENTE
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  if (debugParam) {
    switch (debugParam) {
      case 'pipeline':
        logControls.debugPipeline();
        break;
      case 'cors':
      case 'api':
        logControls.debugCORS();
        break;
      case 'clean':
        logControls.cleanDevMode();
        break;
      case 'silent':
        logControls.silent();
        break;
      case 'verbose':
        logControls.verboseMode();
        break;
      default:
        logControls.debugMode();
    }
  }
  
  // ✅ MOSTRAR AJUDA INICIAL EM DESENVOLVIMENTO
  if (import.meta.env.DEV) {
    console.log('🎛️ Log controls disponíveis! Digite: logControls.help()');
  }
}

export default logControls;