# Kite AI Skill System v0.1

> 完整的 Skill 发现、加载、执行和管理框架

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.1.0-orange.svg)](package.json)

## 项目概述

Kite AI Skill System 是一个企业级的 Skill 管理框架，支持：
- 🔍 **自动发现** - 从文件系统自动扫描和注册 Skill
- 🛡️ **安全沙箱** - 基于 VM2 的隔离执行环境
- 📦 **依赖管理** - 智能依赖解析、环检测、拓扑排序
- ⚡ **灵活执行** - 支持超时、重试、批量并行执行
- 🔌 **RESTful API** - 25+ 完整 API 端点
- 📊 **执行统计** - 完整的执行监控和统计

## 核心模块

| 模块 | 功能描述 |
|------|---------|
| **SkillDiscoverer**  | Skill 发现、注册、搜索 |
| **VMSecurityManager**  | VM2 沙箱、权限系统、审计日志 |
| **SkillLoader**  | Skill 加载、生命周期、钩子系统 |
| **SkillExecutor**  | 执行引擎、超时、重试、统计、批量 |
| **SkillDependencyManager**  | 依赖图、环检测、拓扑排序、依赖树 |
| **API Server**  | 25+ RESTful 端点、OpenAPI 文档 |
| **Test Suite**  | 单元测试、集成测试、性能测试 |
| **Code Review**  | 代码审查、安全审计、架构评审 |

## 项目结构

```
kite-skill-system/
├── src/
│   └── skill/
│       ├── api/                     # API 模块
│       │   ├── types.ts             # API 类型定义
│       │   ├── handlers.ts          # 请求处理器
│       │   └── server.ts            # HTTP 服务器
│       ├── types.ts                 # 核心类型定义
│       ├── SkillDiscoverer.ts       # Skill 发现器
│       ├── VMSecurityManager.ts     # 安全沙箱管理器
│       ├── SkillLoader.ts           # Skill 加载器
│       ├── SkillExecutor.ts         # Skill 执行器
│       ├── SkillDependencyManager.ts # 依赖管理器
│       └── index.ts                 # 统一入口 SkillManager
├── skills/                           # 示例 Skill 集合
│   ├── code-generation/
│   ├── file-io/
│   ├── git-operations/
│   ├── test-runner/
│   └── utils/
├── examples/                         # 使用示例
│   ├── basic-usage.ts
│   ├── api-usage.ts
│   └── skill-example.ts
├── tests/                            # 测试套件
│   ├── unit/
│   ├── integration/
│   ├── mocks/
│   ├── fixtures/
│   ├── README.md
│   └── vitest.config.ts
├── docs/                             # 文档和报告
│   ├── API.md
│   ├── kite-project-analysis-report.md
│   ├── vm-sandbox-security-architecture.md
│   ├── CODE_REVIEW_REPORT.md
│   ├── SECURITY_AUDIT_REPORT.md
│   ├── IMPROVEMENT_SUGGESTIONS.md
│   ├── TEST_SUMMARY.md
│   └── README.md
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行示例

```bash
# 基础使用示例
npm run example:basic

# API 使用示例
npm run example:api
```

### 运行测试

```bash
# 运行所有测试
npm test

# 只运行单元测试
npm run test:unit

# 只运行集成测试
npm run test:integration

# 查看测试覆盖率
npm run test:coverage
```

## 基础使用示例

```typescript
import { SkillManager } from './src/skill';

// 创建管理器实例
const manager = new SkillManager();

// 初始化
await manager.initialize();

// 注册一个 Skill
await manager.registerSkill({
  name: 'my-skill',
  entryPoint: './skills/my-skill/index.ts',
  tags: ['example', 'demo'],
  dependencies: []
});

// 执行 Skill
const result = await manager.executeSkill({
  skillId: 'skill-my-skill',
  input: { foo: 'bar' },
  options: {
    timeout: 30000,
    maxRetries: 3
  }
});

