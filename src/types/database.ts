/**
 * Database Optimization Types for AstralCore Mental Health Platform
 * 
 * This file defines TypeScript types and interfaces for the database optimization
 * system, including performance monitoring, query optimization, and maintenance services.
 */

// ===============================================================================
// QUERY OPTIMIZATION TYPES
// ===============================================================================

export interface QueryMetrics {
  queryId: string;
  queryHash: string;
  sqlQuery: string;
  model?: string;
  action?: string;
  executionTime: number;
  timestamp: Date;
  parameters?: any[];
  rowsReturned?: number;
  userId?: string;
  ipAddress?: string;
  isSlowQuery: boolean;
  planAnalysis?: QueryPlanAnalysis;
  cacheHit?: boolean;
  connectionPoolStats?: ConnectionStats;
}

export interface QueryPlanAnalysis {
  totalCost: number;
  actualTime?: number;
  planningTime?: number;
  executionTime?: number;
  bufferHits?: number;
  bufferMisses?: number;
  bufferReads?: number;
  indexScans: number;
  sequentialScans: number;
  nestedLoops: number;
  hashJoins: number;
  sortOperations: number;
  recommendations: QueryOptimizationRecommendation[];
  planJson?: any;
}

export interface QueryOptimizationRecommendation {
  id: string;
  type: OptimizationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  query: string;
  suggestedSolution: string;
  estimatedImprovement: string;
  implementationComplexity: ImplementationComplexity;
  estimatedEffort: string;
  dependencies?: string[];
  sqlCommands?: string[];
}

export type OptimizationType = 
  | 'INDEX_CREATION'
  | 'INDEX_REMOVAL'
  | 'QUERY_REWRITE'
  | 'CACHING'
  | 'PARTITIONING'
  | 'STATISTICS_UPDATE'
  | 'VACUUM'
  | 'CONNECTION_POOLING';

export type RecommendationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ImplementationComplexity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

// ===============================================================================
// CONNECTION POOL TYPES
// ===============================================================================

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  createTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  maxUses: number;
  validateFunction?: (connection: any) => Promise<boolean>;
  afterCreate?: (connection: any) => Promise<void>;
  beforeDestroy?: (connection: any) => Promise<void>;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  maxConnections: number;
  connectionErrors: number;
  averageWaitTime: number;
  peakConnections: number;
  connectionsCreated: number;
  connectionsDestroyed: number;
  lastResetTime: Date;
}

export interface ConnectionHealthMetrics {
  poolUtilization: number; // Percentage
  averageConnectionAge: number; // Milliseconds
  connectionTurnoverRate: number; // Connections per minute
  errorRate: number; // Percentage
  leakDetection: {
    suspiciousConnections: number;
    longRunningConnections: number;
    zombieConnections: number;
  };
}

// ===============================================================================
// PERFORMANCE MONITORING TYPES
// ===============================================================================

export interface DatabasePerformanceMetrics {
  timestamp: Date;
  databaseSize: number; // Bytes
  tableCount: number;
  indexCount: number;
  connectionMetrics: ConnectionStats;
  cacheMetrics: CachePerformanceMetrics;
  transactionMetrics: TransactionMetrics;
  queryMetrics: AggregatedQueryMetrics;
  diskIOMetrics: DiskIOMetrics;
  systemResourceUsage: SystemResourceMetrics;
}

export interface CachePerformanceMetrics {
  bufferCacheHitRatio: number; // Percentage
  bufferCacheSize: number; // Bytes
  sharedBufferHits: number;
  sharedBufferReads: number;
  diskReads: number;
  queryPlanCacheHitRatio?: number;
  resultSetCacheHitRatio?: number;
}

export interface TransactionMetrics {
  totalTransactions: number;
  commitRate: number;
  rollbackRate: number;
  averageTransactionTime: number; // Milliseconds
  longTransactions: number; // Count of transactions > 5 minutes
  deadlocks: number;
  transactionsPerSecond: number;
}

