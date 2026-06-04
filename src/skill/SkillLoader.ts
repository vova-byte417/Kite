/**
 * Skill 加载器 - 负责 Skill 的动态加载、沙箱执行和生命周期管理
 *
 * 集成 VMSecurityManager 提供安全沙箱环境，支持：
 * - Skill 发现与加载
 * - VM 沙箱隔离执行
 * - 生命周期钩子（onLoad/onUnload）
 * - 热重载支持
 *
 * Skill 执行功能已委托给 SkillExecutor
 *
 * @author vova
 * @version 2.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// 导入安全管理器
import {
  VMSandboxSecurityManager,
  SecureSandbox,
  PermissionCategory,
  ExecutionResult,
} from './VMSecurityManager';

// 导入 SkillExecutor
import { SkillExecutor, SkillExecutorConfig, SkillExecutorEvent } from './SkillExecutor';

// 导入类型定义
import {
  SkillRegistration,
  SkillExecutionRequest,
  SkillExecutionResponse,
  SkillLoadResult,
  SkillStatus,
  SkillExecutionStatus,
} from './types';

// ==================== 类型定义 ====================

/**
 * Skill 导出接口规范
 * 所有 Skill 必须实现此接口才能被正确加载和执行
 */
export interface SkillExport {
  /**
   * 主执行函数 - Skill 的核心逻辑
   * @param input 输入参数
   * @param context 执行上下文
   */
  execute: (input: any, context?: any) => Promise<any>;

  /**
   * 输入验证函数（可选）
   * 在执行前验证输入参数的合法性
   */
  validateInput?: (input: any) => Promise<boolean>;

  /**
   * 输出验证函数（可选）
   * 在执行后验证输出结果的合法性
   */
  validateOutput?: (output: any) => Promise<boolean>;

  /**
   * Skill 加载钩子（可选）
   * 在 Skill 加载完成后执行，用于初始化资源
   */
  onLoad?: () => Promise<void>;

  /**
   * Skill 卸载钩子（可选）
   * 在 Skill 卸载前执行，用于清理资源
   */
  onUnload?: () => Promise<void>;
}

/**
 * 已加载的 Skill 实例
 */
interface LoadedSkill {
  registration: SkillRegistration;
  module: SkillExport;
  sandbox?: SecureSandbox;
  loadedAt: Date;
  executionCount: number;
  lastExecutedAt?: Date;
}

/**
 * SkillLoader 配置选项
 */
export interface SkillLoaderConfig {
  /** 是否启用沙箱模式（推荐生产环境启用） */
  enableSandbox: boolean;

  /** 沙箱配置 */
  sandboxConfig?: {
    freeze?: boolean;
    strict?: boolean;
    eval?: boolean;
    wasm?: boolean;
    asyncTimeout?: number;
  };

  /** SkillExecutor 配置 */
  executorConfig?: Partial<SkillExecutorConfig>;

  /** 是否在加载时自动运行 onLoad 钩子 */
  autoRunOnLoad: boolean;

  /** 是否在卸载时自动运行 onUnload 钩子 */
  autoRunOnUnload: boolean;

  /** 热重载支持（文件变化时自动重新加载） */
  enableHotReload: boolean;

