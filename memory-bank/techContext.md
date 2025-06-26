# Memory Bank: Technical Context

## Current Environment
- **OS**: macOS (Darwin)
- **Node.js**: Version available
- **Package Manager**: npm
- **Development Server**: Vite (localhost:8082)
- **Backend Server**: Express (localhost:3001)

## Dependencies
### Frontend
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "tailwindcss": "^3.x",
  "@supabase/supabase-js": "^2.x"
}
```

### Backend
```json
{
  "express": "^4.x",
  "typescript": "^5.x",
  "@supabase/supabase-js": "^2.x"
}
```

## Database Schema
- **Supabase PostgreSQL**
- Tables: users, companies, leads, pipelines, forms, etc.
- Row Level Security (RLS) implemented
- Multi-tenant architecture

## Build Configuration
- **Frontend**: Vite with React + TypeScript
- **Backend**: TypeScript compilation
- **Styling**: Tailwind CSS with PostCSS
- **Linting**: ESLint + TypeScript

## Development Workflow
1. Frontend: `npm run dev` (Vite dev server)
2. Backend: `npm run dev` (Express server)
3. Database: Supabase cloud instance
4. Hot reload enabled for both frontend and backend

## Known Issues
- Nenhum erro crítico identificado
- Sistema estável e funcional
- Build times otimizados 

## Current Technology Stack

### Core Technologies
- **Frontend**: React 18 + TypeScript
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase subscriptions
- **Styling**: Tailwind CSS + shadcn/ui
- **Build**: Vite (frontend) + tsc (backend)

### Performance Stack (Fase 1 - NEW)
- **Cache Layer**: Redis (in-memory caching)
- **Database Optimization**: PostgreSQL índices compostos
- **Connection Pooling**: pg-pool (PostgreSQL) + ioredis (Redis)
- **Load Balancer**: Nginx (reverse proxy + caching)
- **Monitoring**: Prometheus + Grafana
- **Container**: Docker multi-stage builds
- **CDN**: Cloudflare (planned)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2 (production)
- **Environment**: Node.js 18+

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest (planned)
- **Version Control**: Git

## Performance Architecture (Fase 1)

### Caching Strategy
```typescript
// Multi-tier caching architecture
interface CacheStrategy {
  L1: 'Local Memory Cache';    // Fastest, smallest
  L2: 'Redis Cache';          // Fast, medium size  
  L3: 'Database';             // Slower, persistent
}

// Cache TTL Strategy
const cacheTTL = {
  user_session: 3600,         // 1 hour
  pipeline_data: 1800,        // 30 minutes
  lead_stats: 300,            // 5 minutes
  system_config: 86400        // 24 hours
};
```

### Database Optimization
```sql
-- Performance índices strategy
CREATE INDEX CONCURRENTLY idx_leads_tenant_status_assigned 
ON leads(tenant_id, status, assigned_to);

CREATE INDEX CONCURRENTLY idx_pipelines_tenant_active
ON pipelines(tenant_id, active, created_at);

CREATE INDEX CONCURRENTLY idx_notifications_user_read
ON notifications(user_id, read, created_at);

CREATE INDEX CONCURRENTLY idx_contacts_tenant_email
ON contacts(tenant_id, email, phone);
```

### Connection Pooling
```typescript
// PostgreSQL pool configuration
const dbPoolConfig = {
  min: 2,
  max: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
};

// Redis pool configuration  
const redisPoolConfig = {
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  lazyConnect: true
};
```

## API Architecture

### Backend Services
- **Authentication**: JWT + Supabase Auth
- **Authorization**: Role-based middleware
- **Validation**: Zod schemas
- **Error Handling**: Centralized error middleware
- **Rate Limiting**: Express rate limiter
- **Logging**: Winston logger

### API Endpoints Structure
```
/api/
├── auth/           # Authentication
├── leads/          # Lead management
├── pipelines/      # Pipeline operations
├── notifications/  # Notification system
├── analytics/      # Performance metrics
└── health/         # Health checks
```

### Data Flow
```
Client → Nginx → Express → Redis Cache → PostgreSQL
                      ↓
                 Monitoring Stack