export interface AggregatedQueryMetrics {
  totalQueries: number;
  slowQueries: number; // Queries > threshold
  averageQueryTime: number; // Milliseconds
  queryDistribution: QueryTypeDistribution;
  topSlowQueries: SlowQueryInfo[];
  indexUsageStats: IndexUsageStatistics[];
}

export interface QueryTypeDistribution {
  select: number;
  insert: number;
  update: number;
  delete: number;
  ddl: number; // Data Definition Language
  utility: number; // VACUUM, ANALYZE, etc.
}

export interface SlowQueryInfo {
  queryHash: string;
  query: string;
  averageTime: number;
  callCount: number;
  totalTime: number;
  worstTime: number;
  lastSeen: Date;
  affectedTables: string[];
  recommendedOptimizations: string[];
}

export interface DiskIOMetrics {
  readOperationsPerSecond: number;
  writeOperationsPerSecond: number;
  readBytesPerSecond: number;
  writeBytesPerSecond: number;
  averageReadLatency: number; // Milliseconds
  averageWriteLatency: number; // Milliseconds
  diskUtilization: number; // Percentage
}

export interface SystemResourceMetrics {
  cpuUsage: number; // Percentage
  memoryUsage: number; // Percentage
  memoryTotal: number; // Bytes
  memoryAvailable: number; // Bytes
  diskSpaceUsed: number; // Bytes
  diskSpaceTotal: number; // Bytes
  loadAverage?: number[];
  networkIO?: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
}

// ===============================================================================
// INDEX MANAGEMENT TYPES
// ===============================================================================

export interface IndexAnalysis {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexType: IndexType;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  sizeBytes: number;
  usageStatistics: IndexUsageStatistics;
  maintenanceInfo: IndexMaintenanceInfo;
  recommendation: IndexRecommendation;
}

export interface IndexUsageStatistics {
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  usageRatio: number; // tuplesFetched / tuplesRead
  lastUsed?: Date;
  avgSelectivity: number; // How selective the index is
  correlationCoefficient?: number; // Physical vs logical ordering
}

export interface IndexMaintenanceInfo {
  lastVacuum?: Date;
  lastReindex?: Date;
  bloatEstimate: number; // Percentage
  fragmentationLevel: number; // Percentage
  needsRebuild: boolean;
  rebuildRecommendedReason?: string;
}

export interface IndexRecommendation {
  action: IndexAction;
  priority: RecommendationSeverity;
  reason: string;
  estimatedSpaceSavings?: number; // Bytes
  estimatedPerformanceGain?: number; // Percentage
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  implementationSteps: string[];
}

export type IndexType = 
  | 'btree' 
  | 'hash' 
  | 'gin' 
  | 'gist' 
  | 'spgist' 
  | 'brin' 
  | 'bloom';

export type IndexAction = 
  | 'KEEP' 
  | 'DROP' 
  | 'REBUILD' 
  | 'OPTIMIZE' 
  | 'CREATE_COVERING' 
  | 'MERGE_WITH_OTHER' 
  | 'SPLIT';

// ===============================================================================
// TABLE MAINTENANCE TYPES
// ===============================================================================

export interface TableMaintenanceInfo {
  schemaName: string;
  tableName: string;
  tableSize: number; // Bytes
  indexSize: number; // Bytes
  rowCount: number;
  deadTupleCount: number;
  liveTupleCount: number;
  bloatInfo: TableBloatInfo;
  vacuumInfo: VacuumInfo;
  partitionInfo?: PartitionInfo;
  maintenanceSchedule: MaintenanceSchedule;
}

export interface TableBloatInfo {
  bloatBytes: number;
  bloatRatio: number; // Percentage
  estimatedOptimalSize: number; // Bytes
  severity: BloatSeverity;
  cause: BloatCause[];
  recommendedAction: BloatRecommendation;
}

