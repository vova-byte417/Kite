/**
 * Skill 依赖管理器 - 负责 Skill 间依赖关系的解析、拓扑排序和执行顺序管理
 *
 * 核心功能：
 * - 依赖关系图构建
 * - 循环依赖检测
 * - 拓扑排序生成加载/执行顺序
 * - 依赖验证（存在性、版本兼容性）
 * - 依赖树可视化
 * - 与 SkillExecutor 集成，支持带依赖的批量执行
 *
 * @author vova
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

// 导入类型
import {
  SkillRegistration,
  SkillDependency,
  SkillExecutionRequest,
  SkillExecutionResponse,
  SkillStatus,
} from './types';

// ==================== 类型定义 ====================

/**
 * 依赖检查结果
 */
export interface DependencyCheckResult {
  /** 检查是否通过 */
  satisfied: boolean;

  /** 缺失的依赖（必需但不存在） */
  missing: string[];

  /** 版本不匹配的依赖 */
  versionMismatch: Array<{
    skillId: string;
    required: { min?: string; max?: string };
    actual: string;
  }>;

  /** 状态未就绪的依赖 */
  notReady: Array<{
    skillId: string;
    currentStatus: SkillStatus;
    requiredStatus: SkillStatus;
  }>;

  /** 循环依赖链 */
  cycles: string[][];
}

/**
 * 依赖图节点
 */
export interface DependencyNode {
  /** Skill ID */
  id: string;

  /** Skill 名称 */
  name: string;

  /** 版本 */
  version: string;

  /** 状态 */
  status: SkillStatus;

  /** 入边（被哪些 Skill 依赖） */
  incomingEdges: string[];

  /** 出边（依赖哪些 Skill） */
  outgoingEdges: string[];
}

/**
 * 拓扑排序结果
 */
export interface TopologyResult {
  /** 排序是否成功 */
  success: boolean;

  /** 排序后的 Skill ID 顺序（如果成功） */
  order?: string[];

  /** 检测到的循环依赖 */
  cycles?: string[][];

  /** 层级结构 - 可并行的层级 */
  levels?: string[][];
}

/**
 * 依赖树节点（用于可视化）
 */
export interface DependencyTreeNode {
  /** Skill ID */
  id: string;

  /** Skill 名称 */
  name: string;

  /** 版本 */
  version: string;

  /** 深度（距离根节点的距离） */
  depth: number;

  /** 子依赖 */
  children: DependencyTreeNode[];

  /** 是否可选依赖 */
  optional?: boolean;
}

/**
 * 带依赖的执行批次
 */
export interface ExecutionBatch {
  /** 批次序号 */
  level: number;

  /** 可并行执行的 Skill ID 列表 */
  skillIds: string[];

  /** 该批次的输入数据 */
  inputs: Record<string, any>;

  /** 上游执行结果 */
  upstreamResults?: Record<string, any>;
}

/**
 * 依赖管理器配置
 */
export interface DependencyManagerConfig {
  /** 是否启用严格模式 - 严格模式下可选依赖缺失也会失败 */
  strictMode: boolean;

  /** 是否在加载时自动检查依赖 */
  autoCheckOnLoad: boolean;

  /** 最大依赖深度（防止无限递归） */
  maxDependencyDepth: number;

  /** 默认要求的依赖状态 */
  defaultRequiredStatus: SkillStatus;
}

// ==================== 事件定义 ====================

export enum DependencyManagerEvent {
  /** 依赖检查开始 */
  CHECK_STARTED = 'dependency:check:started',

  /** 依赖检查完成 */
  CHECK_COMPLETED = 'dependency:check:completed',

  /** 发现循环依赖 */
  CYCLE_DETECTED = 'dependency:cycle:detected',

  /** 依赖缺失 */
  DEPENDENCY_MISSING = 'dependency:missing',

  /** 版本不匹配 */
  VERSION_MISMATCH = 'dependency:version:mismatch',

  /** 依赖已解析 */
  DEPENDENCY_RESOLVED = 'dependency:resolved',

  /** 拓扑排序完成 */
  TOPOLOGY_COMPUTED = 'dependency:topology:computed',

  /** 批量执行开始 */
  BATCH_EXECUTION_STARTED = 'dependency:batch:started',

