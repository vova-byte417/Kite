# 测试运行 Skill (test-runner)

**版本**: 1.0.0  
**作者**: vova  
**分类**: 开发工具  
**标签**: `test`, `unit-test`, `integration-test`, `jest`, `vitest`, `coverage`, `lint`

---

## 概述

测试运行 Skill 提供完整的测试执行和代码质量检查能力：
- 运行 Jest/Vitest/Mocha/Cypress 测试
- 自动生成测试文件模板
- 代码质量检查（ESLint + Prettier + TypeScript）
- 覆盖率报告生成
- 测试存在性检查

---

## Skill 配置

### 注册配置

```json
{
  "name": "test-runner",
  "version": "1.0.0",
  "description": "测试运行和代码质量检查工具",
  "entryPoint": "./sample-skills/test-runner/index.js",
  "tags": ["test", "unit-test", "jest", "coverage", "lint"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 120000,
    "maxRetries": 1
  },
  "metadata": {
    "author": "vova",
    "category": "development",
    "icon": "🧪"
  }
}
```

---

## 使用指南

### 基本调用方式

```typescript
import skillManager from '../skill-system';

// 运行所有测试
const result = await skillManager.executeSkill('test-runner', {
  operation: 'run-tests',
  framework: 'jest',
  mode: 'all',
  generateReport: true
});

console.log(`测试结果: ${result.passed}/${result.totalTests} 通过`);
```

---

## 操作类型详解

### 1. 运行测试 (`operation: 'run-tests'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'run-tests'` |
| `framework` | string | 是 | - | 测试框架：jest/vitest/mocha/cypress |
| `testPath` | string | 否 | - | 测试文件或目录路径 |
| `mode` | string | 否 | 'all' | 运行模式：all/watch/coverage/single |
| `testNamePattern` | string | 否 | - | 测试用例名称匹配模式 |
| `parallel` | boolean | 否 | true | 是否并行运行 |
| `maxWorkers` | number | 否 | '50%' | 最大并发工作进程数 |
| `generateReport` | boolean | 否 | false | 是否生成测试报告 |
| `reportFormat` | string | 否 | 'json' | 报告格式：json/html/junit |
| `extraArgs` | Array | 否 | [] | 额外的命令行参数 |
| `cwd` | string | 否 | - | 工作目录 |
| `timeout` | number | 否 | 60000 | 超时时间（毫秒） |

**输出**:

```typescript
{
  success: boolean,          // 是否全部通过
  totalTests: number,        // 总测试数
  passed: number,            // 通过数
  failed: number,            // 失败数
  skipped: number,           // 跳过数
  duration: number,          // 执行时间（毫秒）
  testResults?: Array<{      // 详细测试结果
    testFilePath: string,
    testName: string,
    status: 'passed' | 'failed' | 'skipped',
    duration?: number,
    errorMessage?: string
  }>,
  coverage?: {               // 覆盖率数据
    statements: number,
    branches: number,
    functions: number,
    lines: number
  },
  reportPath?: string,       // 报告文件路径
  rawOutput?: string         // 原始命令输出
}
```

**示例 1: 运行所有测试并生成覆盖率报告**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'run-tests',
  framework: 'jest',
  mode: 'coverage',
  testPath: './src',
  generateReport: true,
  reportFormat: 'html',
  timeout: 120000,
  parallel: true,
  maxWorkers: 4
});

if (result.success) {
  console.log('✅ 所有测试通过!');
  console.log(`📊 覆盖率: 语句 ${result.coverage?.statements}%, 行 ${result.coverage?.lines}%`);
} else {
  console.log(`❌ ${result.failed} 个测试失败`);
}
```

**示例 2: 运行单个测试文件**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'run-tests',
  framework: 'jest',
  mode: 'single',
  testPath: './src/utils/__tests__/string.test.ts',
  testNamePattern: 'should trim',
  timeout: 30000
});
```

**示例 3: Watch 模式开发**

```typescript
await skillManager.executeSkill('test-runner', {
  operation: 'run-tests',
  framework: 'vitest',
  mode: 'watch',
  testPath: './src/components'
});
```

---

### 2. 生成测试文件 (`operation: 'generate-test'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-test'` |
| `targetFile` | string | 是 | - | 要测试的源文件路径 |
| `testFileName` | string | 否 | - | 测试文件名 |
| `framework` | string | 是 | - | 测试框架：jest/vitest/mocha |
| `testType` | string | 否 | 'unit' | 测试类型：unit/integration/e2e |
| `functions` | Array | 否 | ['default'] | 要测试的函数名列表 |
| `className` | string | 否 | - | 要测试的类名 |
| `typescript` | boolean | 否 | true | 是否使用 TypeScript |
| `outputDir` | string | 否 | - | 输出目录 |

**输出**:

```typescript
{
  success: boolean,          // 是否生成成功
  testFilePath: string,      // 生成的测试文件路径
  content: string,           // 生成的测试代码内容
  testCount: number          // 生成的测试用例数量
}
```

