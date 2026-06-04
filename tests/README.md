# Skill 系统测试文档

本目录包含 Skill 系统的完整测试套件，包括单元测试和集成测试。

---

## 📋 目录结构

```
tests/
├── unit/                           # 单元测试
│   ├── SkillDiscoverer.test.ts     # Skill 发现和注册测试
│   ├── SkillLoader.test.ts         # Skill 加载和卸载测试
│   ├── SkillExecutor.test.ts       # Skill 执行引擎测试
│   └── SkillDependencyManager.test.ts  # 依赖管理测试
│
├── integration/                     # 集成测试
│   └── SkillManager.test.ts        # SkillManager 完整流程测试
│
├── mocks/                           # 测试用的 mock Skill
│   ├── mock-skill.ts               # 最简单的 mock Skill
│   ├── math-skill.ts               # 数学运算 Skill（用于测试）
│   └── async-skill.ts              # 异步 Skill（用于测试超时）
│
├── setup.ts                         # 测试全局 setup
├── vitest.config.ts                # Vitest 配置
└── README.md                        # 本文档
```

---

## 🚀 运行测试

### 前置条件

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd skill-system
npm install
```

### 运行所有测试

```bash
# 运行所有测试
npm test

# 或使用 vitest 直接运行
npx vitest run
```

### 运行特定测试文件

```bash
# 只运行单元测试
npx vitest run tests/unit/

# 只运行集成测试
npx vitest run tests/integration/

# 运行单个测试文件
npx vitest run tests/unit/SkillExecutor.test.ts
```

### 监听模式（开发时）

```bash
npx vitest
```

---

## 📊 测试覆盖率

### 生成覆盖率报告

```bash
npx vitest run --coverage
```

### 覆盖率报告位置

```
coverage/
├── index.html           # HTML 报告（浏览器打开）
├── coverage-final.json  # JSON 格式
└── lcov.info           # lcov 格式（用于 CI）
```

### 目标覆盖率

| 指标 | 最低要求 | 目标 |
|------|---------|------|
| 语句覆盖率 | 80% | 90% |
| 分支覆盖率 | 70% | 80% |
| 函数覆盖率 | 80% | 90% |
| 行覆盖率 | 80% | 90% |

---

## 🧪 测试类型说明

### 单元测试 (Unit Tests)

**位置**: `tests/unit/`

测试单个模块的功能，不依赖其他模块。

| 文件 | 测试范围 | 测试数量 |
|------|---------|---------|
| `SkillDiscoverer.test.ts` | Skill 注册、发现、搜索、注销 | 30+ |
| `SkillLoader.test.ts` | Skill 加载、卸载、热重载、事件 | 25+ |
| `SkillExecutor.test.ts` | Skill 执行、超时、重试、统计、钩子 | 40+ |
| `SkillDependencyManager.test.ts` | 依赖解析、拓扑排序、循环检测 | 25+ |

**特点**:
- 快速执行（< 1 秒）
- 依赖最小化
- 覆盖率高

### 集成测试 (Integration Tests)

**位置**: `tests/integration/`

测试多个模块协同工作的情况。

| 文件 | 测试范围 | 测试数量 |
|------|---------|---------|
| `SkillManager.test.ts` | 完整生命周期、管道执行、错误处理 | 20+ |

**特点**:
- 测试模块间交互
- 模拟真实使用场景
- 端到端功能验证

---

## 🎯 核心测试场景

### 1. Skill 生命周期

```
注册 → 发现 → 加载 → 执行 → （热重载） → 卸载 → 注销
```

### 2. 依赖管理

- ✅ 直接依赖和递归依赖
- ✅ 反向依赖查询
- ✅ 拓扑排序正确性
- ✅ 循环依赖检测
- ✅ 依赖树构建
- ✅ 版本兼容性检查

### 3. 执行引擎

- ✅ 正常执行流程
- ✅ 输入验证
- ✅ 超时处理
- ✅ 重试机制（多种策略）
- ✅ 错误处理和恢复
- ✅ 执行统计和监控
- ✅ 生命周期钩子

### 4. 批量执行

- ✅ 并行执行（控制并发数）
- ✅ 串行执行（顺序保证）
- ✅ 依赖驱动执行（自动排序）
- ✅ 失败策略（继续/停止）

### 5. 搜索和匹配

- ✅ 关键词搜索
- ✅ 标签搜索
- ✅ 组合搜索条件
- ✅ 排序和分页
- ✅ 智能任务匹配

### 6. 系统管理

- ✅ 系统概览和统计
- ✅ 安全模式切换
- ✅ 事件和通知
- ✅ 资源清理

---

## 🔧 Mock Skill 说明

### `mock-skill.ts`
最简单的 Skill 实现，用于基础测试。

```typescript
// 输入: any
// 输出: { success: true, message: string, inputReceived: any }
```

### `math-skill.ts`
数学运算 Skill，用于测试输入验证和复杂逻辑。

**支持的操作**:
- `add` - 加法
- `subtract` - 减法
- `multiply` - 乘法
- `divide` - 除法（除零错误）

### `async-skill.ts`
异步 Skill，用于测试超时和重试机制。

**特性**:
- 可配置延迟时间
- 可配置前 N 次失败
- 支持生命周期钩子

---

## 📝 编写新测试

### 1. 单元测试模板

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourModule } from '../../src/YourModule';

describe('YourModule', () => {
  let module: YourModule;

  beforeEach(() => {
    module = new YourModule();
  });

  describe('功能组', () => {
    it('应该正确执行某个操作', () => {
      // 准备
      const input = { /* 测试数据 */ };

      // 执行
      const result = module.doSomething(input);

      // 断言
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('应该正确处理错误情况', () => {
      // 测试边界条件和错误场景
    });
  });
});
```

