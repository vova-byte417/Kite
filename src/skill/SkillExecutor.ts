/**
 * Skill 执行器 - 负责 Skill 的执行控制、重试机制、超时管理和统计
 *
 * 核心功能：
 * - 超时控制：防止无限执行
 * - 重试机制：自动重试失败的执行
 * - 执行统计：记录执行次数、成功率、耗时等
 * - 错误处理：统一的错误封装和处理
 * - 批量执行：支持并行/串行批量执行
 * - 输入输出验证：执行前后的数据验证
 *
 * @author vova
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

// 导入类型定义
import {
  SkillExecutionRequest,
  SkillExecutionResponse,
  SkillExecutionStatus,
  SkillLoadResult,
} from './types';

// ==================== 类型定义 ====================

/**
 * 重试策略类型
 */
export type RetryStrategy = 'fixed' | 'exponential' | 'linear';

/**
 * SkillExecutor 配置选项
 */
export interface SkillExecutorConfig {
  /** 默认超时时间（毫秒） */
  defaultTimeout: number;

  /** 默认最大重试次数 */
  defaultMaxRetries: number;

  /** 重试策略 */
  retryStrategy: RetryStrategy;

  /** 基础重试延迟（毫秒） */
  retryDelayBase: number;

  /** 最大重试延迟（毫秒） */
  maxRetryDelay: number;

  /** 是否启用输入验证 */
  enableInputValidation: boolean;

  /** 是否启用输出验证 */
  enableOutputValidation: boolean;

  /** 是否记录执行统计 */
  enableExecutionStats: boolean;

  /** 统计保留天数 */
  statsRetentionDays: number;
}

/**
 * 执行统计信息
 */
export interface ExecutionStats {
  /** 总执行次数 */
  totalExecutions: number;

  /** 成功次数 */
  successfulExecutions: number;

  /** 失败次数 */
  failedExecutions: number;

  /** 总重试次数 */
  totalRetries: number;

  /** 总执行时间（毫秒） */
  totalDuration: number;

  /** 平均执行时间（毫秒） */
  averageDuration: number;

  /** 最短执行时间（毫秒） */
  minDuration: number;

  /** 最长执行时间（毫秒） */
  maxDuration: number;

  /** 成功率（0-1） */
  successRate: number;

  /** 最后执行时间 */
  lastExecutedAt?: Date;

  /** 最后成功时间 */
  lastSuccessAt?: Date;

  /** 最后失败时间 */
  lastFailedAt?: Date;

  /** 最后错误信息 */
  lastError?: string;
}

/**
 * Skill 统计信息
 */
export interface SkillStats extends ExecutionStats {
  /** Skill ID */
  skillId: string;

  /** 按错误类型统计 */
  errorByType: Record<string, number>;
}

/**
 * 全局执行统计
 */
export interface GlobalExecutionStats {
  /** 总统计 */
  total: ExecutionStats;

  /** 各 Skill 统计 */
  bySkill: Record<string, SkillStats>;

  /** 按状态统计 */
  byStatus: Record<SkillExecutionStatus, number>;
}

/**
 * 执行钩子函数
 */
export interface ExecutionHooks {
  /** 执行前钩子 */
  beforeExecute?: (request: SkillExecutionRequest) => Promise<void> | boolean | void;
  
  /** 执行前钩子（别名） */
  beforeExecution?: (skillId: string, input: any) => Promise<void> | boolean | void;

  /** 执行成功钩子 */
  onSuccess?: (
    request: SkillExecutionRequest,
    response: SkillExecutionResponse
  ) => Promise<void> | void;

  /** 执行失败钩子 */
  onError?: (
    request: SkillExecutionRequest,
    error: Error,
    attempt: number
  ) => Promise<void> | void;

  /** 执行完成钩子（无论成功失败） */
  afterExecute?: (
    request: SkillExecutionRequest,
    response: SkillExecutionResponse
  ) => Promise<void> | void;
  
  /** 执行完成钩子（别名） */
  afterExecution?: (skillId: string, result: SkillExecutionResponse) => Promise<void> | SkillExecutionResponse | void;