```

## Frontend Architecture

### Component Structure
```
src/components/
├── ui/                    # shadcn/ui base components
├── Pipeline/              # Pipeline management
├── Leads/                 # Lead management  
├── Notifications/         # Notification system
└── Performance/           # Performance monitoring (NEW)
```

### State Management
- **Global State**: React Context
- **Server State**: TanStack Query (planned)
- **Local State**: useState + useReducer
- **Real-time**: Supabase subscriptions

### Performance Optimizations (Fase 1)
- **Code Splitting**: Dynamic imports + React.lazy
- **Bundle Optimization**: Vite tree-shaking
- **Image Optimization**: WebP + lazy loading
- **Service Worker**: Cache-first strategy
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1

## Security Context

### Authentication & Authorization
- **JWT Tokens**: Secure token-based auth
- **Role Hierarchy**: Super Admin > Admin > Member
- **RLS Policies**: Database-level security
- **CORS**: Configured for production domains
- **Rate Limiting**: API protection

### Data Protection
- **Encryption**: TLS 1.3 in transit
- **Validation**: Input sanitization
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **Tenant Isolation**: Multi-tenant security

## Integration Context

### External Services
- **Supabase**: Database + Auth + Real-time
- **Redis**: Caching layer
- **Nginx**: Load balancing + reverse proxy
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

### Internal Services
- **API Gateway**: Express.js router
- **Cache Service**: Redis abstraction
- **Notification Service**: Real-time notifications
- **Analytics Service**: Performance tracking
- **Health Check Service**: System monitoring

## Performance Monitoring (NEW - Fase 1)

### Metrics Collection
```typescript
// Performance metrics
interface PerformanceMetrics {
  response_time: number;      // API response time
  cache_hit_rate: number;     // Cache effectiveness
  db_query_time: number;      // Database performance
  memory_usage: number;       // Memory consumption
  cpu_usage: number;          // CPU utilization
  active_connections: number; // Connection pool usage
}
```

### Monitoring Stack
- **Application Metrics**: Custom Express middleware
- **Database Metrics**: PostgreSQL stats
- **Cache Metrics**: Redis INFO command
- **System Metrics**: Node.js process stats
- **Business Metrics**: User engagement tracking

### Alerting Strategy
```yaml
alerts:
  response_time:
    threshold: 200ms
    severity: warning
  cache_hit_rate:
    threshold: 95%
    severity: critical
  database_cpu:
    threshold: 80%
    severity: warning
  memory_usage:
    threshold: 85%
    severity: critical
```

## Development Workflow

### Local Development
```bash
# Frontend development
npm run dev          # Vite dev server

# Backend development  
npm run dev:backend  # Express with nodemon

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed development data
```

### Production Build
```bash
# Frontend build
npm run build        # Vite production build

# Backend build
npm run build:backend # TypeScript compilation

# Docker build
docker build -t crm-marketing .
```

### Performance Testing (NEW)
```bash
# Load testing
npm run test:load    # Artillery load tests

# Performance profiling
npm run profile      # Node.js profiling

# Bundle analysis
npm run analyze      # Bundle size analysis
```

## Environment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# Performance (NEW)
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL_DEFAULT=300
MONITORING_ENABLED=true
```

### Performance Configuration (NEW)
```bash
# Cache settings
REDIS_MAX_MEMORY=512mb
REDIS_EVICTION_POLICY=allkeys-lru

# Database settings
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_QUERY_TIMEOUT=30000

# Monitoring settings
METRICS_COLLECTION_INTERVAL=60000
PROMETHEUS_PORT=9090
```

## Deployment Architecture

