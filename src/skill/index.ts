/**
 * Kite AI Skill System - 统一入口
 *
 * Skill 系统提供完整的 Skill 发现、加载、执行和管理能力
 *
 * ## 核心模块
 * - SkillDiscoverer: 从文件系统自动发现和注册 Skill
 * - SkillLoader: 在安全沙箱中加载 Skill，管理生命周期
 * - SkillExecutor: 执行引擎，支持超时、重试、统计、批量执行
 * - SkillDependencyManager: 依赖管理，支持拓扑排序、循环检测、批量依赖执行
 * - VMSecurityManager: VM 沙箱安全管理
 * - SkillManager: 统一入口，整合所有功能
 *
 * ## 基本使用
 * ```typescript
 * import { skillManager } from 'kite-skill-system';
 *
 * // 初始化
 * await skillManager.initialize();
 *
 * // 注册 Skill
 * await skillManager.registerSkill({
 *   name: 'my-skill',
 *   entryPoint: './skills/my-skill.ts',
 *   tags: ['data', 'analysis']
 * });
 *
 * // 执行 Skill
 * const result = await skillManager.executeSkill({
 *   skillId: 'my-skill',
 *   input: { data: 'test' },
 *   options: { timeout: 10000, maxRetries: 2 }
 * });
 * ```
 *
 * @author vova
 * @version 2.1.0
 */

import { EventEmitter } from 'events';

// 导出类型定义
export * from './types';

// 导出核心类
export { SkillDiscoverer } from './SkillDiscoverer';
export { SkillLoader } from './SkillLoader';
export type { SkillLoaderConfig, SkillLoaderEvent, SkillExport } from './SkillLoader';
export {
  SkillExecutor,
  skillExecutor,
  SkillExecutorEvent,
} from './SkillExecutor';
export type {
  SkillExecutorConfig,
  ExecutionStats,
  SkillStats,
  GlobalExecutionStats,
  ExecutionHooks,
  LoadedSkillModule,
  RetryStrategy,
} from './SkillExecutor';
export {
  SkillDependencyManager,
  DependencyManagerEvent,
} from './SkillDependencyManager';
export type {
  DependencyManagerConfig,
  DependencyCheckResult,
  DependencyNode,
  TopologyResult,
  DependencyTreeNode,
  ExecutionBatch,
} from './SkillDependencyManager';
export {
  VMSandboxSecurityManager,
  SecureSandbox,
  PermissionCategory,
  AuditEventType,
} from './VMSecurityManager';

// 导出 API 模块
export { SkillApiServer } from './api/server';
export type { HttpRequest, HttpResponse, Route } from './api/server';
export type { HttpMethod, RouteHandler } from './api/server';
export {
  ApiHandlers,
} from './api/handlers';
export * from './api/types';

// 导入核心类
import { SkillDiscoverer } from './SkillDiscoverer';
import { SkillLoader, SkillLoaderConfig } from './SkillLoader';
import {
  SkillExecutor,
  SkillExecutorConfig,
  ExecutionStats,
} from './SkillExecutor';
import {
  SkillDependencyManager,
  DependencyManagerConfig,
  DependencyCheckResult,
  TopologyResult,
  DependencyTreeNode,
} from './SkillDependencyManager';

// 导入类型
import {
  SkillRegistration,
  SkillExecutionRequest,
  SkillExecutionResponse,
  SkillSearchOptions,
  SkillMatchResult,
  SkillStatus,
  SkillLoadResult,
} from './types';

// 导入事件枚举
import { SkillLoaderEvent } from './SkillLoader';
import { SkillExecutorEvent } from './SkillExecutor';
import { DependencyManagerEvent } from './SkillDependencyManager';

// ==================== SkillManager 配置 ====================

/**
 * SkillManager 配置选项
 */
export interface SkillManagerConfig {
  /** 扫描路径列表 */
  scanPaths: string[];

  /** 是否在初始化时自动扫描 */
  autoScanOnStartup: boolean;

  /** SkillLoader 配置 */
  loaderConfig: Partial<SkillLoaderConfig>;

  /** SkillExecutor 配置 */
  executorConfig: Partial<SkillExecutorConfig>;