**示例 1: 为工具函数生成测试**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'generate-test',
  targetFile: './src/utils/string.ts',
  framework: 'jest',
  testType: 'unit',
  functions: ['trim', 'capitalize', 'truncate', 'slugify'],
  typescript: true,
  outputDir: './src/utils/__tests__'
});

console.log(`✅ 已生成 ${result.testCount} 个测试用例`);
console.log(`📄 文件路径: ${result.testFilePath}`);
```

**示例 2: 为类生成测试**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'generate-test',
  targetFile: './src/services/UserService.ts',
  framework: 'jest',
  testType: 'unit',
  className: 'UserService',
  functions: ['createUser', 'getUserById', 'updateUser', 'deleteUser'],
  typescript: true
});
```

**生成的测试文件示例**:

```typescript
import * as string from '../string';

describe('UNIT: string', () => {

  describe('trim', () => {

    it('should be defined', () => {
      expect(string.trim).toBeDefined();
    });

    it('should work correctly', () => {
      // TODO: 实现测试逻辑
      // const result = string.trim(/* args */);
      // expect(result).toBe(/* expected */);
    });

    it('should handle edge cases', () => {
      // TODO: 边界情况测试
    });

  });

  // ... 其他函数测试

});
```

---

### 3. 运行 Lint (`operation: 'run-lint'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'run-lint'` |
| `linter` | string | 是 | - | Lint 工具：eslint/prettier/tsc/all |
| `targetPath` | string | 否 | '.' | 要检查的文件/目录路径 |
| `fix` | boolean | 否 | false | 是否自动修复可修复问题 |
| `format` | string | 否 | 'stylish' | 输出格式：stylish/json/unix |
| `cwd` | string | 否 | - | 工作目录 |

**输出**:

```typescript
{
  success: boolean,          // 是否通过检查
  totalErrors: number,       // 总错误数
  totalWarnings: number,     // 总警告数
  filesChecked: number,      // 检查的文件数
  issues?: Array<{           // 详细问题列表
    filePath: string,
    line: number,
    column: number,
    severity: 'error' | 'warning',
    rule: string,
    message: string
  }>,
  fixed?: number             // 自动修复的问题数
}
```

**示例 1: 完整代码质量检查**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'run-lint',
  linter: 'all',  // eslint + prettier + tsc
  targetPath: './src',
  fix: true,      // 自动修复
  format: 'stylish'
});

console.log(`✅ 检查完成`);
console.log(`错误: ${result.totalErrors}, 警告: ${result.totalWarnings}`);
console.log(`自动修复: ${result.fixed} 个问题`);
```

**示例 2: 仅运行 TypeScript 类型检查**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'run-lint',
  linter: 'tsc',
  cwd: './frontend'
});

if (!result.success) {
  console.log(`❌ TypeScript 类型检查失败: ${result.totalErrors} 个错误`);
}
```

---

### 4. 生成覆盖率报告 (`operation: 'coverage-report'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'coverage-report'` |
| `format` | string | 是 | - | 报告格式：text/html/json/lcov/clover |
| `coveragePath` | string | 否 | './coverage' | 覆盖率数据文件路径 |
| `outputDir` | string | 否 | './coverage' | 报告输出目录 |
| `thresholds` | Object | 否 | - | 覆盖率阈值配置 |

**Thresholds 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `statements` | number | 语句覆盖率最低要求（%） |
| `branches` | number | 分支覆盖率最低要求（%） |
| `functions` | number | 函数覆盖率最低要求（%） |
| `lines` | number | 行覆盖率最低要求（%） |

**输出**:

```typescript
{
  success: boolean,          // 报告生成是否成功
  reportPath: string,        // 报告文件路径
  format: string,            // 报告格式
  summary: {                 // 覆盖率摘要
    statements: number,
    branches: number,
    functions: number,
    lines: number
  },
  meetsThresholds?: boolean  // 是否达到设定的阈值
}
```

**示例: 生成 HTML 覆盖率报告并检查阈值**

```typescript
const result = await skillManager.executeSkill('test-runner', {
  operation: 'coverage-report',
  format: 'html',
  coveragePath: './coverage/coverage-final.json',
  outputDir: './coverage/html',
  thresholds: {
    statements: 80,   // 语句覆盖率至少 80%
    branches: 75,     // 分支覆盖率至少 75%
    functions: 85,    // 函数覆盖率至少 85%
    lines: 80         // 行覆盖率至少 80%
  }
});

if (!result.meetsThresholds) {
  console.log('❌ 覆盖率未达到要求!');
  console.log(`语句: ${result.summary.statements}% (要求 80%)`);
  console.log(`分支: ${result.summary.branches}% (要求 75%)`);
} else {
  console.log('✅ 覆盖率检查通过!');
}
console.log(`📄 HTML 报告已生成: ${result.reportPath}`);
```

---

### 5. 检查测试是否存在 (`operation: 'check-tests'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'check-tests'` |
| `sourcePath` | string | 是 | - | 源文件路径 |
| `testDir` | string | 否 | '__tests__' | 测试目录名 |
| `testSuffix` | string | 否 | '.test' | 测试文件后缀 |

**输出**:

