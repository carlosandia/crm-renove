# Memory Bank: System Patterns

## Architecture Patterns
- **Frontend**: Component-based architecture with React
- **Backend**: RESTful API with Express
- **Database**: Relational model with Supabase
- **State Management**: React Context + Local State
- **Styling**: Utility-first with Tailwind CSS

## Code Organization
```
src/
├── components/           # UI Components
│   ├── FormBuilder/     # FormBuilder module
│   ├── Pipeline/        # Pipeline management
│   └── Leads/          # Lead management
├── hooks/              # Custom React hooks
├── services/           # API services
├── contexts/           # React contexts
└── utils/             # Utility functions
```

## Design Patterns
- **Module Pattern**: Cada funcionalidade em pasta própria
- **Hook Pattern**: Lógica compartilhada em hooks customizados
- **Context Pattern**: Estado global via React Context
- **Service Pattern**: Camada de serviços para API

## Technology Choices
- **Framework**: React 18 (Latest stable)
- **Build Tool**: Vite (Fast development)
- **UI Library**: Tailwind CSS (Utility-first)
- **State Management**: React Context (Built-in)
- **API Client**: Fetch API (Native)
- **Database**: Supabase (PostgreSQL + Real-time)

## Quality Standards
- TypeScript para type safety
- Componentes modulares e reutilizáveis
- Responsividade mobile-first
- Performance otimizada
- Código limpo e documentado 

## Performance Optimization Patterns (Fase 1)

### 1. Layered Caching Architecture
**Pattern**: Multi-tier caching com Redis
**Implementation**:
```typescript
// Cache Layer Service
class CacheService {
  private redis: Redis;
  private localCache: Map<string, any>;
  
  async get<T>(key: string): Promise<T | null> {
    // L1: Local cache (in-memory)
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }
    
    // L2: Redis cache
    const cached = await this.redis.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      this.localCache.set(key, data);
      return data;
    }
    
    // L3: Database fallback
    return null;
  }
}
```

### 2. Database Index Strategy Pattern
**Pattern**: Composite índices para queries complexas
**Implementation**:
```sql
-- Multi-column índices para queries frequentes
CREATE INDEX CONCURRENTLY idx_leads_performance 
ON leads(tenant_id, status, assigned_to, created_at);

-- Partial índices para condições específicas
CREATE INDEX CONCURRENTLY idx_leads_active 
ON leads(tenant_id, assigned_to) 
WHERE status != 'archived';
```

### 3. Connection Pooling Pattern
**Pattern**: Pool de conexões otimizado
**Implementation**:
```typescript
// Database pool configuration
const poolConfig = {
  min: 2,
  max: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100
};
```

### 4. Cache Invalidation Pattern
**Pattern**: TTL + Event-driven invalidation
**Implementation**:
```typescript
class CacheInvalidationService {
  async invalidatePattern(pattern: string) {
    // Invalidate by pattern
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  async onDataUpdate(entity: string, id: string) {
    // Event-driven invalidation
    await this.invalidatePattern(`${entity}:${id}:*`);
    await this.invalidatePattern(`${entity}:list:*`);
  }
}
```

## Existing Core Patterns

### 1. Multi-Tenant Architecture
**Pattern**: Tenant-based data isolation
**Usage**: Todas as tabelas principais incluem `tenant_id`
**Implementation**: RLS (Row Level Security) + Application-level filtering

### 2. Role-Based Access Control (RBAC)
**Pattern**: Hierarchical role system
**Roles**: Super Admin > Admin > Member
**Implementation**: Context-based component rendering + API middleware

### 3. Real-time Subscriptions
**Pattern**: Supabase real-time para updates instantâneos
**Usage**: Notifications, Pipeline updates, Lead changes
**Implementation**: `useEffect` + `supabase.channel().on()`

### 4. Component Composition
**Pattern**: Composable UI components com shadcn/ui
**Usage**: Card, Button, Input, Dialog components
**Implementation**: Radix UI + Tailwind CSS + Variant API

### 5. Server Actions Pattern
**Pattern**: Next-safe-action para validação
**Usage**: Todas as mutations usam server actions
**Implementation**: Zod validation + ActionResponse type

