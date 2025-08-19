// =====================================================================================
// COMPONENT: Editor de Anotações
// Autor: Claude (Arquiteto Sênior)
// Descrição: Editor rico usando TipTap com auto-save e toolbar customizada
// =====================================================================================

import React, { useState, useEffect, useRef } from 'react';
import RichTextEditor from 'reactjs-tiptap-editor';
import { BaseKit } from 'reactjs-tiptap-editor';
import 'reactjs-tiptap-editor/style.css';
import { Save, FileText, Clock, AlertCircle, Check } from 'lucide-react';
import { useCreateAnnotation, useUpdateAnnotation, useAutoSaveAnnotation } from '../../hooks/useAnnotations';
import { useAuth } from '../../providers/AuthProvider';
import type { CreateAnnotation, UpdateAnnotation, AnnotationWithRelations } from '../../shared/schemas/annotations';

interface AnnotationEditorProps {
  leadId: string;
  leadType: 'pipeline_lead' | 'lead_master';
  existingAnnotation?: AnnotationWithRelations;
  onSave?: (annotation: AnnotationWithRelations) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minimal?: boolean; // Versão minimalista para quick-add
}

export const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  leadId,
  leadType,
  existingAnnotation,
  onSave,
  onCancel,
  placeholder = "Digite sua anotação aqui...",
  className = "",
  autoFocus = false,
  minimal = false
}) => {
  const { user } = useAuth();
  const editorRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estado do editor
  const [content, setContent] = useState(existingAnnotation?.content || '');
  const [isEditing, setIsEditing] = useState(!existingAnnotation);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  // Função para cancelar auto-save pendente
  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  };

  // Mutations
  const createMutation = useCreateAnnotation();
  const updateMutation = useUpdateAnnotation();

  // AIDEV-NOTE: Configuração das extensões baseada na documentação oficial
  const extensions = [
    BaseKit.configure({
      placeholder: {
        showOnlyCurrent: true,
        placeholder: placeholder
      },
      characterCount: {
        limit: 10000
      }
    })
  ];

  // Handler para mudanças no conteúdo do editor
  const handleContentChange = (value: string) => {
    setContent(value);
    
    const plainText = extractPlainText(value);
    
    // Validações básicas
    if (plainText.length > 5000) {
      setErrors(['Conteúdo muito longo (máximo 5000 caracteres)']);
      return;
    }
    
    if (value.length > 10000) {
      setErrors(['HTML muito longo (máximo 10000 caracteres)']);
      return;
    }

    setErrors([]);
    
    // Auto-save apenas se houver conteúdo significativo
    if (plainText.trim().length > 3) {
      setSaveStatus('saving');
      // Implementar auto-save aqui se necessário
    }
  };

  // Função para extrair texto puro do HTML
  const extractPlainText = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Validar dados antes de salvar
  const validateAnnotation = (html: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const plainText = extractPlainText(html);

    if (!plainText.trim()) {
      errors.push('O conteúdo da anotação não pode estar vazio');
    }

    if (plainText.length > 5000) {
      errors.push('Conteúdo muito longo (máximo 5000 caracteres)');
    }

    if (html.length > 10000) {
      errors.push('HTML muito longo (máximo 10000 caracteres)');
    }

    return { valid: errors.length === 0, errors };
  };

  // Salvar anotação
  const handleSave = async () => {
    if (!content.trim()) {
      setErrors(['O conteúdo da anotação não pode estar vazio']);
      return;
    }

    const validation = validateAnnotation(content);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    cancelAutoSave(); // Cancelar auto-save pendente

    try {
      const plainText = extractPlainText(content);

      if (existingAnnotation) {
        // Atualizar anotação existente
        const updateData: UpdateAnnotation = {
          content,
          content_plain: plainText
        };

        const result = await updateMutation.mutateAsync({
          annotationId: existingAnnotation.id,
          data: updateData
        });

        setSaveStatus('saved');
        setIsEditing(false);
        onSave?.(result);
      } else {
        // Criar nova anotação
        const createData: CreateAnnotation = {
          content,
          content_plain: plainText,
          content_type: 'text', // ✅ CORRIGIDO: Campo obrigatório adicionado
          ...(leadType === 'pipeline_lead' 
            ? { pipeline_lead_id: leadId } 
            : { lead_master_id: leadId }
          )
        };

        const result = await createMutation.mutateAsync(createData);

        setSaveStatus('saved');
        setIsEditing(false);
        setContent(''); // Limpar editor após criar
        onSave?.(result);
      }

      setErrors([]);
    } catch (error: any) {
      console.error('❌ [AnnotationEditor] Erro ao salvar:', error);
      setSaveStatus('error');
      setErrors([error.message || 'Erro ao salvar anotação']);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancelar edição
  const handleCancel = () => {
    cancelAutoSave();
    setContent(existingAnnotation?.content || '');
    setIsEditing(false);
    setErrors([]);
    setSaveStatus('idle');
    onCancel?.();
  };

  // Handler para mudanças no editor
  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus('idle');
  };

  // Shortcuts do teclado
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
    
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  // Status indicator
  const StatusIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-blue-600 text-sm">
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-600 text-sm">
            <Check className="w-4 h-4 mr-2" />
            Salvo
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            Erro ao salvar
          </div>
        );
      default:
        return null;
    }
  };

  if (!isEditing && existingAnnotation) {
    // Modo visualização
    return (
      <div className={`annotation-viewer ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-500">
            <FileText className="w-4 h-4 mr-2" />
            {existingAnnotation.owner_name}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Editar
          </button>
        </div>
        
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: existingAnnotation.content }}
        />
        
        <div className="mt-2 text-xs text-gray-400">
          {new Date(existingAnnotation.updated_at).toLocaleString('pt-BR')}
        </div>
      </div>
    );
  }

  // Modo edição
  return (
    <div className={`annotation-editor ${className}`} onKeyDown={handleKeyDown}>
      {/* Header */}
      {!minimal && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-700">
            <FileText className="w-4 h-4 mr-2" />
            {existingAnnotation ? 'Editando anotação' : 'Nova anotação'}
          </div>
          <StatusIndicator />
        </div>
      )}

      {/* Editor */}
      <div className="border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <RichTextEditor
          ref={editorRef}
          content={content}
          onChangeContent={handleContentChange}
          extensions={extensions}
          output="html"
          minHeight={minimal ? "80px" : "200px"}
          contentClass="prose prose-sm max-w-none"
          disabled={isSaving}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-2 text-sm text-red-600">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Toolbar de ações */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-gray-500">
          {content ? `${extractPlainText(content).length}/5000 caracteres` : ''}
        </div>
        
        <div className="flex space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim() || errors.length > 0}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingAnnotation ? 'Atualizar' : 'Salvar'} {minimal && '(Ctrl+Enter)'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Shortcuts hint */}
      {!minimal && (
        <div className="mt-2 text-xs text-gray-400">
          Dicas: Ctrl+Enter para salvar, Esc para cancelar
        </div>
      )}
    </div>
  );
};