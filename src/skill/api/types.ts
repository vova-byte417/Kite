/**
 * Skill API - 类型定义
 *
 * 定义 API 请求/响应的数据结构
 *
 * @author vova
 * @version 1.0.0
 */

import {
  SkillRegistration,
  SkillExecutionRequest,
  SkillExecutionResponse,
  SkillStatus,
  SkillSearchOptions,
  SkillMatchResult,
  RetryStrategy,
} from '../types';

// ==================== 通用响应类型 ====================

/**
 * 标准 API 响应格式
 */
export interface ApiResponse<T = any> {
  /** 请求是否成功 */
  success: boolean;

  /** 响应数据 */
  data?: T;

  /** 错误信息（仅失败时） */
  error?: {
    /** 错误码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 详细错误信息 */
    details?: any;
  };

  /** 响应时间戳 */
  timestamp: number;

  /** 请求追踪 ID */
  requestId?: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页偏移 */
  offset: number;
  /** 每页数量 */
  limit: number;
  /** 是否有更多数据 */
  hasMore: boolean;
}

// ==================== Skill 注册相关 ====================

/**
 * 注册 Skill 请求
 */
export interface RegisterSkillRequest {
  /** Skill 名称 */
  name: string;
  /** Skill 版本（默认 1.0.0） */
  version?: string;
  /** 描述 */
  description?: string;
  /** 入口文件路径 */
  entryPoint: string;
  /** 标签列表 */
  tags?: string[];
  /** 依赖列表 */
  dependencies?: Array<{
    skillId: string;
    minVersion?: string;
    maxVersion?: string;
    optional?: boolean;
  }>;
  /** 配置选项 */
  config?: {
    enabled?: boolean;
    timeout?: number;
    maxRetries?: number;
    retryStrategy?: RetryStrategy;
  };
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 注册 Skill 响应
 */
export interface RegisterSkillResponse {
  /** Skill ID */
  skillId: string;
  /** Skill 名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 状态 */
  status: SkillStatus;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 更新 Skill 请求
 */
export interface UpdateSkillRequest {
  /** 新名称 */
  name?: string;
  /** 新版本 */
  version?: string;
  /** 新描述 */
  description?: string;
  /** 新入口文件 */
  entryPoint?: string;
  /** 新标签列表（覆盖原有） */
  tags?: string[];
  /** 新依赖列表（覆盖原有） */
  dependencies?: Array<{
    skillId: string;
    minVersion?: string;
    maxVersion?: string;
    optional?: boolean;
  }>;
  /** 新配置 */
  config?: Record<string, any>;
  /** 元数据 */
  metadata?: Record<string, any>;
}

// ==================== Skill 执行相关 ====================

/**
 * 执行 Skill 请求
 */
export interface ExecuteSkillRequest {
  /** 输入数据 */
  input: any;
  /** 执行选项 */
  options?: {
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 重试策略 */
    retryStrategy?: RetryStrategy;
    /** 是否在执行前自动加载（默认 true） */
    autoLoad?: boolean;
    /** 是否忽略依赖检查（默认 false） */
    ignoreDependencies?: boolean;
  };
}

/**
 * 批量执行 Skill 请求
 */
export interface BatchExecuteRequest {
  /** 要执行的 Skill 列表 */
  requests: Array<{
    skillId: string;
    version?: string;
    input: any;
    options?: ExecuteSkillRequest['options'];
  }>;
  /** 执行模式 */
  mode: 'parallel' | 'serial' | 'dependency';
  /** 并行数（仅 parallel 模式） */
  maxConcurrency?: number;
  /** 失败时是否继续（仅 dependency 模式） */
  continueOnFailure?: boolean;
}

/**
 * 批量执行响应
 */
export interface BatchExecuteResponse {
  /** 总请求数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 各 Skill 执行结果 */
  results: Array<{
    skillId: string;
    index: number;
  } & SkillExecutionResponse>;
}

// ==================== Skill 查询相关 ====================

/**
 * Skill 详情响应
 */
export interface SkillDetailResponse extends Omit<SkillRegistration, 'loadedAt'> {
  /** 是否已加载 */
  isLoaded: boolean;
  /** 加载时间 */
  loadedAt?: string;
  /** 执行统计 */
  stats?: {
    /** 总执行次数 */
    totalExecutions: number;
    /** 成功次数 */
    successfulExecutions: number;
    /** 成功率 */
    successRate: number;
    /** 平均执行时间 */
    avgDuration: number;
    /** 最后执行时间 */
    lastExecutedAt?: string;
  };
  /** 直接依赖 */
  directDependencies: string[];
  /** 被哪些 Skill 依赖 */
  dependents: string[];
}

/**
 * Skill 列表查询参数
 */
export interface SkillListQuery extends SkillSearchOptions {
  /** 是否只返回已加载的 */
  loadedOnly?: boolean;
  /** 是否包含统计信息 */
  includeStats?: boolean;
}

/**
 * Skill 匹配请求
 */
export interface MatchSkillRequest {
  /** 任务描述 */
  taskDescription: string;
  /** 必需的技能标签 */
  requiredSkills?: string[];
  /** 最多返回数量 */
  limit?: number;
  /** 最低匹配分数 (0-1) */
  minScore?: number;
}

/**
 * Skill 匹配响应
 */
export interface MatchSkillResponse {
  /** 匹配结果数量 */
  count: number;
  /** 匹配结果列表 */
  results: SkillMatchResult[];
}

// ==================== 依赖管理相关 ====================

/**
 * 依赖检查响应
 */
export interface DependencyCheckResponse {
  /** 是否通过 */
  satisfied: boolean;
  /** 缺失的依赖 */
  missing: string[];
  /** 版本不匹配 */
  versionMismatch: Array<{
    skillId: string;
    required: { min?: string; max?: string };
    actual: string;
  }>;
  /** 状态未就绪 */
  notReady: Array<{
    skillId: string;
    currentStatus: SkillStatus;
    requiredStatus: SkillStatus;
  }>;
  /** 循环依赖 */
  cycles: string[][];
}

/**
 * 拓扑排序响应
 */
export interface TopologyResponse {
  /** 是否成功 */
  success: boolean;
  /** 排序后的执行顺序 */
  order?: string[];
  /** 可并行执行的层级 */
  levels?: string[][];
  /** 发现的循环依赖 */
  cycles?: string[][];
}

/**
 * 依赖树响应
 */
export interface DependencyTreeResponse {
  /** 根节点 Skill ID */
  rootId: string;
  /** 根节点名称 */
  rootName: string;
  /** 树深度 */
  depth: number;
  /** 总节点数 */
  totalNodes: number;
  /** 树结构 JSON */
  tree: any;
  /** ASCII 树形字符串 */
  asciiTree: string;
}

/**
 * 添加依赖请求
 */
export interface AddDependencyRequest {
  /** 依赖的 Skill ID */
  dependencyId: string;
  /** 最低版本要求 */
  minVersion?: string;
  /** 最高版本要求 */
  maxVersion?: string;
  /** 是否可选依赖 */
  optional?: boolean;
}

// ==================== 系统管理相关 ====================

/**
 * 系统概览响应
 */
export interface SystemOverviewResponse {
  /** Skill 总数 */
  totalSkills: number;
  /** 已加载 Skill 数 */
  loadedSkills: number;
  /** 就绪 Skill 数 */
  readySkills: number;
  /** 错误状态 Skill 数 */
  errorSkills: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 全局成功率 */
  successRate: number;
  /** 是否在安全模式 */
  isInSafeMode: boolean;
  /** 系统版本 */
  version: string;
  /** 运行时间 */
  uptime: number;
}

/**
 * 系统配置响应
 */
export interface SystemConfigResponse {
  /** 当前配置 */
  config: {
    scanPaths: string[];
    autoScanOnStartup: boolean;
    defaultTimeout: number;
    defaultMaxRetries: number;
    retryStrategy: string;
    strictDependencyMode: boolean;
    enableSandbox: boolean;
  };
}

/**
 * 系统操作请求
 */
export interface SystemActionRequest {
  /** 操作类型 */
  action: 'initialize' | 'reinitialize' | 'refresh' | 'enterSafeMode' | 'exitSafeMode';
}

// ==================== 批量操作相关 ====================

/**
 * 批量操作请求
 */
export interface BulkOperationRequest {
  /** 操作类型 */
  operation: 'register' | 'load' | 'unload' | 'reload' | 'unregister';
  /** Skill ID 列表 */
  skillIds?: string[];
  /** 要注册的 Skill 列表（仅 register 操作） */
  skills?: RegisterSkillRequest[];
}

/**
 * 批量操作响应
 */
export interface BulkOperationResponse {
  /** 总操作数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 各操作结果 */
  results: Array<{
    skillId: string;
    success: boolean;
    error?: string;
  }>;
}

// ==================== 错误码定义 ====================

/**
 * API 错误码
 */
export enum ApiErrorCode {
  // 通用错误
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Skill 相关
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  SKILL_ALREADY_EXISTS = 'SKILL_ALREADY_EXISTS',
  SKILL_NOT_LOADED = 'SKILL_NOT_LOADED',
  SKILL_LOAD_FAILED = 'SKILL_LOAD_FAILED',
  SKILL_EXECUTION_FAILED = 'SKILL_EXECUTION_FAILED',
  SKILL_EXECUTION_TIMEOUT = 'SKILL_EXECUTION_TIMEOUT',
  SKILL_STATUS_ERROR = 'SKILL_STATUS_ERROR',

  // 依赖相关
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  DEPENDENCY_CYCLE = 'DEPENDENCY_CYCLE',
  DEPENDENCY_VERSION_MISMATCH = 'DEPENDENCY_VERSION_MISMATCH',
  DEPENDENCY_NOT_READY = 'DEPENDENCY_NOT_READY',

  // 安全相关
  SAFE_MODE_ACTIVE = 'SAFE_MODE_ACTIVE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}
