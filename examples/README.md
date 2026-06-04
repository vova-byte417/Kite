# Kite AI Skill System - Examples
 可运行示例集合

**版本**: 2.1.0  
**最后更新**: 2026-05-15

---

## 📋 概述

本目录包含 Skill 完整的可运行示例，展示 Skill 系统的各项功能。
每个示例都是独立的 TypeScript 文件，可以直接运行。

---

## 📁 目录结构

```
examples/
├── 01-basic-usage/           # 基础使用示例
│   ├── 01-initialize.ts     # 初始化和配置
│   ├── 02-register.ts    # Skill 注册
│   ├── 03-load.ts        # Skill 加载
│   ├── 04-execute.ts      # Skill 执行
│   ├── 05-complete.ts       # 完整流程示例
│   └── README.md           # 目录说明
│
├── 02-dependency-management/  # 依赖管理示例
│   ├── 01-dependency-check.ts   # 依赖检查
│   ├── 02-topology-sort.ts     # 拓扑排序
│   ├── 03-cycle-detection.ts  # 循环检测
│   ├── 04-dependency-tree.ts  # 依赖树可视化
│   └── README.md
│
├── 03-batch-execution/       # 批量执行示例
│   ├── 01-parallel.ts         # 并行执行
│   ├── 02-serial.ts          # 串行执行
│   ├── 03-dependency-driven.ts  # 依赖驱动执行
│   └── README.md
│
├── 04-complete-workflow/       # 完整工作流示例
│   ├── 01-data-processing-pipeline.ts  # 数据处理管道
│   ├── 02-ci-cd-pipeline.ts     # CI/CD 管道示例
│   ├── 03-real-world.ts       # 真实场景
│   └── README.md
│
├── 05-api-server/            # API 服务器示例
│   ├── 01-start-server.ts     # 启动 API 服务器
│   ├── 02-api-client.ts       # API 客户端调用
│   └── README.md
│
├── 06-search-match/          # 搜索和匹配示例
│   ├── 01-search-skills.ts    # 搜索 Skill
│   ├── 02-task-matching.ts      # 任务匹配
│   └── README.md
│
├── 07-error-handling/         # 错误处理和重试示例
│   ├── 01-timeout-retry.ts    # 超时和重试
│   ├── 02-sandbox-security.ts # 沙箱安全
│   ├── 03-safe-mode.ts        # 安全模式
│   └── README.md
│
└── README.md                  # 本文档
```

---

## 🚀 快速开始

### 前置条件

- Node.js 18+
- TypeScript 5.0+

### 安装依赖

```bash
cd skill-system
npm install
```

### 运行示例

使用 ts-node 或 tsx 运行：

```bash
# 运行基础使用示例
npx tsx examples/01-basic-usage/01-initialize.ts

# 运行依赖管理示例
npx tsx examples/02-dependency-management/01-dependency-check.ts

# 运行完整工作流示例
npx tsx examples/04-complete-workflow/01-data-processing-pipeline.ts
```

---

## 📚 示例说明

### 01-basic-usage - 基础使用

学习 Skill 系统的核心概念和基本操作：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-initialize.ts | SkillManager 初始化和配置选项 |
| `02-register.ts | Skill 的各种注册方式（自动发现、手动注册） |
| `03-load.ts | Skill 加载、卸载、热重载 |
| `04-execute.ts | 单个 Skill 执行，输入输出，上下文 |
| `05-complete.ts | 完整流程演示（从初始化到清理 |

### 02-dependency-management - 依赖管理

深入了解 Skill 依赖管理功能：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-dependency-check.ts | 检查 Skill 依赖是否满足 |
| `02-topology-sort.ts | 拓扑排序，确定执行顺序 |
| `03-cycle-detection.ts | 循环依赖检测和处理 |
| `04-dependency-tree.ts | 依赖树可视化和层级结构 |

### 03-batch-execution - 批量执行

批量执行模式：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-parallel.ts | 并行批量执行，控制并发数 |
| `02-serial.ts | 串行按顺序执行 |
| `03-dependency-driven.ts | 按依赖关系自动排序执行 |

### 04-complete-workflow - 完整工作流

实际应用场景的完整示例：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-data-processing-pipeline.ts | 数据处理管道（读取→处理→输出） |
| `02-ci-cd-pipeline.ts | CI/CD 风格的工作流示例（lint→测试→构建→部署 |
| `03-real-world.ts | 真实场景综合示例 |

### 05-api-server - API 服务器

Skill 系统作为 HTTP API：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-start-server.ts | 启动 API 服务器，配置路由 |
| `02-api-client.ts | API 客户端调用示例 |