export interface VacuumInfo {
  lastAutoVacuum?: Date;
  lastManualVacuum?: Date;
  autoVacuumCount: number;
  manualVacuumCount: number;
  lastAnalyze?: Date;
  needsVacuum: boolean;
  needsAnalyze: boolean;
  estimatedVacuumTime: number; // Minutes
  vacuumThreshold: number;
  analyzeThreshold: number;
}

export interface PartitionInfo {
  isPartitioned: boolean;
  partitionType?: 'RANGE' | 'LIST' | 'HASH';
  partitionKey?: string;
  partitionCount: number;
  partitions: PartitionDetails[];
  nextPartitionNeeded?: Date;
  oldPartitionsToRemove: string[];
}

export interface PartitionDetails {
  partitionName: string;
  partitionBounds: string;
  rowCount: number;
  sizeBytes: number;
  lastAccessed?: Date;
  shouldArchive: boolean;
}

export interface MaintenanceSchedule {
  vacuumSchedule: CronExpression;
  analyzeSchedule: CronExpression;
  reindexSchedule?: CronExpression;
  archivalSchedule?: CronExpression;
  lastMaintenanceRun?: Date;
  nextScheduledMaintenance: Date;
  maintenanceWindow?: MaintenanceWindow;
}

export type BloatSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BloatCause = 
  | 'FREQUENT_UPDATES' 
  | 'FREQUENT_DELETES' 
  | 'LONG_TRANSACTIONS' 
  | 'VACUUM_FAILURE' 
  | 'BULK_OPERATIONS';

export type BloatRecommendation = 
  | 'MONITOR' 
  | 'VACUUM' 
  | 'VACUUM_FULL' 
  | 'REINDEX' 
  | 'PARTITION' 
  | 'ARCHIVE_OLD_DATA';

export type CronExpression = string; // e.g., "0 2 * * *"

export interface MaintenanceWindow {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  allowEmergencyMaintenance: boolean;
}

// ===============================================================================
// ARCHIVAL AND COMPLIANCE TYPES
// ===============================================================================

export interface DataArchivalPolicy {
  id: string;
  tableName: string;
  retentionPeriod: RetentionPeriod;
  archivalMethod: ArchivalMethod;
  compressionEnabled: boolean;
  encryptionRequired: boolean;
  complianceRequirements: ComplianceRequirement[];
  triggers: ArchivalTrigger[];
  notifications: NotificationConfig[];
  lastRun?: Date;
  nextRun: Date;
}

export interface RetentionPeriod {
  value: number;
  unit: 'DAYS' | 'MONTHS' | 'YEARS';
  extendedRetentionConditions?: ExtendedRetentionCondition[];
}

export interface ExtendedRetentionCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS';
  value: any;
  extendBy: RetentionPeriod;
  reason: string;
}

export type ArchivalMethod = 
  | 'SOFT_DELETE' 
  | 'MOVE_TO_ARCHIVE_TABLE' 
  | 'EXPORT_TO_FILE' 
  | 'HARD_DELETE';

export interface ComplianceRequirement {
  regulation: 'HIPAA' | 'GDPR' | 'CCPA' | 'SOX' | 'PCI_DSS';
  retentionMinimum?: RetentionPeriod;
  retentionMaximum?: RetentionPeriod;
  auditTrailRequired: boolean;
  encryptionRequired: boolean;
  accessLoggingRequired: boolean;
  dataSubjectRights?: DataSubjectRight[];
}

export type DataSubjectRight = 
  | 'RIGHT_TO_ACCESS' 
  | 'RIGHT_TO_RECTIFICATION' 
  | 'RIGHT_TO_ERASURE' 
  | 'RIGHT_TO_PORTABILITY' 
  | 'RIGHT_TO_RESTRICT_PROCESSING';

export interface ArchivalTrigger {
  type: 'SCHEDULED' | 'SIZE_BASED' | 'EVENT_BASED' | 'MANUAL';
  configuration: ArchivalTriggerConfig;
}