  /** 热重载检查间隔（毫秒） */
  hotReloadInterval: number;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SkillLoaderConfig = {
  enableSandbox: true,
  autoRunOnLoad: true,
  autoRunOnUnload: true,
  enableHotReload: false,
  hotReloadInterval: 5000,
};

// ==================== 事件定义 ====================

export enum SkillLoaderEvent {
  SKILL_LOADED = 'skill:loaded',
  SKILL_UNLOADED = 'skill:unloaded',
  SKILL_RELOADED = 'skill:reloaded',
  SKILL_EXECUTE_START = 'skill:execute:start',
  SKILL_EXECUTE_SUCCESS = 'skill:execute:success',
  SKILL_EXECUTE_ERROR = 'skill:execute:error',
  SKILL_VALIDATION_ERROR = 'skill:validation:error',
}

// ==================== 主类实现 ====================

/**
 * Skill 加载器
 *
 * 负责 Skill 的加载、执行和生命周期管理
 * 支持沙箱模式和非沙箱模式
 *
 * @example
 * ```typescript
 * const loader = new SkillLoader();
 *
 * // 加载 Skill
 * const result = await loader.loadSkill(skillRegistration);
 *
 * // 执行 Skill
 * const response = await loader.executeSkill({
 *   skillId: 'my-skill',
 *   input: { data: 'test' }
 * });
 *
 * // 卸载 Skill
 * await loader.unloadSkill('my-skill');
 * ```
 */
export class SkillLoader extends EventEmitter {
  private config: SkillLoaderConfig;
  private loadedSkills = new Map<string, LoadedSkill>();
  private securityManager: VMSandboxSecurityManager;
  private executor: SkillExecutor;
  private hotReloadTimers = new Map<string, NodeJS.Timeout>();
  private fileLastModified = new Map<string, number>();

  constructor(config: Partial<SkillLoaderConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 初始化安全管理器
    this.securityManager = VMSandboxSecurityManager.getInstance(
      this.config.sandboxConfig
    );

    // 初始化 SkillExecutor
    this.executor = new SkillExecutor(this.config.executorConfig);

    // 设置 Skill 模块获取器，供 Executor 使用
    this.executor.setSkillModuleGetter((skillId) => {
      const loadedSkill = this.loadedSkills.get(skillId);
      return loadedSkill?.module;
    });

    // 转发 Executor 事件
    this.forwardExecutorEvents();
  }

  /**
   * 转发 Executor 事件到 Loader 事件
   */
  private forwardExecutorEvents(): void {
    const eventMapping: Record<string, SkillLoaderEvent> = {
      [SkillExecutorEvent.EXECUTE_START]: SkillLoaderEvent.SKILL_EXECUTE_START,
      [SkillExecutorEvent.EXECUTE_SUCCESS]: SkillLoaderEvent.SKILL_EXECUTE_SUCCESS,
      [SkillExecutorEvent.EXECUTE_ERROR]: SkillLoaderEvent.SKILL_EXECUTE_ERROR,
      [SkillExecutorEvent.VALIDATION_ERROR]: SkillLoaderEvent.SKILL_VALIDATION_ERROR,
    };

    for (const [executorEvent, loaderEvent] of Object.entries(eventMapping)) {
      this.executor.on(executorEvent, (data) => {
        this.emit(loaderEvent, data);
      });
    }
  }

  // ==================== 核心加载方法 ====================

  /**
   * 加载单个 Skill
   *
   * @param skill Skill 注册信息
   * @returns 加载结果
   */
  async loadSkill(skill: SkillRegistration): Promise<SkillLoadResult> {
    const startTime = Date.now();

    try {
      // 如果已加载，先卸载旧版本
      if (this.loadedSkills.has(skill.id)) {
        await this.unloadSkill(skill.id, false);
      }

      // 验证入口文件存在
      if (!fs.existsSync(skill.entryPoint)) {
        throw new Error(`Skill entry file not found: ${skill.entryPoint}`);
      }

      let loadedSkill: LoadedSkill;

      if (this.config.enableSandbox) {
        loadedSkill = await this.loadWithSandbox(skill);
      } else {
        loadedSkill = await this.loadWithRequire(skill);
      }

      // 更新状态
      skill.status = SkillStatus.READY;
      skill.loadedAt = new Date();

      this.loadedSkills.set(skill.id, loadedSkill);

      // 执行 onLoad 钩子
      if (this.config.autoRunOnLoad && loadedSkill.module.onLoad) {
        try {
          await loadedSkill.module.onLoad();
        } catch (error) {
          console.warn(
            `Skill onLoad hook execution failed: ${(error as Error).message}`
          );
        }
      }

      // 启动热重载监控（如果启用）
      if (this.config.enableHotReload) {
        this.startHotReloadMonitor(skill);
      }

      this.emit(SkillLoaderEvent.SKILL_LOADED, {
        skillId: skill.id,
        name: skill.name,
        duration: Date.now() - startTime,
      });

      const loadTime = Date.now() - startTime;

      return {
        success: true,
        skillId: skill.id,
        message: `Skill '${skill.name}' loaded successfully`,
        loadTime,
      };
    } catch (error) {
      skill.status = SkillStatus.ERROR;
      skill.error = (error as Error).message;

      this.emit(SkillLoaderEvent.SKILL_EXECUTE_ERROR, {
        skillId: skill.id,
        error: (error as Error).message,
        operation: 'load',
      });

      const loadTime = Date.now() - startTime;

      return {
        success: false,
        skillId: skill.id,
        error: (error as Error).message,
        loadTime,
      };
    }
  }