  /** 单批次执行完成 */
  BATCH_LEVEL_COMPLETED = 'dependency:batch:level:completed',

  /** 批量执行完成 */
  BATCH_EXECUTION_COMPLETED = 'dependency:batch:completed',
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: DependencyManagerConfig = {
  strictMode: false,
  autoCheckOnLoad: true,
  maxDependencyDepth: 50,
  defaultRequiredStatus: SkillStatus.READY,
};

// ==================== 主类实现 ====================

/**
 * Skill 依赖管理器
 *
 * 负责 Skill 间依赖关系的完整生命周期管理：
 * - 依赖图构建和维护
 * - 循环依赖检测
 * - 拓扑排序生成加载/执行顺序
 * - 依赖验证（存在性、版本兼容性）
 * - 依赖树可视化
 * - 与 SkillExecutor 集成，支持带依赖的批量执行
 *
 * @example
 * ```typescript
 * const manager = new SkillDependencyManager();
 *
 * // 注册所有 Skill
 * skills.forEach(skill => manager.registerSkill(skill));
 *
 * // 检查依赖
 * const result = manager.checkAllDependencies();
 * if (!result.satisfied) {
 *   console.error('依赖检查失败:', {
 *     missing: result.missing,
 *     cycles: result.cycles,
 *     versionMismatch: result.versionMismatch
 *   });
 * }
 *
 * // 生成拓扑排序的执行顺序
 * const topology = manager.computeTopology(['skill-a', 'skill-b']);
 *
 * // 按依赖顺序批量执行
 * const results = await manager.executeWithDependencies(
 *   { 'skill-a': { input: 'data' }, 'skill-b': { input: 'data2' } },
 *   executor
 * );
 * ```
 */
export class SkillDependencyManager extends EventEmitter {
  private config: DependencyManagerConfig;

  /** 已注册的 Skill 映射 */
  private skills = new Map<string, SkillRegistration>();

  /** 依赖图 - adjacency list 表示 */
  private dependencyGraph = new Map<string, string[]>();

  /** 反向依赖图 - 记录哪些 Skill 依赖了某个 Skill */
  private reverseDependencyGraph = new Map<string, string[]>();