  /** 重试钩子 */
  onRetry?: (
    request: SkillExecutionRequest,
    error: Error,
    attempt: number,
    maxRetries: number
  ) => Promise<void> | void;
}

/**
 * 执行上下文类型
 */
export interface LoadedSkillModule {
  execute: (input: any, context?: any) => Promise<any>;
  validateInput?: (input: any) => Promise<boolean>;
  validateOutput?: (output: any) => Promise<boolean>;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SkillExecutorConfig = {
  defaultTimeout: 30000,
  defaultMaxRetries: 3,
  retryStrategy: 'exponential',
  retryDelayBase: 1000,
  maxRetryDelay: 30000,
  enableInputValidation: true,
  enableOutputValidation: true,
  enableExecutionStats: true,
  statsRetentionDays: 30,
};

// ==================== 事件定义 ====================

export enum SkillExecutorEvent {
  EXECUTE_START = 'executor:execute:start',
  EXECUTE_SUCCESS = 'executor:execute:success',
  EXECUTE_ERROR = 'executor:execute:error',
  EXECUTE_RETRY = 'executor:execute:retry',
  VALIDATION_ERROR = 'executor:validation:error',
  TIMEOUT = 'executor:timeout',
  BATCH_COMPLETE = 'executor:batch:complete',
}

// ==================== 主类实现 ====================

/**
 * Skill 执行器
 *
 * 负责 Skill 的执行控制，提供以下核心功能：
 * - 超时控制
 * - 重试机制
 * - 执行统计
 * - 错误处理
 * - 批量执行
 * - 输入输出验证
 *
 * @example
 * ```typescript
 * const executor = new SkillExecutor();
 *
 * // 设置 Skill 加载器（用于获取已加载的 Skill 模块）
 * executor.setSkillLoader(skillLoader);
 *
 * // 执行单个 Skill
 * const result = await executor.execute({
 *   skillId: 'my-skill',
 *   input: { data: 'test' },
 *   options: { timeout: 10000, maxRetries: 2 }
 * });
 *
 * // 获取执行统计
 * const stats = executor.getSkillStats('my-skill');
 * console.log('成功率:', stats.successRate);
 * ```
 */
export class SkillExecutor extends EventEmitter {
  private config: SkillExecutorConfig;
  private stats: Map<string, SkillStats> = new Map();
  private globalStats: ExecutionStats = this.createEmptyStats();
  private hooks: ExecutionHooks = {};
  private skillModuleGetter?: (skillId: string) => LoadedSkillModule | undefined;
  private activeExecutions = new Map<string, Promise<SkillExecutionResponse>>();