### 6. Error Boundary Pattern
**Pattern**: Graceful error handling
**Usage**: Componentes críticos com fallbacks
**Implementation**: React Error Boundaries + Toast notifications

### 7. Lazy Loading Pattern
**Pattern**: Dynamic imports para code splitting
**Usage**: Módulos grandes (Pipeline, Reports, etc.)
**Implementation**: `React.lazy()` + `Suspense`

### 8. Cache-First Data Fetching
**Pattern**: TanStack Query para cache management
**Usage**: API calls com cache automático
**Implementation**: Query keys + stale-while-revalidate

## Performance Patterns (New - Fase 1)

### 9. Query Optimization Pattern
**Pattern**: Otimização de queries N+1
**Implementation**:
```typescript
// Batch loading pattern
class BatchLoader {
  private batches = new Map<string, Promise<any[]>>();
  
  async load(keys: string[]) {
    const batchKey = keys.sort().join(',');
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, this.fetchBatch(keys));
    }
    return this.batches.get(batchKey);
  }
}
```

### 10. Monitoring Pattern
**Pattern**: Performance metrics collection
**Implementation**:
```typescript
class PerformanceMonitor {
  static measure(name: string, fn: () => Promise<any>) {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }
}
```

### 11. Circuit Breaker Pattern
**Pattern**: Resilience para external services
**Implementation**:
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Architecture Decisions

### Database Layer
- **PostgreSQL**: Primary database with JSONB for flexible data
- **Redis**: Caching layer for performance
- **Supabase**: Real-time subscriptions + RLS security

### Backend Layer
- **Express.js**: REST API with TypeScript
- **Next-safe-action**: Server actions with validation
- **Zod**: Schema validation throughout

### Frontend Layer
- **React**: Functional components with hooks
- **TypeScript**: Type safety throughout
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library base

### Infrastructure Layer
- **Docker**: Containerization
- **Nginx**: Load balancing + reverse proxy
- **Redis**: In-memory caching
- **Prometheus/Grafana**: Monitoring stack

## Anti-Patterns to Avoid

### Performance Anti-Patterns
❌ **N+1 Query Problem**: Avoid individual queries in loops
❌ **Over-fetching**: Don't load unnecessary data
❌ **Under-indexing**: Missing índices on frequently queried columns
❌ **Cache Stampede**: Multiple processes rebuilding same cache
❌ **Memory Leaks**: Uncleared intervals/subscriptions

### Architecture Anti-Patterns
❌ **God Components**: Components with too many responsibilities
❌ **Prop Drilling**: Passing props through many levels
❌ **Direct Database Access**: Bypass API layer
❌ **Hardcoded Values**: Configuration should be externalized
❌ **Circular Dependencies**: Modules depending on each other

## Pattern Enforcement

### Code Review Checklist
- [ ] Multi-tenant isolation implemented?
- [ ] Role-based access control applied?
- [ ] Error boundaries in place?
- [ ] Performance patterns followed?
- [ ] Cache invalidation strategy defined?
- [ ] Monitoring/logging included?

### Automated Checks
- ESLint rules for pattern enforcement
- TypeScript strict mode
- Bundle size monitoring
- Performance budget alerts
- Security vulnerability scanning 

## Multi-Tenant Architecture
- **Pattern**: Tenant isolation at database level
- **Implementation**: `tenant_id` in all tables with RLS policies
- **Usage**: All queries filtered by authenticated user's tenant
- **Analytics Extension**: Tenant-specific analytics aggregation and dashboards

## Service Layer Pattern
- **Pattern**: Business logic encapsulated in service classes
- **Implementation**: `services/` directory with TypeScript classes
- **Usage**: Controllers delegate to services for business operations
- **Analytics Services**:
  - `AnalyticsService`: Core data processing and aggregation
  - `ReportingService`: Report generation and export
  - `ForecastingService`: ML-based sales predictions
  - `DashboardService`: Real-time metrics and KPIs

## Repository Pattern
- **Pattern**: Data access abstraction layer
- **Implementation**: Supabase client with typed queries
- **Usage**: Services use repositories for data operations
- **Analytics Repositories**:
  - `AnalyticsRepository`: Historical data aggregation
  - `MetricsRepository`: KPI calculations and tracking
  - `ReportRepository`: Custom report data access

