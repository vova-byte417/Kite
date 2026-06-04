/**
 * Skill API - 请求处理器
 *
 * 处理所有 API 请求的业务逻辑
 *
 * @author vova
 * @version 1.0.0
 */

import { SkillManager } from '../index';
import {
  ApiResponse,
  PaginatedResponse,
  RegisterSkillRequest,
  RegisterSkillResponse,
  UpdateSkillRequest,
  ExecuteSkillRequest,
  BatchExecuteRequest,
  BatchExecuteResponse,
  SkillDetailResponse,
  SkillListQuery,
  MatchSkillRequest,
  MatchSkillResponse,
  DependencyCheckResponse,
  TopologyResponse,
  DependencyTreeResponse,
  AddDependencyRequest,
  SystemOverviewResponse,
  SystemConfigResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  ApiErrorCode,
} from './types';

/**
 * API 请求处理器类
 */
export class ApiHandlers {
  private manager: SkillManager;
  private startTime: number;

  constructor(skillManager: SkillManager) {
    this.manager = skillManager;
    this.startTime = Date.now();
  }

  // ==================== 辅助方法 ====================

  /**
   * 创建成功响应
   */
  private success<T>(data: T, requestId?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * 创建错误响应
   */
  private error(
    code: ApiErrorCode,
    message: string,
    details?: any,
    requestId?: string
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== Skill 注册相关 ====================

  /**
   * 注册新 Skill
   */
  async registerSkill(
    request: RegisterSkillRequest
  ): Promise<ApiResponse<RegisterSkillResponse>> {
    const requestId = this.generateRequestId();

    try {
      // 验证必填字段
      if (!request.name || !request.entryPoint) {
        return this.error(
          ApiErrorCode.VALIDATION_ERROR,
          'name and entryPoint are required',
          { required: ['name', 'entryPoint'], provided: Object.keys(request) },
          requestId
        );
      }

      // 注册 Skill
      const registration = this.manager.registerSkill({
        name: request.name,
        version: request.version || '1.0.0',
        description: request.description || '',
        entryPoint: request.entryPoint,
        tags: request.tags || [],
        dependencies: request.dependencies || [],
        config: request.config,
        metadata: request.metadata,
      });

      return this.success<RegisterSkillResponse>(
        {
          skillId: registration.id,
          name: registration.name,
          version: registration.version,
          status: registration.status,
          createdAt: registration.metadata?.createdAt?.toISOString() || new Date().toISOString(),
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to register skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 更新 Skill
   */
  async updateSkill(
    skillId: string,
    request: UpdateSkillRequest
  ): Promise<ApiResponse<RegisterSkillResponse>> {
    const requestId = this.generateRequestId();

    try {
      const existing = this.manager.getSkill(skillId);
      if (!existing) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found: ${skillId}`,
          null,
          requestId
        );
      }

      // 注意：当前 SkillDiscoverer 不支持直接更新，需要先注销再重新注册
      // 这是简化实现
      await this.manager.unregisterSkill(skillId);

      const updated = this.manager.registerSkill({
        ...existing,
        ...request,
        name: request.name || existing.name,
        entryPoint: request.entryPoint || existing.entryPoint,
      });

      return this.success<RegisterSkillResponse>(
        {
          skillId: updated.id,
          name: updated.name,
          version: updated.version,
          status: updated.status,
          createdAt: updated.metadata?.createdAt?.toISOString() || new Date().toISOString(),
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to update skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 注销 Skill
   */
  async unregisterSkill(skillId: string): Promise<ApiResponse<{ skillId: string }>> {
    const requestId = this.generateRequestId();

    try {
      const success = await this.manager.unregisterSkill(skillId);

      if (!success) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found: ${skillId}`,
          null,
          requestId
        );
      }

      return this.success({ skillId }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to unregister skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== Skill 执行相关 ====================

  /**
   * 执行 Skill
   */
  async executeSkill(
    skillId: string,
    request: ExecuteSkillRequest
  ): Promise<ApiResponse<any>> {
    const requestId = this.generateRequestId();

    try {
      // 检查安全模式
      if (this.manager.isInSafeMode()) {
        return this.error(
          ApiErrorCode.SAFE_MODE_ACTIVE,
          'System is in safe mode, skill execution is disabled',
          null,
          requestId
        );
      }

      // 检查依赖（除非忽略）
      if (!request.options?.ignoreDependencies) {
        const depCheck = this.manager.checkSkillDependencies(skillId);
        if (!depCheck.satisfied) {
          return this.error(
            ApiErrorCode.DEPENDENCY_MISSING,
            'Dependency check failed',
            depCheck,
            requestId
          );
        }
      }

      // 执行 Skill
      const result = await this.manager.executeSkill({
        skillId,
        input: request.input,
        options: request.options,
      });

      if (!result.success) {
        return this.error(
          ApiErrorCode.SKILL_EXECUTION_FAILED,
          result.error || 'Skill execution failed',
          { duration: result.duration },
          requestId
        );
      }

      return this.success(result.result, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to execute skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 批量执行 Skill
   */
  async batchExecute(
    request: BatchExecuteRequest
  ): Promise<ApiResponse<BatchExecuteResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 检查安全模式
      if (this.manager.isInSafeMode()) {
        return this.error(
          ApiErrorCode.SAFE_MODE_ACTIVE,
          'System is in safe mode, skill execution is disabled',
          null,
          requestId
        );
      }

      let results: any[];

      switch (request.mode) {
        case 'parallel':
          results = await this.manager.executeSkillsParallel(
            request.requests.map((r) => ({
              skillId: r.skillId,
              version: r.version,
              input: r.input,
              options: r.options,
            })),
            request.maxConcurrency
          );
          break;

        case 'serial':
          results = await this.manager.executeSkillsSerial(
            request.requests.map((r) => ({
              skillId: r.skillId,
              version: r.version,
              input: r.input,
              options: r.options,
            }))
          );
          break;

        case 'dependency':
          // 构建输入映射
          const inputs: Record<string, any> = {};
          request.requests.forEach((r) => {
            inputs[r.skillId] = r.input;
          });

          const depResult = await this.manager.executeSkillsWithDependencies(inputs, {
            continueOnFailure: request.continueOnFailure,
            parallelInBatch: true,
          });

          // 转换结果格式
          results = Object.entries(depResult.results).map(([skillId, res]) => ({
            skillId,
            ...res,
          }));
          break;

        default:
          return this.error(
            ApiErrorCode.VALIDATION_ERROR,
            `Invalid execution mode: ${request.mode}`,
            { validModes: ['parallel', 'serial', 'dependency'] },
            requestId
          );
      }

      // 统计结果
      const successCount = results.filter((r) => r.success).length;

      return this.success<BatchExecuteResponse>(
        {
          total: request.requests.length,
          success: successCount,
          failed: request.requests.length - successCount,
          totalDuration: Date.now() - startTime,
          results: results.map((r, index) => ({
            skillId: r.skillId,
            index,
            ...r,
          })),
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to batch execute skills: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== Skill 查询相关 ====================

  /**
   * 获取 Skill 详情
   */
  async getSkill(skillId: string): Promise<ApiResponse<SkillDetailResponse>> {
    const requestId = this.generateRequestId();

    try {
      const skill = this.manager.getSkill(skillId);
      if (!skill) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found: ${skillId}`,
          null,
          requestId
        );
      }

      const isLoaded = this.manager.isSkillLoaded(skillId);
      const stats = this.manager.getSkillStats(skillId);

      return this.success<SkillDetailResponse>(
        {
          ...skill,
          loadedAt: skill.loadedAt?.toISOString(),
          isLoaded,
          directDependencies: this.manager.getDirectDependencies(skillId),
          dependents: this.manager.getDependents(skillId),
          stats: stats
            ? {
                totalExecutions: stats.totalExecutions,
                successfulExecutions: stats.successfulExecutions,
                successRate: stats.successRate,
                avgDuration: stats.averageDuration,
                lastExecutedAt: stats.lastExecutedAt?.toISOString(),
              }
            : undefined,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 获取 Skill 列表
   */
  async listSkills(
    query: SkillListQuery = {}
  ): Promise<ApiResponse<PaginatedResponse<SkillDetailResponse>>> {
    const requestId = this.generateRequestId();

    try {
      // 搜索 Skill
      let skills = this.manager.searchSkills(query);

      // 过滤已加载的
      if (query.loadedOnly) {
        skills = skills.filter((s) => this.manager.isSkillLoaded(s.id));
      }

      // 分页
      const offset = query.offset || 0;
      const limit = query.limit || skills.length;
      const paginatedSkills = skills.slice(offset, offset + limit);

      // 构建详细信息
      const items = paginatedSkills.map((skill) => {
        const stats = query.includeStats
          ? this.manager.getSkillStats(skill.id)
          : null;

        return {
          ...skill,
          loadedAt: skill.loadedAt?.toISOString(),
          isLoaded: this.manager.isSkillLoaded(skill.id),
          directDependencies: this.manager.getDirectDependencies(skill.id),
          dependents: this.manager.getDependents(skill.id),
          stats: stats
            ? {
                totalExecutions: stats.totalExecutions,
                successfulExecutions: stats.successfulExecutions,
                successRate: stats.successRate,
                avgDuration: stats.averageDuration,
                lastExecutedAt: stats.lastExecutedAt?.toISOString(),
              }
            : undefined,
        };
      });

      return this.success<PaginatedResponse<SkillDetailResponse>>(
        {
          items,
          total: skills.length,
          offset,
          limit,
          hasMore: offset + limit < skills.length,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to list skills: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 匹配 Skill
   */
  async matchSkills(
    request: MatchSkillRequest
  ): Promise<ApiResponse<MatchSkillResponse>> {
    const requestId = this.generateRequestId();

    try {
      let results = this.manager.matchSkillsForTask(
        request.taskDescription,
        request.requiredSkills
      );

      // 过滤分数
      if (request.minScore) {
        results = results.filter((r) => r.score >= request.minScore!);
      }

      // 限制数量
      if (request.limit) {
        results = results.slice(0, request.limit);
      }

      return this.success<MatchSkillResponse>(
        {
          count: results.length,
          results,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to match skills: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== Skill 加载/卸载 ====================

  /**
   * 加载 Skill
   */
  async loadSkill(skillId: string): Promise<ApiResponse<{ skillId: string; loaded: boolean }>> {
    const requestId = this.generateRequestId();

    try {
      const result = await this.manager.loadSkill(skillId);

      if (!result.success) {
        return this.error(
          ApiErrorCode.SKILL_LOAD_FAILED,
          result.error || 'Failed to load skill',
          null,
          requestId
        );
      }

      return this.success({ skillId, loaded: true }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to load skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 卸载 Skill
   */
  async unloadSkill(skillId: string): Promise<ApiResponse<{ skillId: string; unloaded: boolean }>> {
    const requestId = this.generateRequestId();

    try {
      const success = await this.manager.unloadSkill(skillId);

      if (!success) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found or already unloaded: ${skillId}`,
          null,
          requestId
        );
      }

      return this.success({ skillId, unloaded: true }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to unload skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 重新加载 Skill
   */
  async reloadSkill(skillId: string): Promise<ApiResponse<{ skillId: string; reloaded: boolean }>> {
    const requestId = this.generateRequestId();

    try {
      const result = await this.manager.reloadSkill(skillId);

      if (!result || !result.success) {
        return this.error(
          ApiErrorCode.SKILL_LOAD_FAILED,
          result?.error || 'Failed to reload skill',
          null,
          requestId
        );
      }

      return this.success({ skillId, reloaded: true }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to reload skill: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 按依赖顺序批量加载 Skill
   */
  async loadSkillsInOrder(
    skillIds?: string[]
  ): Promise<ApiResponse<{ loaded: number; total: number; results: Record<string, boolean> }>> {
    const requestId = this.generateRequestId();

    try {
      const result = await this.manager.loadSkillsInDependencyOrder(skillIds);

      const simplifiedResults: Record<string, boolean> = {};
      for (const [id, res] of Object.entries(result.results)) {
        simplifiedResults[id] = res.success;
      }

      return this.success(
        {
          loaded: result.loadedCount,
          total: Object.keys(result.results).length,
          results: simplifiedResults,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to load skills in order: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== 依赖管理相关 ====================

  /**
   * 检查 Skill 依赖
   */
  async checkDependencies(skillId: string): Promise<ApiResponse<DependencyCheckResponse>> {
    const requestId = this.generateRequestId();

    try {
      const check = this.manager.checkSkillDependencies(skillId);

      return this.success<DependencyCheckResponse>(
        {
          satisfied: check.satisfied,
          missing: check.missing,
          versionMismatch: check.versionMismatch,
          notReady: check.notReady,
          cycles: check.cycles,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to check dependencies: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 检查所有 Skill 依赖
   */
  async checkAllDependencies(): Promise<
    ApiResponse<{
      allSatisfied: boolean;
      total: number;
      satisfied: number;
      withIssues: number;
      totalMissing: number;
      totalCycles: number;
      results: Record<string, DependencyCheckResponse>;
    }>
  > {
    const requestId = this.generateRequestId();

    try {
      const result = this.manager.checkAllDependencies();

      return this.success({
        allSatisfied: result.allSatisfied,
        total: result.summary.total,
        satisfied: result.summary.satisfied,
        withIssues: result.summary.withIssues,
        totalMissing: result.summary.totalMissing,
        totalCycles: result.summary.totalCycles,
        results: result.results,
      }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to check all dependencies: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 检测循环依赖
   */
  async detectCycles(skillIds?: string[]): Promise<ApiResponse<{ cycles: string[][] }>> {
    const requestId = this.generateRequestId();

    try {
      const cycles = this.manager.detectCycles(skillIds);

      return this.success({ cycles }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to detect cycles: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 计算拓扑排序
   */
  async computeTopology(skillIds?: string[]): Promise<ApiResponse<TopologyResponse>> {
    const requestId = this.generateRequestId();

    try {
      const result = this.manager.computeDependencyTopology(skillIds);

      return this.success<TopologyResponse>(result, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to compute topology: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 获取依赖树
   */
  async getDependencyTree(
    skillId: string,
    maxDepth: number = 10
  ): Promise<ApiResponse<DependencyTreeResponse>> {
    const requestId = this.generateRequestId();

    try {
      const skill = this.manager.getSkill(skillId);
      if (!skill) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found: ${skillId}`,
          null,
          requestId
        );
      }

      const tree = this.manager.buildDependencyTree(skillId, maxDepth);
      const asciiTree = this.manager.printDependencyTree(skillId, maxDepth);

      // 计算节点数
      const countNodes = (node: any): number => {
        if (!node) return 0;
        return 1 + (node.children?.reduce((sum: number, child: any) => sum + countNodes(child), 0) || 0);
      };

      return this.success<DependencyTreeResponse>(
        {
          rootId: skillId,
          rootName: skill.name,
          depth: tree?.depth || 0,
          totalNodes: countNodes(tree),
          tree,
          asciiTree,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get dependency tree: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 添加依赖关系
   */
  async addDependency(
    skillId: string,
    request: AddDependencyRequest
  ): Promise<ApiResponse<{ skillId: string; dependencyId: string }>> {
    const requestId = this.generateRequestId();

    try {
      // 检查 Skill 是否存在
      if (!this.manager.getSkill(skillId)) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Skill not found: ${skillId}`,
          null,
          requestId
        );
      }

      if (!this.manager.getSkill(request.dependencyId)) {
        return this.error(
          ApiErrorCode.SKILL_NOT_FOUND,
          `Dependency skill not found: ${request.dependencyId}`,
          null,
          requestId
        );
      }

      // 获取依赖管理器并添加依赖
      const depManager = this.manager.getDependencyManager();
      depManager.addDependency(skillId, request.dependencyId);

      // 检查是否产生循环
      const cycles = depManager.detectCycle([skillId]);
      if (cycles.length > 0) {
        // 回滚操作
        depManager.removeDependency(skillId, request.dependencyId);
        return this.error(
          ApiErrorCode.DEPENDENCY_CYCLE,
          'Adding this dependency would create a cycle',
          { cycles },
          requestId
        );
      }

      return this.success({ skillId, dependencyId: request.dependencyId }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to add dependency: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 移除依赖关系
   */
  async removeDependency(
    skillId: string,
    dependencyId: string
  ): Promise<ApiResponse<{ skillId: string; dependencyId: string; removed: boolean }>> {
    const requestId = this.generateRequestId();

    try {
      const depManager = this.manager.getDependencyManager();
      const removed = depManager.removeDependency(skillId, dependencyId);

      return this.success({ skillId, dependencyId, removed }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to remove dependency: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== 系统管理相关 ====================

  /**
   * 获取系统概览
   */
  async getSystemOverview(): Promise<ApiResponse<SystemOverviewResponse>> {
    const requestId = this.generateRequestId();

    try {
      const overview = this.manager.getOverview();

      return this.success<SystemOverviewResponse>(
        {
          ...overview,
          isInSafeMode: this.manager.isInSafeMode(),
          version: '2.1.0',
          uptime: Date.now() - this.startTime,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get system overview: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<ApiResponse<SystemConfigResponse>> {
    const requestId = this.generateRequestId();

    try {
      const config = this.manager.getConfig();

      return this.success<SystemConfigResponse>(
        {
          config: {
            scanPaths: config.scanPaths,
            autoScanOnStartup: config.autoScanOnStartup,
            defaultTimeout: config.executorConfig.defaultTimeout || 30000,
            defaultMaxRetries: config.executorConfig.defaultMaxRetries || 3,
            retryStrategy: String(config.executorConfig.retryStrategy || 'exponential'),
            strictDependencyMode: Boolean(config.dependencyConfig?.strictMode),
            enableSandbox: Boolean(config.loaderConfig.enableSandbox),
          },
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get system config: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  /**
   * 执行系统操作
   */
  async executeSystemAction(action: string): Promise<ApiResponse<{ action: string; success: boolean }>> {
    const requestId = this.generateRequestId();

    try {
      switch (action) {
        case 'initialize':
          await this.manager.initialize();
          break;
        case 'reinitialize':
          await this.manager.reinitialize();
          break;
        case 'refresh':
          await this.manager.refreshDiscovery();
          break;
        case 'enterSafeMode':
          this.manager.enterSafeMode();
          break;
        case 'exitSafeMode':
          this.manager.exitSafeMode();
          break;
        default:
          return this.error(
            ApiErrorCode.VALIDATION_ERROR,
            `Invalid action: ${action}`,
            { validActions: ['initialize', 'reinitialize', 'refresh', 'enterSafeMode', 'exitSafeMode'] },
            requestId
          );
      }

      return this.success({ action, success: true }, requestId);
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to execute system action: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }

  // ==================== 批量操作相关 ====================

  /**
   * 执行批量操作
   */
  async bulkOperation(
    request: BulkOperationRequest
  ): Promise<ApiResponse<BulkOperationResponse>> {
    const requestId = this.generateRequestId();

    try {
      const results: Array<{ skillId: string; success: boolean; error?: string }> = [];

      switch (request.operation) {
        case 'register':
          if (!request.skills || request.skills.length === 0) {
            return this.error(
              ApiErrorCode.VALIDATION_ERROR,
              'skills array is required for register operation',
              null,
              requestId
            );
          }
          for (const skill of request.skills) {
            try {
              const reg = this.manager.registerSkill(skill as any);
              results.push({ skillId: reg.id, success: true });
            } catch (err: any) {
              results.push({ skillId: skill.name, success: false, error: err.message });
            }
          }
          break;

        case 'load':
          if (!request.skillIds) {
            return this.error(
              ApiErrorCode.VALIDATION_ERROR,
              'skillIds array is required',
              null,
              requestId
            );
          }
          for (const skillId of request.skillIds) {
            try {
              await this.manager.loadSkill(skillId);
              results.push({ skillId, success: true });
            } catch (err: any) {
              results.push({ skillId, success: false, error: err.message });
            }
          }
          break;

        case 'unload':
          if (!request.skillIds) {
            return this.error(
              ApiErrorCode.VALIDATION_ERROR,
              'skillIds array is required',
              null,
              requestId
            );
          }
          for (const skillId of request.skillIds) {
            try {
              await this.manager.unloadSkill(skillId);
              results.push({ skillId, success: true });
            } catch (err: any) {
              results.push({ skillId, success: false, error: err.message });
            }
          }
          break;

        case 'reload':
          if (!request.skillIds) {
            return this.error(
              ApiErrorCode.VALIDATION_ERROR,
              'skillIds array is required',
              null,
              requestId
            );
          }
          for (const skillId of request.skillIds) {
            try {
              await this.manager.reloadSkill(skillId);
              results.push({ skillId, success: true });
            } catch (err: any) {
              results.push({ skillId, success: false, error: err.message });
            }
          }
          break;

        case 'unregister':
          if (!request.skillIds) {
            return this.error(
              ApiErrorCode.VALIDATION_ERROR,
              'skillIds array is required',
              null,
              requestId
            );
          }
          for (const skillId of request.skillIds) {
            try {
              await this.manager.unregisterSkill(skillId);
              results.push({ skillId, success: true });
            } catch (err: any) {
              results.push({ skillId, success: false, error: err.message });
            }
          }
          break;

        default:
          return this.error(
            ApiErrorCode.VALIDATION_ERROR,
            `Invalid operation: ${request.operation}`,
            { validOperations: ['register', 'load', 'unload', 'reload', 'unregister'] },
            requestId
          );
      }

      const successCount = results.filter((r) => r.success).length;

      return this.success<BulkOperationResponse>(
        {
          total: results.length,
          success: successCount,
          failed: results.length - successCount,
          results,
        },
        requestId
      );
    } catch (err: any) {
      return this.error(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to execute bulk operation: ${err.message}`,
        { stack: err.stack },
        requestId
      );
    }
  }
}

export default ApiHandlers;