  constructor(config: Partial<SkillExecutorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==================== 配置方法 ====================

  /**
   * 更新配置
   *
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<SkillExecutorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   *
   * @returns 当前配置
   */
  getConfig(): SkillExecutorConfig {
    return { ...this.config };
  }

  /**
   * 设置 Skill 模块获取器
   * 用于从 SkillLoader 获取已加载的 Skill 模块
   *
   * @param getter 获取函数
   */
  setSkillModuleGetter(getter: (skillId: string) => LoadedSkillModule | undefined): void {
    this.skillModuleGetter = getter;
  }

  // ==================== 钩子管理 ====================

  /**
   * 设置执行钩子
   *
   * @param hooks 钩子函数
   */
  setHooks(hooks: ExecutionHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  /**
   * 清除所有钩子
   */
  clearHooks(): void {
    this.hooks = {};
  }

  // ==================== 核心执行方法 ====================

  /**
   * 执行单个 Skill
   *
   * @param request 执行请求
   * @returns 执行响应
   */
  async execute(request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    const startTime = Date.now();
    const skillId = request.skillId || request.skill?.id;

    this.emit(SkillExecutorEvent.EXECUTE_START, {
      skillId,
      input: request.input,
      context: request.context,
    });

    try {
      // 执行前钩子（支持 beforeExecute 和 beforeExecution）
      if (this.hooks.beforeExecute) {
        const hookResult = await this.hooks.beforeExecute(request);
        if (hookResult === false) {
          const cancelledResponse: SkillExecutionResponse = {
            success: false,
            requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            skillId,
            version: request.version || 'unknown',
            status: SkillExecutionStatus.CANCELLED,
            error: 'Execution cancelled by beforeExecute hook',
            duration: Date.now() - startTime,
            retries: 0,
          };
          return cancelledResponse;
        }
      } else if (this.hooks.beforeExecution) {
        const hookResult = await this.hooks.beforeExecution(skillId, request.input);
        if (hookResult === false) {
          const cancelledResponse: SkillExecutionResponse = {
            success: false,
            requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            skillId,
            version: request.version || 'unknown',
            status: SkillExecutionStatus.CANCELLED,
            error: 'Execution cancelled by beforeExecution hook',
            duration: Date.now() - startTime,
            retries: 0,
          };
          return cancelledResponse;
        }
      }

      // 获取 Skill 模块（优先从请求中获取）
      const skillModule = request.skillModule || this.getSkillModule(skillId);

      // 输入验证
      if (this.config.enableInputValidation && skillModule.validateInput) {
        const isValid = await skillModule.validateInput(request.input);
        if (!isValid) {
          return await this.handleValidationError(request, 'input', startTime);
        }
      }

      // 带超时和重试执行
      const maxRetries = request.options?.maxRetries ?? this.config.defaultMaxRetries;
      const timeout = request.options?.timeout ?? this.config.defaultTimeout;
      let result: any;
      let lastError: Error | null = null;
      let actualRetries = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          result = await this.executeWithTimeout(
            () => skillModule.execute(request.input, request.context),
            timeout
          );
          // 更新重试次数为当前尝试次数（表示成功前失败了多少次）
          actualRetries = attempt;
          break;
        } catch (error) {
          lastError = error as Error;
          actualRetries = attempt;

          // 最后一次尝试，不再重试
          if (attempt === maxRetries) {
            break;
          }

          // 触发重试钩子
          if (this.hooks.onRetry) {
            await this.hooks.onRetry(request, lastError, attempt + 1, maxRetries);
          }

          this.emit(SkillExecutorEvent.EXECUTE_RETRY, {
            skillId,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          // 等待后重试
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay);
        }
      }

      // 如果所有重试都失败
      if (lastError && result === undefined) {
        if (this.hooks.onError) {
          await this.hooks.onError(request, lastError, actualRetries);
        }

        return this.handleExecutionError(request, lastError, startTime, actualRetries);
      }

      // 输出验证
      if (this.config.enableOutputValidation && skillModule.validateOutput) {
        const isValid = await skillModule.validateOutput(result);
        if (!isValid) {
          return await this.handleValidationError(request, 'output', startTime);
        }
      }

      // 构造成功响应
      const successResponse: SkillExecutionResponse = {
        success: true,
        requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        skillId,
        version: request.version || 'unknown',
        status: SkillExecutionStatus.SUCCESS,
        result,
        duration: Date.now() - startTime,
        retries: actualRetries,
      };

      // 触发成功钩子
      if (this.hooks.onSuccess) {
        await this.hooks.onSuccess(request, successResponse);
      }

      // 记录统计
      this.recordExecutionStats(skillId, successResponse);

      this.emit(SkillExecutorEvent.EXECUTE_SUCCESS, {
        skillId,
        duration: successResponse.duration,
        retries: actualRetries,
      });

      // 触发完成钩子（支持 afterExecute 和 afterExecution）
      if (this.hooks.afterExecute) {
        await this.hooks.afterExecute(request, successResponse);
      } else if (this.hooks.afterExecution) {
        await this.hooks.afterExecution(skillId, successResponse);
      }

      return successResponse;
    } catch (error) {
      const errorResponse = this.handleExecutionError(
        request,
        error as Error,
        startTime,
        0
      );

      // 触发完成钩子（支持 afterExecute 和 afterExecution）
      if (this.hooks.afterExecute) {
        await this.hooks.afterExecute(request, errorResponse);
      } else if (this.hooks.afterExecution) {
        await this.hooks.afterExecution(skillId, errorResponse);
      }

      return errorResponse;
    }
  }

  /**
   * 执行单个 Skill（别名方法）
   *
   * @param request 执行请求
   * @returns 执行响应
   */
  async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    return this.execute(request);
  }

