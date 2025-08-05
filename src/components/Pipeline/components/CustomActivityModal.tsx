import React, { useState } from 'react';
import { X, Save, Calendar, Mail, Phone, MessageCircle, ClipboardList } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface CustomActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: CustomActivity) => void;
  leadId: string;
}

interface CustomActivity {
  title: string;
  channel: 'email' | 'whatsapp' | 'phone' | 'task';
  scheduled_at: string;
  description?: string;
}

const channelOptions = [
  { value: 'task', label: 'Tarefa', icon: ClipboardList, color: 'bg-gray-500' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-blue-500' },
  { value: 'phone', label: 'Ligação', icon: Phone, color: 'bg-green-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500' },
] as const;

const CustomActivityModal: React.FC<CustomActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  leadId
}) => {
  const [formData, setFormData] = useState<CustomActivity>({
    title: '',
    channel: 'task',
    scheduled_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      
      // Reset form
      setFormData({
        title: '',
        channel: 'task',
        scheduled_at: new Date().toISOString().slice(0, 16),
        description: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar atividade personalizada:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (e?: Event) => {
    if (!isSubmitting) {
      // Impedir propagação para evitar abrir LeadDetailsModal
      e?.preventDefault?.();
      e?.stopPropagation?.();
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[9999] w-full max-w-md [&[data-state=open]]:!animate-none [&[data-state=closed]]:!animate-none data-[state=open]:animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Nova Atividade Personalizada
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Preencha os campos abaixo para criar uma nova atividade personalizada
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Título da atividade */}
            <div>
              <label htmlFor="activity-title" className="block text-sm font-medium text-gray-700 mb-1">
                Título da Atividade
              </label>
              <input
                id="activity-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Enviar proposta comercial"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Canal/Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atividade
              </label>
              <div className="grid grid-cols-2 gap-2">
                {channelOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = formData.channel === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: option.value }))}
                      className={`flex items-center gap-2 p-3 rounded-md border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                      disabled={isSubmitting}
                    >
                      <div className={`p-1 rounded ${isSelected ? option.color : 'bg-gray-400'}`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data e hora */}
            <div>
              <label htmlFor="activity-datetime" className="block text-sm font-medium text-gray-700 mb-1">
                Data e Hora
              </label>
              <div className="relative">
                <input
                  id="activity-datetime"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isSubmitting}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Descrição (opcional) */}
            <div>
              <label htmlFor="activity-description" className="block text-sm font-medium text-gray-700 mb-1">
                Observações <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                id="activity-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes adicionais sobre a atividade..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formData.title.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Criar Atividade
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CustomActivityModal;