export interface ArchivalTriggerConfig {
  schedule?: CronExpression;
  sizeThresholdBytes?: number;
  eventType?: string;
  customLogic?: string; // SQL or function reference
}

export interface NotificationConfig {
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';
  recipients: string[];
  events: NotificationEvent[];
  template?: string;
}

export type NotificationEvent = 
  | 'ARCHIVAL_STARTED' 
  | 'ARCHIVAL_COMPLETED' 
  | 'ARCHIVAL_FAILED' 
  | 'RETENTION_VIOLATION' 
  | 'COMPLIANCE_ALERT';

// ===============================================================================
// MONITORING AND ALERTING TYPES
// ===============================================================================

export interface DatabaseAlert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  threshold: AlertThreshold;
  currentValue: any;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  affectedResources: string[];
  recommendedActions: string[];
  escalationPolicy?: EscalationPolicy;
}

export type AlertType = 
  | 'PERFORMANCE' 
  | 'AVAILABILITY' 
  | 'SECURITY' 
  | 'COMPLIANCE' 
  | 'CAPACITY' 
  | 'ERROR_RATE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface AlertThreshold {
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS' | 'BETWEEN';
  value: number | string;
  secondaryValue?: number | string; // For BETWEEN operator
  duration?: number; // Milliseconds - how long condition must persist
  evaluationWindow?: number; // Milliseconds - time window for evaluation
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  maxEscalationLevel: number;
  autoResolve: boolean;
  autoResolveAfterMinutes?: number;
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  notificationChannels: string[];
  recipients: string[];
  actions?: EscalationAction[];
}

export interface EscalationAction {
  type: 'EMAIL' | 'SMS' | 'CALL' | 'WEBHOOK' | 'TICKET' | 'RUNBOOK';
  configuration: any;
}

// ===============================================================================
// REPORTING TYPES
// ===============================================================================

export interface DatabasePerformanceReport {
  id: string;
  reportType: ReportType;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: any[];
  metadata: ReportMetadata;
}

export type ReportType = 
  | 'DAILY_PERFORMANCE' 
  | 'WEEKLY_SUMMARY' 
  | 'MONTHLY_ANALYSIS' 
  | 'QUARTERLY_REVIEW' 
  | 'INCIDENT_REPORT' 
  | 'CAPACITY_PLANNING';

export interface ReportSummary {
  overallHealth: HealthStatus;
  keyMetrics: KeyMetric[];
  trendsIdentified: Trend[];
  criticalIssues: Issue[];
  improvementsImplemented: Improvement[];
}

export interface ReportSection {
  title: string;
  content: ReportContent[];
  charts?: ChartData[];
  tables?: TableData[];
  insights: string[];
}

export interface ReportContent {
  type: 'TEXT' | 'METRIC' | 'CHART' | 'TABLE' | 'LIST';
  data: any;
  formatting?: ContentFormatting;
}

export interface KeyMetric {
  name: string;
  value: number | string;
  unit?: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage?: number;
  status: HealthStatus;
  benchmark?: number | string;
}

export interface Trend {
  metric: string;
  direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  duration: string;
  significance: number; // 0-1 scale
}

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  impact: string;
  recommendedActions: string[];
  estimatedResolutionTime?: string;
}

export interface Improvement {
  description: string;
  implementedAt: Date;
  measuredImpact?: string;
  performanceGain?: number; // Percentage
  costSavings?: number;
}

export type HealthStatus = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
export type IssueCategory = 
  | 'PERFORMANCE' 
  | 'CAPACITY' 
  | 'RELIABILITY' 
  | 'SECURITY' 
  | 'COMPLIANCE';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChartData {
  type: 'LINE' | 'BAR' | 'PIE' | 'SCATTER' | 'AREA';
  title: string;
  data: any[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
}

export interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
  sorting?: SortingConfig;
  pagination?: PaginationConfig;
}

export interface AxisConfig {
  label: string;
  type: 'CATEGORY' | 'VALUE' | 'TIME';
  format?: string;
}