  /** SkillDependencyManager 配置 */
  dependencyConfig: Partial<DependencyManagerConfig>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SkillManagerConfig = {
  scanPaths: ['./skills'],
  autoScanOnStartup: true,
  loaderConfig: {
    enableSandbox: true,
  },
  executorConfig: {
    defaultTimeout: 30000,
    defaultMaxRetries: 3,
    retryStrategy: 'exponential',
  },
  dependencyConfig: {
    strictMode: false,
    autoCheckOnLoad: true,
    maxDependencyDepth: 50,
    defaultRequiredStatus: SkillStatus.READY,
  },
};

// ==================== SkillManager 主类 ====================

/**
 * Skill 管理器 - Skill 系统的统一入口
 *
 * 集成所有子模块，提供统一的管理接口：
 * - 初始化和配置管理
 * - Skill 发现和注册
 * - Skill 加载、卸载、重新加载
 * - Skill 执行（支持超时、重试、批量、依赖执行）
 * - Skill 查询、搜索、匹配
 * - 依赖管理（拓扑排序、循环检测、依赖树构建）
 * - 执行统计和监控
 * - 安全模式管理
 *
 * @example
 * ```typescript
 * const manager = new SkillManager({
 *   scanPaths: ['./skills'],
 *   autoScanOnStartup: true,
 *   dependencyConfig: {
 *     strictMode: true
 *   }
 * });
 *
 * // 初始化
 * await manager.initialize();
 *
 * // 加载并执行 Skill
 * await manager.loadSkill('skill-id');
 * const result = await manager.executeSkill({
 *   skillId: 'skill-id',
 *   input: { data: 'test' },
 *   options: { timeout: 10000, maxRetries: 2 }
 * });
 *
 * // 带依赖的批量执行
 * const batchResults = await manager.executeWithDependencies({
 *   'skill-a': { input: 'data-a' },
 *   'skill-b': { input: 'data-b' }
 * });
 *
 * // 获取统计
 * const stats = manager.getSkillStats('skill-id');
 * console.log('成功率:', stats.successRate);
 * ```
 */
export class SkillManager extends EventEmitter {
  private discoverer: SkillDiscoverer;
  private loader: SkillLoader;
  private executor: SkillExecutor;
  private dependencyManager: SkillDependencyManager;
  private config: SkillManagerConfig;
  private initialized = false;

  constructor(config: Partial<SkillManagerConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      loaderConfig: { ...DEFAULT_CONFIG.loaderConfig, ...config.loaderConfig },
      executorConfig: { ...DEFAULT_CONFIG.executorConfig, ...config.executorConfig },
      dependencyConfig: { ...DEFAULT_CONFIG.dependencyConfig, ...config.dependencyConfig },
    };

    this.discoverer = new SkillDiscoverer({
      scanPaths: this.config.scanPaths,
    });

    this.loader = new SkillLoader(this.config.loaderConfig);
    this.executor = this.loader.getExecutor();
    this.dependencyManager = new SkillDependencyManager(this.config.dependencyConfig);

    // 转发事件
    this.forwardEvents();
  }

  /**
   * 转发内部事件到外部
   */
  private forwardEvents(): void {
    // Loader 事件
    for (const event of Object.values(SkillLoaderEvent)) {
      this.loader.on(event, (data) => this.emit(event, data));
    }

    // Executor 事件
    for (const event of Object.values(SkillExecutorEvent)) {
      this.executor.on(event, (data) => this.emit(event, data));
    }

    // DependencyManager 事件
    for (const event of Object.values(DependencyManagerEvent)) {
      this.dependencyManager.on(event, (data) => this.emit(event, data));
    }
  }

  // ==================== 生命周期 ====================

  /**
   * 初始化 SkillManager
   *
   * @param autoScan 是否自动扫描路径发现 Skill
   */
  async initialize(autoScan: boolean = this.config.autoScanOnStartup): Promise<void> {
    if (this.initialized) {
      console.warn('SkillManager already initialized');
      return;
    }

    console.log('Initializing SkillManager...');

    // 自动扫描路径发现 Skill
    if (autoScan) {
      const discoveredSkills = await this.discoverAll();
      console.log(`Discovered ${discoveredSkills.length} skills`);
    }

    this.initialized = true;
    this.emit('manager:initialized');
    console.log('SkillManager initialized successfully');
  }

  /**
   * 销毁 SkillManager 实例
   * 停止所有活动并清理资源
   */
  async destroy(): Promise<void> {
    console.log('Destroying SkillManager...');

    await this.loader.destroy();
    this.discoverer.clear();

    this.initialized = false;
    this.emit('manager:destroyed');
    console.log('SkillManager destroyed');
  }