## Data Patterns

### Event Sourcing (Partial)
- **Pattern**: Store state changes as events
- **Implementation**: `lead_history`, `pipeline_changes` tables
- **Usage**: Audit trail and analytics data source
- **Analytics Application**: Historical trend analysis and forecasting

### Materialized Views
- **Pattern**: Pre-computed aggregations for performance
- **Implementation**: PostgreSQL materialized views
- **Usage**: Complex analytics queries with fast response times
- **Analytics Views**:
  - `daily_metrics_mv`: Daily KPI aggregations
  - `pipeline_performance_mv`: Pipeline conversion rates
  - `team_performance_mv`: Individual and team metrics

### Time Series Data
- **Pattern**: Time-based data storage for analytics
- **Implementation**: Timestamped analytics snapshots
- **Usage**: Trend analysis and historical reporting
- **Tables**:
  - `analytics_snapshots`: Point-in-time metrics
  - `kpi_tracking`: KPI values over time
  - `conversion_tracking`: Funnel performance tracking

## API Patterns

### RESTful API Design
- **Pattern**: Resource-based URLs with HTTP verbs
- **Implementation**: Express.js routes with proper status codes
- **Usage**: CRUD operations for all entities
- **Analytics Endpoints**:
  - `GET /api/analytics/dashboard` - Dashboard metrics
  - `GET /api/analytics/forecast` - Sales forecasting
  - `GET /api/analytics/funnel` - Conversion funnel
  - `POST /api/reports/generate` - Custom report generation

### Response Standardization
- **Pattern**: Consistent API response structure
- **Implementation**: `{ success, data, message, meta }` format
- **Usage**: All API endpoints return standardized responses
- **Analytics Metadata**: Include query performance and cache status

### Error Handling Pattern
- **Pattern**: Centralized error handling with proper HTTP codes
- **Implementation**: Express error middleware
- **Usage**: Consistent error responses across all endpoints
- **Analytics Errors**: Specialized error types for data processing failures

## Frontend Patterns

### Component Composition
- **Pattern**: Small, reusable components composed into features
- **Implementation**: React components with TypeScript
- **Usage**: Modular UI development with clear boundaries
- **Analytics Components**:
  - `<DashboardCard />`: Reusable metric display
  - `<ChartContainer />`: Wrapper for all chart types
  - `<MetricTrend />`: Trend visualization component
  - `<ExportButton />`: Report export functionality

### Custom Hooks Pattern
- **Pattern**: Reusable stateful logic in custom hooks
- **Implementation**: React hooks with TypeScript
- **Usage**: Share complex state logic between components
- **Analytics Hooks**:
  - `useAnalytics()`: Dashboard data fetching and caching
  - `useReporting()`: Report generation and status
  - `useForecasting()`: Sales prediction data
  - `useRealTimeMetrics()`: WebSocket-based live updates

### State Management
- **Pattern**: Local state with React hooks, global with Context
- **Implementation**: useState, useReducer, useContext
- **Usage**: Component state and shared application state
- **Analytics State**: Dashboard configurations and user preferences

## Performance Patterns

### Caching Strategy (Multi-Tier)
- **Pattern**: L1 (Memory) + L2 (Redis) caching
- **Implementation**: Cache service with TTL strategies
- **Usage**: Reduce database load and improve response times
- **Analytics Caching**:
  - **Short TTL (60s)**: Real-time metrics
  - **Medium TTL (5min)**: Dashboard aggregations
  - **Long TTL (30min)**: Historical reports

### Query Optimization
- **Pattern**: Optimized database queries with proper indexing
- **Implementation**: Composite indexes on frequently queried columns
- **Usage**: Fast data retrieval for analytics workloads
- **Analytics Indexes**:
  - `(tenant_id, date, metric_type)` - Time series queries
  - `(tenant_id, pipeline_stage, created_at)` - Funnel analysis
  - `(tenant_id, user_id, activity_date)` - Performance tracking