  constructor(config: Partial<DependencyManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==================== 注册和注销 ====================

  /**
   * 注册单个 Skill 到依赖管理器
   *
   * @param skill Skill 注册信息
   */
  registerSkill(skill: SkillRegistration): void {
    this.skills.set(skill.id, skill);

    // 初始化该 Skill 的依赖列表
    if (!this.dependencyGraph.has(skill.id)) {
      this.dependencyGraph.set(skill.id, []);
    }

    // 初始化反向依赖列表
    if (!this.reverseDependencyGraph.has(skill.id)) {
      this.reverseDependencyGraph.set(skill.id, []);
    }

    // 解析并注册依赖关系
    skill.dependencies.forEach((dep) => {
      this.addDependency(skill.id, dep.skillId);
    });

    this.emit(DependencyManagerEvent.DEPENDENCY_RESOLVED, {
      skillId: skill.id,
      dependencyCount: skill.dependencies.length,
    });
  }

  /**
   * 批量注册多个 Skill
   *
   * @param skills Skill 注册信息列表
   */
  registerSkills(skills: SkillRegistration[]): void {
    skills.forEach((skill) => this.registerSkill(skill));
  }

  /**
   * 注销 Skill 及其依赖关系
   *
   * @param skillId Skill ID
   */
  unregisterSkill(skillId: string): boolean {
    if (!this.skills.has(skillId)) {
      return false;
    }

    // 移除该 Skill 作为依赖方的关系
    const dependencies = this.dependencyGraph.get(skillId) || [];
    dependencies.forEach((depId) => {
      const reverseDeps = this.reverseDependencyGraph.get(depId) || [];
      const idx = reverseDeps.indexOf(skillId);
      if (idx !== -1) {
        reverseDeps.splice(idx, 1);
      }
    });

    // 移除该 Skill 作为被依赖方的关系
    const dependents = this.reverseDependencyGraph.get(skillId) || [];
    dependents.forEach((dependentId) => {
      const deps = this.dependencyGraph.get(dependentId) || [];
      const idx = deps.indexOf(skillId);
      if (idx !== -1) {
        deps.splice(idx, 1);
      }
    });

    // 移除 Skill 本身
    this.skills.delete(skillId);
    this.dependencyGraph.delete(skillId);
    this.reverseDependencyGraph.delete(skillId);

    return true;
  }

  /**
   * 添加 Skill 间的依赖关系
   *
   * @param skillId 依赖方 Skill ID
   * @param dependencyId 被依赖方 Skill ID
   */
  addDependency(skillId: string, dependencyId: string): void {
    // 更新正向依赖图
    const dependencies = this.dependencyGraph.get(skillId) || [];
    if (!dependencies.includes(dependencyId)) {
      dependencies.push(dependencyId);
      this.dependencyGraph.set(skillId, dependencies);
    }

    // 更新反向依赖图
    const reverseDependencies = this.reverseDependencyGraph.get(dependencyId) || [];
    if (!reverseDependencies.includes(skillId)) {
      reverseDependencies.push(skillId);
      this.reverseDependencyGraph.set(dependencyId, reverseDependencies);
    }
  }

  /**
   * 移除 Skill 间的依赖关系
   *
   * @param skillId 依赖方 Skill ID
   * @param dependencyId 被依赖方 Skill ID
   */
  removeDependency(skillId: string, dependencyId: string): boolean {
    const dependencies = this.dependencyGraph.get(skillId);
    if (!dependencies) return false;

    const idx = dependencies.indexOf(dependencyId);
    if (idx === -1) return false;

    // 移除正向依赖
    dependencies.splice(idx, 1);

    // 移除反向依赖
    const reverseDependencies = this.reverseDependencyGraph.get(dependencyId);
    if (reverseDependencies) {
      const reverseIdx = reverseDependencies.indexOf(skillId);
      if (reverseIdx !== -1) {
        reverseDependencies.splice(reverseIdx, 1);
      }
    }

    return true;
  }

  // ==================== 依赖检查 ====================

  /**
   * 检查单个 Skill 的所有依赖是否满足
   *
   * @param skillId 要检查的 Skill ID
   * @param requiredStatus 要求的依赖状态
   * @returns 检查结果
   */
  checkDependencies(
    skillId: string,
    requiredStatus: SkillStatus = this.config.defaultRequiredStatus
  ): DependencyCheckResult {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        satisfied: false,
        missing: [skillId],
        versionMismatch: [],
        notReady: [],
        cycles: [],
      };
    }

    const result: DependencyCheckResult = {
      satisfied: true,
      missing: [],
      versionMismatch: [],
      notReady: [],
      cycles: [],
    };

    // 检查循环依赖
    const cycles = this.detectCycle([skillId]);
    if (cycles.length > 0) {
      result.satisfied = false;
      result.cycles = cycles;
      this.emit(DependencyManagerEvent.CYCLE_DETECTED, { cycles });
    }

    // 检查每个依赖
    for (const dep of skill.dependencies) {
      const dependencySkill = this.skills.get(dep.skillId);

      // 检查依赖是否存在
      if (!dependencySkill) {
        if (!dep.optional || this.config.strictMode) {
          result.satisfied = false;
          result.missing.push(dep.skillId);
          this.emit(DependencyManagerEvent.DEPENDENCY_MISSING, {
            skillId,
            dependencyId: dep.skillId,
            optional: dep.optional,
          });
        }
        continue;
      }

      // 检查版本兼容性
      if (dep.minVersion || dep.maxVersion) {
        if (!this.checkVersionCompatibility(dependencySkill.version, dep.minVersion, dep.maxVersion)) {
          result.satisfied = false;
          result.versionMismatch.push({
            skillId: dep.skillId,
            required: { min: dep.minVersion, max: dep.maxVersion },
            actual: dependencySkill.version,
          });
          this.emit(DependencyManagerEvent.VERSION_MISMATCH, {
            skillId,
            dependencyId: dep.skillId,
            required: { min: dep.minVersion, max: dep.maxVersion },
            actual: dependencySkill.version,
          });
        }
      }

      // 检查依赖状态
      if (dependencySkill.status !== requiredStatus) {
        if (!dep.optional || this.config.strictMode) {
          result.satisfied = false;
          result.notReady.push({
            skillId: dep.skillId,
            currentStatus: dependencySkill.status,
            requiredStatus,
          });
        }
      }
    }

