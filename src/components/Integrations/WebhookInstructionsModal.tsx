import React, { useRef, useCallback, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { 
  Copy, 
  CheckCircle, 
  FileText, 
  Globe,
  Key,
  Zap,
  ExternalLink,
  Code2,
  X
} from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';

interface WebhookInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  apiKey: string;
  tenantId: string;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
}

interface InstructionStepProps {
  step: number;
  title: string;
  description: string;
  code?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const InstructionStep: React.FC<InstructionStepProps> = ({ 
  step, 
  title, 
  description, 
  code, 
  icon, 
  children 
}) => (
  <BlurFade key={step} delay={0.25 + step * 0.05}>
    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            {step}
          </span>
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        {code && (
          <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm text-gray-100 overflow-x-auto">
            <pre>{code}</pre>
          </div>
        )}
        {children}
      </div>
    </div>
  </BlurFade>
);

interface CopyButtonProps {
  text: string;
  label: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, label }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
    >
      {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
      {copied ? 'Copiado!' : label}
    </button>
  );
};

export const WebhookInstructionsModal: React.FC<WebhookInstructionsModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  apiKey,
  tenantId,
  triggerButtonRef: externalTriggerRef
}) => {
  const pipelineListUrl = `${webhookUrl}/pipelines`;
  
  // ✅ CORREÇÃO DEFINITIVA: Refs para gerenciamento de foco
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  // ✅ CORREÇÃO: Callback para gerenciar foco de forma robusta
  const handleOpenAutoFocus = useCallback((event: Event) => {
    // Prevenir comportamento padrão do Radix
    event.preventDefault();
    
    // Garantir que o modal tenha foco após abrir
    setTimeout(() => {
      const closeButton = modalContentRef.current?.querySelector('[data-close-modal="true"]') as HTMLElement;
      if (closeButton) {
        closeButton.focus();
      } else {
        // Fallback: focar no próprio container
        modalContentRef.current?.focus();
      }
    }, 100);
  }, []);
  
  // ✅ CORREÇÃO: Callback para gerenciar foco de retorno
  const handleCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
    
    // Retornar foco para o botão que abriu o modal
    setTimeout(() => {
      if (externalTriggerRef?.current) {
        externalTriggerRef.current.focus();
      }
    }, 50);
  }, [externalTriggerRef]);
  
  // ✅ CORREÇÃO: Effect para gerenciar estado da página quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      // Remover foco de qualquer elemento ativo antes de abrir modal
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur?.();
      }
      
      // Garantir que o body não tenha elementos focáveis conflitantes
      document.body.style.pointerEvents = '';
    }
    
    return () => {
      // Limpar estilos quando modal fecha
      document.body.style.pointerEvents = '';
    };
  }, [isOpen]);
  
  const n8nWebhookConfig = `{
  "method": "POST",
  "url": "${webhookUrl}",
  "headers": {
    "X-API-Key": "${apiKey}",
    "Content-Type": "application/json"
  },
  "body": {
    "first_name": "{{$json.first_name}}",
    "email": "{{$json.email}}",
    "phone": "{{$json.phone}}",
    "company": "{{$json.company}}",
    "source": "N8N Integration"
  }
}`;

  const zapierWebhookConfig = `POST ${webhookUrl}
Headers: X-API-Key: ${apiKey}
Content-Type: application/json

Body:
{
  "first_name": "Nome do Lead",
  "email": "email@exemplo.com",
  "phone": "+5511999999999",
  "company": "Empresa Exemplo",
  "source": "Zapier Integration"
}`;

  const pipelineListConfig = `GET ${pipelineListUrl}
Headers: X-API-Key: ${apiKey}

Resposta:
{
  "success": true,
  "data": [
    {
      "id": "pipeline-id-1",
      "name": "Pipeline Vendas",
      "is_active": true
    }
  ]
}`;

  const pipelineFieldsUrl = `${webhookUrl}/pipelines/{PIPELINE_ID}/fields`;
  const pipelineFieldsConfig = `GET ${pipelineFieldsUrl}
Headers: X-API-Key: ${apiKey}

Resposta:
{
  "success": true,
  "data": {
    "pipeline": {
      "id": "pipeline-id-1",
      "name": "Pipeline Vendas"
    },
    "fields": [
      {
        "id": "first_name",
        "name": "first_name",
        "label": "Nome", 
        "type": "text",
        "required": true,
        "system": true
      },
      {
        "id": "email",
        "name": "email",
        "label": "E-mail",
        "type": "email", 
        "required": true,
        "system": true
      },
      {
        "id": "custom-field-1",
        "name": "budget",
        "label": "Orçamento",
        "type": "number",
        "required": false,
        "system": false
      }
    ]
  }
}`;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent 
        ref={modalContentRef}
        className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0 !fixed !left-1/2 !top-1/2 !transform !-translate-x-1/2 !-translate-y-1/2"
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        aria-modal="true"
        role="dialog"
      >
        {/* AIDEV-NOTE: Elementos obrigatórios para acessibilidade - AlertDialog.Title é obrigatório segundo documentação Radix UI */}
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>Instruções de Integração Webhook</AlertDialogTitle>
          <AlertDialogDescription>
            Guia completo para integrar com N8N, Zapier, Make.com e outras plataformas. 
            Contém URLs importantes, chave de API e instruções passo-a-passo para configurar webhooks.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Header fixo com título à esquerda e botão X à direita */}
        <div className="sticky top-0 z-50 flex items-center justify-between p-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start gap-3">
            {/* Ícone com altura proporcional ao título + subtítulo */}
            <div className="flex items-center justify-center">
              <FileText className="text-blue-600" size={32} />
            </div>
            
            {/* Título e subtítulo alinhados à esquerda */}
            <div className="flex flex-col justify-center">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                Instruções de Integração Webhook
              </h2>
              <p className="text-sm text-gray-600 leading-tight mt-1">
                Guia completo para integrar com N8N, Zapier, Make.com e outras plataformas
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            data-close-modal="true"
            aria-label="Fechar modal de instruções"
            tabIndex={0}
            autoFocus={false}
            className="w-10 h-10 bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-full flex items-center justify-center transition-all shadow-lg flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="text-gray-600" size={18} aria-hidden="true" />
          </button>
        </div>
        
        {/* Container scrollável para o conteúdo */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-h-0">
          <div className="space-y-4 py-4">
          {/* URLs Importantes */}
          <BlurFade delay={0.1}>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Globe size={16} />
                URLs Importantes
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Criar Leads
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono text-blue-800">
                      {webhookUrl}
                    </code>
                    <CopyButton text={webhookUrl} label="Copiar" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Listar Pipelines
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono text-blue-800">
                      {pipelineListUrl}
                    </code>
                    <CopyButton text={pipelineListUrl} label="Copiar" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Listar Campos de Pipeline
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-mono text-blue-800">
                      {pipelineFieldsUrl}
                    </code>
                    <CopyButton text={pipelineFieldsUrl} label="Copiar" />
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* API Key */}
          <BlurFade delay={0.15}>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Key size={16} />
                Chave de API
              </h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono text-amber-800">
                  {apiKey}
                </code>
                <CopyButton text={apiKey} label="Copiar Chave" />
              </div>
              <p className="text-xs text-amber-700 mt-2">
                💡 Use no header <strong>X-API-Key</strong> em todas as requisições
              </p>
            </div>
          </BlurFade>

          {/* Instruções N8N */}
          <InstructionStep
            step={1}
            title="Configuração N8N"
            description="Configure um nó HTTP Request no N8N com os seguintes parâmetros:"
            icon={<Zap className="text-blue-600" size={16} />}
            code={n8nWebhookConfig}
          >
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">
                <strong>Dica:</strong> Para direcionar a uma pipeline específica, adicione <code className="bg-gray-200 px-1 rounded">"pipeline_id": "id-da-pipeline"</code> no body
              </p>
            </div>
          </InstructionStep>

          {/* Instruções Zapier */}
          <InstructionStep
            step={2}
            title="Configuração Zapier"
            description="No Zapier, use a ação 'Webhooks by Zapier' com método POST:"
            icon={<Zap className="text-blue-600" size={16} />}
            code={zapierWebhookConfig}
          />

          {/* Como Listar Pipelines */}
          <InstructionStep
            step={3}
            title="Listar Pipelines Disponíveis"
            description="Para obter a lista de pipelines e seus IDs, faça uma requisição GET:"
            icon={<Code2 className="text-blue-600" size={16} />}
            code={pipelineListConfig}
          >
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Como usar:</strong> Copie o <code>id</code> da pipeline desejada e use no campo <code>pipeline_id</code> ao criar leads.
              </p>
            </div>
          </InstructionStep>

          {/* Como Listar Campos de Pipeline */}
          <InstructionStep
            step={4}
            title="Listar Campos Disponíveis de uma Pipeline"
            description="Para obter os campos (fixos + customizados) de uma pipeline específica:"
            icon={<FileText className="text-blue-600" size={16} />}
            code={pipelineFieldsConfig}
          >
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800 font-medium mb-2">
                  🔹 <strong>Campos do Sistema (sempre disponíveis):</strong>
                </p>
                <p className="text-xs text-green-700">
                  <code>first_name, last_name, email, phone, company, job_title, lead_temperature, source</code>
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800 font-medium mb-2">
                  🔹 <strong>Campos Customizados (específicos da pipeline):</strong>
                </p>
                <p className="text-xs text-purple-700">
                  Criados pelo administrador - aparecerão com <code>"system": false</code> na resposta
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Como usar:</strong> Substitua <code>{`{PIPELINE_ID}`}</code> pelo ID real da pipeline obtido na listagem de pipelines.
                </p>
              </div>
            </div>
          </InstructionStep>

          {/* Campos Obrigatórios */}
          <BlurFade delay={0.4}>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-900 mb-3">
                📋 Resumo de Campos Disponíveis
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-green-800 mb-2">✅ Obrigatórios (Sistema):</h4>
                  <ul className="space-y-1 text-green-700">
                    <li>• <code>first_name</code> - Nome do lead</li>
                    <li>• <code>email</code> - E-mail do lead</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-800 mb-2">⚙️ Opcionais (Sistema):</h4>
                  <ul className="space-y-1 text-green-700">
                    <li>• <code>last_name</code> - Sobrenome</li>
                    <li>• <code>phone</code> - Telefone</li>
                    <li>• <code>company</code> - Empresa</li>
                    <li>• <code>job_title</code> - Cargo</li>
                    <li>• <code>lead_temperature</code> - Temperatura (quente/morno/frio)</li>
                    <li>• <code>source</code> - Origem do lead</li>
                    <li>• <code>pipeline_id</code> - ID da pipeline específica</li>
                    <li>• <code>assigned_to</code> - ID do usuário responsável</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">🎯 Campos Customizados:</h4>
                <p className="text-sm text-green-700">
                  Para descobrir campos customizados específicos de uma pipeline, use a rota: <br/>
                  <code className="bg-green-100 px-2 py-1 rounded text-xs">
                    GET /webhook/{`{TENANT_ID}`}/pipelines/{`{PIPELINE_ID}`}/fields
                  </code>
                </p>
                <p className="text-xs text-green-600 mt-2">
                  💡 <strong>Dica:</strong> Campos customizados podem ser obrigatórios ou opcionais, dependendo da configuração da pipeline.
                </p>
              </div>
            </div>
          </BlurFade>

          {/* Links Úteis */}
          <BlurFade delay={0.4}>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                🔗 Links Úteis
              </h3>
              <div className="grid md:grid-cols-3 gap-3">
                <a
                  href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <ExternalLink size={16} className="text-gray-500" />
                  <span className="text-sm font-medium">Docs N8N</span>
                </a>
                <a
                  href="https://zapier.com/apps/webhook/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <ExternalLink size={16} className="text-gray-500" />
                  <span className="text-sm font-medium">Docs Zapier</span>
                </a>
                <a
                  href="https://www.make.com/en/help/tools/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <ExternalLink size={16} className="text-gray-500" />
                  <span className="text-sm font-medium">Docs Make.com</span>
                </a>
              </div>
            </div>
          </BlurFade>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};