### Production Stack
```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    
  app:
    image: crm-marketing:latest
    environment:
      - NODE_ENV=production
      
  redis:
    image: redis:alpine
    command: redis-server --maxmemory 512mb
    
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=crm_marketing
      
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

### Scaling Strategy
- **Horizontal Scaling**: Multiple app instances behind Nginx
- **Database Scaling**: Read replicas + connection pooling
- **Cache Scaling**: Redis cluster for high availability
- **CDN**: Static asset delivery optimization

## Future Technical Roadmap

### Phase 2: Advanced Infrastructure
- Kubernetes orchestration
- Microservices architecture
- Event-driven architecture
- Advanced monitoring (APM)

### Phase 3: AI/ML Integration
- Predictive analytics
- Lead scoring algorithms
- Automated insights
- Performance optimization AI

### Phase 4: Enterprise Features
- Multi-region deployment
- Advanced security (SSO, MFA)
- Compliance (GDPR, SOC2)
- Enterprise integrations 

## Current Tech Stack

### Frontend (React Ecosystem)
- **React**: 18.2.0 (Latest stable)
- **TypeScript**: 5.0+ (Type safety)
- **Vite**: 4.4+ (Build tool, fast HMR)
- **Tailwind CSS**: 3.3+ (Utility-first styling)
- **Lucide React**: Icons library

### UI Components & Libraries
- **shadcn/ui**: Component library base
- **Radix UI**: Accessible primitives
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **Class Variance Authority**: Component variants

### Analytics & Visualization (Phase 3)
- **Recharts**: 2.8+ (React chart library)
- **Chart.js**: 4.4+ (Alternative charting solution)
- **D3.js**: 7.8+ (Advanced data visualization)
- **React Query**: 4.32+ (Data fetching and caching)
- **Date-fns**: 2.30+ (Date manipulation for time series)

### Backend (Node.js Ecosystem)
- **Node.js**: 18+ LTS
- **Express.js**: 4.18+ (Web framework)
- **TypeScript**: 5.0+ (Type safety)
- **Zod**: Schema validation
- **CORS**: Cross-origin resource sharing

### Database & Storage
- **Supabase**: PostgreSQL + Real-time + Auth
- **PostgreSQL**: 15+ (Primary database)
- **Redis**: 7.0+ (Caching layer - Phase 1)

### Analytics Database Extensions (Phase 3)
- **PostgreSQL Extensions**:
  - `pg_stat_statements`: Query performance monitoring
  - `pg_cron`: Scheduled analytics jobs
  - `timescaledb`: Time series data optimization (optional)
- **Materialized Views**: Pre-computed aggregations
- **Partitioning**: Time-based table partitioning for large datasets

### Infrastructure & DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-service orchestration
- **Nginx**: Reverse proxy + load balancing
- **PM2**: Process management (production)

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Commitizen**: Conventional commits

### Performance & Monitoring (Phase 1)
- **Redis**: Multi-tier caching
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Winston**: Logging framework

## Phase 3: Analytics & Reporting Technical Stack

### Data Processing & Analytics
- **Node.js Streams**: Large dataset processing
- **Worker Threads**: CPU-intensive calculations
- **Cron Jobs**: Scheduled data aggregation
- **Queue System**: Background job processing

### Machine Learning & Forecasting
- **Simple Statistics**: Statistical calculations
- **Regression.js**: Linear and polynomial regression
- **ML-Matrix**: Matrix operations for ML
- **Moving Averages**: Time series forecasting

### Export & Reporting
- **PDFKit**: PDF generation
- **ExcelJS**: Excel file generation
- **CSV Writer**: CSV export functionality
- **Handlebars**: Template engine for reports

### Real-time Features
- **WebSocket**: Real-time dashboard updates
- **Server-Sent Events**: Live metric streaming
- **Socket.io**: Enhanced WebSocket support

### Chart & Visualization Libraries
```typescript
// Primary: Recharts (React-native)
import { LineChart, BarChart, PieChart, AreaChart } from 'recharts';

// Secondary: Chart.js (Canvas-based)
import { Chart as ChartJS } from 'chart.js/auto';