  /**
   * 带超时的执行
   *
   * @param fn 要执行的函数
   * @param timeout 超时时间（毫秒）
   * @returns 执行结果
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  // ==================== 批量执行方法 ====================

  /**
   * 并行批量执行
   *
   * @param requests 执行请求列表
   * @param maxConcurrency 最大并发数
   * @returns 执行响应列表
   */
  async executeParallel(
    requests: SkillExecutionRequest[],
    maxConcurrency?: number
  ): Promise<SkillExecutionResponse[]> {
    if (!maxConcurrency || maxConcurrency >= requests.length) {
      // 无限制并发
      const results = await Promise.all(requests.map((req) => this.execute(req)));
      this.emit(SkillExecutorEvent.BATCH_COMPLETE, {
        total: requests.length,
        successful: results.filter((r) => r.success).length,
      });
      return results;
    }

    // 限制并发数
    const results: SkillExecutionResponse[] = [];
    const inProgress: Promise<SkillExecutionResponse>[] = [];

    for (const request of requests) {
      // 如果达到最大并发数，等待一个完成
      if (inProgress.length >= maxConcurrency) {
        const completed = await Promise.race(inProgress);
        results.push(completed);
        const index = inProgress.findIndex((p) => p.then(() => true));
        if (index !== -1) {
          inProgress.splice(index, 1);
        }
      }

      inProgress.push(this.execute(request));
    }

    // 等待剩余的完成
    const remainingResults = await Promise.all(inProgress);
    results.push(...remainingResults);

    this.emit(SkillExecutorEvent.BATCH_COMPLETE, {
      total: requests.length,
      successful: results.filter((r) => r.success).length,
    });

    return results;
  }

  /**
   * 串行批量执行
   *
   * @param requests 执行请求列表
   * @returns 执行响应列表
   */
  async executeSerial(
    requests: SkillExecutionRequest[]
  ): Promise<SkillExecutionResponse[]> {
    const results: SkillExecutionResponse[] = [];

    for (const request of requests) {
      results.push(await this.execute(request));
    }

    this.emit(SkillExecutorEvent.BATCH_COMPLETE, {
      total: requests.length,
      successful: results.filter((r) => r.success).length,
    });

    return results;
  }