  /**
   * 重新初始化 SkillManager
   * 清空所有状态并重新初始化
   */
  async reinitialize(): Promise<void> {
    await this.destroy();
    await this.initialize(true);
  }

  // ==================== Skill 发现和注册 ====================

  /**
   * 扫描所有配置路径发现 Skill
   *
   * @returns 发现的 Skill 列表
   */
  async discoverAll(): Promise<SkillRegistration[]> {
    const skills = await this.discoverer.discoverAll();

    // 注册到依赖管理器
    skills.forEach((skill) => this.dependencyManager.registerSkill(skill));

    this.emit('skills:discovered', { count: skills.length });
    return skills;
  }

  /**
   * 从指定路径发现 Skill
   *
   * @param scanPath 扫描路径
   * @returns 发现的 Skill 列表
   */
  async discoverFromPath(scanPath: string): Promise<SkillRegistration[]> {
    const skills = await this.discoverer.discoverFromPath(scanPath);
    skills.forEach((skill) => this.dependencyManager.registerSkill(skill));
    return skills;
  }

  /**
   * 手动注册单个 Skill
   *
   * @param skill Skill 注册信息
   * @returns 完整的 SkillRegistration
   */
  registerSkill(
    skill: Partial<SkillRegistration> & { name: string; entryPoint: string }
  ): SkillRegistration {
    const registration = this.discoverer.registerSkill(skill);
    this.dependencyManager.registerSkill(registration);
    this.emit('skill:registered', { skillId: registration.id, name: registration.name });
    return registration;
  }

  /**
   * 注销 Skill
   *
   * @param skillId Skill ID
   * @returns 是否成功注销
   */
  async unregisterSkill(skillId: string): Promise<boolean> {
    // 如果已加载，先卸载
    if (this.loader.isSkillLoaded(skillId)) {
      await this.loader.unloadSkill(skillId);
    }

    const result = this.dependencyManager.unregisterSkill(skillId);
    if (result) {
      this.discoverer.unregisterSkill(skillId);
      this.emit('skill:unregistered', { skillId });
    }
    return result;
  }

  /**
   * 添加扫描路径
   *
   * @param scanPath 新的扫描路径
   */
  addScanPath(scanPath: string): void {
    this.discoverer.addScanPath(scanPath);
  }

  /**
   * 移除扫描路径
   *
   * @param scanPath 要移除的扫描路径
   * @returns 是否成功移除
   */
  removeScanPath(scanPath: string): boolean {
    return this.discoverer.removeScanPath(scanPath);
  }

  /**
   * 刷新发现（清空并重新扫描）
   *
   * @returns 重新发现的 Skill 列表
   */
  async refreshDiscovery(): Promise<SkillRegistration[]> {
    // 先卸载所有已加载的 Skill
    await this.loader.unloadAll();

    // 重新发现
    const skills = await this.discoverer.refresh();
    this.emit('skills:refreshed', { count: skills.length });

    // 更新依赖管理器
    skills.forEach((skill) => this.dependencyManager.registerSkill(skill));

    return skills;
  }

  // ==================== Skill 加载和卸载 ====================

  /**
   * 加载单个 Skill
   *
   * @param skillId Skill ID
   * @returns 加载结果
   */
  async loadSkill(skillId: string): Promise<SkillLoadResult> {
    const skill = this.discoverer.getDiscoveredSkill(skillId);

    if (!skill) {
      return {
        success: false,
        skillId,
        error: `Skill not found: ${skillId}`,
      };
    }

    // 自动检查依赖（如果配置了）
    if (this.config.dependencyConfig.autoCheckOnLoad) {
      const check = this.dependencyManager.checkDependencies(skillId);
      if (!check.satisfied) {
        return {
          success: false,
          skillId,
          error: `Dependency check failed: ${JSON.stringify(check)}`,
        };
      }
    }

    const result = await this.loader.loadSkill(skill);
    this.emit('skill:loaded', {
      skillId,
      name: skill.name,
      success: result.success,
    });

    return result;
  }

