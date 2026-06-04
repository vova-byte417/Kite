/**
 * Skill 管理模块类型定义
 */

// Skill 基础接口
export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  entryPoint: string; // 执行入口
  supportedModels: string[];
  requirements: Record<string, any>;
}

// Skill 状态枚举
export enum SkillStatus {
  REGISTERED = 'registered',    // 已注册
  LOADING = 'loading',          // 加载中
  READY = 'ready',              // 就绪
  ERROR = 'error',              // 错误
  DISABLED = 'disabled',        // 已禁用
  DEPRECATED = 'deprecated'     // 已废弃
}

// Skill 执行状态
export enum SkillExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// Skill 元数据扩展
export interface SkillMetadata {
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  documentation?: string;
  examples?: SkillExample[];
  category?: string;
  icon?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  license?: string;
  repository?: string;
}

// Skill 示例
export interface SkillExample {
  description: string;
  input: any;
  output: any;
}

// Skill 依赖
export interface SkillDependency {
  skillId: string;
  minVersion?: string;
  maxVersion?: string;
  optional?: boolean;
}

// Skill 配置
export interface SkillConfig {
  enabled?: boolean;
  timeout?: number;
  maxRetries?: number;
  concurrency?: number;
  parameters?: Record<string, any>;
  envVars?: Record<string, string>;
}

// Skill 注册信息
export interface SkillRegistration extends Skill {
  status: SkillStatus;
  metadata: SkillMetadata;
  dependencies: SkillDependency[];
  config: SkillConfig;
  registeredAt: Date;
  loadedAt?: Date;
  error?: string;
  path?: string;
}

// Skill 执行请求
export interface SkillExecutionRequest {
  skillId: string;
  skill?: SkillRegistration;
  skillModule?: any;
  version?: string;
  input: any;
  context?: ExecutionContext;
  options?: ExecutionOptions;
}

// Skill 执行响应
export interface SkillExecutionResponse {
  success: boolean;
  requestId?: string;
  skillId: string;
  version: string;
  status: SkillExecutionStatus;
  result?: any;
  error?: string;
  errorCode?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // 毫秒
  retries: number;
}

// 执行上下文
export interface ExecutionContext {
  agentId?: string;
  taskId?: string;
  userId?: string;
  sessionId?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

// 执行选项
export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validateInput?: boolean;
  validateOutput?: boolean;
  sandbox?: boolean;
  async?: boolean;
  callbackUrl?: string;
}

// Skill 搜索选项
export interface SkillSearchOptions {
  query?: string;
  tags?: string[];
  category?: string;
  status?: SkillStatus[];
  supportedModel?: string;
  minVersion?: string;
  maxVersion?: string;
  author?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'version' | 'createdAt' | 'updatedAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// Skill 匹配结果
export interface SkillMatchResult {
  skill: SkillRegistration;
  score: number; // 0-1 匹配度
  matchedFields: string[];
  explanation?: string;
}

// Skill 加载结果
export interface SkillLoadResult {
  success: boolean;
  skillId: string;
  message?: string;
  error?: string;
  loadTime?: number;
}

// Skill 验证结果
export interface SkillValidationResult {
  valid: boolean;
  skillId: string;
  errors: string[];
  warnings: string[];
}

// Skill 执行统计
export interface SkillExecutionStats {
  skillId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutedAt?: Date;
  successRate: number;
}

// Skill 注册表配置
export interface SkillRegistryConfig {
  scanPaths: string[];
  autoDiscover: boolean;
  autoReload: boolean;
  reloadInterval: number; // 毫秒
  allowedExtensions: string[];
  maxSkillSize: number; // 字节
  enableSandbox: boolean;
  defaultTimeout: number;
  defaultMaxRetries: number;
}

// Skill 包格式（用于导入）
export interface SkillPackage {
  manifest: Skill;
  metadata?: SkillMetadata;
  dependencies?: SkillDependency[];
  config?: SkillConfig;
  code: string;
  assets?: Record<string, string>;
}

// Skill 事件类型
export enum SkillEventType {
  REGISTERED = 'skill.registered',
  LOADED = 'skill.loaded',
  UNLOADED = 'skill.unloaded',
  DISABLED = 'skill.disabled',
  ENABLED = 'skill.enabled',
  EXECUTION_STARTED = 'skill.execution.started',
  EXECUTION_COMPLETED = 'skill.execution.completed',
  EXECUTION_FAILED = 'skill.execution.failed',
  DEPENDENCY_MISSING = 'skill.dependency.missing',
  DEPENDENCY_RESOLVED = 'skill.dependency.resolved'
}

// Skill 事件
export interface SkillEvent {
  type: SkillEventType;
  skillId: string;
  timestamp: Date;
  payload?: any;
}

/**
 * Skill 导出接口 - 所有 Skill 必须实现
 */
export interface SkillExport {
  execute: (input: any, context?: ExecutionContext) => Promise<any>;
  validateInput?: (input: any) => Promise<boolean>;
  validateOutput?: (output: any) => Promise<boolean>;
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
}

/**
 * 重试策略类型
 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear';