```typescript
{
  success: boolean,          // 检查是否成功
  hasTests: boolean,         // 是否存在测试文件
  testFilePath?: string,     // 测试文件路径
  testCount?: number,        // 已有的测试用例数
  missingTests?: string[]    // 缺少测试的文件列表
}
```

**示例: 批量检查测试覆盖情况**

```typescript
const files = [
  './src/utils/string.ts',
  './src/utils/number.ts',
  './src/utils/date.ts',
  './src/utils/object.ts'
];

for (const file of files) {
  const result = await skillManager.executeSkill('test-runner', {
    operation: 'check-tests',
    sourcePath: file,
    testDir: '__tests__',
    testSuffix: '.test'
  });

  if (!result.hasTests) {
    console.log(`❌ ${file} 缺少测试文件`);
  } else {
    console.log(`✅ ${file} 有 ${result.testCount} 个测试用例`);
  }
}
```

---

## 完整工作流程示例

### CI/CD 管道中的测试流程

```typescript
async function runTestPipeline() {
  console.log('🚀 开始测试管道...');

  // 1. 首先运行类型检查
  console.log('\n1/4 运行 TypeScript 类型检查...');
  const tscResult = await skillManager.executeSkill('test-runner', {
    operation: 'run-lint',
    linter: 'tsc'
  });
  if (!tscResult.success) {
    console.log('❌ 类型检查失败，终止流程');
    return false;
  }
  console.log('✅ 类型检查通过');

  // 2. 运行代码规范检查
  console.log('\n2/4 运行代码规范检查...');
  const lintResult = await skillManager.executeSkill('test-runner', {
    operation: 'run-lint',
    linter: 'eslint',
    targetPath: './src',
    fix: false
  });
  if (lintResult.totalErrors > 0) {
    console.log(`❌ 有 ${lintResult.totalErrors} 个 ESLint 错误需要修复`);
    return false;
  }
  console.log('✅ 代码规范检查通过');

  // 3. 运行所有测试
  console.log('\n3/4 运行所有测试...');
  const testResult = await skillManager.executeSkill('test-runner', {
    operation: 'run-tests',
    framework: 'jest',
    mode: 'coverage',
    timeout: 120000
  });
  if (!testResult.success) {
    console.log(`❌ ${testResult.failed}/${testResult.totalTests} 个测试失败`);
    return false;
  }
  console.log(`✅ 所有测试通过 (${testResult.passed}/${testResult.totalTests})`);

  // 4. 检查覆盖率阈值
  console.log('\n4/4 检查覆盖率阈值...');
  const coverageResult = await skillManager.executeSkill('test-runner', {
    operation: 'coverage-report',
    format: 'html',
    thresholds: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    }
  });
  if (!coverageResult.meetsThresholds) {
    console.log('❌ 覆盖率未达到要求');
    return false;
  }
  console.log('✅ 覆盖率检查通过');

  console.log('\n🎉 测试管道全部通过!');
  return true;
}
```

---

## 支持的测试框架

| 框架 | 状态 | 说明 |
|------|------|------|
| Jest | ✅ 完全支持 | 单元测试、覆盖率、快照 |
| Vitest | ✅ 完全支持 | Vite 原生测试框架 |
| Mocha | ✅ 支持 | 需配合 Chai 等断言库 |
| Cypress | ✅ 支持 | E2E 端到端测试 |
| Playwright | ⏳ 计划中 | 多浏览器 E2E 测试 |

---

## 最佳实践

### 1. 测试文件组织

```
src/
├── utils/
│   ├── string.ts
│   └── __tests__/
│       └── string.test.ts      ✅ 与源文件同目录
├── services/
│   └── UserService.ts
└── __tests__/                  ✅ 全局测试目录
    └── integration/
        └── user-flow.test.ts
```

### 2. 覆盖率目标

| 项目类型 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 |
|---------|-----------|-----------|-----------|
| 工具库 | 95%+ | 90%+ | 95%+ |
| 业务服务 | 80%+ | 75%+ | 80%+ |
| UI 组件 | 70%+ | 60%+ | 70%+ |

### 3. 测试金字塔

- **单元测试 (70%)**: 快速、独立、覆盖函数/方法
- **集成测试 (20%)**: 模块间交互、API 调用
- **E2E 测试 (10%)**: 完整用户流程

---

## 常见问题

### Q: 测试运行超时怎么办？

A: 可以增大 `timeout` 参数，或者减少并发数：

```typescript
{
  timeout: 300000,  // 5 分钟
  maxWorkers: 2     // 减少并发
}
```

### Q: 如何调试失败的测试？

A: 使用 `testNamePattern` 只运行失败的测试，并查看 `rawOutput` 获取详细错误信息。

### Q: 生成的测试文件位置在哪里？

A: 默认在源文件所在目录的 `__tests__` 子目录下，可以通过 `outputDir` 参数自定义。

---

## 更新日志

### v1.0.0 (2026-05-15)
- ✅ 支持 5 种测试相关操作
- ✅ 支持 Jest/Vitest/Mocha/Cypress 框架
- ✅ 自动生成测试文件模板
- ✅ ESLint/Prettier/TypeScript 代码检查
- ✅ 覆盖率报告生成与阈值检查
- ✅ 测试存在性批量检查