### Lazy Loading
- **Pattern**: Load data only when needed
- **Implementation**: React.lazy and Suspense
- **Usage**: Improve initial page load times
- **Analytics Application**: Chart components loaded on demand

## Security Patterns

### Row Level Security (RLS)
- **Pattern**: Database-level access control
- **Implementation**: PostgreSQL RLS policies
- **Usage**: Automatic tenant isolation
- **Analytics Security**: Sensitive metrics protected by role-based policies

### Role-Based Access Control (RBAC)
- **Pattern**: Permission-based feature access
- **Implementation**: User roles and permissions system
- **Usage**: Control access to sensitive features
- **Analytics RBAC**:
  - **Admin**: Full analytics access and configuration
  - **Manager**: Team performance and departmental reports
  - **Sales**: Individual metrics and pipeline data
  - **Viewer**: Read-only dashboard access

### Data Anonymization
- **Pattern**: Protect sensitive data in analytics
- **Implementation**: Data masking for non-privileged users
- **Usage**: Compliance with privacy regulations
- **Analytics Application**: PII masking in exported reports

## Integration Patterns

### Webhook Pattern
- **Pattern**: Event-driven integrations
- **Implementation**: HTTP callbacks for external systems
- **Usage**: Real-time data synchronization
- **Analytics Webhooks**: Trigger external reporting systems

### API Gateway Pattern
- **Pattern**: Single entry point for all API requests
- **Implementation**: Express.js with middleware
- **Usage**: Authentication, logging, rate limiting
- **Analytics Gateway**: Specialized middleware for analytics requests

### Event Bus Pattern
- **Pattern**: Decoupled communication between services
- **Implementation**: Internal event system
- **Usage**: Service-to-service communication
- **Analytics Events**: Data change notifications for real-time updates

## Analytics-Specific Patterns

### Data Aggregation Pattern
- **Pattern**: Pre-compute common aggregations
- **Implementation**: Scheduled jobs and materialized views
- **Usage**: Fast dashboard loading and reporting
- **Aggregations**:
  - Daily/Weekly/Monthly metrics rollups
  - Pipeline conversion calculations
  - Team performance summaries

### Real-Time Analytics Pattern
- **Pattern**: Live data updates without page refresh
- **Implementation**: WebSocket connections
- **Usage**: Live dashboards and notifications
- **Components**: Real-time metric updates and alerts

### Forecasting Pattern
- **Pattern**: Predictive analytics based on historical data
- **Implementation**: Statistical models and ML algorithms
- **Usage**: Sales forecasting and trend prediction
- **Models**: Linear regression, moving averages, seasonal adjustments

### Export Pattern
- **Pattern**: Multiple format data export capabilities
- **Implementation**: Server-side report generation
- **Usage**: Business reporting and data sharing
- **Formats**: PDF, Excel, CSV with templating support

## Error Patterns

### Graceful Degradation
- **Pattern**: System continues functioning with reduced features
- **Implementation**: Fallback mechanisms for failed services
- **Usage**: Maintain availability during partial failures
- **Analytics Degradation**: Show cached data when real-time fails

### Circuit Breaker Pattern
- **Pattern**: Prevent cascading failures
- **Implementation**: Monitor service health and break circuit
- **Usage**: Protect system from failing dependencies
- **Analytics Application**: Protect dashboard from slow queries

## Testing Patterns

### Test Data Factories
- **Pattern**: Generate realistic test data
- **Implementation**: Factory functions for test entities
- **Usage**: Consistent test data across test suites
- **Analytics Factories**: Generate time series data for testing

### Mock Service Pattern
- **Pattern**: Mock external dependencies in tests
- **Implementation**: Jest mocks and test doubles
- **Usage**: Isolated unit testing
- **Analytics Mocks**: Mock chart libraries and export services

## Deployment Patterns

### Blue-Green Deployment
- **Pattern**: Zero-downtime deployments
- **Implementation**: Docker containers with load balancer
- **Usage**: Safe production deployments
- **Analytics Consideration**: Maintain analytics data consistency

### Configuration Management
- **Pattern**: Environment-specific configurations
- **Implementation**: Environment variables and config files
- **Usage**: Different settings per environment
- **Analytics Config**: Chart settings, export limits, cache TTLs 