  /**
   * 批量加载多个 Skill
   *
   * @param skills Skill 注册信息列表
   * @returns 加载结果列表
   */
  async loadSkills(skills: SkillRegistration[]): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];

    for (const skill of skills) {
      const result = await this.loadSkill(skill);
      results.push(result);
    }

    return results;
  }

  /**
   * 批量加载多个 Skill（别名方法）
   *
   * @param skills Skill 注册信息数组
   * @returns 加载结果数组
   */
  async loadAll(skills: SkillRegistration[]): Promise<SkillLoadResult[]> {
    return this.loadSkills(skills);
  }

  // ==================== 执行方法（委托给 SkillExecutor） ====================

  /**
   * 执行 Skill（委托给 SkillExecutor）
   *
   * @param request 执行请求
   * @returns 执行响应
   */
  async executeSkill(
    request: SkillExecutionRequest
  ): Promise<SkillExecutionResponse> {
    const skillId = request.skillId;

    // 检查 Skill 是否已加载
    if (!this.loadedSkills.has(skillId)) {
      return {
        success: false,
        requestId: request.context?.taskId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        skillId,
        version: request.version || 'unknown',
        status: SkillExecutionStatus.FAILED,
        error: `Skill not loaded: ${skillId}`,
        duration: 0,
        retries: 0,
      };
    }

    const response = await this.executor.execute(request);

    // 如果执行成功，更新加载的 Skill 的统计信息
    if (response.success) {
      const loadedSkill = this.loadedSkills.get(skillId);
      if (loadedSkill) {
        loadedSkill.executionCount++;
        loadedSkill.lastExecutedAt = new Date();
      }
    }

    return response;
  }

  /**
   * 批量并行执行多个 Skill
   *
   * @param requests 执行请求列表
   * @param maxConcurrency 最大并发数
   * @returns 执行响应列表
   */
  async executeParallel(
    requests: SkillExecutionRequest[],
    maxConcurrency?: number
  ): Promise<SkillExecutionResponse[]> {
    return this.executor.executeParallel(requests, maxConcurrency);
  }

  /**
   * 批量串行执行多个 Skill
   *
   * @param requests 执行请求列表
   * @returns 执行响应列表
   */
  async executeSerial(
    requests: SkillExecutionRequest[]
  ): Promise<SkillExecutionResponse[]> {
    return this.executor.executeSerial(requests);
  }

  /**
   * 带依赖关系的批量执行
   *
   * @param requests 执行请求列表
   * @param dependencies 依赖关系图 { skillId: [依赖的skillId] }
   * @returns 执行响应列表
   */
  async executeWithDependencies(
    requests: SkillExecutionRequest[],
    dependencies: Record<string, string[]>
  ): Promise<SkillExecutionResponse[]> {
    return this.executor.executeWithDependencies(requests, dependencies);
  }

  // ==================== 卸载方法 ====================

  /**
   * 卸载单个 Skill
   *
   * @param skillId Skill ID
   * @param runOnUnloadHook 是否运行 onUnload 钩子
   * @returns 是否成功卸载
   */
  async unloadSkill(
    skillId: string,
    runOnUnloadHook: boolean = this.config.autoRunOnUnload
  ): Promise<boolean> {
    const loadedSkill = this.loadedSkills.get(skillId);

    if (!loadedSkill) {
      return false;
    }

    try {
      // 执行 onUnload 钩子
      if (runOnUnloadHook && loadedSkill.module.onUnload) {
        await loadedSkill.module.onUnload();
      }

      // 停止热重载监控
      this.stopHotReloadMonitor(skillId);

      // 销毁沙箱
      if (loadedSkill.sandbox) {
        this.securityManager.destroySandbox(skillId);
      }

      // 清除 require 缓存（非沙箱模式）
      if (!this.config.enableSandbox) {
        try {
          delete require.cache[require.resolve(loadedSkill.registration.entryPoint)];
        } catch (e) {
          // 忽略缓存清除错误
        }
      }

      // 更新状态
      loadedSkill.registration.status = SkillStatus.REGISTERED;

      this.loadedSkills.delete(skillId);

      this.emit(SkillLoaderEvent.SKILL_UNLOADED, {
        skillId,
        name: loadedSkill.registration.name,
      });

      return true;
    } catch (error) {
      console.error(`Failed to unload skill ${skillId}:`, error);
      return false;
    }
  }

  /**
   * 卸载所有已加载的 Skill
   */
  async unloadAll(): Promise<void> {
    const skillIds = Array.from(this.loadedSkills.keys());

    for (const skillId of skillIds) {
      await this.unloadSkill(skillId);
    }
  }

  // ==================== 重载方法 ====================

  /**
   * 重新加载 Skill
   *
   * @param skillId Skill ID
   * @returns 重新加载结果
   */
  async reloadSkill(skillId: string): Promise<SkillLoadResult | null> {
    const loadedSkill = this.loadedSkills.get(skillId);

    if (!loadedSkill) {
      return null;
    }

    // 先卸载
    await this.unloadSkill(skillId);

    // 重新加载
    const result = await this.loadSkill(loadedSkill.registration);

    this.emit(SkillLoaderEvent.SKILL_RELOADED, {
      skillId,
      success: result.success,
    });

    return result;
  }

  // ==================== 查询方法 ====================

  /**
   * 检查 Skill 是否已加载
   *
   * @param skillId Skill ID
   * @returns 是否已加载
   */
  isSkillLoaded(skillId: string): boolean {
    return this.loadedSkills.has(skillId);
  }

  /**
   * 获取已加载的 Skill 信息
   *
   * @param skillId Skill ID
   * @returns Skill 信息（如果已加载）
   */
  getLoadedSkill(skillId: string): LoadedSkill | undefined {
    return this.loadedSkills.get(skillId);
  }

  /**
   * 获取所有已加载的 Skill ID 列表
   *
   * @returns Skill ID 列表
   */
  getLoadedSkillIds(): string[] {
    return Array.from(this.loadedSkills.keys());
  }

  /**
   * 获取已加载的 Skill 数量
   *
   * @returns Skill 数量
   */
  getLoadedCount(): number {
    return this.loadedSkills.size;
  }

  /**
   * 获取 Skill 执行统计信息（从 SkillExecutor 获取）
   *
   * @param skillId Skill ID
   * @returns 统计信息
   */
  getSkillStats(skillId: string): {
    loadedAt: Date;
    executionCount: number;
    lastExecutedAt?: Date;
  } | null {
    const loadedSkill = this.loadedSkills.get(skillId);

    if (!loadedSkill) {
      return null;
    }

    // 合并 Loader 统计和 Executor 统计
    const executorStats = this.executor.getSkillStats(skillId);

    return {
      loadedAt: loadedSkill.loadedAt,
      executionCount: executorStats.totalExecutions,
      lastExecutedAt: executorStats.lastExecutedAt,
    };
  }

  /**
   * 获取完整的执行统计（来自 SkillExecutor）
   *
   * @param skillId Skill ID
   * @returns 完整的执行统计
   */
  getFullExecutionStats(skillId: string) {
    return this.executor.getSkillStats(skillId);
  }

  /**
   * 获取全局执行统计
   *
   * @returns 全局执行统计
   */
  getGlobalExecutionStats() {
    return this.executor.getGlobalStats();
  }

  // ==================== 权限管理 ====================

  /**
   * 授予 Skill 权限
   *
   * @param skillId Skill ID
   * @param permission 权限类别
   */
  grantPermission(skillId: string, permission: PermissionCategory): void {
    this.securityManager.grantPermission(skillId, permission);
  }

  /**
   * 撤销 Skill 权限
   *
   * @param skillId Skill ID
   * @param permission 权限类别
   */
  revokePermission(skillId: string, permission: PermissionCategory): void {
    this.securityManager.revokePermission(skillId, permission);
  }

  /**
   * 检查 Skill 是否拥有指定权限
   *
   * @param skillId Skill ID
   * @param permission 权限类别
   * @returns 是否拥有权限
   */
  hasPermission(skillId: string, permission: PermissionCategory): boolean {
    return this.securityManager.hasPermission(skillId, permission);
  }

  // ==================== 安全模式 ====================

  /**
   * 进入安全模式（紧急情况下使用）
   * 终止所有执行并禁止新的 Skill 加载
   */
  enterSafeMode(): void {
    this.securityManager.enterSafeMode();
  }

  /**
   * 退出安全模式
   */
  exitSafeMode(): void {
    this.securityManager.exitSafeMode();
  }

  /**
   * 检查是否在安全模式
   *
   * @returns 是否在安全模式
   */
  isInSafeMode(): boolean {
    return this.securityManager.isInSafeMode();
  }

  /**
   * 获取安全状态信息
   *
   * @returns 安全状态对象
   */
  getSecurityStatus(): any {
    return this.securityManager.getSecurityStatus();
  }

  // ==================== Executor 访问 ====================

  /**
   * 获取内部的 SkillExecutor 实例
   * 用于高级操作，如设置钩子等
   *
   * @returns SkillExecutor 实例
   */
  getExecutor(): SkillExecutor {
    return this.executor;
  }

  /**
   * 更新 Executor 配置
   *
   * @param newConfig 新的配置
   */
  updateExecutorConfig(newConfig: Partial<SkillExecutorConfig>): void {
    this.executor.updateConfig(newConfig);
  }

  // ==================== 私有方法 ====================

  /**
   * 使用沙箱模式加载 Skill
   */
  private async loadWithSandbox(skill: SkillRegistration): Promise<LoadedSkill> {
    // 读取 Skill 代码
    const code = fs.readFileSync(skill.entryPoint, 'utf-8');

    // 检查是否包含 ES 模块语法
    const hasESM = code.includes('import ') || code.includes('export ');
    
    // 如果是 ES 模块，使用动态 import（非沙箱模式）来加载
    // 因为 vm2 的 NodeVM 默认不支持 ES 模块语法
    if (hasESM) {
      console.warn(`Skill ${skill.name} contains ES module syntax, loading without sandbox`);
      return this.loadWithRequire(skill);
    }

    // 创建沙箱
    const sandbox = await this.securityManager.createSandbox(
      skill.id,
      this.config.sandboxConfig
    );

    // 在沙箱中执行代码获取模块
    const result = await sandbox.execute(`
      // 在沙箱中定义 module 对象
      const module = { exports: {} };
      const exports = module.exports;

      // 执行用户代码
      ${code}

      // 返回导出的模块
      module.exports;
    `);

    if (!result.success) {
      throw new Error(`Failed to execute skill code: ${result.error}`);
    }

    const skillModule = result.result as SkillExport;

    // 验证模块导出
    this.validateSkillExports(skillModule);

    return {
      registration: skill,
      module: skillModule,
      sandbox,
      loadedAt: new Date(),
      executionCount: 0,
    };
  }

  /**
   * 使用动态 import 加载 Skill（非沙箱模式）
   */
  private async loadWithRequire(skill: SkillRegistration): Promise<LoadedSkill> {
    // 清除可能存在的缓存以确保加载最新版本
    try {
      delete require.cache[require.resolve(skill.entryPoint)];
    } catch (e) {
      // 忽略清除缓存错误
    }

    // 使用动态 import 加载，支持 TypeScript 文件
    const importResult = await import(skill.entryPoint);
    const skillModule = (importResult.default || importResult) as SkillExport;

    // 验证模块导出
    this.validateSkillExports(skillModule);

    return {
      registration: skill,
      module: skillModule,
      loadedAt: new Date(),
      executionCount: 0,
    };
  }

  /**
   * 验证 Skill 导出接口
   */
  private validateSkillExports(module: SkillExport): void {
    if (!module) {
      throw new Error('Skill module is null or undefined');
    }

    if (typeof module.execute !== 'function') {
      throw new Error('Skill must export an execute function');
    }

    // 验证可选钩子的类型
    if (module.validateInput !== undefined && typeof module.validateInput !== 'function') {
      throw new Error('validateInput must be a function');
    }

    if (module.validateOutput !== undefined && typeof module.validateOutput !== 'function') {
      throw new Error('validateOutput must be a function');
    }

    if (module.onLoad !== undefined && typeof module.onLoad !== 'function') {
      throw new Error('onLoad must be a function');
    }

    if (module.onUnload !== undefined && typeof module.onUnload !== 'function') {
      throw new Error('onUnload must be a function');
    }
  }

  /**
   * 启动热重载监控
   */
  private startHotReloadMonitor(skill: SkillRegistration): void {
    // 记录初始修改时间
    try {
      const stats = fs.statSync(skill.entryPoint);
      this.fileLastModified.set(skill.id, stats.mtimeMs);

      // 设置定时检查
      const timer = setInterval(async () => {
        try {
          const newStats = fs.statSync(skill.entryPoint);
          const lastModified = this.fileLastModified.get(skill.id) || 0;

          if (newStats.mtimeMs > lastModified) {
            console.log(`Skill ${skill.name} changed, reloading...`);
            this.fileLastModified.set(skill.id, newStats.mtimeMs);
            await this.reloadSkill(skill.id);
          }
        } catch (error) {
          // 文件可能被删除，停止监控
          this.stopHotReloadMonitor(skill.id);
        }
      }, this.config.hotReloadInterval);

      this.hotReloadTimers.set(skill.id, timer);
    } catch (e) {
      // 文件可能不存在，忽略
    }
  }

  /**
   * 停止热重载监控
   */
  private stopHotReloadMonitor(skillId: string): void {
    const timer = this.hotReloadTimers.get(skillId);
    if (timer) {
      clearInterval(timer);
      this.hotReloadTimers.delete(skillId);
    }
    this.fileLastModified.delete(skillId);
  }

  // ==================== 生命周期 ====================

  /**
   * 销毁 SkillLoader 实例
   * 清理所有资源
   */
  async destroy(): Promise<void> {
    // 停止所有热重载监控
    for (const skillId of this.hotReloadTimers.keys()) {
      this.stopHotReloadMonitor(skillId);
    }

    // 卸载所有 Skill
    await this.unloadAll();

    // 销毁 Executor
    this.executor.destroy();

    // 移除所有事件监听器
    this.removeAllListeners();
  }
}

// ==================== 导出单例 ====================

export const skillLoader = new SkillLoader();

export default SkillLoader;