### 06-search-match - 搜索和匹配

Skill 搜索和智能匹配：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-search-skills.ts | 按关键词、标签、状态搜索 |
| `02-task-matching.ts | 根据任务描述自动匹配最合适的 Skill |

### 07-error-handling - 错误处理

错误处理和安全机制：

| 示例文件 | 功能说明 |
|----------|---------|
| `01-timeout-retry.ts | 超时和重试策略 |
| `02-sandbox-security.ts | 沙箱安全机制 |
| `03-safe-mode.ts | 安全模式下的操作 |

---

## 🎯 学习路径推荐

### 初学者

1.  `01-basic-usage/01-initialize.ts`
2. `01-basic-usage/04-execute.ts`
3. `03-batch-execution/01-parallel.ts`

### 中级

1. `02-dependency-management/02-topology-sort.ts`
2. `04-complete-workflow/01-data-processing-pipeline.ts`
3. `06-search-match/02-task-matching.ts`

### 高级

1. `05-api-server/01-start-server.ts`
2. `07-error-handling/02-sandbox-security.ts`
3. `04-complete-workflow/03-real-world.ts`

---

## 💡 示例特点

### ✅ 每个示例都包含：

1. **清晰的注释** - 每一步操作都有详细说明
2. **可运行代码** - 可以直接执行，无需额外配置
3. **预期输出** - 标注了预期的控制台输出
4. **最佳实践** - 展示推荐的使用方式
5. **错误处理** - 包含完整的异常处理

---

## 📊 示例代码结构

每个示例遵循统一的结构：

```typescript
/**
 * 示例标题
 *
 * 功能说明
 *
 * 本示例展示：
 * 1. 功能点 1
 * 2. 功能点 2
 * 3. ...
 */

import { SkillManager } from '../src';

async function main() {
  console.log('='.repeat(60));
  console.log('  示例标题');
  console.log('='.repeat(60));
  console.log('');

  // 示例代码...

  console.log('✅ 示例运行完成！');
}

main().catch(console.error);
```

---

## 🛠 工具和配置

### tsconfig.json

示例使用以下 TypeScript 配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "examples/**/*", "sample-skills/**/*"]
}
```

### package.json 脚本配置：

```json
{
  "scripts": {
    "example:basic": "tsx examples/01-basic-usage/05-complete.ts",
    "example:dependency": "tsx examples/02-dependency-management/04-dependency-tree.ts",
    "example:workflow": "tsx examples/04-complete-workflow/01-data-processing-pipeline.ts"
  }
}
```

---

## 📝 编写新示例指南

### 添加新的示例时请遵循：

1. **命名规范**

- 目录使用 `-` 分隔，格式为 `XX-名称`
- 文件使用 `-` 分隔，格式为 `XX-名称.ts`

2. **代码规范**

- 添加清晰的头部注释说明功能
- 示例代码应简洁明了
- 包含错误处理
- 使用 console.log 展示进度
- 末尾添加清理代码

---

## 🆘 常见问题

### Q: 示例运行报错？

A: 确保先安装依赖，检查 Node.js 版本 >= 18

### Q: 如何调试示例？

A: 使用 VS Code 的调试功能，或添加 `--inspect` 参数：

```bash
node --inspect-brk -r tsx/cjs examples/...
```

### Q: 示例中的 Skill 哪里来的？

A: 示例中的 Skill 来自 `../sample-skills/` 目录，在运行示例前确保已创建。

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交新的示例或改进现有示例！

请确保：
1. 示例可独立运行
2. 有清晰的注释和说明
3. 包含错误处理
4. 更新本文档中的对应说明