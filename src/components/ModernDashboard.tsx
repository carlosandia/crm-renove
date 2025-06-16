import React from 'react';
import ModernStatsCards from './ModernStatsCards';

const ModernDashboard: React.FC = () => {
  return (
    <div className="modern-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Visão geral do seu CRM</p>
      </div>
      
      <ModernStatsCards />
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card recent-activities">
            <h3>Atividades Recentes</h3>
            <div className="activities-list">
              <div className="activity-item">
                <span className="activity-icon">📞</span>
                <div className="activity-content">
                  <p>Ligação para João Silva</p>
                  <span className="activity-time">2 horas atrás</span>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-icon">📧</span>
                <div className="activity-content">
                  <p>Email enviado para Maria Santos</p>
                  <span className="activity-time">4 horas atrás</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card pipeline-overview">
            <h3>Pipeline Overview</h3>
            <div className="pipeline-stages">
              <div className="stage">
                <span className="stage-name">Novos Leads</span>
                <span className="stage-count">12</span>
              </div>
              <div className="stage">
                <span className="stage-name">Em Contato</span>
                <span className="stage-count">8</span>
              </div>
              <div className="stage">
                <span className="stage-name">Proposta</span>
                <span className="stage-count">5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard; 