  /**
   * 加载所有已发现的 Skill
   *
   * @returns 加载结果列表
   */
  async loadAllSkills(): Promise<SkillLoadResult[]> {
    const skills = this.discoverer.getDiscoveredSkills();
    const results: SkillLoadResult[] = [];

    for (const skill of skills) {
      const result = await this.loadSkill(skill.id);
      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    this.emit('skills:all-loaded', {
      total: skills.length,
      success: successCount,
      failed: skills.length - successCount,
    });

    return results;
  }

  /**
   * 卸载单个 Skill
   *
   * @param skillId Skill ID
   * @returns 是否成功卸载
   */
  async unloadSkill(skillId: string): Promise<boolean> {
    const result = await this.loader.unloadSkill(skillId);
    if (result) {
      this.emit('skill:unloaded', { skillId });
    }
    return result;
  }

  /**
   * 卸载所有已加载的 Skill
   */
  async unloadAllSkills(): Promise<void> {
    await this.loader.unloadAll();
    this.emit('skills:all-unloaded');
  }

  /**
   * 重新加载 Skill
   *
   * @param skillId Skill ID
   * @returns 重新加载结果
   */
  async reloadSkill(skillId: string): Promise<SkillLoadResult | null> {
    const result = await this.loader.reloadSkill(skillId);
    if (result) {
      this.emit('skill:reloaded', { skillId, success: result.success });
    }
    return result;
  }

  // ==================== Skill 执行 ====================

  /**
   * 执行 Skill
   *
   * @param request 执行请求
   * @returns 执行响应
   */
  async executeSkill(request: SkillExecutionRequest): Promise<SkillExecutionResponse> {
    // 如果 Skill 未加载，尝试自动加载
    if (!this.loader.isSkillLoaded(request.skillId)) {
      const loadResult = await this.loadSkill(request.skillId);
      if (!loadResult.success) {
        return {
          success: false,
          requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          skillId: request.skillId,
          version: request.version || 'unknown',
          status: 'failed' as any,
          error: `Failed to auto-load skill: ${loadResult.error}`,
          duration: 0,
          retries: 0,
        };
      }
    }

    return this.loader.executeSkill(request);
  }

  /**
   * 并行批量执行 Skill
   *
   * @param requests 执行请求列表
   * @param maxConcurrency 最大并发数
   * @returns 执行响应列表
   */
  async executeSkillsParallel(
    requests: SkillExecutionRequest[],
    maxConcurrency?: number
  ): Promise<SkillExecutionResponse[]> {
    // 先确保所有 Skill 都已加载
    for (const request of requests) {
      if (!this.loader.isSkillLoaded(request.skillId)) {
        await this.loadSkill(request.skillId);
      }
    }

    return this.loader.executeParallel(requests, maxConcurrency);
  }

  /**
   * 串行批量执行 Skill
   *
   * @param requests 执行请求列表
   * @returns 执行响应列表
   */
  async executeSkillsSerial(
    requests: SkillExecutionRequest[]
  ): Promise<SkillExecutionResponse[]> {
    // 先确保所有 Skill 都已加载
    for (const request of requests) {
      if (!this.loader.isSkillLoaded(request.skillId)) {
        await this.loadSkill(request.skillId);
      }
    }

    return this.loader.executeSerial(requests);
  }

  /**
   * 带依赖关系的批量执行
   * 按拓扑排序顺序执行 Skill，确保依赖先执行
   *
   * @param inputs Skill ID 到输入数据的映射
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeSkillsWithDependencies(
    inputs: Record<string, any>,
    options: {
      continueOnFailure?: boolean;
      parallelInBatch?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    results: Record<string, SkillExecutionResponse>;
    failedBatches: number[];
    completedBatches: number;
    totalBatches: number;
  }> {
    // 先确保所有 Skill 都已加载
    for (const skillId of Object.keys(inputs)) {
      if (!this.loader.isSkillLoaded(skillId)) {
        await this.loadSkill(skillId);
      }
    }

    // 使用依赖管理器执行
    return this.dependencyManager.executeWithDependencies(
      inputs,
      (req) => this.loader.executeSkill(req),
      options
    );
  }

  // ==================== Skill 查询和搜索 ====================

  /**
   * 获取单个已发现的 Skill
   *
   * @param skillId Skill ID
   * @returns Skill 注册信息（如果存在）
   */
  getSkill(skillId: string): SkillRegistration | undefined {
    return this.discoverer.getDiscoveredSkill(skillId);
  }

  /**
   * 获取所有已发现的 Skill
   *
   * @returns Skill 注册信息列表
   */
  getAllSkills(): SkillRegistration[] {
    return this.discoverer.getDiscoveredSkills();
  }

  /**
   * 获取所有已加载的 Skill
   *
   * @returns 已加载的 Skill 列表
   */
  getLoadedSkills(): SkillRegistration[] {
    return this.getAllSkills().filter((skill) => this.loader.isSkillLoaded(skill.id));
  }

  /**
   * 按名称查找 Skill
   *
   * @param name Skill 名称
   * @returns 匹配的 Skill（如果存在）
   */
  findSkillByName(name: string): SkillRegistration | undefined {
    return this.discoverer.findDiscoveredSkillByName(name);
  }

  /**
   * 搜索 Skill
   *
   * @param options 搜索选项
   * @returns 匹配的 Skill 列表
   */
  searchSkills(options: SkillSearchOptions): SkillRegistration[] {
    let skills = this.getAllSkills();

    // 按状态过滤
    if (options.status && options.status.length > 0) {
      skills = skills.filter((s) => options.status!.includes(s.status));
    }

    // 按标签过滤
    if (options.tags && options.tags.length > 0) {
      skills = skills.filter((s) =>
        options.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    // 按搜索关键词过滤
    if (options.query) {
      const query = options.query.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // 排序
    if (options.sortBy) {
      skills.sort((a, b) => {
        let comparison = 0;
        switch (options.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'version':
            comparison = a.version.localeCompare(b.version);
            break;
          case 'createdAt':
            comparison =
              (a.metadata?.createdAt?.getTime() || 0) -
              (b.metadata?.createdAt?.getTime() || 0);
            break;
          case 'updatedAt':
            comparison =
              (a.metadata?.updatedAt?.getTime() || 0) -
              (b.metadata?.updatedAt?.getTime() || 0);
            break;
        }
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || skills.length;

    return skills.slice(offset, offset + limit);
  }

  /**
   * 为任务匹配最合适的 Skill
   *
   * @param taskDescription 任务描述
   * @param requiredSkills 必需的技能标签
   * @returns 匹配结果列表（按得分排序）
   */
  matchSkillsForTask(
    taskDescription: string,
    requiredSkills?: string[]
  ): SkillMatchResult[] {
    const allReadySkills = this.getAllSkills().filter(
      (s) => (s.status === SkillStatus.READY || s.status === SkillStatus.REGISTERED) && s.config?.enabled !== false
    );

    const results: SkillMatchResult[] = [];

    for (const skill of allReadySkills) {
      let score = 0;
      const matchedFields: string[] = [];

      // 检查技能标签匹配
      if (requiredSkills && requiredSkills.length > 0) {
        const matchedTags = requiredSkills.filter((req) =>
          skill.tags.some((tag) =>
            tag.toLowerCase().includes(req.toLowerCase())
          )
        );
        if (matchedTags.length > 0) {
          score += (matchedTags.length / requiredSkills.length) * 0.5;
          matchedFields.push('tags');
        }
      }

      // 检查描述文本匹配
      const descriptionLower = taskDescription.toLowerCase();
      const skillNameLower = skill.name.toLowerCase();
      const skillDescLower = skill.description.toLowerCase();

      if (descriptionLower.includes(skillNameLower)) {
        score += 0.3;
        matchedFields.push('name');
      }

      if (
        skillDescLower &&
        descriptionLower.split(' ').some((word) => skillDescLower.includes(word))
      ) {
        score += 0.2;
        matchedFields.push('description');
      }

      if (score > 0) {
        results.push({
          skill,
          score: Math.min(score, 1),
          matchedFields,
          explanation: `匹配度: ${Math.round(score * 100)}%`,
        });
      }
    }

    // 按分数降序排序
    return results.sort((a, b) => b.score - a.score);
  }

  // ==================== 依赖管理 ====================

  /**
   * 检查单个 Skill 的依赖是否满足
   *
   * @param skillId Skill ID
   * @param requiredStatus 要求的依赖状态
   * @returns 检查结果
   */
  checkSkillDependencies(
    skillId: string,
    requiredStatus?: SkillStatus
  ): DependencyCheckResult {
    return this.dependencyManager.checkDependencies(skillId, requiredStatus);
  }

  /**
   * 检查所有已注册 Skill 的依赖
   *
   * @returns 所有 Skill 的检查结果汇总
   */
  checkAllDependencies() {
    return this.dependencyManager.checkAllDependencies();
  }

  /**
   * 检测循环依赖
   *
   * @param startSkillIds 可选的起始 Skill ID 列表，不指定则检测整个图
   * @returns 检测到的循环依赖链列表
   */
  detectCycles(startSkillIds?: string[]): string[][] {
    return this.dependencyManager.detectCycle(startSkillIds);
  }

  /**
   * 计算拓扑排序，生成可执行的 Skill 顺序
   *
   * @param targetSkillIds 目标 Skill ID 列表（可选，不指定则计算整个图）
   * @returns 拓扑排序结果，包含排序后的顺序和层级结构
   */
  computeDependencyTopology(targetSkillIds?: string[]): TopologyResult {
    return this.dependencyManager.computeTopology(targetSkillIds);
  }

  /**
   * 获取 Skill 的直接依赖
   *
   * @param skillId Skill ID
   * @returns 直接依赖的 Skill ID 列表
   */
  getDirectDependencies(skillId: string): string[] {
    return this.dependencyManager.getDirectDependencies(skillId);
  }

  /**
   * 获取 Skill 的所有依赖（递归）
   *
   * @param skillId Skill ID
   * @returns 所有依赖的 Skill ID 列表（去重）
   */
  getAllDependencies(skillId: string): string[] {
    return this.dependencyManager.getAllDependencies(skillId);
  }

  /**
   * 获取依赖当前 Skill 的所有 Skill（反向依赖）
   *
   * @param skillId Skill ID
   * @returns 依赖该 Skill 的所有 Skill ID 列表
   */
  getDependents(skillId: string): string[] {
    return this.dependencyManager.getDependents(skillId);
  }

  /**
   * 构建依赖树（用于可视化）
   *
   * @param skillId 根 Skill ID
   * @param maxDepth 最大深度
   * @returns 依赖树结构
   */
  buildDependencyTree(
    skillId: string,
    maxDepth: number = 10
  ): DependencyTreeNode | null {
    return this.dependencyManager.buildDependencyTree(skillId, maxDepth);
  }

  /**
   * 生成 ASCII 格式的依赖树字符串
   *
   * @param skillId 根 Skill ID
   * @param maxDepth 最大深度
   * @returns 格式化的依赖树字符串
   */
  printDependencyTree(skillId: string, maxDepth: number = 10): string {
    return this.dependencyManager.printDependencyTree(skillId, maxDepth);
  }

  /**
   * 生成加载批次 - 用于按依赖顺序加载 Skill
   *
   * @returns 加载批次列表，可并行加载的 Skill 在同一批次
   */
  generateLoadBatches(): string[][] {
    return this.dependencyManager.generateLoadBatches();
  }

  /**
   * 按依赖顺序批量加载 Skill
   *
   * @param skillIds 要加载的 Skill ID 列表（可选，不指定则加载所有）
   * @returns 加载结果
   */
  async loadSkillsInDependencyOrder(
    skillIds?: string[]
  ): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
    loadedCount: number;
  }> {
    // 生成加载批次
    const batches = this.dependencyManager.generateLoadBatches();
    const results: Record<string, { success: boolean; error?: string }> = {};
    let loadedCount = 0;

    // 按批次加载
    for (const batch of batches) {
      // 过滤出需要加载的 Skill
      const toLoad = skillIds ? batch.filter((id) => skillIds.includes(id)) : batch;

      // 并行加载当前批次
      const batchResults = await Promise.all(
        toLoad.map(async (skillId) => {
          const result = await this.loadSkill(skillId);
          results[skillId] = {
            success: result.success,
            error: result.error,
          };
          if (result.success) {
            loadedCount++;
          }
          return result;
        })
      );

      // 如果有失败且是严格模式，停止加载
      const hasFailure = batchResults.some((r) => !r.success);
      if (hasFailure && this.config.dependencyConfig.strictMode) {
        return {
          success: false,
          results,
          loadedCount,
        };
      }
    }

    return {
      success: Object.values(results).every((r) => r.success),
      results,
      loadedCount,
    };
  }

  // ==================== 统计和监控 ====================

  /**
   * 获取 Skill 执行统计
   *
   * @param skillId Skill ID
   * @returns 统计信息
   */
  getSkillStats(skillId: string) {
    return this.loader.getFullExecutionStats(skillId);
  }

  /**
   * 获取系统概览
   *
   * @returns 系统概览信息
   */
  getOverview(): {
    totalSkills: number;
    loadedSkills: number;
    readySkills: number;
    errorSkills: number;
    totalExecutions: number;
    successRate: number;
  } {
    const allSkills = this.getAllSkills();
    const globalStats = this.executor.getAllSkillStats();

    const totalExecutions = Object.values(globalStats).reduce(
      (sum, s) => sum + s.totalExecutions,
      0
    );
    const successfulExecutions = Object.values(globalStats).reduce(
      (sum, s) => sum + s.successfulExecutions,
      0
    );

    return {
      totalSkills: allSkills.length,
      loadedSkills: this.getLoadedSkills().length,
      readySkills: allSkills.filter((s) => s.status === SkillStatus.READY || s.status === SkillStatus.REGISTERED).length,
      errorSkills: allSkills.filter((s) => s.status === SkillStatus.ERROR).length,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    };
  }

  /**
   * 获取全局执行统计
   *
   * @returns 完整的全局统计
   */
  getGlobalStats() {
    const stats = this.executor.getGlobalStats();
    return {
      ...stats,
      avgExecutionTime: stats.averageDuration,
    };
  }

  /**
   * 获取全局执行统计（完整版本）
   *
   * @returns 完整的全局统计
   */
  getFullGlobalStats() {
    return this.executor.getGlobalStats();
  }

  /**
   * 获取所有 Skill 的统计
   *
   * @returns 所有 Skill 的统计
   */
  getAllSkillStats(): Record<string, ExecutionStats> {
    return this.executor.getAllSkillStats();
  }

  // ==================== 安全模式 ====================

  /**
   * 进入安全模式（紧急情况下使用）
   * 终止所有执行并禁止新的 Skill 加载
   */
  enterSafeMode(): void {
    this.loader.enterSafeMode();
    this.emit('security:safe-mode:entered');
  }

  /**
   * 退出安全模式
   */
  exitSafeMode(): void {
    this.loader.exitSafeMode();
    this.emit('security:safe-mode:exited');
  }

  /**
   * 检查是否在安全模式
   *
   * @returns 是否在安全模式
   */
  isInSafeMode(): boolean {
    return this.loader.isInSafeMode();
  }

  /**
   * 获取安全状态信息
   *
   * @returns 安全状态对象
   */
  getSecurityStatus(): any {
    return this.loader.getSecurityStatus();
  }

  // ==================== 配置管理 ====================

  /**
   * 获取当前配置
   *
   * @returns 当前配置
   */
  getConfig(): SkillManagerConfig {
    return { ...this.config };
  }

  /**
   * 更新 Executor 配置
   *
   * @param newConfig 新的 Executor 配置
   */
  updateExecutorConfig(newConfig: Partial<SkillExecutorConfig>): void {
    this.loader.updateExecutorConfig(newConfig);
  }

  // ==================== 辅助方法 ====================

  /**
   * 检查 Skill 是否已加载
   *
   * @param skillId Skill ID
   * @returns 是否已加载
   */
  isSkillLoaded(skillId: string): boolean {
    return this.loader.isSkillLoaded(skillId);
  }

  /**
   * 获取已加载的 Skill ID 列表
   *
   * @returns Skill ID 列表
   */
  getLoadedSkillIds(): string[] {
    return this.loader.getLoadedSkillIds();
  }

  /**
   * 获取已加载的 Skill 数量
   *
   * @returns Skill 数量
   */
  getLoadedCount(): number {
    return this.loader.getLoadedCount();
  }

  /**
   * 获取内部的 Executor 实例（用于高级操作）
   *
   * @returns SkillExecutor 实例
   */
  getExecutor(): SkillExecutor {
    return this.executor;
  }

  /**
   * 获取内部的 Loader 实例（用于高级操作）
   *
   * @returns SkillLoader 实例
   */
  getLoader(): SkillLoader {
    return this.loader;
  }

  /**
   * 获取内部的 Discoverer 实例（用于高级操作）
   *
   * @returns SkillDiscoverer 实例
   */
  getDiscoverer(): SkillDiscoverer {
    return this.discoverer;
  }

  /**
   * 获取内部的 DependencyManager 实例（用于高级操作）
   *
   * @returns SkillDependencyManager 实例
   */
  getDependencyManager(): SkillDependencyManager {
    return this.dependencyManager;
  }
}

// ==================== 导出单例 ====================

/**
 * SkillManager 单例实例
 * 大多数情况下应该使用这个单例
 */
export const skillManager = new SkillManager();

export default SkillManager;
