import { vi } from 'vitest';

// 全局测试 setup
vi.setConfig({ testTimeout: 30000 });

// 清理环境变量
process.env.NODE_ENV = 'test';

// 全局测试辅助函数
declare global {
  var createTestSkill: typeof createTestSkill;
}

export function createTestSkill(overrides = {}) {
  return {
    id: 'test-skill-' + Math.random().toString(36).slice(2),
    name: 'test-skill',
    version: '1.0.0',
    description: 'Test skill',
    entryPoint: './tests/mocks/mock-skill.ts',
    tags: ['test'],
    dependencies: [],
    config: { enabled: true },
    metadata: { author: 'test' },
    ...overrides
  };
}

// 导出到全局
globalThis.createTestSkill = createTestSkill;