console.log('执行结果:', result);
```

## API 端点

完整的 API 文档请参考 [docs/API.md](docs/API.md)

### Skill 管理
- `GET /api/v1/skills` - 获取 Skill 列表
- `GET /api/v1/skills/{id}` - 获取单个 Skill 详情
- `POST /api/v1/skills` - 注册新 Skill
- `PATCH /api/v1/skills/{id}` - 更新 Skill
- `DELETE /api/v1/skills/{id}` - 注销 Skill

### Skill 执行
- `POST /api/v1/skills/{id}/execute` - 执行单个 Skill
- `POST /api/v1/skills/execute/batch` - 批量执行 Skill

### 依赖管理
- `GET /api/v1/skills/{id}/dependencies` - 检查依赖状态
- `GET /api/v1/dependencies/cycles` - 检测循环依赖
- `GET /api/v1/dependencies/topology` - 计算拓扑排序
- `GET /api/v1/skills/{id}/dependencies/tree` - 获取依赖树

### 系统管理
- `GET /api/v1/system/overview` - 系统概览
- `GET /api/v1/health` - 健康检查
- `POST /api/v1/system/action` - 系统操作

## 执行模式

### 1. 并行执行 (Parallel)
```typescript
const results = await manager.executeSkillsParallel(requests, 5);
```

### 2. 串行执行 (Serial)
```typescript
const results = await manager.executeSkillsSerial(requests);
```

### 3. 依赖驱动执行 (Dependency)
```typescript
// 按依赖拓扑排序，同层级并行执行
const results = await manager.executeSkillsWithDependencies(inputs);
```

## 安全沙箱

基于 VM2 的安全沙箱提供：

- ✅ **隔离执行环境** - Skill 代码运行在独立 VM 中
- ✅ **权限分级系统** - 8 级权限控制（BASIC, FILESYSTEM_*, NETWORK_*）
- ✅ **完整审计日志** - 记录所有 Skill 执行和资源访问
- ✅ **超时保护** - 防止 Skill 无限执行
- ✅ **白名单机制** - 可配置允许访问的模块和资源

## 依赖管理功能

- 🔍 **环检测** - 自动检测 Skill 间的循环依赖
- 📊 **拓扑排序** - Kahn 算法，生成可并行层级
- 🌳 **依赖树** - 可视化 Skill 依赖关系
- ✅ **版本兼容** - 检查依赖版本兼容性
- 🎯 **状态检查** - 验证依赖 Skill 是否已就绪



## 文档资源

- 📖 **API 文档**: [docs/API.md](docs/API.md)
- 🏗️ **架构分析**: [docs/kite-project-analysis-report.md](docs/kite-project-analysis-report.md)
- 🔐 **安全架构**: [docs/vm-sandbox-security-architecture.md](docs/vm-sandbox-security-architecture.md)
- 🧪 **测试报告**: [docs/TEST_SUMMARY.md](docs/TEST_SUMMARY.md)
- 👀 **代码审查**: [docs/CODE_REVIEW_REPORT.md](docs/CODE_REVIEW_REPORT.md)
- 🛡️ **安全审计**: [docs/SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md)
- 💡 **改进建议**: [docs/IMPROVEMENT_SUGGESTIONS.md](docs/IMPROVEMENT_SUGGESTIONS.md)

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **TypeScript** | 5.4 | 类型安全的开发语言 |
| **Node.js** | >=16.0 | 运行时环境 |
| **VM2** | 3.9.19 | 安全沙箱执行 |
| **Winston** | 3.13.0 | 日志系统 |
| **UUID** | 9.0.1 | ID 生成 |
| **Vitest** | 1.6.0 | 测试框架 |
| **ESLint** | 8.57.0 | 代码质量检查 |

## 开发进度

| 阶段 | 状态 | 完成度 |
|------|------|--------|
| 需求分析与架构设计 | ✅ 完成 | 100% |
| SkillDiscoverer 模块 | ✅ 完成 | 100% |
| VMSecurityManager 模块 | ✅ 完成 | 100% |
| SkillLoader 模块 | ✅ 完成 | 100% |
| SkillExecutor 模块 | ✅ 完成 | 100% |
| SkillDependencyManager 模块 | ✅ 完成 | 100% |
| API 系统开发 | ✅ 完成 | 100% |
| 示例 Skill 开发 | ✅ 完成 | 100% |
| 测试套件开发 | ✅ 完成 | 100% |
| 代码审查与安全审计 | ✅ 完成 | 100% |
| 项目整合与产物合并 | 🔄 进行中 | 90% |

## 统计数据

- **代码行数**: ~25,000 行 TypeScript
- **核心模块**: 7 个
- **API 端点**: 25+
- **测试用例**: 50+
- **示例 Skill**: 5 个
- **使用示例**: 8 个
- **文档页数**: 150+

## License

MIT License - 详见 LICENSE 文件

---

**Kite AI Skill System v0.1**
*Built with ❤️ by the Kite AI Team*