    this.emit(DependencyManagerEvent.CHECK_COMPLETED, {
      skillId,
      satisfied: result.satisfied,
      result,
    });

    return result;
  }

  /**
   * 检查所有已注册 Skill 的依赖
   *
   * @returns 所有 Skill 的检查结果汇总
   */
  checkAllDependencies(): {
    allSatisfied: boolean;
    results: Record<string, DependencyCheckResult>;
    summary: {
      total: number;
      satisfied: number;
      withIssues: number;
      totalMissing: number;
      totalCycles: number;
    };
  } {
    const results: Record<string, DependencyCheckResult> = {};
    let allSatisfied = true;
    let totalMissing = 0;
    let totalCycles = 0;

    for (const skillId of this.skills.keys()) {
      const check = this.checkDependencies(skillId);
      results[skillId] = check;

      if (!check.satisfied) {
        allSatisfied = false;
      }

      totalMissing += check.missing.length;
      totalCycles += check.cycles.length;
    }

    return {
      allSatisfied,
      results,
      summary: {
        total: this.skills.size,
        satisfied: Object.values(results).filter((r) => r.satisfied).length,
        withIssues: Object.values(results).filter((r) => !r.satisfied).length,
        totalMissing,
        totalCycles,
      },
    };
  }

  /**
   * 检查版本兼容性（简化版 - 基本的字符串比较）
   * 实际项目中可以使用 semver 库
   */
  private checkVersionCompatibility(
    currentVersion: string,
    minVersion?: string,
    maxVersion?: string
  ): boolean {
    if (!minVersion && !maxVersion) return true;

    // 简单的字符串比较（适用于 x.y.z 格式）
    if (minVersion && currentVersion < minVersion) {
      return false;
    }
    if (maxVersion && currentVersion > maxVersion) {
      return false;
    }

    return true;
  }

  // ==================== 循环依赖检测 ====================

  /**
   * 检测循环依赖
   *
   * @param startSkillIds 可选的起始 Skill ID 列表，不指定则检测整个图
   * @returns 检测到的循环依赖链列表
   */
  detectCycle(startSkillIds?: string[]): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    const path: string[] = [];

    const dfs = (skillId: string): void => {
      if (recursionStack.has(skillId)) {
        // 发现循环
        const cycleStartIndex = path.indexOf(skillId);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          cycle.push(skillId); // 闭合循环
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(skillId)) {
        return;
      }

      visited.add(skillId);
      recursionStack.add(skillId);
      path.push(skillId);

      const dependencies = this.dependencyGraph.get(skillId) || [];
      for (const dep of dependencies) {
        dfs(dep);
      }

      path.pop();
      recursionStack.delete(skillId);
    };

    // 确定要检测的起始节点
    const nodesToCheck = startSkillIds && startSkillIds.length > 0
      ? startSkillIds
      : Array.from(this.skills.keys());

    for (const skillId of nodesToCheck) {
      if (!visited.has(skillId)) {
        dfs(skillId);
      }
    }

    // 去重（不同路径可能发现相同循环）
    const uniqueCycles = this.deduplicateCycles(cycles);

    if (uniqueCycles.length > 0) {
      this.emit(DependencyManagerEvent.CYCLE_DETECTED, { cycles: uniqueCycles });
    }

