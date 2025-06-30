// FASE 4/5: Backend Endpoints para Analytics de Formulários
// Endpoints para dashboard de analytics, métricas e relatórios

import express from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware as authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// GET /api/analytics/forms/:id/overview - Visão geral do formulário
router.get('/forms/:id/overview', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    // Calcular datas
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Buscar visualizações
    const { data: views } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .eq('event_type', 'view')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Buscar submissões
    const { data: submissions } = await supabase
      .from('forms_submissions')
      .select('*')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Calcular métricas
    const totalViews = views?.length || 0;
    const totalSubmissions = submissions?.length || 0;
    const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;
    
    // Calcular tempo médio
    const avgTime = calculateAverageTime(views || [], submissions || []);
    
    // Distribuição por dispositivo
    const deviceDistribution = getDeviceDistribution(views || []);
    
    // Timeline de conversões
    const timeline = generateTimeline(views || [], submissions || [], startDate, endDate);

    res.json({
      period,
      overview: {
        total_views: totalViews,
        total_submissions: totalSubmissions,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        average_time: avgTime
      },
      device_distribution: deviceDistribution,
      timeline
    });

  } catch (error) {
    console.error('Erro ao buscar overview:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analytics/forms/:id/traffic - Análise de tráfego
router.get('/forms/:id/traffic', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    const { startDate, endDate } = getPeriodDates(period as string);

    // Buscar dados de tráfego
    const { data: analytics } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Analisar fontes de tráfego
    const sources = analyzeTrafficSources(analytics || []);
    
    // Analisar países/regiões
    const geography = analyzeGeography(analytics || []);
    
    // Horários de pico
    const peakHours = analyzePeakHours(analytics || []);

    res.json({
      period,
      traffic_sources: sources,
      geography,
      peak_hours: peakHours
    });

  } catch (error) {
    console.error('Erro ao analisar tráfego:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analytics/forms/:id/funnel - Análise de funil
router.get('/forms/:id/funnel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    const { startDate, endDate } = getPeriodDates(period as string);

    // Buscar formulário para analisar campos
    const { data: form } = await supabase
      .from('forms')
      .select('fields, form_type')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado' });
    }

    // Buscar interações
    const { data: interactions } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .eq('event_type', 'interaction')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Buscar submissões
    const { data: submissions } = await supabase
      .from('forms_submissions')
      .select('id, data, created_at')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Analisar funil
    const funnelAnalysis = analyzeFunnel(form, interactions || [], submissions || []);

    res.json({
      period,
      form_type: form.form_type,
      funnel_steps: funnelAnalysis.steps,
      dropoff_analysis: funnelAnalysis.dropoffs,
      completion_rate: funnelAnalysis.completion_rate
    });

  } catch (error) {
    console.error('Erro ao analisar funil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analytics/forms/:id/heatmap - Dados para heatmap
router.get('/forms/:id/heatmap', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    const { startDate, endDate } = getPeriodDates(period as string);

    // Buscar interações por elemento
    const { data: interactions } = await supabase
      .from('form_analytics')
      .select('event_data')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .eq('event_type', 'interaction')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Processar dados para heatmap
    const heatmapData = processHeatmapData(interactions || []);

    res.json({
      period,
      element_interactions: heatmapData.elements,
      click_density: heatmapData.density,
      scroll_depth: heatmapData.scroll,
      time_on_elements: heatmapData.timeOnElements
    });

  } catch (error) {
    console.error('Erro ao gerar heatmap:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analytics/forms/:id/performance - Análise de performance
router.get('/forms/:id/performance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    const { startDate, endDate } = getPeriodDates(period as string);

    // Buscar dados de performance
    const { data: analytics } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', id)
      .eq('tenant_id', tenant_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Analisar performance
    const performance = analyzePerformance(analytics || []);

    res.json({
      period,
      load_times: performance.loadTimes,
      interaction_times: performance.interactionTimes,
      completion_times: performance.completionTimes,
      bounce_rate: performance.bounceRate,
      error_rate: performance.errorRate
    });

  } catch (error) {
    console.error('Erro ao analisar performance:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/analytics/forms/:id/export - Exportar dados
router.post('/forms/:id/export', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'csv', period = '30d', metrics = [] } = req.body;
    
    if (!req.user || !req.user.tenant_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const { tenant_id } = req.user;
    
    const { startDate, endDate } = getPeriodDates(period);

    // Buscar todos os dados conforme métricas solicitadas
    const exportData = await gatherExportData(id, tenant_id, startDate, endDate, metrics);
    
    // Gerar arquivo conforme formato
    let responseData;
    let contentType;
    
    switch (format) {
      case 'csv':
        responseData = generateCSV(exportData);
        contentType = 'text/csv';
        break;
      case 'json':
        responseData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        break;
      case 'xlsx':
        responseData = generateExcel(exportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        return res.status(400).json({ error: 'Formato não suportado' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="form-analytics-${id}-${period}.${format}"`);
    res.send(responseData);

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// FUNÇÕES AUXILIARES

function getPeriodDates(period: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }
  
  return { startDate, endDate };
}

function calculateAverageTime(views: any[], submissions: any[]): number {
  // Implementar cálculo de tempo médio
  if (!views || !submissions || submissions.length === 0) return 0;
  
  const times = submissions.map(sub => {
    const view = views.find(v => 
      Math.abs(new Date(v.created_at).getTime() - new Date(sub.created_at).getTime()) < 3600000
    );
    
    if (view) {
      return new Date(sub.created_at).getTime() - new Date(view.created_at).getTime();
    }
    return 0;
  }).filter(t => t > 0);
  
  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0;
}

function getDeviceDistribution(views: any[]) {
  const devices = { mobile: 0, desktop: 0, tablet: 0 };
  
  views?.forEach(view => {
    const userAgent = view.event_data?.user_agent || '';
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      devices.mobile++;
    } else if (/Tablet|iPad/.test(userAgent)) {
      devices.tablet++;
    } else {
      devices.desktop++;
    }
  });
  
  return devices;
}

function generateTimeline(views: any[], submissions: any[], startDate: Date, endDate: Date) {
  const timeline = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.toISOString().split('T')[0];
    const dayViews = views?.filter(v => v.created_at.startsWith(day)).length || 0;
    const daySubmissions = submissions?.filter(s => s.created_at.startsWith(day)).length || 0;
    
    timeline.push({
      date: day,
      views: dayViews,
      submissions: daySubmissions,
      conversion_rate: dayViews > 0 ? (daySubmissions / dayViews) * 100 : 0
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return timeline;
}

function analyzeTrafficSources(analytics: any[]) {
  const sources: Record<string, number> = {};
  
  analytics?.forEach(item => {
    const referer = item.event_data?.referer || 'Direct';
    const source = extractSource(referer);
    sources[source] = (sources[source] || 0) + 1;
  });
  
  return Object.entries(sources)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

function extractSource(referer: string): string {
  if (!referer || referer === 'Direct') return 'Direct';
  
  try {
    const url = new URL(referer);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('facebook')) return 'Facebook';
    if (hostname.includes('instagram')) return 'Instagram';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('twitter')) return 'Twitter';
    
    return hostname;
  } catch {
    return 'Unknown';
  }
}

function analyzeGeography(analytics: any[]) {
  // Implementação básica - em produção usaria serviço de geolocalização
  const countries: Record<string, number> = { 'Brasil': 0, 'Outros': 0 };
  
  analytics?.forEach(() => {
    countries['Brasil']++; // Simplificado
  });
  
  return Object.entries(countries)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);
}

function analyzePeakHours(analytics: any[]) {
  const hours: Record<number, number> = {};
  
  analytics?.forEach(item => {
    const hour = new Date(item.created_at).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });
  
  return Object.entries(hours)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);
}

function analyzeFunnel(form: any, interactions: any[], submissions: any[]) {
  const fields = form.fields || [];
  const steps: any[] = [];
  
  // Analisar cada campo como um step do funil
  fields.forEach((field: any, index: number) => {
    const fieldInteractions = interactions?.filter(i => 
      i.event_data?.element_id === field.name
    ).length || 0;
    
    const fieldCompletions = submissions?.filter(s => 
      s.data && s.data[field.name]
    ).length || 0;
    
    steps.push({
      step: index + 1,
      field_name: field.name,
      field_label: field.label,
      interactions: fieldInteractions,
      completions: fieldCompletions,
      completion_rate: fieldInteractions > 0 ? (fieldCompletions / fieldInteractions) * 100 : 0
    });
  });
  
  const totalSubmissions = submissions?.length || 0;
  const totalViews = Math.max(...steps.map(s => s.interactions), 1);
  
  return {
    steps,
    dropoffs: calculateDropoffs(steps),
    completion_rate: (totalSubmissions / totalViews) * 100
  };
}

function calculateDropoffs(steps: any[]) {
  const dropoffs = [];
  
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    
    const dropoff = current.interactions > 0 ? 
      ((current.interactions - next.interactions) / current.interactions) * 100 : 0;
    
    dropoffs.push({
      from_step: current.step,
      to_step: next.step,
      dropoff_rate: dropoff,
      users_lost: current.interactions - next.interactions
    });
  }
  
  return dropoffs;
}

function processHeatmapData(interactions: any[]) {
  const elements: Record<string, number> = {};
  const density: Record<string, number> = {};
  
  interactions?.forEach(item => {
    const elementId = item.event_data?.element_id;
    const interactionType = item.event_data?.interaction_type;
    
    if (elementId) {
      elements[elementId] = (elements[elementId] || 0) + 1;
    }
    
    if (interactionType) {
      density[interactionType] = (density[interactionType] || 0) + 1;
    }
  });
  
  return {
    elements,
    density,
    scroll: {}, // Implementar análise de scroll
    timeOnElements: {} // Implementar tempo por elemento
  };
}

function analyzePerformance(analytics: any[]) {
  // Análise básica de performance
  const loadTimes = analytics?.map(a => a.event_data?.load_time).filter(Boolean) || [];
  const avgLoadTime = loadTimes.length > 0 ? 
    loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;
  
  return {
    loadTimes: {
      average: avgLoadTime,
      samples: loadTimes.length
    },
    interactionTimes: {
      average: 0 // Implementar
    },
    completionTimes: {
      average: 0 // Implementar
    },
    bounceRate: 0, // Implementar
    errorRate: 0 // Implementar
  };
}

async function gatherExportData(formId: string, tenantId: string, startDate: Date, endDate: Date, metrics: string[]) {
  // Buscar dados conforme métricas solicitadas
  const data: any = {};
  
  if (metrics.includes('views') || metrics.length === 0) {
    const { data: views } = await supabase
      .from('form_analytics')
      .select('*')
      .eq('form_id', formId)
      .eq('tenant_id', tenantId)
      .eq('event_type', 'view')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    data.views = views;
  }
  
  if (metrics.includes('submissions') || metrics.length === 0) {
    const { data: submissions } = await supabase
      .from('forms_submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    data.submissions = submissions;
  }
  
  return data;
}

function generateCSV(data: any): string {
  // Implementação básica de CSV
  let csv = 'Type,Date,Data\n';
  
  if (data.views) {
    data.views.forEach((view: any) => {
      csv += `view,${view.created_at},${JSON.stringify(view.event_data)}\n`;
    });
  }
  
  if (data.submissions) {
    data.submissions.forEach((sub: any) => {
      csv += `submission,${sub.created_at},${JSON.stringify(sub.data)}\n`;
    });
  }
  
  return csv;
}

function generateExcel(data: any): Buffer {
  // Implementação simplificada - em produção usaria biblioteca como xlsx
  return Buffer.from(generateCSV(data));
}

export default router; 