// Advanced: D3.js (Custom visualizations)
import * as d3 from 'd3';
```

### Data Processing Architecture
```typescript
// Analytics Service Architecture
interface AnalyticsEngine {
  aggregateMetrics(timeRange: TimeRange): Promise<Metrics>;
  generateForecast(historicalData: TimeSeries): Promise<Forecast>;
  calculateConversionFunnel(filters: FunnelFilters): Promise<FunnelData>;
  exportReport(config: ReportConfig): Promise<ExportResult>;
}
```

## Database Architecture (Phase 3 Extensions)

### Analytics Tables Schema
```sql
-- Core analytics tables
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  snapshot_date DATE NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KPI tracking
CREATE TABLE kpi_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  kpi_name VARCHAR(100) NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  target_value DECIMAL(15,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom reports configuration
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  schedule JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Performance Indexes (Analytics-Specific)
```sql
-- Time series optimization
CREATE INDEX CONCURRENTLY idx_analytics_time_series 
ON analytics_snapshots(tenant_id, snapshot_date DESC);

-- KPI performance queries
CREATE INDEX CONCURRENTLY idx_kpi_tracking_performance 
ON kpi_tracking(tenant_id, kpi_name, period_start DESC);

-- Report access patterns
CREATE INDEX CONCURRENTLY idx_custom_reports_access 
ON custom_reports(tenant_id, created_by, created_at DESC);
```

### Materialized Views for Performance
```sql
-- Daily metrics aggregation
CREATE MATERIALIZED VIEW daily_metrics_mv AS
SELECT 
  tenant_id,
  DATE(created_at) as metric_date,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'converted') as conversions,
  AVG(value) as avg_deal_value
FROM leads 
GROUP BY tenant_id, DATE(created_at);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_daily_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;
END;
$$ LANGUAGE plpgsql;
```

## API Architecture (Phase 3)

### Analytics Endpoints Structure
```typescript
// Analytics API Routes
app.get('/api/analytics/dashboard', analyticsController.getDashboard);
app.get('/api/analytics/forecast', analyticsController.getForecast);
app.get('/api/analytics/funnel', analyticsController.getConversionFunnel);
app.get('/api/analytics/team-performance', analyticsController.getTeamPerformance);
app.post('/api/reports/generate', reportController.generateReport);
app.get('/api/reports/export/:id', reportController.exportReport);
app.get('/api/analytics/realtime', analyticsController.getRealTimeMetrics);
```

### Response Formats
```typescript
// Standardized analytics response
interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  meta: {
    query_time_ms: number;
    cache_hit: boolean;
    data_freshness: string;
    total_records?: number;
  };
  message?: string;
}

// Dashboard metrics format
interface DashboardMetrics {
  kpis: {
    total_leads: number;
    conversion_rate: number;
    avg_deal_value: number;
    pipeline_velocity: number;
  };
  trends: {
    leads_trend: TrendData[];
    revenue_trend: TrendData[];
    conversion_trend: TrendData[];
  };
  comparisons: {
    period_over_period: ComparisonData;
    year_over_year: ComparisonData;
  };
}
```

## Frontend Architecture (Phase 3)

### Component Structure
```
src/components/Analytics/
├── Dashboard/
│   ├── ExecutiveDashboard.tsx
│   ├── DashboardCard.tsx
│   ├── MetricTrend.tsx
│   └── KPIWidget.tsx
├── Charts/
│   ├── ChartContainer.tsx
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   ├── PieChart.tsx
│   └── FunnelChart.tsx
├── Reports/
│   ├── ReportBuilder.tsx
│   ├── ReportPreview.tsx
│   ├── ExportButton.tsx
│   └── ScheduleReport.tsx
└── Forecasting/
    ├── ForecastingView.tsx
    ├── TrendAnalysis.tsx
    └── PredictionChart.tsx
```

### Custom Hooks for Analytics
```typescript
// Analytics data fetching
export const useAnalytics = (timeRange: TimeRange) => {
  return useQuery({
    queryKey: ['analytics', 'dashboard', timeRange],
    queryFn: () => analyticsService.getDashboard(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Real-time metrics
export const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('/api/analytics/realtime');
    ws.onmessage = (event) => {
      setMetrics(JSON.parse(event.data));
    };
    return () => ws.close();
  }, []);
  
  return metrics;
};
```

## Performance Considerations (Phase 3)

### Query Optimization Strategies
- **Materialized Views**: Pre-computed aggregations
- **Partitioning**: Time-based table partitioning
- **Indexing**: Composite indexes for analytics queries
- **Caching**: Multi-tier caching with Redis

### Data Processing Optimization
- **Batch Processing**: Process large datasets in chunks
- **Worker Threads**: Offload CPU-intensive calculations
- **Streaming**: Process data streams for real-time analytics
- **Compression**: Compress historical data

### Frontend Performance
- **Virtual Scrolling**: Handle large datasets in tables
- **Chart Optimization**: Limit data points for smooth rendering
- **Lazy Loading**: Load chart components on demand
- **Memoization**: Cache expensive calculations

## Security Considerations (Phase 3)

### Data Access Control
- **Row Level Security**: Tenant-based data isolation
- **Role-based Permissions**: Control access to sensitive metrics
- **Data Masking**: Anonymize PII in reports
- **Audit Logging**: Track all analytics data access

### Export Security
- **Rate Limiting**: Prevent data export abuse
- **Watermarking**: Add identifying marks to exported reports
- **Access Logs**: Track all export activities
- **File Encryption**: Encrypt exported files

## Integration Points (Phase 3)

### External Systems
- **Email Services**: Automated report delivery
- **Cloud Storage**: Store large reports and exports
- **BI Tools**: Integration with Tableau, Power BI
- **Webhook Endpoints**: Real-time data synchronization

### Internal Integrations
- **Cache Layer**: Redis integration for performance
- **Workflow Engine**: Trigger analytics on workflow events
- **Notification System**: Alert on metric thresholds
- **User Management**: Role-based analytics access

## Development Workflow (Phase 3)

### Testing Strategy
- **Unit Tests**: Test analytics calculations
- **Integration Tests**: Test API endpoints
- **Performance Tests**: Load testing for large datasets
- **Visual Tests**: Chart rendering validation

### Deployment Strategy
- **Blue-Green**: Zero-downtime deployments
- **Feature Flags**: Gradual rollout of analytics features
- **Monitoring**: Track analytics performance metrics
- **Rollback**: Quick rollback for analytics issues

## Technology Decisions & Rationale

### Chart Library Choice: Recharts
**Pros**:
- Native React integration
- TypeScript support
- Responsive by default
- Good performance with moderate datasets

**Cons**:
- Limited customization vs D3
- Less suitable for very large datasets

**Decision**: Primary choice for standard charts, D3 for custom visualizations

### Database Strategy: PostgreSQL + Materialized Views
**Pros**:
- ACID compliance for analytics accuracy
- Materialized views for performance
- JSON support for flexible metrics
- Time series capabilities

**Cons**:
- More complex than NoSQL for some use cases
- Requires careful index management

**Decision**: Leverage existing PostgreSQL expertise with analytics extensions

### Caching Strategy: Multi-tier with Redis
**Pros**:
- Excellent performance for repeated queries
- Supports complex data structures
- Persistence options available

**Cons**:
- Additional infrastructure complexity
- Cache invalidation complexity

**Decision**: Essential for analytics performance at scale 