    return uniqueCycles;
  }

  /**
   * 循环去重 - 将相同的循环（可能起始点不同）合并
   */
  private deduplicateCycles(cycles: string[][]): string[][] {
    const seen = new Set<string>();
    const result: string[][] = [];

    for (const cycle of cycles) {
      // 找到循环中的最小 ID 作为标准化的起点
      const minId = cycle.slice(0, -1).reduce((a, b) => (a < b ? a : b), cycle[0]);
      const minIndex = cycle.indexOf(minId);

      // 重新排列循环，使其从最小 ID 开始
      const normalized = [...cycle.slice(minIndex, -1), ...cycle.slice(0, minIndex), minId];
      const key = normalized.join('→');

      if (!seen.has(key)) {
        seen.add(key);
        result.push(cycle);
      }
    }

    return result;
  }

  // ==================== 拓扑排序 ====================

  /**
   * 计算拓扑排序，生成可执行的 Skill 顺序
   *
   * @param targetSkillIds 目标 Skill ID 列表（可选，不指定则计算整个图）
   * @returns 拓扑排序结果，包含排序后的顺序和层级结构
   */
  computeTopology(targetSkillIds?: string[]): TopologyResult {
    // 先检测循环依赖
    const cycles = this.detectCycle(targetSkillIds);
    if (cycles.length > 0) {
      return {
        success: false,
        cycles,
      };
    }

    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];
    const levels: string[][] = [];

    // 确定要处理的节点范围
    const nodesToProcess = targetSkillIds && targetSkillIds.length > 0
      ? this.collectReachableNodes(targetSkillIds)
      : Array.from(this.skills.keys());

    // 初始化入度
    for (const skillId of nodesToProcess) {
      const deps = this.dependencyGraph.get(skillId) || [];
      // 只统计在处理范围内的依赖
      const relevantDeps = deps.filter((dep) => nodesToProcess.includes(dep));
      inDegree.set(skillId, relevantDeps.length);
    }

    // Kahn 算法：初始化入度为 0 的节点
    for (const [skillId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(skillId);
      }
    }

    // 分层处理，用于并行执行
    while (queue.length > 0) {
      const levelSize = queue.length;
      const currentLevel: string[] = [];

      for (let i = 0; i < levelSize; i++) {
        const current = queue.shift()!;
        result.push(current);
        currentLevel.push(current);

        // 找到所有依赖当前节点的 Skill（反向查找）
        const dependents = this.reverseDependencyGraph.get(current) || [];
        for (const dependent of dependents) {
          if (!nodesToProcess.includes(dependent)) continue;

          const currentDegree = inDegree.get(dependent) || 0;
          const newDegree = currentDegree - 1;
          inDegree.set(dependent, newDegree);

          if (newDegree === 0) {
            queue.push(dependent);
          }
        }
      }

      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      }
    }

    // 检查是否所有节点都被处理
    if (result.length !== nodesToProcess.length) {
      // 理论上不会发生，因为已经检查过循环
      return {
        success: false,
        cycles,
      };
    }

    this.emit(DependencyManagerEvent.TOPOLOGY_COMPUTED, {
      order: result,
      levels,
      targetSkills: targetSkillIds,
    });

    return {
      success: true,
      order: result,
      levels,
    };
  }

  /**
   * 计算拓扑排序（别名方法）
   *
   * @param targetSkillIds 目标 Skill ID 列表（可选）
   * @returns 拓扑排序结果
   */
  computeDependencyTopology(targetSkillIds?: string[]): TopologyResult {
    return this.computeTopology(targetSkillIds);
  }

  /**
   * 检测循环依赖（别名方法）
   *
   * @param startSkillIds 起始 Skill ID 列表（可选）
   * @returns 检测到的循环依赖链列表
   */
  detectCycles(startSkillIds?: string[]): string[][] {
    return this.detectCycle(startSkillIds);
  }

  /**
   * 收集所有可达节点（用于部分 Skill 的拓扑排序）
   */
  private collectReachableNodes(startIds: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (skillId: string, depth: number = 0): void => {
      if (visited.has(skillId)) return;
      if (depth > this.config.maxDependencyDepth) return;

      visited.add(skillId);
      result.push(skillId);

      // 继续遍历该 Skill 的所有依赖
      const deps = this.dependencyGraph.get(skillId) || [];
      for (const dep of deps) {
        dfs(dep, depth + 1);
      }
    };

    for (const id of startIds) {
      dfs(id);
    }

    return result;
  }

  /**
   * 生成加载批次 - 用于按依赖顺序加载 Skill
   *
   * @returns 加载批次列表，可并行加载的 Skill 在同一批次
   */
  generateLoadBatches(): string[][] {
    const topology = this.computeTopology();
    if (!topology.success || !topology.levels) {
      return [Array.from(this.skills.keys())]; // 降级：全部在同一批次
    }

    // 拓扑排序的层级是 "无依赖" 到 "有依赖"，这正好就是加载顺序
    return [...topology.levels];
  }

  /**
   * 生成执行批次 - 用于按依赖顺序执行 Skill
   *
   * @param inputs 每个 Skill 的输入数据映射
   * @returns 执行批次列表
   */
  generateExecutionBatches(
    inputs: Record<string, any>
  ): { batches: ExecutionBatch[]; success: boolean; error?: string } {
    const skillIds = Object.keys(inputs);

    // 先检查依赖
    for (const skillId of skillIds) {
      const check = this.checkDependencies(skillId);
      if (!check.satisfied) {
        return {
          success: false,
          batches: [],
          error: `依赖检查失败: ${skillId} - ${JSON.stringify(check)}`,
        };
      }
    }

    // 计算拓扑
    const topology = this.computeTopology(skillIds);
    if (!topology.success || !topology.levels) {
      return {
        success: false,
        batches: [],
        error: `拓扑排序失败: ${JSON.stringify(topology.cycles)}`,
      };
    }

    // 生成批次 - 注意：执行顺序与加载顺序相同（先依赖后被依赖）
    const batches: ExecutionBatch[] = topology.levels.map((skillIds, index) => ({
      level: index,
      skillIds,
      inputs,
    }));

    this.emit(DependencyManagerEvent.BATCH_EXECUTION_STARTED, {
      batchCount: batches.length,
      totalSkills: skillIds.length,
    });

    return { success: true, batches };
  }

  // ==================== 与 SkillExecutor 集成 ====================

  /**
   * 带依赖关系的批量执行
   * 按拓扑排序顺序执行 Skill，确保依赖先执行
   *
   * @param inputs Skill ID 到输入数据的映射
   * @param executeFn 实际执行函数（通常是 SkillExecutor.executeSkill）
   * @param options 执行选项
   * @returns 所有 Skill 的执行结果
   */
  async executeWithDependencies(
    inputs: Record<string, any>,
    executeFn: (
      request: SkillExecutionRequest
    ) => Promise<SkillExecutionResponse> | SkillExecutionResponse,
    options: {
      /** 失败时是否继续执行后续批次（默认 false） */
      continueOnFailure?: boolean;
      /** 是否并行执行同一批次内的 Skill（默认 true） */
      parallelInBatch?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    results: Record<string, SkillExecutionResponse>;
    failedBatches: number[];
    completedBatches: number;
    totalBatches: number;
  }> {
    const { continueOnFailure = false, parallelInBatch = true } = options;

    const batchResult = this.generateExecutionBatches(inputs);
    if (!batchResult.success || !batchResult.batches) {
      return {
        success: false,
        results: {},
        failedBatches: [],
        completedBatches: 0,
        totalBatches: 0,
      };
    }

    const results: Record<string, SkillExecutionResponse> = {};
    const upstreamResults: Record<string, any> = {};
    const failedBatches: number[] = [];
    let completedBatches = 0;

    for (const batch of batchResult.batches) {
      // 将上游结果注入当前批次的输入
      const enrichedInputs = { ...batch.inputs };
      for (const skillId of batch.skillIds) {
        enrichedInputs[skillId] = {
          ...(enrichedInputs[skillId] || {}),
          _upstreamResults: upstreamResults,
        };
      }

      this.emit(DependencyManagerEvent.BATCH_LEVEL_COMPLETED, {
        level: batch.level,
        skillIds: batch.skillIds,
        batchCount: batchResult.batches.length,
      });

      try {
        let batchResults: SkillExecutionResponse[];

        if (parallelInBatch) {
          // 并行执行同一批次的所有 Skill
          batchResults = await Promise.all(
            batch.skillIds.map((skillId) =>
              executeFn({
                skillId,
                input: enrichedInputs[skillId],
              })
            )
          );
        } else {
          // 串行执行
          batchResults = [];
          for (const skillId of batch.skillIds) {
            const result = await executeFn({
              skillId,
              input: enrichedInputs[skillId],
            });
            batchResults.push(result);
          }
        }

        // 收集结果
        let batchSuccess = true;
        for (let i = 0; i < batch.skillIds.length; i++) {
          const skillId = batch.skillIds[i];
          const result = batchResults[i];
          results[skillId] = result;

          if (result.success && result.result) {
            upstreamResults[skillId] = result.result;
          }

          if (!result.success) {
            batchSuccess = false;
          }
        }

        completedBatches++;

        if (!batchSuccess && !continueOnFailure) {
          failedBatches.push(batch.level);
          break;
        }
      } catch (error) {
        failedBatches.push(batch.level);
        if (!continueOnFailure) {
          break;
        }
      }
    }

    const allSuccess = failedBatches.length === 0;

    this.emit(DependencyManagerEvent.BATCH_EXECUTION_COMPLETED, {
      success: allSuccess,
      completedBatches,
      failedBatches,
      totalBatches: batchResult.batches.length,
    });

    return {
      success: allSuccess,
      results,
      failedBatches,
      completedBatches,
      totalBatches: batchResult.batches.length,
    };
  }

  // ==================== 查询和统计 ====================

  /**
   * 获取 Skill 的直接依赖
   *
   * @param skillId Skill ID
   * @returns 直接依赖的 Skill ID 列表
   */
  getDirectDependencies(skillId: string): string[] {
    return [...(this.dependencyGraph.get(skillId) || [])];
  }

  /**
   * 获取 Skill 的所有依赖（递归）
   *
   * @param skillId Skill ID
   * @returns 所有依赖的 Skill ID 列表（去重）
   */
  getAllDependencies(skillId: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (id: string, depth: number = 0): void => {
      if (visited.has(id)) return;
      if (depth > this.config.maxDependencyDepth) return;

      visited.add(id);
      result.push(id);

      const deps = this.dependencyGraph.get(id) || [];
      for (const dep of deps) {
        dfs(dep, depth + 1);
      }
    };

    const directDeps = this.dependencyGraph.get(skillId) || [];
    for (const dep of directDeps) {
      dfs(dep);
    }

    return result;
  }

  /**
   * 获取依赖当前 Skill 的所有 Skill（反向依赖）
   *
   * @param skillId Skill ID
   * @returns 依赖该 Skill 的所有 Skill ID 列表
   */
  getDependents(skillId: string): string[] {
    return [...(this.reverseDependencyGraph.get(skillId) || [])];
  }

  /**
   * 构建依赖树（用于可视化）
   *
   * @param skillId 根 Skill ID
   * @param maxDepth 最大深度
   * @returns 依赖树结构
   */
  buildDependencyTree(skillId: string, maxDepth: number = 10): DependencyTreeNode {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        id: skillId,
        name: skillId,
        version: 'unknown',
        depth: 0,
        children: [],
      };
    }

    const visited = new Set<string>();

    const buildNode = (id: string, nodeDepth: number): DependencyTreeNode | null => {
      if (nodeDepth > maxDepth) return null;
      if (visited.has(id)) return null;

      const nodeSkill = this.skills.get(id);
      if (!nodeSkill) return null;

      visited.add(id);

      const deps = this.dependencyGraph.get(id) || [];
      const children: DependencyTreeNode[] = [];

      for (const depId of deps) {
        const depInfo = nodeSkill.dependencies.find((d) => d.skillId === depId);

        const child = buildNode(depId, nodeDepth + 1);
        if (child) {
          children.push({
            ...child,
            optional: depInfo?.optional,
          });
        }
      }

      return {
        id,
        name: nodeSkill.name,
        version: nodeSkill.version,
        depth: nodeDepth,
        children,
      };
    };

    return buildNode(skillId, 0) || {
      id: skillId,
      name: skill.name,
      version: skill.version,
      depth: 0,
      children: [],
    };
  }

  /**
   * 生成 ASCII 格式的依赖树字符串
   *
   * @param skillId 根 Skill ID
   * @param maxDepth 最大深度
   * @returns 格式化的依赖树字符串
   */
  printDependencyTree(skillId: string, maxDepth: number = 10): string {
    const tree = this.buildDependencyTree(skillId, maxDepth);

    const lines: string[] = [];

    const printNode = (
      node: DependencyTreeNode,
      prefix: string = '',
      isLast: boolean = true
    ): void => {
      const connector = isLast ? '└── ' : '├── ';
      const status = this.skills.get(node.id)?.status || 'unknown';
      const statusIcon = status === SkillStatus.READY ? '✓' : '✗';
      const optionalMarker = node.optional ? ' (optional)' : '';

      lines.push(
        `${prefix}${connector}${statusIcon} ${node.name}@${node.version}${optionalMarker}`
      );

      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      node.children.forEach((child, index) => {
        printNode(child, childPrefix, index === node.children.length - 1);
      });
    };

    lines.push(`${tree.name}@${tree.version} (root)`);
    tree.children.forEach((child, index) => {
      printNode(child, "", index === tree.children.length - 1);
    });

    return lines.join("\n");
  }
}

export default SkillDependencyManager;

