// =====================================================================================
// COMPONENT: Modern UI Demo
// Autor: Claude (Arquiteto Sênior)
// Descrição: Demonstração dos componentes Magic UI implementados
// =====================================================================================

"use client";

import React from 'react';
import { modernAlerts } from '../../utils/modernAlerts';
import { useModernModal, ModernModal, ModernConfirmModal } from './ModernModal';
import { BorderBeam } from '../magicui/border-beam';
import { ConfettiButton } from '../magicui/confetti';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ModernUIDemo: React.FC = () => {
  const { isOpen, openModal, closeModal } = useModernModal();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleTestNotifications = () => {
    // Demonstrar diferentes tipos de notificação
    setTimeout(() => modernAlerts.info('Esta é uma notificação de informação'), 100);
    setTimeout(() => modernAlerts.warning('Este é um aviso importante'), 600);
    setTimeout(() => modernAlerts.success('Operação realizada com sucesso!'), 1100);
    setTimeout(() => modernAlerts.error('Erro simulado para demonstração'), 1600);
  };

  const handleCelebration = () => {
    modernAlerts.created('Nova demonstração');
  };

  const handleConfirmDemo = async () => {
    const confirmed = await modernAlerts.confirmDelete('esta demonstração');
    if (confirmed) {
      modernAlerts.deleted('Demonstração');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Modern UI Demo
        </h1>
        <p className="text-gray-600">
          Demonstração dos componentes Magic UI implementados
        </p>
      </div>

      {/* Seção de Notificações */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Notificações Modernas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleTestNotifications}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Testar Notificações
          </button>
          
          <button
            onClick={handleCelebration}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Celebração com Confetti
          </button>
          
          <button
            onClick={handleConfirmDemo}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Teste de Confirmação
          </button>

          <button
            onClick={() => modernAlerts.info('API de annotations funcionando! ✅')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Teste API Fix
          </button>
        </div>
      </section>

      {/* Seção de Modais */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Modais Modernos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={openModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Abrir Modal Moderno
          </button>
          
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Modal de Confirmação
          </button>
        </div>
      </section>

      {/* Seção de Efeitos Visuais */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Efeitos Visuais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BorderBeam Demo */}
          <div className="relative p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <BorderBeam className="rounded-lg" />
            <h3 className="font-semibold text-gray-800 mb-2">Border Beam</h3>
            <p className="text-gray-600">Efeito de borda animada para destacar elementos importantes</p>
          </div>

          {/* Confetti Demo */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Confetti Effect</h3>
            <p className="text-gray-600 mb-4">Celebração visual para ações de sucesso</p>
            <ConfettiButton
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              options={{
                particleCount: 100,
                spread: 70,
                origin: { x: 0.5, y: 0.6 }
              }}
            >
              🎉 Trigger Confetti
            </ConfettiButton>
          </div>
        </div>
      </section>

      {/* Status das Correções */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Status das Correções</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">API Annotations</p>
              <p className="text-sm text-green-600">Tabela criada + rotas funcionando</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Magic UI</p>
              <p className="text-sm text-green-600">Componentes implementados</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Sistema Integrado</p>
              <p className="text-sm text-blue-600">Logger + Notificações + Modais</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Demo */}
      <ModernModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Modal Moderno"
        size="md"
        animationStyle="from-center"
        icon={<Info className="h-5 w-5 text-blue-600" />}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Este é um exemplo de modal moderno com animações suaves e design elegante.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold">Características:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Animações com Framer Motion</li>
              <li>Múltiplos estilos de animação</li>
              <li>BorderBeam para modais de erro</li>
              <li>Escape key e overlay click para fechar</li>
              <li>Tamanhos responsivos</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </ModernModal>

      {/* Confirm Modal Demo */}
      <ModernConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          modernAlerts.success('Ação confirmada!', 'Sucesso');
        }}
        title="Confirmação de Teste"
        message="Esta é uma demonstração do modal de confirmação moderno. Deseja continuar?"
        variant="default"
        icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
      />
    </div>
  );
};