/**
 * Skill 发现器 - 负责从各种来源发现和注册 Skill
 */

import {
  SkillPackage,
  SkillRegistration,
  SkillStatus,
  SkillRegistryConfig
} from './types';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// 简单日志实现
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args)
};

export class SkillDiscoverer {
  private config: SkillRegistryConfig;
  private discoveredSkills: Map<string, SkillRegistration> = new Map();

  constructor(config: Partial<SkillRegistryConfig> = {}) {
    this.config = {
      scanPaths: ['./skills'],
      autoDiscover: true,
      autoReload: false,
      reloadInterval: 300000, // 5 分钟
      allowedExtensions: ['.ts', '.js', '.json'],
      maxSkillSize: 10 * 1024 * 1024, // 10MB
      enableSandbox: true,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      ...config
    };
    logger.info('SkillDiscoverer 初始化完成，扫描路径:', this.config.scanPaths);
  }

  /**
   * 扫描所有配置的路径发现 Skill
   */
  async discoverAll(): Promise<SkillRegistration[]> {
    logger.info('开始扫描所有路径发现 Skill...');
    const allSkills: SkillRegistration[] = [];

    for (const scanPath of this.config.scanPaths) {
      try {
        const skills = await this.discoverFromPath(scanPath);
        allSkills.push(...skills);
      } catch (error) {
        logger.error(`扫描路径 ${scanPath} 失败:`, error);
      }
    }

    logger.info(`发现完成，共找到 ${allSkills.length} 个 Skill`);
    return allSkills;
  }

