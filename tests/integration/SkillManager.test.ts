import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillManager } from '@/skill';
import { SkillStatus } from '@/skill/types';
import * as path from 'path';

describe('SkillManager - 集成测试', () => {
  let manager: SkillManager;

  beforeEach(() => {
    manager = new SkillManager({
      scanPaths: [],
      autoScanOnStartup: false,
      loaderConfig: {
        enableSandbox: false,
        defaultTimeout: 10000
      },
      executorConfig: {
        defaultTimeout: 5000,
        defaultMaxRetries: 0
      }
    });
  });

  afterEach(async () => {
    await manager.unloadAllSkills();
    await manager.destroy();
  });

  describe('完整生命周期测试', () => {
    it('应该完成从注册到执行的完整流程', async () => {
      // 1. 初始化
      await manager.initialize(false);

      const overview1 = manager.getOverview();
      expect(overview1.totalSkills).toBe(0);
      expect(overview1.loadedSkills).toBe(0);

      // 2. 注册 Skill
      const skill = manager.registerSkill({
        name: 'math-skill',
        version: '1.0.0',
        description: '数学运算 Skill',
        entryPoint: path.resolve(__dirname, '../mocks/math-skill.ts'),
        tags: ['math', 'calculator']
      });

      expect(skill.id).toBeDefined();
      expect(skill.status).toBe(SkillStatus.REGISTERED);

      const overview2 = manager.getOverview();
      expect(overview2.totalSkills).toBe(1);

      // 3. 加载 Skill
      const loadResult = await manager.loadSkill(skill.id);
      expect(loadResult.success).toBe(true);
      expect(manager.isSkillLoaded(skill.id)).toBe(true);

      const overview3 = manager.getOverview();
      expect(overview3.loadedSkills).toBe(1);

      // 4. 执行 Skill
      const execResult = await manager.executeSkill({
        skillId: skill.id,
        input: { operation: 'add', a: 10, b: 20 }
      });

      expect(execResult.success).toBe(true);
      expect(execResult.result.result).toBe(30);

      // 5. 检查统计
      const stats = manager.getGlobalStats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);

      // 6. 卸载 Skill
      const unloadResult = await manager.unloadSkill(skill.id);
      expect(unloadResult).toBe(true);
      expect(manager.isSkillLoaded(skill.id)).toBe(false);

      const overview4 = manager.getOverview();
      expect(overview4.loadedSkills).toBe(0);
    });
  });

  describe('依赖驱动的批量执行测试', () => {
    it('应该按依赖顺序执行多个 Skill', async () => {
      await manager.initialize(false);

      // 注册有依赖关系的 Skill
      // reader → cleaner → validator → writer
      const reader = manager.registerSkill({
        name: 'data-reader',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['reader']
      });

      const cleaner = manager.registerSkill({
        name: 'data-cleaner',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['cleaner'],
        dependencies: [{ skillId: reader.id, minVersion: '1.0.0' }]
      });

      const validator = manager.registerSkill({
        name: 'data-validator',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['validator'],
        dependencies: [{ skillId: cleaner.id, minVersion: '1.0.0' }]
      });

      // 检查拓扑排序
      const topology = manager.computeDependencyTopology();
      expect(topology.order.length).toBe(3);

      // reader 应该在 cleaner 之前
      const readerIndex = topology.order.indexOf(reader.id);
      const cleanerIndex = topology.order.indexOf(cleaner.id);
      expect(readerIndex).toBeLessThan(cleanerIndex);

      // cleaner 应该在 validator 之前
      const validatorIndex = topology.order.indexOf(validator.id);
      expect(cleanerIndex).toBeLessThan(validatorIndex);
    });
  });

  describe('搜索和匹配功能测试', () => {
    beforeEach(async () => {
      await manager.initialize(false);

      // 注册多个 Skill
      manager.registerSkill({
        name: 'csv-reader',
        description: '读取并解析 CSV 格式的数据文件',
        entryPoint: './dummy.ts',
        tags: ['data', 'reader', 'csv', 'io']
      });

      manager.registerSkill({
        name: 'json-reader',
        description: '读取并解析 JSON 格式的数据文件',
        entryPoint: './dummy.ts',
        tags: ['data', 'reader', 'json', 'io']
      });

      manager.registerSkill({
        name: 'report-pdf-generator',
        description: '生成 PDF 格式的报告文档',
        entryPoint: './dummy.ts',
        tags: ['report', 'generator', 'pdf', 'output']
      });

      manager.registerSkill({
        name: 'email-sender',
        description: '发送电子邮件通知',
        entryPoint: './dummy.ts',
        tags: ['email', 'notification', 'output']
      });
    });

    it('应该能根据关键词搜索 Skill', () => {
      // 搜索 'reader'
      const results = manager.searchSkills({ query: 'reader' });
      expect(results.length).toBeGreaterThanOrEqual(2);

      const names = results.map(r => r.name);
      expect(names).toContain('csv-reader');
      expect(names).toContain('json-reader');
    });

    it('应该能根据标签搜索 Skill', () => {
      const results = manager.searchSkills({ tags: ['output'] });
      expect(results.length).toBe(2);

      const names = results.map(r => r.name);
      expect(names).toContain('report-pdf-generator');
      expect(names).toContain('email-sender');
    });

    it('应该能根据任务描述智能匹配 Skill', () => {
      const matches = manager.matchSkillsForTask(
        '我需要读取一个数据文件然后发送邮件通知',
        ['reader', 'email']
      );

      expect(matches.length).toBeGreaterThan(0);

      // 第一个匹配应该是最相关的
      const firstMatchSkillNames = matches.slice(0, 2).map(m => m.skill.name);
      expect(firstMatchSkillNames.some(n =>
        n.includes('reader') || n.includes('email'))).toBe(true);
    });
  });

  describe('错误处理和恢复测试', () => {
    it('应该正确处理执行错误', async () => {
      await manager.initialize(false);

      const skill = manager.registerSkill({
        name: 'error-skill',
        entryPoint: path.resolve(__dirname, '../mocks/math-skill.ts')
      });

      await manager.loadSkill(skill.id);

      // 执行无效操作应该返回错误
      const result = await manager.executeSkill({
        skillId: skill.id,
        input: { operation: 'invalid-operation', a: 1, b: 2 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // 统计应该正确记录失败
      const stats = manager.getGlobalStats();
      expect(stats.failedExecutions).toBe(1);
    });

    it('应该正确处理输入验证错误', async () => {
      await manager.initialize(false);

      const skill = manager.registerSkill({
        name: 'validation-test',
        entryPoint: path.resolve(__dirname, '../mocks/math-skill.ts')
      });

      await manager.loadSkill(skill.id);

      // 无效输入
      const result = await manager.executeSkill({
        skillId: skill.id,
        input: { operation: 'add', a: 'not-number', b: 2 } as any
      });

      expect(result.success).toBe(false);
    });
  });

  describe('系统状态和监控测试', () => {
    beforeEach(async () => {
      await manager.initialize(false);
    });

    it('应该返回正确的系统概览', async () => {
      // 初始状态
      const overview1 = manager.getOverview();
      expect(overview1.totalSkills).toBe(0);
      expect(overview1.totalExecutions).toBe(0);

      // 注册一个 Skill
      manager.registerSkill({
        name: 'test-skill',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts')
      });

      const overview2 = manager.getOverview();
      expect(overview2.totalSkills).toBe(1);
      expect(overview2.readySkills).toBe(1);  // 已注册
    });

    it('应该返回正确的安全状态', () => {
      const securityStatus = manager.getSecurityStatus();

      expect(securityStatus).toBeDefined();
      expect(typeof securityStatus.safeMode).toBe('boolean');
      expect(typeof securityStatus.activeSandboxes).toBe('number');
    });

    it('应该能进入和退出安全模式', () => {
      expect(manager.isInSafeMode()).toBe(false);

      manager.enterSafeMode();
      expect(manager.isInSafeMode()).toBe(true);

      manager.exitSafeMode();
      expect(manager.isInSafeMode()).toBe(false);
    });
  });

  describe('热重载和动态更新测试', () => {
    it('应该支持热重载 Skill', async () => {
      await manager.initialize(false);

      const skill = manager.registerSkill({
        name: 'reloadable-skill',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts')
      });

      // 第一次加载
      const loadResult1 = await manager.loadSkill(skill.id);
      expect(loadResult1.success).toBe(true);

      // 执行一次
      const execResult1 = await manager.executeSkill({
        skillId: skill.id,
        input: { test: 'first-execution' }
      });
      expect(execResult1.success).toBe(true);

      // 热重载
      const reloadResult = await manager.reloadSkill(skill.id);
      expect(reloadResult).toBeDefined();
      expect(reloadResult?.success).toBe(true);

      // 重载后应该仍然能执行
      const execResult2 = await manager.executeSkill({
        skillId: skill.id,
        input: { test: 'after-reload' }
      });
      expect(execResult2.success).toBe(true);
    });
  });

  describe('统计和分析测试', () => {
    it('应该正确追踪执行统计', async () => {
      await manager.initialize(false);

      const skill = manager.registerSkill({
        name: 'stats-test-skill',
        entryPoint: path.resolve(__dirname, '../mocks/math-skill.ts')
      });

      await manager.loadSkill(skill.id);

      // 执行多次
      for (let i = 0; i < 5; i++) {
        await manager.executeSkill({
          skillId: skill.id,
          input: { operation: 'add', a: i, b: i }
        });
      }

      // 2 次失败执行
      for (let i = 0; i < 2; i++) {
        await manager.executeSkill({
          skillId: skill.id,
          input: { operation: 'invalid' } as any
        });
      }

      const stats = manager.getGlobalStats();

      expect(stats.totalExecutions).toBe(7);
      expect(stats.successfulExecutions).toBe(5);
      expect(stats.failedExecutions).toBe(2);
      expect(stats.successRate).toBeCloseTo(5 / 7);
      expect(stats.avgExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该能获取单个 Skill 的统计', async () => {
      await manager.initialize(false);

      const skill1 = manager.registerSkill({
        name: 'skill-a',
        entryPoint: path.resolve(__dirname, '../mocks/math-skill.ts')
      });

      const skill2 = manager.registerSkill({
        name: 'skill-b',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts')
      });

      await manager.loadSkill(skill1.id);
      await manager.loadSkill(skill2.id);

      // 执行 skill1 三次
      for (let i = 0; i < 3; i++) {
        await manager.executeSkill({
          skillId: skill1.id,
          input: { operation: 'add', a: i, b: i }
        });
      }

      // 执行 skill2 一次
      await manager.executeSkill({
        skillId: skill2.id,
        input: { operation: 'add', a: 1, b: 2 }
      });

      const allStats = manager.getAllSkillStats();
      expect(Object.keys(allStats).length).toBeGreaterThanOrEqual(2);

      const skill1Stats = manager.getSkillStats(skill1.id);
      const skill2Stats = manager.getSkillStats(skill2.id);

      expect(skill1Stats?.totalExecutions).toBe(3);
      expect(skill2Stats?.totalExecutions).toBe(1);
    });
  });

  describe('复杂场景测试', () => {
    it('应该支持完整的管道处理流程', async () => {
      await manager.initialize(false);

      // 注册 4 个 Skill 组成数据管道
      const reader = manager.registerSkill({
        name: 'pipeline-reader',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['pipeline']
      });

      const processor = manager.registerSkill({
        name: 'pipeline-processor',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['pipeline'],
        dependencies: [{ skillId: reader.id, minVersion: '1.0.0' }]
      });

      const validator = manager.registerSkill({
        name: 'pipeline-validator',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['pipeline'],
        dependencies: [{ skillId: processor.id, minVersion: '1.0.0' }]
      });

      const writer = manager.registerSkill({
        name: 'pipeline-writer',
        entryPoint: path.resolve(__dirname, '../mocks/mock-skill.ts'),
        tags: ['pipeline'],
        dependencies: [{ skillId: validator.id, minVersion: '1.0.0' }]
      });

      // 检查依赖关系
      const allDeps = manager.getAllDependencies(writer.id);
      expect(allDeps).toContain(reader.id);
      expect(allDeps).toContain(processor.id);
      expect(allDeps).toContain(validator.id);

      // 检查依赖树结构（writer → validator → processor → reader，共4个节点）
      const tree = manager.buildDependencyTree(writer.id);
      expect(tree.id).toBe(writer.id);
      expect(tree.children.length).toBe(1);
      expect(tree.children[0].id).toBe(validator.id);
      expect(tree.children[0].children.length).toBe(1);
      expect(tree.children[0].children[0].id).toBe(processor.id);
      expect(tree.children[0].children[0].children.length).toBe(1);
      expect(tree.children[0].children[0].children[0].id).toBe(reader.id);

      // 检查循环
      const cycles = manager.detectCycles();
      expect(cycles).toEqual([]);

      // 批量加载
      const loadBatches = manager.generateLoadBatches();
      expect(loadBatches.length).toBe(4);  // 4 个层级

      // 按批次加载
      for (const batch of loadBatches) {
        for (const skillId of batch) {
          await manager.loadSkill(skillId);
        }
      }

      expect(manager.getLoadedCount()).toBe(4);

      // 准备输入并执行
      const inputs: Record<string, any> = {};
      inputs[reader.id] = { source: 'data.csv', step: 1 };
      inputs[processor.id] = { operation: 'clean', step: 2 };
      inputs[validator.id] = { schema: 'v2', step: 3 };
      inputs[writer.id] = { destination: 'output.json', step: 4 };

      const result = await manager.executeSkillsWithDependencies(inputs, {
        continueOnFailure: false,
        parallelInBatch: true
      });

      expect(result.success).toBe(true);
      expect(Object.keys(result.results)).toHaveLength(4);

      // 所有执行应该成功
      Object.values(result.results).forEach((r: any) => {
        expect(r.success).toBe(true);
      });
    });
  });
});
