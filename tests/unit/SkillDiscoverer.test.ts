import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillDiscoverer } from '@/skill/SkillDiscoverer';
import { SkillRegistration, SkillStatus } from '@/skill/types';
import * as path from 'path';

describe('SkillDiscoverer', () => {
  let discoverer: SkillDiscoverer;

  beforeEach(() => {
    discoverer = new SkillDiscoverer({
      scanPaths: [],
      autoDiscover: false
    });
  });

  describe('初始化', () => {
    it('应该正确初始化空的 discoverer', () => {
      expect(discoverer).toBeDefined();
      expect(discoverer.getDiscoveredSkills()).toHaveLength(0);
    });

    it('应该接受多个扫描路径', () => {
      const multiPathDiscoverer = new SkillDiscoverer({
        scanPaths: ['/path/1', '/path/2', '/path/3'],
        autoDiscover: false
      });
      expect(multiPathDiscoverer).toBeDefined();
    });
  });

  describe('手动注册 Skill', () => {
    it('应该成功注册一个新 Skill', () => {
      const skill = discoverer.registerSkill({
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test skill',
        entryPoint: './test-skill.ts',
        tags: ['test', 'unit']
      });

      expect(skill.id).toBeDefined();
      expect(skill.name).toBe('test-skill');
      expect(skill.version).toBe('1.0.0');
      expect(skill.status).toBe(SkillStatus.REGISTERED);
      expect(skill.tags).toEqual(['test', 'unit']);
      expect(discoverer.getDiscoveredSkills()).toHaveLength(1);
    });

    it('应该生成唯一的 Skill ID', () => {
      const skill1 = discoverer.registerSkill({
        name: 'skill-1',
        entryPoint: './s1.ts'
      });
      const skill2 = discoverer.registerSkill({
        name: 'skill-2',
        entryPoint: './s2.ts'
      });

      expect(skill1.id).not.toBe(skill2.id);
    });

    it('应该正确设置默认值', () => {
      const skill = discoverer.registerSkill({
        name: 'minimal-skill',
        entryPoint: './minimal.ts'
      });

      expect(skill.version).toBe('1.0.0');
      expect(skill.description).toBe('');
      expect(skill.tags).toEqual([]);
      expect(skill.dependencies).toEqual([]);
    });

    it('应该支持覆盖默认版本', () => {
      const skill = discoverer.registerSkill({
        name: 'versioned-skill',
        version: '2.1.0-beta',
        entryPoint: './v2.ts'
      });

      expect(skill.version).toBe('2.1.0-beta');
    });

    it('应该正确注册多个 Skill', () => {
      for (let i = 0; i < 5; i++) {
        discoverer.registerSkill({
          name: `skill-${i}`,
          entryPoint: `./skill-${i}.ts`
        });
      }

      expect(discoverer.getDiscoveredSkills()).toHaveLength(5);
    });
  });

  describe('查询 Skill', () => {
    beforeEach(() => {
      discoverer.registerSkill({
        name: 'data-reader',
        entryPoint: './reader.ts',
        tags: ['data', 'io', 'reader']
      });
      discoverer.registerSkill({
        name: 'data-writer',
        entryPoint: './writer.ts',
        tags: ['data', 'io', 'writer']
      });
      discoverer.registerSkill({
        name: 'math-ops',
        entryPoint: './math.ts',
        tags: ['math', 'calculator']
      });
    });

    it('应该根据 ID 查询 Skill', () => {
      const skill = discoverer.getDiscoveredSkills()[0];
      const found = discoverer.getDiscoveredSkill(skill.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(skill.id);
    });

    it('查询不存在的 ID 返回 undefined', () => {
      const found = discoverer.getDiscoveredSkill('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('根据名称精确匹配 Skill', () => {
      const found = discoverer.findDiscoveredSkillByName('data-reader');
      expect(found).toBeDefined();
      expect(found?.name).toBe('data-reader');
    });

    it('查询不存在的名称返回 undefined', () => {
      const found = discoverer.findDiscoveredSkillByName('not-found');
      expect(found).toBeUndefined();
    });
  });

  describe('搜索 Skill', () => {
    beforeEach(() => {
      discoverer.registerSkill({
        name: 'csv-reader',
        description: '读取 CSV 格式的数据文件',
        entryPoint: './csv.ts',
        tags: ['data', 'reader', 'csv', 'io']
      });
      discoverer.registerSkill({
        name: 'json-reader',
        description: '读取 JSON 格式的数据文件',
        entryPoint: './json.ts',
        tags: ['data', 'reader', 'json', 'io']
      });
      discoverer.registerSkill({
        name: 'report-generator',
        description: '生成 PDF 和 HTML 格式的报告',
        entryPoint: './report.ts',
        tags: ['report', 'generator', 'output']
      });
    });

    it('根据关键词搜索 Skill', () => {
      const results = discoverer.searchSkills({ query: 'reader' });
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('根据标签搜索 Skill', () => {
      const results = discoverer.searchSkills({ tags: ['io'] });
      expect(results).toHaveLength(2);
    });

    it('组合多个搜索条件', () => {
      const results = discoverer.searchSkills({
        query: 'reader',
        tags: ['data']
      });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('支持限制搜索结果数量', () => {
      const results = discoverer.searchSkills({ limit: 1 });
      expect(results.length).toBe(1);
    });

    it('支持按名称排序', () => {
      const results = discoverer.searchSkills({
        sortBy: 'name',
        sortOrder: 'asc'
      });

      expect(results[0].name).toBe('csv-reader');
    });
  });

  describe('添加和移除扫描路径', () => {
    it('应该成功添加扫描路径', () => {
      discoverer.addScanPath('./new-skills');
      // 验证路径已添加（内部状态）
    });

    it('应该成功移除扫描路径', () => {
      discoverer.addScanPath('./test-path');
      const result = discoverer.removeScanPath('./test-path');
      expect(result).toBe(true);
    });

    it('移除不存在的路径返回 false', () => {
      const result = discoverer.removeScanPath('./not-exists');
      expect(result).toBe(false);
    });
  });

  describe('注销 Skill', () => {
    it('应该成功注销 Skill', () => {
      const skill = discoverer.registerSkill({
        name: 'to-remove',
        entryPoint: './remove.ts'
      });

      const beforeCount = discoverer.getDiscoveredSkills().length;
      const result = discoverer.unregisterSkill(skill.id);
      const afterCount = discoverer.getDiscoveredSkills().length;

      expect(result).toBe(true);
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('注销不存在的 ID 返回 false', () => {
      const result = discoverer.unregisterSkill('not-exists');
      expect(result).toBe(false);
    });
  });

  describe('刷新发现', () => {
    it('应该清空并重新扫描', async () => {
      // 先注册一些 Skill
      discoverer.registerSkill({ name: 'temp', entryPoint: './temp.ts' });

      expect(discoverer.getDiscoveredSkills()).toHaveLength(1);

      // 刷新
      await discoverer.refresh();

      // 空路径扫描后数量为 0
      expect(discoverer.getDiscoveredSkills()).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('处理空的搜索结果', () => {
      const results = discoverer.searchSkills({ query: 'xyz-nonexistent' });
      expect(results).toEqual([]);
    });

    it('处理空标签列表', () => {
      const skill = discoverer.registerSkill({
        name: 'no-tags',
        entryPoint: './no-tags.ts',
        tags: []
      });
      expect(skill.tags).toEqual([]);
    });

    it('处理长名称', () => {
      const longName = 'a'.repeat(100);
      const skill = discoverer.registerSkill({
        name: longName,
        entryPoint: './long-name.ts'
      });
      expect(skill.name).toBe(longName);
    });
  });
});
