# Skill System - Sample Skills Collection

**版本**: 1.0.0  
**作者**: vova  
**最后更新**: 2026-05-15

---

## 📋 项目简介

这是 Skill 系统的示例 Skill 集合，包含 5 个完整的 Skill，展示了 Skill 系统的各种功能和最佳实践。每个 Skill 都包含完整的代码实现、类型定义、文档说明和使用示例。

---

## 📦 Skill 总览

| Skill 名称 | 分类 | 功能描述 | 操作数 | 状态 |
|-----------|------|---------|--------|------|
| [file-io](./file-io/SKILL.md) | 工具类 | 文件系统操作（读/写/删除/复制/移动等） | 8 | ✅ 完成 |
| [code-generation](./code-generation/SKILL.md) | 开发工具 | 模板驱动的代码生成（类/接口/组件/CRUD等） | 9 | ✅ 完成 |
| [test-runner](./test-runner/SKILL.md) | 开发工具 | 测试执行与代码质量检查（Jest、ESLint、覆盖率等） | 9 | ✅ 完成 |
| [git-operations](./git-operations/SKILL.md) | 开发工具 | Git 版本控制操作（分支、提交、推送、拉取等） | 16 | ✅ 完成 |
| [utils](./utils/SKILL.md) | 工具类 | 通用工具函数（字符串、数字、数组、验证等） | 28 | ✅ 完成 |

**总计**: 5 个 Skill，共 70+ 个操作

---

## 🚀 快速开始

### 1. 注册 Skill

```typescript
import { SkillManager } from './skill-system';

const manager = new SkillManager();

// 注册所有示例 Skill
await manager.registerSkill({
  name: 'file-io',
  version: '1.0.0',
  description: '文件系统操作工具',
  entryPoint: './sample-skills/file-io/index.js',
  tags: ['file', 'io', 'filesystem'],
  config: { enabled: true, timeout: 30000 }
});

await manager.registerSkill({
  name: 'utils',
  version: '1.0.0',
  description: '通用工具函数集合',
  entryPoint: './sample-skills/utils/index.js',
  tags: ['utils', 'string', 'number', 'validation'],
  config: { enabled: true, timeout: 5000 }
});
```

### 2. 执行 Skill

```typescript
// 读取文件
const fileResult = await manager.executeSkill('file-io', {
  operation: 'read',
  filePath: './config.json',
  encoding: 'utf-8'
});

console.log('文件内容:', fileResult.content);

// 使用工具函数验证邮箱
const validateResult = await manager.executeSkill('utils', {
  operation: 'validate',
  subOperation: 'email',
  value: 'user@example.com'
});

console.log('邮箱是否有效:', validateResult.isValid);
```

### 3. 批量执行 Skill

```typescript
// 按依赖顺序批量执行
const batchResult = await manager.executeBatch({
  requests: [
    { skillId: 'utils', input: { operation: 'string', subOperation: 'trim', value: '  hello  ' } },
    { skillId: 'utils', input: { operation: 'string', subOperation: 'capitalize', value: 'world' } }
  ],
  mode: 'parallel',
  maxConcurrency: 5
});

console.log('批量执行结果:', batchResult);
```

---

## 📐 Skill 开发规范

### 目录结构

每个 Skill 应该包含以下文件：

```
sample-skills/
└── your-skill/
    ├── index.ts          # 主入口文件，实现 Skill 接口
    ├── SKILL.md          # 详细的使用文档和示例
    └── README.md         # 可选：额外的说明
```

### Skill 接口定义

所有 Skill 必须实现以下接口：

```typescript
interface SkillExport {
  /**
   * 主执行函数
   * @param input 输入参数
   * @param context 执行上下文
   */
  execute(input: any, context?: ExecutionContext): Promise<any>;

  /**
   * 输入验证（可选）
   * @param input 输入参数
   * @returns 是否有效
   */
  validateInput?(input: any): Promise<boolean>;

  /**
   * Skill 加载时的钩子函数（可选）
   */
  onLoad?(): Promise<void>;

  /**
   * Skill 卸载时的钩子函数（可选）
   */
  onUnload?(): Promise<void>;
}
```

### 最佳实践

#### 1. 操作类型设计

- ✅ 每个 Skill 应该有一个 `operation` 字段来标识执行什么操作
- ✅ 对于复杂的 Skill，可以使用 `subOperation` 进一步细分
- ✅ 所有操作应该在同一领域内，保持单一职责
- ❌ 不要创建包含不相关操作的"万能" Skill

#### 2. 输入输出类型

- ✅ 为每个操作定义完整的 TypeScript 类型
- ✅ 使用 discriminated union 区分不同操作的类型
- ✅ 输出应该包含 `success` 字段标识操作是否成功
- ✅ 错误信息应该清晰、用户友好

```typescript
// ✅ 好的做法：可区分的联合类型
type MySkillInput =
  | { operation: 'create'; data: CreateData; }
  | { operation: 'update'; id: string; data: UpdateData; }
  | { operation: 'delete'; id: string; };
```

#### 3. 文档规范

每个 Skill 的 SKILL.md 应该包含：

- ✅ 版本、作者、分类、标签信息
- ✅ 清晰的功能概述
- ✅ 注册配置示例
- ✅ 每个操作的详细说明（输入参数、输出格式、示例代码）
- ✅ 完整的使用场景示例
- ✅ 最佳实践和注意事项
- ✅ 更新日志

#### 4. 错误处理