### 2. 测试最佳实践

#### ✅ 应该做的
- 每个测试独立，不依赖其他测试
- 使用 `beforeEach` 重置状态
- 测试描述清晰，说明"应该做什么"
- 一个测试只测试一个关注点
- 测试正常和异常场景
- 使用有意义的断言消息

#### ❌ 不应该做的
- 测试之间共享状态
- 过长的测试用例
- 依赖外部网络/服务
- 测试私有方法（通过公开 API 测试）
- 过于宽泛的断言

---

## 🔍 调试测试

### VS Code 调试

1. 在测试代码行号左侧设置断点
2. 按 F5 或点击"运行和调试"
3. 选择"Vitest 调试"配置

### 打印调试

在测试中使用 `console.log`，Vitest 会正常显示输出。

### 只运行特定测试

```typescript
// 只运行这个测试
it.only('重点测试', () => {
  // ...
});

// 跳过这个测试
it.skip('暂时跳过', () => {
  // ...
});
```

---

## 📈 持续集成

### GitHub Actions 示例

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 📚 相关资源

- [Vitest 文档](https://vitest.dev/)
- [Vitest 断言 API](https://vitest.dev/api/)
- [测试覆盖最佳实践](https://martinfowler.com/bliki/TestCoverage.html)
- [测试金字塔](https://martinfowler.com/bliki/TestPyramid.html)

---

## 🤝 贡献指南

### 添加新测试

1. 确定测试类型（单元/集成）
2. 在对应目录创建测试文件
3. 遵循现有测试风格和命名规范
4. 确保测试独立且可重复运行
5. 运行所有测试确保没有破坏现有功能

### 提高覆盖率

1. 运行 `npm test -- --coverage` 查看覆盖率报告
2. 找到红色（未覆盖）的代码行
3. 添加测试用例覆盖这些场景
4. 重新运行验证覆盖率提升

---

## ❓ 常见问题

### Q: 测试运行很慢？

A:
- 检查是否有不必要的异步等待
- 使用 `it.only` 只运行需要的测试
- 考虑拆分大的测试文件

### Q: 测试偶尔失败（flaky tests）？

A:
- 检查测试之间是否共享状态
- 确保 `beforeEach` 正确重置
- 避免依赖外部系统或时间
- 使用假定时器 `vi.useFakeTimers()`

### Q: 如何测试私有方法？

A:
- 通过公开 API 间接测试
- 如果确实需要，考虑提取为单独的函数
- 或者使用 `// @ts-expect-error` 临时访问

### Q: 覆盖率已经 100% 了还需要加测试吗？

A: 覆盖率只是一个指标！100% 覆盖率不代表没有 bug。考虑：
- 边界条件是否测试完整？
- 各种错误场景是否覆盖？
- 不同的输入组合是否测试？
