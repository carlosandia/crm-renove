import React, { useState } from 'react';
import { X, Star, Lock, ExternalLink, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { BlurFade } from '../../ui/blur-fade';
import { useFormTypes } from '../hooks/useFormTypes';
import { FormType } from './FormTypeDefinitions';

interface FormTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (formType: FormType) => void;
}

export const FormTypeSelector: React.FC<FormTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const { 
    typesByCategory, 
    selectedType, 
    selectType, 
    isTypeAvailable, 
    getUserPlan 
  } = useFormTypes();
  
  const [previewType, setPreviewType] = useState<FormType | null>(null);
  const userPlan = getUserPlan();

  const handleSelectType = (formType: FormType) => {
    if (isTypeAvailable(formType)) {
      selectType(formType.id);
      onSelect(formType);
      onClose();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'standard': return '📄';
      case 'conversion': return '🎯';
      case 'advanced': return '⚡';
      case 'enterprise': return '🚀';
      default: return '📋';
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'standard': return 'Formulários básicos para captura de leads';
      case 'conversion': return 'Formulários otimizados para conversão';
      case 'advanced': return 'Funcionalidades avançadas e personalizadas';
      case 'enterprise': return 'Recursos enterprise com integrações';
      default: return '';
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'basic': return 'secondary';
      case 'pro': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🎨 Selecionar Tipo de Formulário
            <Badge variant="outline" className="ml-auto">
              Plano: {userPlan}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full gap-6 mt-4">
          {/* LISTA DE CATEGORIAS E TIPOS */}
          <div className="flex-1 overflow-y-auto pr-2">
            {Object.entries(typesByCategory).map(([category, types], categoryIndex) => (
              <BlurFade key={category} delay={0.1 * categoryIndex}>
                <div className="mb-8">
                  {/* HEADER DA CATEGORIA */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{category}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getCategoryDescription(category)}
                      </p>
                    </div>
                  </div>

                  {/* GRID DE TIPOS */}
                  <div className="grid grid-cols-2 gap-4">
                    {types.map((formType, typeIndex) => {
                      const isAvailable = isTypeAvailable(formType);
                      const restrictions = formType.config.tenant_restrictions;
                      
                      return (
                        <BlurFade key={formType.id} delay={0.05 * typeIndex}>
                          <Card 
                            className={`
                              p-4 cursor-pointer transition-all duration-200 hover:shadow-md
                              ${isAvailable 
                                ? 'hover:border-primary hover:bg-accent/50' 
                                : 'opacity-60 cursor-not-allowed bg-muted/30'
                              }
                              ${selectedType?.id === formType.id ? 'border-primary bg-accent' : ''}
                            `}
                            onClick={() => isAvailable && handleSelectType(formType)}
                            onMouseEnter={() => setPreviewType(formType)}
                          >
                            {/* HEADER DO CARD */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {React.createElement(formType.icon as any, { className: "w-5 h-5 text-primary" })}
                                <h4 className="font-medium text-sm leading-tight">
                                  {formType.name}
                                </h4>
                              </div>
                              
                              {/* BADGES DE STATUS */}
                              <div className="flex gap-1">
                                {restrictions?.is_premium && (
                                  <Badge 
                                    variant={getPlanBadgeVariant(restrictions.required_plan)}
                                    className="text-xs"
                                  >
                                    {restrictions.required_plan.toUpperCase()}
                                  </Badge>
                                )}
                                {!isAvailable && (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* DESCRIÇÃO */}
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                              {formType.description}
                            </p>

                            {/* FUNCIONALIDADES */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {formType.config.pipelineIntegration && (
                                <Badge variant="outline" className="text-xs">Pipeline</Badge>
                              )}
                              {formType.config.cadenceIntegration && (
                                <Badge variant="outline" className="text-xs">Cadência</Badge>
                              )}
                              {formType.config.calendarIntegration && (
                                <Badge variant="outline" className="text-xs">Agenda</Badge>
                              )}
                              {formType.config.analytics && (
                                <Badge variant="outline" className="text-xs">Analytics</Badge>
                              )}
                            </div>

                            {/* FOOTER COM AÇÕES */}
                            <div className="flex items-center justify-between text-xs">
                              {formType.demo_url && (
                                <button 
                                  className="flex items-center gap-1 text-primary hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(formType.demo_url, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Demo
                                </button>
                              )}
                              
                              {!isAvailable && restrictions && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Info className="w-3 h-3" />
                                  Requer plano {restrictions.required_plan}
                                </div>
                              )}
                            </div>
                          </Card>
                        </BlurFade>
                      );
                    })}
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>

          {/* PAINEL DE PREVIEW */}
          <div className="w-80 border-l pl-6">
            {previewType ? (
              <BlurFade key={previewType.id}>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {React.createElement(previewType.icon, { className: "w-6 h-6 text-primary" } as any)}
                    <h3 className="font-semibold">{previewType.name}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {previewType.description}
                  </p>

                  {/* CONFIGURAÇÕES PRINCIPAIS */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Tipo de Exibição
                      </label>
                      <p className="text-sm">{previewType.config.displayType}</p>
                    </div>

                    {previewType.config.trigger && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Trigger
                        </label>
                        <p className="text-sm">{previewType.config.trigger}</p>
                      </div>
                    )}

                    {previewType.config.pipelineIntegration && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          Pipeline Integration
                        </label>
                        <p className="text-sm">
                          Stage: {previewType.config.pipelineIntegration.default_stage} | 
                          Temp: {previewType.config.pipelineIntegration.lead_temperature}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* INTEGRAÇÕES REQUERIDAS */}
                  {previewType.config.tenant_restrictions?.requires_integration && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-muted-foreground">
                        Integrações Requeridas
                      </label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {previewType.config.tenant_restrictions.requires_integration.map(integration => (
                          <Badge key={integration} variant="outline" className="text-xs">
                            {integration}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* IMAGEM DE PREVIEW (se disponível) */}
                  {previewType.preview_image && (
                    <div className="mb-4">
                      <label className="text-xs font-medium text-muted-foreground">
                        Preview
                      </label>
                      <img 
                        src={previewType.preview_image} 
                        alt={`Preview ${previewType.name}`}
                        className="w-full rounded border mt-1"
                      />
                    </div>
                  )}

                  {/* LINKS DE DOCUMENTAÇÃO */}
                  {previewType.documentation_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(previewType.documentation_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Documentação
                    </Button>
                  )}
                </div>
              </BlurFade>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">
                    Passe o mouse sobre um tipo para ver o preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER COM AÇÕES */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {Object.values(typesByCategory).flat().length} tipos disponíveis
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {selectedType && (
              <Button onClick={() => handleSelectType(selectedType)}>
                Continuar com {selectedType.name}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 