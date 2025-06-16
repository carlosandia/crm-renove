import React from 'react';

interface PerformanceStats {
  leadsTotal: number;
  leadsConvertidos: number;
  vendas: number;
  faturamento: number;
}

const PerformanceModule: React.FC = () => {
  const stats: PerformanceStats = {
    leadsTotal: 156,
    leadsConvertidos: 23,
    vendas: 18,
    faturamento: 125000
  };

  const conversionRate = ((stats.leadsConvertidos / stats.leadsTotal) * 100).toFixed(1);

  return (
    <div className="performance-module">
      <div className="module-header">
        <h2>📈 Performance</h2>
        <p>Métricas e indicadores de desempenho</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.leadsTotal}</h3>
            <p>Total de Leads</p>
            <span className="stat-trend positive">+12%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.leadsConvertidos}</h3>
            <p>Leads Convertidos</p>
            <span className="stat-trend positive">+8%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{stats.vendas}</h3>
            <p>Vendas Fechadas</p>
            <span className="stat-trend positive">+15%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <h3>R$ {stats.faturamento.toLocaleString()}</h3>
            <p>Faturamento</p>
            <span className="stat-trend positive">+22%</span>
          </div>
        </div>
      </div>

      <div className="performance-details">
        <div className="conversion-rate">
          <h3>Taxa de Conversão</h3>
          <div className="rate-display">
            <span className="rate-value">{conversionRate}%</span>
            <div className="rate-bar">
              <div 
                className="rate-fill" 
                style={{ width: `${conversionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="monthly-trends">
          <h3>Tendências Mensais</h3>
          <div className="trend-chart">
            <div className="chart-placeholder">
              📊 Gráfico de tendências seria exibido aqui
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceModule; 