// Cache service removed - using simplified performance monitoring

interface PerformanceMetrics {
  timestamp: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  requestsPerMinute: number;
}

interface DatabaseMetrics {
  slowQueries: number;
  averageQueryTime: number;
  connectionPoolSize: number;
  activeConnections: number;
}

class PerformanceService {
  private metrics: PerformanceMetrics[] = [];
  private requestCount = 0;
  private lastMinuteReset = Date.now();
  private slowQueryThreshold = 100; // 100ms

  constructor() {
    // Clean old metrics every 5 minutes
    setInterval(() => {
      this.cleanOldMetrics();
    }, 5 * 60 * 1000);

    // Reset request counter every minute
    setInterval(() => {
      this.resetRequestCounter();
    }, 60 * 1000);
  }

  /**
   * Record a performance metric
   */
  recordMetric(responseTime: number): void {
    try {
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        responseTime,
        memoryUsage: process.memoryUsage(),
        activeConnections: this.getActiveConnections(),
        requestsPerMinute: this.requestCount
      };

      this.metrics.push(metric);
      this.requestCount++;

      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    current: any;
    averages: any;
    alerts: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        current: null,
        averages: null,
        alerts: ['No performance data available']
      };
    }

    const latest = this.metrics[this.metrics.length - 1];
    const last10Minutes = this.metrics.filter(
      m => m.timestamp > Date.now() - 10 * 60 * 1000
    );

    const averageResponseTime = last10Minutes.reduce((sum, m) => sum + m.responseTime, 0) / last10Minutes.length;
    const averageMemory = last10Minutes.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / last10Minutes.length;

    const alerts: string[] = [];
    
    // Performance alerts
    if (averageResponseTime > 500) {
      alerts.push(`High average response time: ${averageResponseTime.toFixed(2)}ms`);
    }
    
    if (latest.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      alerts.push(`High memory usage: ${(latest.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    

    return {
      current: {
        responseTime: latest.responseTime,
        memoryUsage: {
          heapUsed: (latest.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
          heapTotal: (latest.memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
          external: (latest.memoryUsage.external / 1024 / 1024).toFixed(2) + 'MB'
        },
        requestsPerMinute: latest.requestsPerMinute,
        activeConnections: latest.activeConnections
      },
      averages: {
        responseTime: averageResponseTime.toFixed(2) + 'ms',
        memoryUsage: (averageMemory / 1024 / 1024).toFixed(2) + 'MB',
      },
      alerts
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(): {
    responseTime: number[];
    memoryUsage: number[];
    timestamps: number[];
  } {
    const last30Minutes = this.metrics.filter(
      m => m.timestamp > Date.now() - 30 * 60 * 1000
    );

    return {
      responseTime: last30Minutes.map(m => m.responseTime),
      memoryUsage: last30Minutes.map(m => m.memoryUsage.heapUsed / 1024 / 1024),
      timestamps: last30Minutes.map(m => m.timestamp)
    };
  }

  /**
   * Get slow query analysis
   */
  getSlowQueryAnalysis(): {
    count: number;
    averageTime: number;
    threshold: number;
  } {
    const slowQueries = this.metrics.filter(m => m.responseTime > this.slowQueryThreshold);
    
    return {
      count: slowQueries.length,
      averageTime: slowQueries.length > 0 
        ? slowQueries.reduce((sum, m) => sum + m.responseTime, 0) / slowQueries.length 
        : 0,
      threshold: this.slowQueryThreshold
    };
  }

  /**
   * Check system health
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    details: any;
  } {
    const summary = this.getPerformanceSummary();
    let score = 100;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Deduct points for issues
    if (summary.alerts.length > 0) {
      score -= summary.alerts.length * 10;
    }

    const latest = this.metrics[this.metrics.length - 1];
    if (latest) {
      // Response time check
      if (latest.responseTime > 1000) {
        score -= 30;
      } else if (latest.responseTime > 500) {
        score -= 15;
      }

      // Memory usage check
      const memoryUsageMB = latest.memoryUsage.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 1000) {
        score -= 25;
      } else if (memoryUsageMB > 500) {
        score -= 10;
      }

    }

    // Determine status
    if (score >= 90) {
      status = 'healthy';
    } else if (score >= 70) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      details: summary
    };
  }

  /**
   * Performance optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getPerformanceSummary();
    
    if (!summary.current) {
      return ['Collect performance data to get recommendations'];
    }

    // Response time recommendations
    const avgResponseTime = parseFloat(summary.averages.responseTime);
    if (avgResponseTime > 500) {
      recommendations.push('Consider adding more cache layers for frequently accessed data');
      recommendations.push('Review and optimize database queries');
      recommendations.push('Implement request batching for multiple API calls');
    }

    // Memory recommendations
    const memoryUsage = parseFloat(summary.current.memoryUsage.heapUsed);
    if (memoryUsage > 500) {
      recommendations.push('Review memory leaks and optimize object lifecycle');
      recommendations.push('Implement memory pooling for large objects');
      recommendations.push('Consider increasing server memory allocation');
    }


    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal - no immediate optimizations needed');
    }

    return recommendations;
  }

  private cleanOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  private resetRequestCounter(): void {
    this.requestCount = 0;
    this.lastMinuteReset = Date.now();
  }

  private getActiveConnections(): number {
    // This would typically integrate with your connection pool
    // For now, return a mock value
    return Math.floor(Math.random() * 10) + 1;
  }
}

// Singleton instance
const performanceService = new PerformanceService();

/**
 * Middleware to track performance metrics
 */
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;
      performanceService.recordMetric(responseTime);
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

export { performanceService };
export type { PerformanceMetrics, DatabaseMetrics }; 