export interface SeriesConfig {
  name: string;
  color?: string;
  type?: string;
}

export interface ContentFormatting {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface SortingConfig {
  column: string;
  direction: 'ASC' | 'DESC';
  sortable: boolean;
}

export interface PaginationConfig {
  pageSize: number;
  showPagination: boolean;
  showPageSizeOptions: boolean;
}

export interface ReportMetadata {
  generatedBy: string;
  version: string;
  dataSource: string;
  processingTime: number; // Milliseconds
  recordCount: number;
  filters?: ReportFilter[];
  exportFormats: string[];
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: any;
  label: string;
}

// ===============================================================================
// CONFIGURATION TYPES
// ===============================================================================

export interface DatabaseOptimizationConfig {
  queryOptimization: QueryOptimizationConfig;
  indexManagement: IndexManagementConfig;
  connectionPooling: ConnectionPoolingConfig;
  maintenance: MaintenanceConfig;
  monitoring: MonitoringConfig;
  archival: ArchivalConfig;
  compliance: ComplianceConfig;
}

export interface QueryOptimizationConfig {
  enabled: boolean;
  slowQueryThresholdMs: number;
  caching: QueryCachingConfig;
  monitoring: QueryMonitoringConfig;
  optimization: QueryOptimizationSettings;
}

export interface QueryCachingConfig {
  enabled: boolean;
  defaultTtlSeconds: number;
  maxMemoryMb: number;
  cacheStrategies: CacheStrategy[];
}

export interface CacheStrategy {
  pattern: string; // Regex or glob pattern
  ttlSeconds: number;
  compressionEnabled: boolean;
  invalidationTriggers: string[];
}

export interface QueryMonitoringConfig {
  trackAllQueries: boolean;
  sampleRate: number; // 0-1
  retentionDays: number;
  enablePlanAnalysis: boolean;
  exportMetrics: boolean;
}

export interface QueryOptimizationSettings {
  autoOptimization: boolean;
  suggestionThresholds: OptimizationThresholds;
  approvalRequired: boolean;
  testingRequired: boolean;
}

export interface OptimizationThresholds {
  minCallCount: number;
  minDuration: number; // Milliseconds
  minImpactPercentage: number;
  maxRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IndexManagementConfig {
  enabled: boolean;
  autoCreation: boolean;
  autoRemoval: boolean;
  maintenanceSchedule: CronExpression;
  analysisSettings: IndexAnalysisSettings;
}

export interface IndexAnalysisSettings {
  usageThreshold: number; // Minimum scans to keep index
  sizeThresholdMb: number; // Minimum size to analyze
  bloatThreshold: number; // Percentage
  rebuildThreshold: number; // Percentage fragmentation
}

export interface ConnectionPoolingConfig {
  enabled: boolean;
  pools: Record<string, ConnectionPoolConfig>;
  healthChecks: HealthCheckConfig;
  monitoring: ConnectionMonitoringConfig;
}

export interface HealthCheckConfig {
  enabled: boolean;
  intervalSeconds: number;
  timeoutMs: number;
  query: string;
  failureThreshold: number;
}

export interface ConnectionMonitoringConfig {
  trackConnections: boolean;
  alertOnLeaks: boolean;
  leakDetectionThreshold: number; // Seconds
  metricsRetentionDays: number;
}

export interface MaintenanceConfig {
  enabled: boolean;
  maintenanceWindows: MaintenanceWindow[];
  jobs: Record<string, MaintenanceJobConfig>;
  notifications: MaintenanceNotificationConfig;
}

export interface MaintenanceJobConfig {
  enabled: boolean;
  schedule: CronExpression;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeoutMinutes: number;
  retryCount: number;
  dependencies?: string[];
  requiresMaintenanceWindow: boolean;
}

export interface MaintenanceNotificationConfig {
  onStart: NotificationConfig[];
  onComplete: NotificationConfig[];
  onFailure: NotificationConfig[];
  onWarning: NotificationConfig[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsCollection: MetricsCollectionConfig;
  alerting: AlertingConfig;
  reporting: ReportingConfig;
}

export interface MetricsCollectionConfig {
  intervalSeconds: number;
  retentionDays: number;
  detailedMetrics: boolean;
  customMetrics: CustomMetricConfig[];
}

export interface CustomMetricConfig {
  name: string;
  query: string;
  schedule: CronExpression;
  thresholds?: AlertThreshold[];
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannelConfig[];
  rules: AlertRuleConfig[];
  escalation: EscalationPolicyConfig;
}

export interface AlertChannelConfig {
  id: string;
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';
  configuration: any;
  enabled: boolean;
}

export interface AlertRuleConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: AlertThreshold;
  severity: AlertSeverity;
  channels: string[];
  enabled: boolean;
}

export interface EscalationPolicyConfig {
  enabled: boolean;
  defaultPolicy: string;
  policies: Record<string, EscalationPolicy>;
}

export interface ReportingConfig {
  enabled: boolean;
  schedules: ReportScheduleConfig[];
  distribution: ReportDistributionConfig[];
  retention: ReportRetentionConfig;
}

export interface ReportScheduleConfig {
  id: string;
  reportType: ReportType;
  schedule: CronExpression;
  enabled: boolean;
  parameters?: any;
}

export interface ReportDistributionConfig {
  reportType: ReportType;
  channels: string[];
  format: 'PDF' | 'HTML' | 'JSON' | 'CSV';
  recipients: string[];
}

export interface ReportRetentionConfig {
  retentionDays: number;
  compressionEnabled: boolean;
  archiveLocation?: string;
}

export interface ArchivalConfig {
  enabled: boolean;
  policies: DataArchivalPolicy[];
  defaultRetention: RetentionPeriod;
  compliance: ComplianceConfig;
}

export interface ComplianceConfig {
  regulations: ComplianceRequirement[];
  auditLogging: AuditLoggingConfig;
  dataClassification: DataClassificationConfig;
  accessControl: AccessControlConfig;
}

export interface AuditLoggingConfig {
  enabled: boolean;
  logAllAccess: boolean;
  logSensitiveOperations: boolean;
  retentionPeriod: RetentionPeriod;
  encryptionEnabled: boolean;
  integrityChecking: boolean;
}

export interface DataClassificationConfig {
  enabled: boolean;
  classifications: DataClassification[];
  defaultClassification: string;
  autoClassification: boolean;
}

export interface DataClassification {
  level: string;
  description: string;
  handlingRequirements: string[];
  retentionRequirements: RetentionPeriod;
  accessRestrictions: string[];
}

export interface AccessControlConfig {
  enabled: boolean;
  defaultDenyAll: boolean;
  roleBasedAccess: boolean;
  timeBasedAccess: boolean;
  locationBasedAccess: boolean;
  auditFailedAccess: boolean;
}

// ===============================================================================
// UTILITY TYPES
// ===============================================================================

export interface DatabaseError extends Error {
  code?: string;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}

export interface AsyncJobResult<T = any> {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt?: Date;
  completedAt?: Date;
  progress?: number; // 0-100
  result?: T;
  error?: DatabaseError;
  logs?: string[];
}

export interface BatchOperation<T = any> {
  operations: T[];
  batchSize: number;
  maxConcurrency: number;
  continueOnError: boolean;
  progressCallback?: (completed: number, total: number) => void;
}

export interface TransactionContext {
  transactionId: string;
  isolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly: boolean;
  timeout?: number; // Milliseconds
  retryCount: number;
  rollbackReasons?: string[];
}

// ===============================================================================
// EXPORT ALL TYPES
// ===============================================================================

// Re-exports commented out to avoid duplicate type errors
// TODO: Resolve duplicate type definitions across modules
// export * from './wellness';
// export * from './crisis';
// export * from './admin';