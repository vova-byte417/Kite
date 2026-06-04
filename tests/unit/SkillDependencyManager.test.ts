import { describe, it, expect, beforeEach } from 'vitest';
import { SkillDependencyManager } from '@/skill/SkillDependencyManager';
import { SkillRegistration, SkillStatus } from '@/skill/types';

describe('SkillDependencyManager', () => {
  let manager: SkillDependencyManager;

  beforeEach(() => {
    manager = new SkillDependencyManager({
      strictMode: false,
      autoCheckOnLoad: false
    });
  });

  function createSkill(id: string, deps: string[] = []): SkillRegistration {
    return {
      id,
      name: id,
      version: '1.0.0',
      description: `Skill ${id}`,
      entryPoint: `./${id}.ts`,
      tags: [],
      supportedModels: [],
      requirements: {},
      status: SkillStatus.READY,
      metadata: {},
      dependencies: deps.map(depId => ({ skillId: depId, minVersion: '1.0.0' })),
      config: { enabled: true },
      registeredAt: new Date()
    };
  }

  describe('注册和基本依赖', () => {
    it('应该正确注册单个 Skill', () => {
      const skill = createSkill('skill-a');
      manager.registerSkill(skill);

      const deps = manager.getDirectDependencies('skill-a');
      expect(deps).toEqual([]);
    });

    it('应该正确注册带依赖的 Skill', () => {
      const skillA = createSkill('skill-a');
      const skillB = createSkill('skill-b', ['skill-a']);

      manager.registerSkill(skillA);
      manager.registerSkill(skillB);

      const deps = manager.getDirectDependencies('skill-b');
      expect(deps).toEqual(['skill-a']);
    });

    it('应该正确获取所有递归依赖', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const allDeps = manager.getAllDependencies('c');
      expect(allDeps).toContain('a');
      expect(allDeps).toContain('b');
      expect(allDeps).toHaveLength(2);
    });

    it('应该正确获取反向依赖', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['a']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const dependents = manager.getDependents('a');
      expect(dependents).toContain('b');
      expect(dependents).toContain('c');
      expect(dependents).toHaveLength(2);
    });
  });

  describe('拓扑排序', () => {
    it('应该正确排序简单的线性依赖', () => {
      // a → b → c
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const topology = manager.computeDependencyTopology();

      // a 应该在 b 之前，b 应该在 c 之前
      const indexA = topology.order.indexOf('a');
      const indexB = topology.order.indexOf('b');
      const indexC = topology.order.indexOf('c');

      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });

    it('应该正确处理并行依赖', () => {
      // a 和 b 都没有依赖，c 依赖两者
      const a = createSkill('a');
      const b = createSkill('b');
      const c = createSkill('c', ['a', 'b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const topology = manager.computeDependencyTopology();

      // a 和 b 应该都在 c 之前
      const indexA = topology.order.indexOf('a');
      const indexB = topology.order.indexOf('b');
      const indexC = topology.order.indexOf('c');

      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexC);
    });

    it('应该正确计算可并行层级', () => {
      // Level 0: a, b
      // Level 1: c (依赖 a 和 b)
      const a = createSkill('a');
      const b = createSkill('b');
      const c = createSkill('c', ['a', 'b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const topology = manager.computeDependencyTopology();

      expect(topology.levels.length).toBeGreaterThanOrEqual(2);

      // 第 0 层应该包含 a 和 b（无依赖）
      const level0 = topology.levels[0];
      expect(level0).toContain('a');
      expect(level0).toContain('b');

      // c 应该在后面的层级
      const levelWithC = topology.levels.find(l => l.includes('c'));
      expect(levelWithC).toBeDefined();
    });

    it('空系统应该返回空的拓扑', () => {
      const topology = manager.computeDependencyTopology();
      expect(topology.order).toEqual([]);
      expect(topology.levels).toEqual([]);
    });
  });

  describe('循环检测', () => {
    it('应该检测直接的循环依赖', () => {
      // a → b → a
      const a = createSkill('a', ['b']);
      const b = createSkill('b', ['a']);

      manager.registerSkill(a);
      manager.registerSkill(b);

      const cycles = manager.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('应该检测间接的循环依赖', () => {
      // a → b → c → a
      const a = createSkill('a', ['c']);
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const cycles = manager.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('没有循环时应该返回空数组', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const cycles = manager.detectCycles();
      expect(cycles).toEqual([]);
    });

    it('单个 Skill 应该不会检测到循环', () => {
      const a = createSkill('a');
      manager.registerSkill(a);

      const cycles = manager.detectCycles();
      expect(cycles).toEqual([]);
    });

    it('自引用应该被检测', () => {
      const a = createSkill('a', ['a']);
      manager.registerSkill(a);

      const cycles = manager.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('依赖检查', () => {
    it('应该正确检查 Skill 的依赖满足状态', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);

      manager.registerSkill(a);
      manager.registerSkill(b);

      // 此时 a 存在，应该满足
      const check = manager.checkDependencies('b');
      expect(check.satisfied).toBe(true);
      expect(check.missing).toEqual([]);
    });

    it('缺少依赖时应该正确报告', () => {
      // b 依赖 a，但 a 没有注册
      const b = createSkill('b', ['a']);
      manager.registerSkill(b);

      const check = manager.checkDependencies('b');
      expect(check.satisfied).toBe(false);
      expect(check.missing).toContain('a');
    });

    it('应该检查所有 Skill 的依赖', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b', 'd']);  // d 不存在

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const allCheck = manager.checkAllDependencies();
      expect(allCheck.allSatisfied).toBe(false);
      expect(allCheck.summary.total).toBe(3);
      expect(allCheck.summary.withIssues).toBeGreaterThan(0);
    });

    it('应该能检查可选依赖', () => {
      // 可选依赖即使不存在也不会导致检查失败
      const skill = {
        id: 'test-skill',
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test',
        entryPoint: './test.ts',
        tags: [],
        supportedModels: [],
        requirements: {},
        status: SkillStatus.REGISTERED,
        metadata: {},
        dependencies: [{ skillId: 'optional-dep', minVersion: '1.0.0', optional: true }],
        config: { enabled: true },
        registeredAt: new Date()
      };

      manager.registerSkill(skill);
      const check = manager.checkDependencies('test-skill');

      // 可选依赖缺失不影响整体满足状态
      expect(check.satisfied).toBe(true);
    });
  });

  describe('依赖树可视化', () => {
    it('应该生成依赖树结构', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const tree = manager.buildDependencyTree('c');
      expect(tree).toBeDefined();
      expect(tree?.id).toBe('c');
      expect(tree?.depth).toBe(0);  // 根节点深度为 0
    });

    it('应该生成 ASCII 依赖树', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const ascii = manager.printDependencyTree('c');
      expect(ascii).toContain('c');
      expect(ascii).toContain('b');
      expect(ascii).toContain('a');
    });

    it('处理不存在的 Skill 应该返回空树', () => {
      const tree = manager.buildDependencyTree('not-exists');
      expect(tree.id).toBe('not-exists');
      expect(tree.children.length).toBe(0);  // 没有子节点
    });
  });

  describe('生成加载批次', () => {
    it('应该根据依赖关系生成正确的加载批次', () => {
      // 批次 0: a, b
      // 批次 1: c (依赖 a 和 b)
      const a = createSkill('a');
      const b = createSkill('b');
      const c = createSkill('c', ['a', 'b']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);

      const batches = manager.generateLoadBatches();

      // 至少应该有 2 个批次
      expect(batches.length).toBeGreaterThanOrEqual(2);

      // a 和 b 应该可以并行加载
      const firstBatch = batches[0];
      expect(firstBatch).toContain('a');
      expect(firstBatch).toContain('b');
    });

    it('空系统应该返回空批次', () => {
      const batches = manager.generateLoadBatches();
      expect(batches).toEqual([]);
    });

    it('单个 Skill 应该只有一个批次', () => {
      const a = createSkill('a');
      manager.registerSkill(a);

      const batches = manager.generateLoadBatches();
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual(['a']);
    });
  });

  describe('版本检查', () => {
    it('应该正确匹配最小版本要求', () => {
      const a = createSkill('a');  // version 1.0.0
      const b = {
        ...createSkill('b'),
        dependencies: [{ skillId: 'a', minVersion: '0.5.0' }]
      };

      manager.registerSkill(a);
      manager.registerSkill(b);

      const check = manager.checkDependencies('b');
      expect(check.satisfied).toBe(true);
    });

    it('应该检测不满足的最小版本要求', () => {
      const a = { ...createSkill('a'), version: '0.8.0' };
      const b = {
        ...createSkill('b'),
        dependencies: [{ skillId: 'a', minVersion: '1.0.0' }]
      };

      manager.registerSkill(a);
      manager.registerSkill(b);

      const check = manager.checkDependencies('b');
      expect(check.versionMismatch.length).toBeGreaterThan(0);
    });

    it('应该正确处理最大版本限制', () => {
      const a = { ...createSkill('a'), version: '2.0.0' };
      const b = {
        ...createSkill('b'),
        dependencies: [{ skillId: 'a', minVersion: '1.0.0', maxVersion: '1.9.9' }]
      };

      manager.registerSkill(a);
      manager.registerSkill(b);

      const check = manager.checkDependencies('b');
      expect(check.versionMismatch.length).toBeGreaterThan(0);
    });
  });

  describe('注销和清理', () => {
    it('应该正确注销 Skill', () => {
      const a = createSkill('a');
      manager.registerSkill(a);
      expect(manager.getAllDependencies('a')).toEqual([]);

      const result = manager.unregisterSkill('a');
      expect(result).toBe(true);
    });

    it('注销不存在的 Skill 返回 false', () => {
      const result = manager.unregisterSkill('not-exists');
      expect(result).toBe(false);
    });

    it('注销后应该更新依赖关系', () => {
      const a = createSkill('a');
      const b = createSkill('b', ['a']);

      manager.registerSkill(a);
      manager.registerSkill(b);

      // 注销前，b 依赖 a
      expect(manager.getDependents('a')).toContain('b');

      manager.unregisterSkill('a');

      // 注销后，依赖应该更新
      const check = manager.checkDependencies('b');
      expect(check.missing).toContain('a');
    });
  });

  describe('复杂场景', () => {
    it('应该处理钻石形依赖图', () => {
      //     a
      //   /   \
      //  b     c
      //   \   /
      //     d
      const a = createSkill('a');
      const b = createSkill('b', ['a']);
      const c = createSkill('c', ['a']);
      const d = createSkill('d', ['b', 'c']);

      manager.registerSkill(a);
      manager.registerSkill(b);
      manager.registerSkill(c);
      manager.registerSkill(d);

      const topology = manager.computeDependencyTopology();

      // a 应该最先
      expect(topology.order[0]).toBe('a');

      // b 和 c 应该在中间层级
      // d 应该最后
      expect(topology.order[topology.order.length - 1]).toBe('d');
    });

    it('应该处理多分支并行', () => {
      // Branch 1: a1 → a2 → a3
      // Branch 2: b1 → b2
      // 两个分支独立，可以并行
      const a1 = createSkill('a1');
      const a2 = createSkill('a2', ['a1']);
      const a3 = createSkill('a3', ['a2']);
      const b1 = createSkill('b1');
      const b2 = createSkill('b2', ['b1']);

      manager.registerSkill(a1);
      manager.registerSkill(a2);
      manager.registerSkill(a3);
      manager.registerSkill(b1);
      manager.registerSkill(b2);

      const batches = manager.generateLoadBatches();

      // a1 和 b1 可以在同一批次加载
      const firstBatch = batches[0];
      expect(firstBatch).toContain('a1');
      expect(firstBatch).toContain('b1');
    });
  });
});