- ✅ 使用 try-catch 捕获所有可能的异常
- ✅ 返回结构化的错误信息，而不是抛出异常
- ✅ 包含错误码、错误消息、详细信息
- ✅ 超时操作应该有明确的超时配置

#### 5. 性能考虑

- ✅ 异步操作使用 Promise
- ✅ 大数据量操作支持流式处理
- ✅ 避免内存泄漏
- ✅ 合理的超时设置

---

## 📁 目录结构

```
sample-skills/
├── file-io/                    # 文件系统操作 Skill
│   ├── index.ts               # 主入口
│   └── SKILL.md               # 详细文档
│
├── code-generation/            # 代码生成 Skill
│   ├── index.ts
│   └── SKILL.md
│
├── test-runner/               # 测试运行 Skill
│   ├── index.ts
│   └── SKILL.md
│
├── git-operations/            # Git 操作 Skill
│   ├── index.ts
│   └── SKILL.md
│
├── utils/                     # 通用工具 Skill
│   ├── index.ts
│   └── SKILL.md
│
└── README.md                  # 本文档：总览和规范
```

---

## 🎯 Skill 设计原则

### 1. 单一职责原则

每个 Skill 应该只负责一个明确的领域：

- ✅ **file-io**: 只处理文件系统操作
- ✅ **code-generation**: 只处理代码生成
- ❌ **bad**: 同时处理文件、网络、数据库的"万能" Skill

### 2. 可组合性

Skill 之间应该可以组合使用：

```typescript
// 组合示例：生成代码 → 写入文件 → 运行测试
const code = await manager.executeSkill('code-generation', { ... });
await manager.executeSkill('file-io', { operation: 'write', content: code.result, ... });
await manager.executeSkill('test-runner', { operation: 'run-tests', ... });
```

### 3. 幂等性

相同的输入应该产生相同的输出：

- ✅ 纯函数操作（字符串处理、计算等）天然幂等
- ✅ 有副作用的操作应该考虑幂等性设计
- ✅ 写入操作支持 overwrite 参数

### 4. 容错性

Skill 应该优雅地处理错误：

```typescript
try {
  // 执行操作
} catch (error) {
  return {
    success: false,
    error: {
      code: 'FILE_READ_ERROR',
      message: `无法读取文件: ${filePath}`,
      details: error.message
    }
  };
}
```

---

## 📝 开发新 Skill 模板

### 1. 创建目录结构

```bash
mkdir sample-skills/my-new-skill
cd sample-skills/my-new-skill
```

### 2. 创建 index.ts

```typescript
import { SkillExport, ExecutionContext } from '../../skill-system/src/types';

export interface MySkillInput {
  operation: 'action1' | 'action2';
  // 其他参数...
}

export interface MySkillOutput {
  success: boolean;
  result: any;
}

const skillExport: SkillExport = {
  execute: async (input: MySkillInput, context?: ExecutionContext): Promise<MySkillOutput> => {
    // 实现你的逻辑
    return { success: true, result: null };
  },

  validateInput: async (input: MySkillInput): Promise<boolean> => {
    return input && input.operation ? true : false;
  },

  onLoad: async (): Promise<void> => {
    console.log('[My Skill] 加载完成');
  }
};

export default skillExport;
```

### 3. 创建 SKILL.md

参考现有的 SKILL.md 模板，包含完整的文档和示例。

---

## 🔧 Skill 系统功能

Skill 系统提供以下核心功能：

| 功能 | 说明 |
|------|------|
| Skill 注册 | 动态注册新的 Skill，支持版本管理 |
| Skill 加载 | 按需加载，支持热重载 |
| 单 Skill 执行 | 支持超时、重试、自动加载 |
| 批量执行 | 支持并行、串行、依赖驱动三种模式 |
| 智能匹配 | 根据任务描述自动推荐最适合的 Skill |
| 依赖管理 | 自动解析 Skill 依赖关系，检测循环依赖 |
| 执行统计 | 完整的执行次数、成功率、性能统计 |
| 安全沙箱 | 可选的沙箱隔离，执行环境安全可控 |

---

## 📊 Skill 统计信息

| 指标 | 数值 |
|------|------|
| 总 Skill 数 | 5 |
| 总操作数 | 70+ |
| 总代码行数 | ~5,000 |
| 文档字数 | ~30,000 |
| 示例代码数 | 100+ |

---

## 🚧 扩展计划

### 即将推出的 Skill

- [ ] **http-client**: HTTP 客户端（REST、GraphQL）
- [ ] **data-processing**: 数据处理（CSV、JSON、Excel）
- [ ] **email**: 邮件发送与模板
- [ ] **notification**: 通知推送（Webhook、钉钉、飞书）
- [ ] **ai-assistant**: AI 助手集成（OpenAI、Claude）
- [ ] **database**: 数据库操作（SQL、NoSQL）
- [ ] **image-processing**: 图像处理（裁剪、缩放、滤镜）
- [ ] **pdf-generator**: PDF 文档生成

---

## 📄 许可证

MIT License - 可自由使用和修改

---

## 👥 贡献

欢迎贡献新的 Skill 或改进现有 Skill！请遵循：

1. 遵循本 README 的开发规范
2. 提供完整的 SKILL.md 文档
3. 包含至少 3 个完整的使用示例
4. 确保 TypeScript 类型完整
5. 添加适当的错误处理

---

## 📞 联系

如有问题或建议，请联系 Skill 系统维护团队。

---

**最后更新**: 2026-05-15
**维护者**: vova
