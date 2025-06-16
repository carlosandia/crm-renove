
import React from 'react';
import ModernStatsCards from './ModernStatsCards';

const ModernDashboard: React.FC = () => {
  return (
    <div className="modern-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard CRM</h1>
        <p>Visão geral completa do seu sistema de vendas</p>
      </div>
      
      <ModernStatsCards />
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card recent-activities">
            <h3>🕒 Atividades Recentes</h3>
            <div className="activities-list">
              <div className="activity-item">
                <span className="activity-icon">📞</span>
                <div className="activity-content">
                  <p>Ligação realizada para João Silva</p>
                  <span className="activity-time">2 horas atrás</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-icon">📧</span>
                <div className="activity-content">
                  <p>Email de proposta enviado para Maria Santos</p>
                  <span className="activity-time">4 horas atrás</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-icon">🤝</span>
                <div className="activity-content">
                  <p>Reunião agendada com Carlos Pereira</p>
                  <span className="activity-time">6 horas atrás</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-icon">✅</span>
                <div className="activity-content">
                  <p>Venda fechada - R$ 15.500</p>
                  <span className="activity-time">8 horas atrás</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card pipeline-overview">
            <h3>🔄 Visão do Pipeline</h3>
            <div className="pipeline-stages">
              <div className="stage">
                <span className="stage-name">🎯 Novos Leads</span>
                <span className="stage-count">12</span>
              </div>
              <div className="stage">
                <span className="stage-name">📞 Em Contato</span>
                <span className="stage-count">8</span>
              </div>
              <div className="stage">
                <span className="stage-name">💰 Proposta Enviada</span>
                <span className="stage-count">5</span>
              </div>
              <div className="stage">
                <span className="stage-name">🤝 Negociação</span>
                <span className="stage-count">3</span>
              </div>
              <div className="stage">
                <span className="stage-name">✅ Fechamento</span>
                <span className="stage-count">2</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>📊 Metas do Mês</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                <div>
                  <p className="font-semibold text-green-800">Vendas Realizadas</p>
                  <p className="text-sm text-green-600">85% da meta atingida</p>
                </div>
                <div className="text-2xl font-bold text-green-700">17/20</div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <div>
                  <p className="font-semibold text-blue-800">Faturamento</p>
                  <p className="text-sm text-blue-600">92% da meta atingida</p>
                </div>
                <div className="text-2xl font-bold text-blue-700">R$ 460k</div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl">
                <div>
                  <p className="font-semibold text-orange-800">Novos Leads</p>
                  <p className="text-sm text-orange-600">110% da meta atingida</p>
                </div>
                <div className="text-2xl font-bold text-orange-700">132/120</div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>👥 Top Vendedores</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <span className="font-medium">Ana Silva</span>
                </div>
                <span className="font-bold text-yellow-700">R$ 125k</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                  <span className="font-medium">Carlos Santos</span>
                </div>
                <span className="font-bold text-gray-700">R$ 98k</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                  <span className="font-medium">Maria Costa</span>
                </div>
                <span className="font-bold text-orange-700">R$ 87k</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