  /**
   * 带依赖关系的批量执行
   * 根据依赖图确定执行顺序
   *
   * @param requests 执行请求列表
   * @param dependencies 依赖关系图 { skillId: [依赖的skillId] }
   * @returns 执行响应列表
   */
  async executeWithDependencies(
    requests: SkillExecutionRequest[],
    dependencies: Record<string, string[]>
  ): Promise<SkillExecutionResponse[]> {
    const results: SkillExecutionResponse[] = [];
    const completed = new Set<string>();
    const requestMap = new Map(requests.map((r) => [r.skillId, r]));

    // 拓扑排序确定执行顺序
    const executionOrder = this.topologicalSort(
      requests.map((r) => r.skillId),
      dependencies
    );

    for (const skillId of executionOrder) {
      const request = requestMap.get(skillId);
      if (!request) continue;

      // 检查依赖是否都成功
      const deps = dependencies[skillId] || [];
      const failedDeps = deps.filter(
        (depId) =>
          !completed.has(depId) || results.find((r) => r.skillId === depId && !r.success)
      );

      if (failedDeps.length > 0) {
        results.push({
          success: false,
          requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          skillId,
          version: request.version || 'unknown',
          status: SkillExecutionStatus.FAILED,
          error: `Dependent skills failed: ${failedDeps.join(', ')}`,
          duration: 0,
          retries: 0,
        });
        completed.add(skillId);
        continue;
      }

      const result = await this.execute(request);
      results.push(result);
      completed.add(skillId);
    }

    return results;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(nodes: string[], dependencies: Record<string, string[]>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: string) => {
      if (visited.has(node)) return;
      if (visiting.has(node)) {
        throw new Error(`Circular dependency detected involving ${node}`);
      }

      visiting.add(node);

      const deps = dependencies[node] || [];
      for (const dep of deps) {
        if (nodes.includes(dep)) {
          visit(dep);
        }
      }

      visiting.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return result;
  }

  // ==================== 统计方法 ====================

  /**
   * 获取单个 Skill 的执行统计
   *
   * @param skillId Skill ID
   * @returns 统计信息
   */
  getSkillStats(skillId: string): SkillStats {
    return (
      this.stats.get(skillId) || {
        ...this.createEmptyStats(),
        skillId,
        errorByType: {},
      }
    );
  }

  /**
   * 获取所有 Skill 的执行统计
   *
   * @returns 所有 Skill 的统计
   */
  getAllSkillStats(): Record<string, SkillStats> {
    const result: Record<string, SkillStats> = {};
    for (const [skillId, stat] of this.stats.entries()) {
      result[skillId] = { ...stat };
    }
    return result;
  }

  /**
   * 获取全局执行统计
   *
   * @returns 全局统计
   */
  getGlobalStats(): ExecutionStats {
    return { ...this.globalStats };
  }

  /**
   * 获取完整的全局统计（包含按 Skill 和状态分组）
   *
   * @returns 完整的全局统计
   */
  getFullGlobalStats(): GlobalExecutionStats {
    const byStatus: Record<SkillExecutionStatus, number> = {
      [SkillExecutionStatus.PENDING]: 0,
      [SkillExecutionStatus.RUNNING]: 0,
      [SkillExecutionStatus.SUCCESS]: this.globalStats.successfulExecutions,
      [SkillExecutionStatus.FAILED]: this.globalStats.failedExecutions,
      [SkillExecutionStatus.CANCELLED]: 0,
      [SkillExecutionStatus.TIMEOUT]: 0,
    };

    // 统计超时
    for (const stat of this.stats.values()) {
      if (stat.lastError?.includes('timed out')) {
        byStatus[SkillExecutionStatus.TIMEOUT]++;
      }
    }

    return {
      total: { ...this.globalStats },
      bySkill: this.getAllSkillStats(),
      byStatus,
    };
  }

  /**
   * 清除单个 Skill 的统计
   *
   * @param skillId Skill ID
   */
  clearSkillStats(skillId: string): void {
    this.stats.delete(skillId);
  }

  /**
   * 清除所有统计
   */
  clearAllStats(): void {
    this.stats.clear();
    this.globalStats = this.createEmptyStats();
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查是否有正在执行的请求
   *
   * @param skillId 可选的 Skill ID，如果提供则只检查该 Skill
   * @returns 是否有正在执行的请求
   */
  hasActiveExecutions(skillId?: string): boolean {
    if (skillId) {
      // 检查该 Skill 是否有活动执行（简化实现）
      return false;
    }
    return this.activeExecutions.size > 0;
  }

  /**
   * 获取活动执行数量
   *
   * @returns 活动执行数量
   */
  getActiveExecutionCount(): number {
    return this.activeExecutions.size;
  }

  // ==================== 私有方法 ====================

  /**
   * 获取 Skill 模块
   */
  private getSkillModule(skillId: string): LoadedSkillModule {
    if (!this.skillModuleGetter) {
      throw new Error('Skill module getter not set. Call setSkillModuleGetter first.');
    }

    const module = this.skillModuleGetter(skillId);
    if (!module) {
      throw new Error(`Skill not loaded: ${skillId}`);
    }

    return module;
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    switch (this.config.retryStrategy) {
      case 'fixed':
        return Math.min(this.config.retryDelayBase, this.config.maxRetryDelay);
      case 'linear':
        return Math.min(
          this.config.retryDelayBase * (attempt + 1),
          this.config.maxRetryDelay
        );
      case 'exponential':
      default:
        return Math.min(
          this.config.retryDelayBase * Math.pow(2, attempt),
          this.config.maxRetryDelay
        );
    }
  }

  /**
   * 处理执行错误
   */
  private handleExecutionError(
    request: SkillExecutionRequest,
    error: Error,
    startTime: number,
    retries: number
  ): SkillExecutionResponse {
    const skillId = request.skillId;
    const isTimeout = error.message.includes('timed out');

    const response: SkillExecutionResponse = {
      success: false,
      requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      skillId,
      version: request.version || 'unknown',
      status: isTimeout ? SkillExecutionStatus.TIMEOUT : SkillExecutionStatus.FAILED,
      error: error.message,
      duration: Date.now() - startTime,
      retries,
    };

    // 记录统计
    this.recordExecutionStats(skillId, response, error);

    if (isTimeout) {
      this.emit(SkillExecutorEvent.TIMEOUT, {
        skillId,
        timeout: request.options?.timeout || this.config.defaultTimeout,
      });
    } else {
      this.emit(SkillExecutorEvent.EXECUTE_ERROR, {
        skillId,
        error: error.message,
      });
    }

    return response;
  }

  /**
   * 处理验证错误
   */
  private async handleValidationError(
    request: SkillExecutionRequest,
    phase: 'input' | 'output',
    startTime: number
  ): Promise<SkillExecutionResponse> {
    const skillId = request.skillId;

    const response: SkillExecutionResponse = {
      success: false,
      requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      skillId,
      version: request.version || 'unknown',
      status: SkillExecutionStatus.FAILED,
      error: `${phase.charAt(0).toUpperCase() + phase.slice(1)} validation failed`,
      duration: Date.now() - startTime,
      retries: 0,
    };

    this.emit(SkillExecutorEvent.VALIDATION_ERROR, {
      skillId,
      phase,
    });

    // 调用 onError 钩子
    if (this.hooks.onError) {
      await this.hooks.onError(request, new Error(response.error), 0);
    }

    // 记录执行统计
    this.recordExecutionStats(skillId, response, new Error(response.error));

    return response;
  }

  /**
   * 记录执行统计
   */
  private recordExecutionStats(
    skillId: string,
    response: SkillExecutionResponse,
    error?: Error
  ): void {
    if (!this.config.enableExecutionStats) return;

    const now = new Date();

    // 更新 Skill 统计
    let skillStats = this.stats.get(skillId);
    if (!skillStats) {
      skillStats = {
        ...this.createEmptyStats(),
        skillId,
        errorByType: {},
      };
      this.stats.set(skillId, skillStats);
    }

    this.updateStats(skillStats, response, now, error);

    // 更新全局统计
    this.updateStats(this.globalStats, response, now, error);
  }

  /**
   * 更新统计数据
   */
  private updateStats(
    stats: ExecutionStats | SkillStats,
    response: SkillExecutionResponse,
    now: Date,
    error?: Error
  ): void {
    stats.totalExecutions++;
    stats.totalDuration += response.duration || 0;
    stats.averageDuration = Math.round(stats.totalDuration / stats.totalExecutions);
    stats.lastExecutedAt = now;

    if (response.duration !== undefined) {
      if (stats.minDuration === 0 || response.duration < stats.minDuration) {
        stats.minDuration = response.duration;
      }
      if (response.duration > stats.maxDuration) {
        stats.maxDuration = response.duration;
      }
    }

    if (response.retries !== undefined) {
      stats.totalRetries += response.retries;
    }

    if (response.success) {
      stats.successfulExecutions++;
      stats.lastSuccessAt = now;
    } else {
      stats.failedExecutions++;
      stats.lastFailedAt = now;

      if ('errorByType' in stats && error) {
        const errorType = error.message.split(':')[0] || 'Unknown';
        stats.errorByType[errorType] = (stats.errorByType[errorType] || 0) + 1;
      }
    }

    stats.successRate =
      stats.totalExecutions > 0 ? stats.successfulExecutions / stats.totalExecutions : 0;
  }

  /**
   * 创建空统计对象
   */
  private createEmptyStats(): ExecutionStats {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalRetries: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      successRate: 0,
    };
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== 生命周期 ====================

  /**
   * 销毁实例
   * 清理所有资源
   */
  destroy(): void {
    this.removeAllListeners();
    this.stats.clear();
    this.activeExecutions.clear();
    this.hooks = {};
    this.skillModuleGetter = undefined;
  }
}

// ==================== 导出单例 ====================

export const skillExecutor = new SkillExecutor();

export default SkillExecutor;
