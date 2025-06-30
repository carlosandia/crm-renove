import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { BaseModal } from './base-modal';
import { CrudModalProps, ModalFormProps } from '../../types/CommonProps';
import { Alert, AlertDescription } from './alert';

/**
 * 🎯 FormModal - Modal especializado para formulários
 * Unifica lógica de formulários em 25+ modais
 */

interface FormModalProps<T = any> extends CrudModalProps<T> {
  /** Conteúdo do formulário */
  children: React.ReactNode;
  /** Função de validação personalizada */
  onValidate?: (data: T) => string[] | null;
  /** Mostrar indicador de campos obrigatórios */
  showRequiredIndicator?: boolean;
  /** Resetar formulário ao fechar */
  resetOnClose?: boolean;
  /** Callback quando o formulário é resetado */
  onReset?: () => void;
  /** Mensagem de erro geral */
  errorMessage?: string;
  /** Mensagem de sucesso */
  successMessage?: string;
  /** Configuração de seções do formulário */
  sections?: FormSection[];
  /** Ícone do header baseado no modo */
  autoHeaderIcon?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
}

const getModeConfig = (mode: 'create' | 'edit' | 'view') => {
  switch (mode) {
    case 'create':
      return {
        title: 'Criar',
        buttonText: 'Criar',
        headerColor: 'blue' as const,
        icon: <Save className="w-5 h-5" />
      };
    case 'edit':
      return {
        title: 'Editar',
        buttonText: 'Salvar',
        headerColor: 'green' as const,
        icon: <Save className="w-5 h-5" />
      };
    case 'view':
      return {
        title: 'Visualizar',
        buttonText: 'Fechar',
        headerColor: 'gray' as const,
        icon: null
      };
    default:
      return {
        title: 'Formulário',
        buttonText: 'Salvar',
        headerColor: 'blue' as const,
        icon: <Save className="w-5 h-5" />
      };
  }
};

export const FormModal = <T extends Record<string, any> = any>({
  isOpen,
  onClose,
  title,
  item,
  onSave,
  onDelete,
  mode = 'create',
  saving = false,
  deleting = false,
  children,
  onValidate,
  showRequiredIndicator = true,
  resetOnClose = false,
  onReset,
  errorMessage,
  successMessage,
  sections,
  autoHeaderIcon = true,
  className,
  ...baseProps
}: FormModalProps<T>) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const modeConfig = getModeConfig(mode);
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  // Header title baseado no modo
  const modalTitle = title || `${modeConfig.title} ${item?.name || 'Item'}`;
  
  // Ícone do header
  const headerIcon = autoHeaderIcon ? modeConfig.icon : undefined;

  // Reset errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setValidationErrors([]);
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges && !isViewMode) {
      const confirmClose = window.confirm(
        'Você tem alterações não salvas. Deseja realmente fechar?'
      );
      if (!confirmClose) return;
    }

    if (resetOnClose && onReset) {
      onReset();
    }
    
    setValidationErrors([]);
    setHasUnsavedChanges(false);
    onClose();
  };

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isViewMode) {
      handleClose();
      return;
    }

    // Validation
    if (onValidate && item) {
      const errors = onValidate(item);
      if (errors && errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
    }

    setValidationErrors([]);

    try {
      if (onSave && item) {
        await onSave(item);
        setHasUnsavedChanges(false);
        // Modal será fechado pelo componente pai após sucesso
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro interno do servidor';
      setValidationErrors([errorMsg]);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete || !item?.id) return;

    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmDelete) return;

    try {
      await onDelete(item.id);
      handleClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao excluir item';
      setValidationErrors([errorMsg]);
    }
  };

  // Footer content
  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-2">
        {onDelete && isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={saving || deleting}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isViewMode ? 'Fechar' : 'Cancelar'}
        </button>
        
        {!isViewMode && (
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {modeConfig.buttonText}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      headerColor={modeConfig.headerColor}
      headerIcon={headerIcon}
      footerContent={footerContent}
      loading={saving || deleting}
      className={className}
      {...baseProps}
    >
      {/* Messages */}
      {errorMessage && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            <ul className="list-disc pl-4 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Required indicator */}
      {showRequiredIndicator && !isViewMode && (
        <div className="mb-4 text-sm text-gray-600">
          <span className="text-red-500">*</span> Campos obrigatórios
        </div>
      )}

      {/* Form content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {children}
      </form>

      {/* Sections (if provided) */}
      {sections && sections.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Seções do Formulário
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  {section.title}
                  {section.required && <span className="text-red-500">*</span>}
                </h4>
                {section.description && (
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseModal>
  );
};

export default FormModal; 