  /**
   * 从指定路径发现 Skill
   */
  async discoverFromPath(scanPath: string): Promise<SkillRegistration[]> {
    const absolutePath = path.resolve(scanPath);
    logger.debug(`扫描路径: ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      logger.warn(`路径不存在: ${absolutePath}`);
      return [];
    }

    const skills: SkillRegistration[] = [];
    await this.scanDirectory(absolutePath, skills);
    return skills;
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(dirPath: string, skills: SkillRegistration[]): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 检查是否是 Skill 目录（包含 skill.json 或 index.ts）
        if (this.isSkillDirectory(fullPath)) {
          const skill = await this.loadSkillFromDirectory(fullPath);
          if (skill) {
            skills.push(skill);
            this.discoveredSkills.set(skill.id, skill);
          }
        } else {
          // 递归扫描子目录
          await this.scanDirectory(fullPath, skills);
        }
      } else if (entry.isFile()) {
        // 检查是否是独立的 Skill 文件
        if (this.isSkillFile(entry.name)) {
          const skill = await this.loadSkillFromFile(fullPath);
          if (skill) {
            skills.push(skill);
            this.discoveredSkills.set(skill.id, skill);
          }
        }
      }
    }
  }

  /**
   * 检查是否是 Skill 目录
   * Skill 目录必须包含以下文件之一：
   * - skill.json (Skill 清单文件)
   * - index.ts / index.js (入口文件)
   * - main.ts / main.js (备选入口文件)
   */
  private isSkillDirectory(dirPath: string): boolean {
    const manifestPath = path.join(dirPath, 'skill.json');
    const indexPath = path.join(dirPath, 'index.ts');
    const indexJsPath = path.join(dirPath, 'index.js');
    const mainTsPath = path.join(dirPath, 'main.ts');
    const mainJsPath = path.join(dirPath, 'main.js');

    return (
      fs.existsSync(manifestPath) ||
      fs.existsSync(indexPath) ||
      fs.existsSync(indexJsPath) ||
      fs.existsSync(mainTsPath) ||
      fs.existsSync(mainJsPath)
    );
  }

  /**
   * 检查是否是 Skill 文件
   * 根据文件扩展名判断是否为支持的 Skill 文件
   */
  private isSkillFile(fileName: string): boolean {
    const ext = path.extname(fileName);
    return this.config.allowedExtensions.includes(ext);
  }

  /**
   * 从目录加载 Skill
   *
   * 加载逻辑：
   * 1. 优先从 skill.json 读取完整配置
   * 2. 如果没有 skill.json，从目录名和入口文件生成基本信息
   * 3. 确定入口文件（skill.json 指定的 entryPoint 或自动查找 index.ts/index.js 等）
   * 4. 生成完整的 SkillRegistration 对象
   */
  private async loadSkillFromDirectory(dirPath: string): Promise<SkillRegistration | null> {
    try {
      const manifestPath = path.join(dirPath, 'skill.json');
      let manifest: any = {};

      // 优先从 skill.json 读取配置
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(content);
        logger.debug(`从 skill.json 加载配置: ${path.basename(dirPath)}`);
      } else {
        // 如果没有 manifest，从目录名生成基本信息
        manifest = {
          name: path.basename(dirPath),
          description: `Skill from directory: ${path.basename(dirPath)}`,
          version: '1.0.0'
        };
        logger.debug(`无 skill.json，使用默认配置: ${path.basename(dirPath)}`);
      }

      // 查找入口文件
      let entryPoint = manifest.entryPoint;
      const possibleEntries = ['index.ts', 'index.js', 'main.ts', 'main.js'];

      // 如果 skill.json 中指定了 entryPoint，验证它是否存在
      if (entryPoint) {
        const fullEntryPath = path.join(dirPath, entryPoint);
        if (!fs.existsSync(fullEntryPath)) {
          logger.warn(`入口文件不存在，尝试自动查找: ${entryPoint}`);
          entryPoint = undefined;
        }
      }

      // 自动查找入口文件
      if (!entryPoint) {
        for (const possible of possibleEntries) {
          const possiblePath = path.join(dirPath, possible);
          if (fs.existsSync(possiblePath)) {
            entryPoint = possible;
            logger.debug(`自动发现入口文件: ${possible}`);
            break;
          }
        }
      }

      // 如果还是没有找到入口文件，跳过
      if (!entryPoint) {
        logger.warn(`目录 ${dirPath} 未找到有效入口文件，跳过`);
        return null;
      }

      // 创建 SkillRegistration 对象
      const registration: SkillRegistration = {
        id: manifest.id || uuidv4(),
        name: manifest.name || path.basename(dirPath),
        description: manifest.description || '',
        version: manifest.version || '1.0.0',
        tags: manifest.tags || [],
        entryPoint: path.join(dirPath, entryPoint),
        supportedModels: manifest.supportedModels || [],
        requirements: manifest.requirements || {},
        status: SkillStatus.REGISTERED,
        metadata: manifest.metadata || {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        dependencies: manifest.dependencies || [],
        config: manifest.config || {
          enabled: true,
          timeout: this.config.defaultTimeout,
          maxRetries: this.config.defaultMaxRetries,
          concurrency: 1
        },
        registeredAt: new Date(),
        path: dirPath
      };

      logger.debug(`从目录加载 Skill: ${registration.name} (${registration.id})`);
      return registration;
    } catch (error) {
      logger.error(`从目录 ${dirPath} 加载 Skill 失败:`, error);
      return null;
    }
  }

  /**
   * 从文件加载 Skill
   *
   * 支持两种格式：
   * 1. JSON 文件：作为 SkillPackage 格式解析
   * 2. TS/JS 文件：作为独立 Skill 代码文件
   */
  private async loadSkillFromFile(filePath: string): Promise<SkillRegistration | null> {
    try {
      const stats = fs.statSync(filePath);

      // 检查文件大小限制
      if (stats.size > this.config.maxSkillSize) {
        logger.warn(`文件过大，跳过: ${filePath} (${stats.size} bytes)`);
        return null;
      }

      const fileName = path.basename(filePath, path.extname(filePath));

      // 如果是 JSON 文件，尝试作为 SkillPackage 加载
      if (path.extname(filePath) === '.json') {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          const pkg = JSON.parse(content) as SkillPackage;
          return this.registerFromPackage(pkg, filePath);
        } catch (jsonError) {
          logger.warn(`JSON 文件解析失败，作为普通文件处理: ${filePath}`);
        }
      }

      // 否则创建基本的 Skill 注册信息
      const registration: SkillRegistration = {
        id: uuidv4(),
        name: fileName,
        description: `Skill from file: ${fileName}`,
        version: '1.0.0',
        tags: [],
        entryPoint: filePath,
        supportedModels: [],
        requirements: {},
        status: SkillStatus.REGISTERED,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        },
        dependencies: [],
        config: {
          enabled: true,
          timeout: this.config.defaultTimeout,
          maxRetries: this.config.defaultMaxRetries,
          concurrency: 1
        },
        registeredAt: new Date(),
        path: filePath
      };

      logger.debug(`从文件加载 Skill: ${registration.name} (${registration.id})`);
      return registration;
    } catch (error) {
      logger.error(`从文件 ${filePath} 加载 Skill 失败:`, error);
      return null;
    }
  }

  /**
   * 从 SkillPackage 注册 Skill
   *
   * SkillPackage 是一种标准化的 Skill 分发格式
   * 包含完整的元数据、依赖声明、配置和代码
   */
  registerFromPackage(pkg: SkillPackage, sourcePath?: string): SkillRegistration {
    const registration: SkillRegistration = {
      id: pkg.manifest.id || uuidv4(),
      name: pkg.manifest.name,
      description: pkg.manifest.description || '',
      version: pkg.manifest.version || '1.0.0',
      tags: pkg.manifest.tags || [],
      entryPoint: pkg.manifest.entryPoint,
      supportedModels: pkg.manifest.supportedModels || [],
      requirements: pkg.manifest.requirements || {},
      status: SkillStatus.REGISTERED,
      metadata: pkg.metadata || {
        createdAt: new Date(),
        updatedAt: new Date()
      },
      dependencies: pkg.dependencies || [],
      config: pkg.config || {
        enabled: true,
        timeout: this.config.defaultTimeout,
        maxRetries: this.config.defaultMaxRetries,
        concurrency: 1
      },
      registeredAt: new Date(),
      path: sourcePath
    };

    this.discoveredSkills.set(registration.id, registration);
    logger.info(`从包注册 Skill: ${registration.name} (${registration.id})`);
    return registration;
  }

  /**
   * 手动注册单个 Skill
   *
   * 允许通过编程方式动态注册 Skill，而不需要文件系统扫描
   * 适用于：
   * - 动态生成的 Skill
   * - 内存中的 Skill
   * - 远程加载的 Skill
   */
  registerSkill(skill: Partial<SkillRegistration> & { name: string; entryPoint: string }): SkillRegistration {
    const registration: SkillRegistration = {
      id: skill.id || uuidv4(),
      name: skill.name,
      description: skill.description || '',
      version: skill.version || '1.0.0',
      tags: skill.tags || [],
      entryPoint: skill.entryPoint,
      supportedModels: skill.supportedModels || [],
      requirements: skill.requirements || {},
      status: SkillStatus.REGISTERED,
      metadata: skill.metadata || {
        createdAt: new Date(),
        updatedAt: new Date()
      },
      dependencies: skill.dependencies || [],
      config: skill.config || {
        enabled: true,
        timeout: this.config.defaultTimeout,
        maxRetries: this.config.defaultMaxRetries,
        concurrency: 1
      },
      registeredAt: new Date(),
      ...skill
    };

    this.discoveredSkills.set(registration.id, registration);
    logger.info(`手动注册 Skill: ${registration.name} (${registration.id})`);
    return registration;
  }

  /**
   * 获取所有已发现的 Skill
   */
  getDiscoveredSkills(): SkillRegistration[] {
    return Array.from(this.discoveredSkills.values());
  }

  /**
   * 根据 ID 获取已发现的 Skill
   */
  getDiscoveredSkill(id: string): SkillRegistration | undefined {
    return this.discoveredSkills.get(id);
  }

  /**
   * 根据名称查找已发现的 Skill（不区分大小写）
   */
  findDiscoveredSkillByName(name: string): SkillRegistration | undefined {
    return Array.from(this.discoveredSkills.values()).find(
      s => s.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * 根据标签查找 Skill
   * 返回包含所有指定标签的 Skill
   */
  findSkillsByTags(tags: string[]): SkillRegistration[] {
    return Array.from(this.discoveredSkills.values()).filter(
      skill => tags.every(tag => skill.tags.includes(tag))
    );
  }

  /**
   * 搜索 Skill
   * 支持多种搜索条件和排序选项
   */
  searchSkills(options: {
    query?: string;
    tags?: string[];
    limit?: number;
    sortBy?: 'name' | 'version' | 'registeredAt';
    sortOrder?: 'asc' | 'desc';
  }): SkillRegistration[] {
    let results = Array.from(this.discoveredSkills.values());

    // 根据关键词搜索
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(skill =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query)
      );
    }

    // 根据标签过滤（包含任意一个指定标签）
    if (options.tags && options.tags.length > 0) {
      results = results.filter(skill =>
        options.tags!.some(tag => skill.tags.includes(tag))
      );
    }

    // 排序
    if (options.sortBy) {
      results.sort((a, b) => {
        const aValue = a[options.sortBy!];
        const bValue = b[options.sortBy!];
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // 限制结果数量
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 注销 Skill
   * 从注册表中移除指定的 Skill
   */
  unregisterSkill(id: string): boolean {
    const existed = this.discoveredSkills.has(id);
    if (existed) {
      this.discoveredSkills.delete(id);
      logger.info(`已注销 Skill: ${id}`);
    }
    return existed;
  }

  /**
   * 清空所有已发现的 Skill
   * 清空整个注册表，通常用于重新扫描前
   */
  clear(): void {
    const count = this.discoveredSkills.size;
    this.discoveredSkills.clear();
    logger.debug(`已清空所有已发现的 Skill，共 ${count} 个`);
  }

  /**
   * 刷新发现
   * 清空现有注册表并重新扫描所有配置的路径
   */
  async refresh(): Promise<SkillRegistration[]> {
    logger.info('开始刷新 Skill 发现...');
    this.clear();
    const skills = await this.discoverAll();
    logger.info(`刷新完成，共发现 ${skills.length} 个 Skill`);
    return skills;
  }

  /**
   * 添加扫描路径
   * 动态添加新的扫描路径，不会自动触发扫描
   * 需要调用 discoverAll() 或 refresh() 来实际扫描
   */
  addScanPath(scanPath: string): void {
    if (!this.config.scanPaths.includes(scanPath)) {
      this.config.scanPaths.push(scanPath);
      logger.info(`添加扫描路径: ${scanPath}`);
    } else {
      logger.debug(`扫描路径已存在: ${scanPath}`);
    }
  }

  /**
   * 移除扫描路径
   */
  removeScanPath(scanPath: string): boolean {
    const index = this.config.scanPaths.indexOf(scanPath);
    if (index > -1) {
      this.config.scanPaths.splice(index, 1);
      logger.info(`移除扫描路径: ${scanPath}`);
      return true;
    }
    logger.warn(`扫描路径不存在: ${scanPath}`);
    return false;
  }

  /**
   * 获取当前配置
   * 返回配置的副本，防止外部修改
   */
  getConfig(): SkillRegistryConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   * 允许动态更新部分配置选项
   */
  updateConfig(newConfig: Partial<SkillRegistryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('已更新 SkillDiscoverer 配置');
  }

  /**
   * 获取统计信息
   * 返回当前注册表的统计概览
   */
  getStats(): {
    total: number;
    byStatus: Record<SkillStatus, number>;
    scanPaths: string[];
  } {
    const byStatus: Record<SkillStatus, number> = {
      [SkillStatus.REGISTERED]: 0,
      [SkillStatus.LOADING]: 0,
      [SkillStatus.READY]: 0,
      [SkillStatus.ERROR]: 0,
      [SkillStatus.DISABLED]: 0,
      [SkillStatus.DEPRECATED]: 0
    };

    for (const skill of this.discoveredSkills.values()) {
      byStatus[skill.status]++;
    }

    return {
      total: this.discoveredSkills.size,
      byStatus,
      scanPaths: [...this.config.scanPaths]
    };
  }
}

// 导出单例实例
// 大多数场景下使用单例即可满足需求
export const skillDiscoverer = new SkillDiscoverer();
