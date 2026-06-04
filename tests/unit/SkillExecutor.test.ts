import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillExecutor } from '@/skill/SkillExecutor';
import { SkillRegistration, SkillStatus } from '@/skill/types';
import MathSkill from '../mocks/math-skill';
import AsyncSkill from '../mocks/async-skill';

describe('SkillExecutor', () => {
  let executor: SkillExecutor;

  beforeEach(() => {
    executor = new SkillExecutor({
      defaultTimeout: 5000,
      defaultMaxRetries: 0,
      retryStrategy: 'fixed'
    });
  });

  describe('初始化', () => {
    it('应该正确初始化 executor', () => {
      expect(executor).toBeDefined();
    });

    it('应该使用自定义配置', () => {
      const customExecutor = new SkillExecutor({
        defaultTimeout: 10000,
        defaultMaxRetries: 3,
        retryStrategy: 'exponential'
      });
      expect(customExecutor).toBeDefined();
    });
  });

  describe('执行 Skill', () => {
    const testSkill: SkillRegistration = {
      id: 'test-math-skill',
      name: 'math-skill',
      version: '1.0.0',
      description: 'Math operations',
      entryPoint: '../mocks/math-skill.ts',
      tags: ['math'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true, timeout: 5000 },
      registeredAt: new Date()
    };

    it('应该成功执行 Skill', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 2, b: 3 }
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.result).toBe(5);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.retries).toBe(0);
    });

    it('应该正确执行减法', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'subtract', a: 10, b: 4 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(6);
    });

    it('应该正确执行乘法', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'multiply', a: 5, b: 6 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(30);
    });

    it('应该正确执行除法', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'divide', a: 20, b: 4 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(5);
    });

    it('输入验证失败时应该返回错误', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 'not-a-number', b: 3 } as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('Skill 抛出异常时应该正确处理', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'divide', a: 10, b: 0 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Division by zero');
    });

    it('未知操作时应该返回错误', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'unknown', a: 1, b: 2 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Input validation failed');
    });
  });

  describe('超时测试', () => {
    const asyncSkill: SkillRegistration = {
      id: 'test-async-skill',
      name: 'async-skill',
      version: '1.0.0',
      description: 'Async test skill',
      entryPoint: '../mocks/async-skill.ts',
      tags: ['async'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    it('短延迟应该成功执行', async () => {
      const result = await executor.executeSkill({
        skill: asyncSkill,
        skillModule: AsyncSkill,
        input: { delay: 50 },
        options: { timeout: 500 }
      });

      expect(result.success).toBe(true);
      expect(result.result.processed).toBe(true);
    });

    it('应该正确设置执行时间', async () => {
      const result = await executor.executeSkill({
        skill: asyncSkill,
        skillModule: AsyncSkill,
        input: { delay: 100 },
        options: { timeout: 1000 }
      });

      expect(result.duration).toBeGreaterThanOrEqual(100);
    });

    it('超时配置应该覆盖默认值', async () => {
      const customExecutor = new SkillExecutor({
        defaultTimeout: 10,  // 10ms 默认超时
        defaultMaxRetries: 0
      });

      // 使用更长的超时覆盖默认值
      const result = await customExecutor.executeSkill({
        skill: asyncSkill,
        skillModule: AsyncSkill,
        input: { delay: 50 },
        options: { timeout: 500 }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('执行统计', () => {
    const testSkill: SkillRegistration = {
      id: 'stats-skill',
      name: 'stats-skill',
      version: '1.0.0',
      description: 'Stats test skill',
      entryPoint: '../mocks/math-skill.ts',
      tags: ['stats'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    beforeEach(async () => {
      // 重置统计
      executor = new SkillExecutor({
        defaultTimeout: 5000,
        defaultMaxRetries: 0
      });
    });

    it('应该追踪执行次数', async () => {
      for (let i = 0; i < 5; i++) {
        await executor.executeSkill({
          skill: testSkill,
          skillModule: MathSkill,
          input: { operation: 'add', a: i, b: 1 }
        });
      }

      const stats = executor.getSkillStats('stats-skill');
      expect(stats).toBeDefined();
    });

    it('应该返回全局执行统计', () => {
      const globalStats = executor.getGlobalStats();

      expect(globalStats).toBeDefined();
      expect(typeof globalStats.totalExecutions).toBe('number');
      expect(typeof globalStats.successfulExecutions).toBe('number');
      expect(typeof globalStats.failedExecutions).toBe('number');
    });

    it('应该正确计算成功率', async () => {
      // 执行 3 次成功，1 次失败
      await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 1, b: 2 }
      });
      await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 3, b: 4 }
      });
      await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 5, b: 6 }
      });
      await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'invalid', a: 1, b: 2 } as any
      });

      const globalStats = executor.getGlobalStats();
      expect(globalStats.totalExecutions).toBe(4);
      expect(globalStats.successRate).toBeGreaterThan(0.5);
      expect(globalStats.successRate).toBeLessThan(1);
    });

    it('应该返回所有 Skill 的统计', async () => {
      // 执行多个不同的 Skill
      for (let i = 0; i < 3; i++) {
        await executor.executeSkill({
          skill: { ...testSkill, id: `skill-${i}`, name: `name-${i}` },
          skillModule: MathSkill,
          input: { operation: 'add', a: i, b: i }
        });
      }

      const allStats = executor.getAllSkillStats();
      expect(Object.keys(allStats).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('重试机制', () => {
    const asyncSkill: SkillRegistration = {
      id: 'retry-skill',
      name: 'retry-skill',
      version: '1.0.0',
      description: 'Retry test skill',
      entryPoint: '../mocks/async-skill.ts',
      tags: ['retry'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    it('重试策略配置', () => {
      const strategies: any[] = ['fixed', 'linear', 'exponential', 'exponential_with_jitter'];

      strategies.forEach(strategy => {
        const e = new SkillExecutor({
          defaultTimeout: 1000,
          defaultMaxRetries: 3,
          retryStrategy: strategy
        });
        expect(e).toBeDefined();
      });
    });

    it('应该追踪重试次数', async () => {
      const retryExecutor = new SkillExecutor({
        defaultTimeout: 5000,
        defaultMaxRetries: 2,
        retryStrategy: 'fixed',
        retryDelay: 50
      });

      // 第一次会失败两次，然后成功
      const result = await retryExecutor.executeSkill({
        skill: asyncSkill,
        skillModule: AsyncSkill,
        input: { delay: 10, failNTimes: 2 },
        options: { maxRetries: 2 }
      });

      // 最终应该成功（2次重试后）
      expect(result.success).toBe(true);
      expect(result.retries).toBe(2);
    });
  });

  describe('执行上下文', () => {
    const testSkill: SkillRegistration = {
      id: 'context-skill',
      name: 'context-skill',
      version: '1.0.0',
      description: 'Context test skill',
      entryPoint: '../mocks/math-skill.ts',
      tags: ['context'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    it('应该传递上下文信息到 Skill', async () => {
      const context = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        variables: { foo: 'bar' }
      };

      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 1, b: 2 },
        context
      });

      expect(result.success).toBe(true);
    });

    it('空上下文应该正常工作', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 1, b: 2 },
        context: {}
      });

      expect(result.success).toBe(true);
    });
  });

  describe('生命周期钩子', () => {
    const testSkill: SkillRegistration = {
      id: 'hook-skill',
      name: 'hook-skill',
      version: '1.0.0',
      description: 'Hook test skill',
      entryPoint: '../mocks/async-skill.ts',
      tags: ['hook'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    it('支持设置执行前钩子', async () => {
      let hookCalled = false;

      executor.setHooks({
        beforeExecution: async (skillId, input) => {
          hookCalled = true;
          expect(skillId).toBe('hook-skill');
          return true;
        }
      });

      await executor.executeSkill({
        skill: testSkill,
        skillModule: AsyncSkill,
        input: { delay: 10 }
      });

      expect(hookCalled).toBe(true);
    });

    it('支持设置执行后钩子', async () => {
      let hookResult: any = null;

      executor.setHooks({
        afterExecution: async (skillId, result) => {
          hookResult = result;
          return result;
        }
      });

      await executor.executeSkill({
        skill: testSkill,
        skillModule: AsyncSkill,
        input: { delay: 10 }
      });

      expect(hookResult).toBeDefined();
      expect(hookResult.success).toBe(true);
    });

    it('支持设置错误钩子', async () => {
      let errorHookCalled = false;

      executor.setHooks({
        onError: async (request, error, attempt) => {
          errorHookCalled = true;
        }
      });

      await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'invalid' } as any
      });

      expect(errorHookCalled).toBe(true);
    });

    it('执行前钩子返回 false 应该取消执行', async () => {
      executor.setHooks({
        beforeExecution: async () => false
      });

      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: 1, b: 2 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });
  });

  describe('边界情况', () => {
    const testSkill: SkillRegistration = {
      id: 'edge-skill',
      name: 'edge-skill',
      version: '1.0.0',
      description: 'Edge case test skill',
      entryPoint: '../mocks/math-skill.ts',
      tags: ['edge'],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: [],
      config: { enabled: true },
      registeredAt: new Date()
    };

    it('空输入应该正常处理', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: {} as any
      });

      expect(result.success).toBe(false);  // 验证失败
    });

    it('超大数值计算', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'multiply', a: 999999999, b: 999999999 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(999999998000000001);
    });

    it('负数计算', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'add', a: -10, b: -20 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(-30);
    });

    it('小数计算', async () => {
      const result = await executor.executeSkill({
        skill: testSkill,
        skillModule: MathSkill,
        input: { operation: 'multiply', a: 0.1, b: 0.2 }
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBeCloseTo(0.02);
    });
  });
});
