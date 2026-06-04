# Git 操作 Skill (git-operations)

**版本**: 1.0.0  
**作者**: vova  
**分类**: 开发工具  
**标签**: `git`, `version-control`, `commit`, `branch`, `merge`, `push`, `pull`

---

## 概述

Git 操作 Skill 提供完整的 Git 版本控制操作能力：
- 仓库初始化与克隆
- 分支管理（创建、删除、切换）
- 提交管理（暂存、提交、修改）
- 远程仓库操作（推送、拉取）
- 查看状态、日志、差异
- 标签、储藏、重置等高级操作

---

## Skill 配置

### 注册配置

```json
{
  "name": "git-operations",
  "version": "1.0.0",
  "description": "Git 版本控制操作工具",
  "entryPoint": "./sample-skills/git-operations/index.js",
  "tags": ["git", "version-control", "commit", "branch", "merge"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 60000,
    "maxRetries": 2
  },
  "metadata": {
    "author": "vova",
    "category": "development",
    "icon": "📦"
  }
}
```

---

## 使用指南

### 基本调用方式

```typescript
import skillManager from '../skill-system';

// 查看当前仓库状态
const result = await skillManager.executeSkill('git-operations', {
  operation: 'status',
  cwd: './my-project'
});

console.log(`当前分支: ${result.branch}`);
console.log(`是否干净: ${result.isClean}`);
```

---

## 操作类型详解

### 1. 初始化仓库 (`operation: 'init'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'init'` |
| `directory` | string | 否 | - | 仓库目录路径 |
| `withReadme` | boolean | 否 | false | 是否创建 README.md |
| `withGitignore` | boolean | 否 | false | 是否创建 .gitignore |
| `gitignoreTemplate` | string | 否 | 'node' | Git 忽略模板 |

**支持的模板类型**: `node`, `python`, `java`, `react`, `vue`

**示例**:

```typescript
// 初始化一个完整的 Node.js 项目
const result = await skillManager.executeSkill('git-operations', {
  operation: 'init',
  directory: './my-new-project',
  withReadme: true,
  withGitignore: true,
  gitignoreTemplate: 'node'
});

console.log('✅ 仓库初始化完成!');
```

---

### 2. 克隆仓库 (`operation: 'clone'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'clone'` |
| `repoUrl` | string | 是 | - | 仓库 URL |
| `targetDir` | string | 否 | - | 目标目录 |
| `branch` | string | 否 | - | 克隆特定分支 |
| `depth` | number | 否 | - | 深度克隆的提交数 |
| `recursive` | boolean | 否 | false | 是否递归克隆子模块 |

**示例 1: 完整克隆**

```typescript
const result = await skillManager.executeSkill('git-operations', {
  operation: 'clone',
  repoUrl: 'https://github.com/user/repo.git',
  targetDir: './local-repo'
});
```

**示例 2: 快速浅克隆**

```typescript
const result = await skillManager.executeSkill('git-operations', {
  operation: 'clone',
  repoUrl: 'https://github.com/user/repo.git',
  branch: 'main',
  depth: 1  // 只克隆最新一次提交，速度快
});
```

---

### 3. 提交变更 (`operation: 'commit'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'commit'` |
| `message` | string | 是 | - | 提交信息 |
| `description` | string | 否 | - | 提交详细描述 |
| `addAll` | boolean | 否 | false | 是否添加所有变更 |
| `files` | Array | 否 | - | 要提交的特定文件 |
| `author` | string | 否 | - | 提交作者 |
| `amend` | boolean | 否 | false | 是否修改上一次提交 |
| `cwd` | string | 否 | - | 工作目录 |

**示例 1: 常规提交**

```typescript
const result = await skillManager.executeSkill('git-operations', {
  operation: 'commit',
  message: 'feat: add user authentication module',
  description: `
    - 添加 JWT token 验证
    - 实现登录/注册接口
    - 添加权限中间件
  `,
  addAll: true,
  cwd: './my-project'
});
```

**示例 2: 修改上一次提交**

```typescript
await skillManager.executeSkill('git-operations', {
  operation: 'commit',
  message: 'fix: typo in login page',
  amend: true,
  cwd: './my-project'
});
```

---

### 4. 分支操作 (`operation: 'branch'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'branch'` |
| `subOperation` | string | 是 | - | 子操作：create/delete/list/switch/current |
| `branchName` | string | 否 | - | 分支名 |
| `baseBranch` | string | 否 | - | 基于哪个分支创建 |
| `force` | boolean | 否 | false | 是否强制删除 |
| `cwd` | string | 否 | - | 工作目录 |

**示例**:

```typescript
// 创建新的功能分支
await skillManager.executeSkill('git-operations', {
  operation: 'branch',
  subOperation: 'create',
  branchName: 'feature/payment',
  baseBranch: 'develop'
});

// 列出所有分支
const listResult = await skillManager.executeSkill('git-operations', {
  operation: 'branch',
  subOperation: 'list'
});

listResult.branches.forEach(branch => {
  const marker = branch.isCurrent ? '✅ ' : '   ';
  console.log(`${marker}${branch.name}`);
});

// 切换到主分支
await skillManager.executeSkill('git-operations', {
  operation: 'branch',
  subOperation: 'switch',
  branchName: 'main'
});
```

---

### 5. 查看状态 (`operation: 'status'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'status'` |
| `verbose` | boolean | 否 | false | 是否显示详细信息 |
| `cwd` | string | 否 | - | 工作目录 |

**输出**:

```typescript
{
  success: boolean,
  branch: string,              // 当前分支名
  staged: string[],            // 已暂存的文件
  unstaged: string[],          // 未暂存的修改
  untracked: string[],         // 未跟踪的文件
  isClean: boolean,            // 工作区是否干净
  ahead: number,               // 领先远程的提交数
  behind: number,              // 落后远程的提交数
  output: string               // 原始输出
}
```

**示例**:

```typescript
const status = await skillManager.executeSkill('git-operations', {
  operation: 'status',
  cwd: './my-project'
});

console.log(`📂 分支: ${status.branch}`);
console.log(`📝 已暂存: ${status.staged.length} 个文件`);
console.log(`🔄 未暂存: ${status.unstaged.length} 个文件`);
console.log(`❓ 未跟踪: ${status.untracked.length} 个文件`);

if (!status.isClean) {
  console.log('⚠️ 工作区有未提交的变更');
}
```

---

### 6. 查看提交日志 (`operation: 'log'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'log'` |
| `limit` | number | 否 | - | 显示的提交数量 |
| `stat` | boolean | 否 | false | 是否显示统计信息 |
| `format` | string | 否 | - | 输出格式：oneline/short/full/pretty |
| `author` | string | 否 | - | 按作者过滤 |
| `branch` | string | 否 | - | 按分支过滤 |
| `cwd` | string | 否 | - | 工作目录 |

**示例**:

```typescript
// 查看最近 10 次提交
const logResult = await skillManager.executeSkill('git-operations', {
  operation: 'log',
  limit: 10,
  format: 'pretty',
  stat: true,
  cwd: './my-project'
});

logResult.commits.forEach((commit, i) => {
  console.log(`[${commit.shortHash}] ${commit.author}: ${commit.message}`);
});
```

---

### 7. 推送变更 (`operation: 'push'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'push'` |
| `remote` | string | 否 | 'origin' | 远程仓库名 |
| `branch` | string | 否 | - | 分支名 |
| `force` | boolean | 否 | false | 是否强制推送（安全模式） |
| `all` | boolean | 否 | false | 是否推送所有分支 |
| `tags` | boolean | 否 | false | 是否推送标签 |
| `setUpstream` | boolean | 否 | false | 是否设置上游分支 |
| `cwd` | string | 否 | - | 工作目录 |

**示例**:

```typescript
// 首次推送新分支并设置上游
await skillManager.executeSkill('git-operations', {
  operation: 'push',
  remote: 'origin',
  branch: 'feature/payment',
  setUpstream: true,
  cwd: './my-project'
});

// 推送所有标签
await skillManager.executeSkill('git-operations', {
  operation: 'push',
  tags: true,
  cwd: './my-project'
});
```

---

### 8. 拉取变更 (`operation: 'pull'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'pull'` |
| `remote` | string | 否 | 'origin' | 远程仓库名 |
| `branch` | string | 否 | - | 分支名 |
| `rebase` | boolean | 否 | false | 是否使用 rebase 方式 |
| `ffOnly` | boolean | 否 | false | 只允许快进合并 |
| `cwd` | string | 否 | - | 工作目录 |

**示例**:

```typescript
// 使用 rebase 方式拉取（保持提交历史线性）
await skillManager.executeSkill('git-operations', {
  operation: 'pull',
  rebase: true,
  cwd: './my-project'
});
```

---

### 9. 添加文件到暂存区 (`operation: 'add'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'add'` |
| `files` | Array | 否 | [] | 要添加的文件/目录列表 |
| `all` | boolean | 否 | false | 是否添加所有变更 |
| `update` | boolean | 否 | false | 只更新已跟踪的文件 |
| `cwd` | string | 否 | - | 工作目录 |

**示例**:

```typescript
// 添加特定文件
await skillManager.executeSkill('git-operations', {
  operation: 'add',
  files: ['src/auth.ts', 'src/auth.test.ts'],
  cwd: './my-project'
});
```

---

## 完整工作流程示例

### 典型的功能开发流程

```typescript
async function featureWorkflow(featureName: string) {
  const cwd = './my-project';

  // 1. 切换到开发分支并拉取最新代码
  console.log('1/6 切换到 develop 分支并更新...');
  await skillManager.executeSkill('git-operations', {
    operation: 'branch', subOperation: 'switch', branchName: 'develop', cwd
  });
  await skillManager.executeSkill('git-operations', {
    operation: 'pull', rebase: true, cwd
  });

  // 2. 创建功能分支
  console.log('2/6 创建功能分支...');
  await skillManager.executeSkill('git-operations', {
    operation: 'branch',
    subOperation: 'create',
    branchName: `feature/${featureName}`,
    cwd
  });

  // 3. 开发功能代码...
  // (这里是你的代码修改)

  // 4. 提交代码
  console.log('3/6 提交代码...');
  await skillManager.executeSkill('git-operations', {
    operation: 'commit',
    message: `feat: ${featureName}`,
    description: '实现核心功能',
    addAll: true,
    cwd
  });

  // 5. 推送到远程
  console.log('4/6 推送到远程仓库...');
  await skillManager.executeSkill('git-operations', {
    operation: 'push',
    branch: `feature/${featureName}`,
    setUpstream: true,
    cwd
  });

  // 6. 创建 Pull Request
  console.log('5/6 ✅ 功能分支已准备好');
  console.log(`   分支: feature/${featureName}`);
  console.log('   请在代码托管平台创建 Pull Request');
}
```

---

## Git 提交规范

### 提交信息格式

```
<类型>(<范围>): <主题>

<正文>

<脚注>
```

### 类型说明

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响代码运行） |
| `refactor` | 重构（既不是新增功能，也不是改 bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建过程或辅助工具的变动 |

### 优秀提交示例

```
feat(auth): add JWT token verification

- 实现 token 签名和验证
- 添加登录和注册接口
- 添加权限中间件

Closes #123
```

---

## 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 功能分支 | `feature/<功能名>` | `feature/user-auth` |
| Bug 修复 | `fix/<问题描述>` | `fix/login-error` |
| 热修复 | `hotfix/<紧急修复>` | `hotfix/payment-bug` |
| 发布分支 | `release/<版本号>` | `release/v1.2.0` |
| 文档更新 | `docs/<文档名>` | `docs/api-update` |

---

## 常见问题

### Q: 如何撤销未提交的修改？

A: 使用 `reset` 操作：

```typescript
await skillManager.executeSkill('git-operations', {
  operation: 'reset',
  mode: 'hard',
  target: 'HEAD',
  cwd: './my-project'
});
```

### Q: 如何暂时保存未完成的工作？

A: 使用 `stash` 操作：

```typescript
// 保存
await skillManager.executeSkill('git-operations', {
  operation: 'stash',
  subOperation: 'push',
  message: 'WIP: 中间状态',
  cwd
});

// 恢复
await skillManager.executeSkill('git-operations', {
  operation: 'stash',
  subOperation: 'pop',
  cwd
});
```

### Q: 如何合并分支？

A: 使用 `merge` 操作：

```typescript
await skillManager.executeSkill('git-operations', {
  operation: 'merge',
  sourceBranch: 'feature/payment',
  message: 'merge: 合并支付功能到 develop',
  cwd
});
```

---

## 更新日志

### v1.0.0 (2026-05-15)
- ✅ 支持 16 种 Git 操作
- ✅ 仓库初始化与克隆
- ✅ 分支管理（创建/删除/切换/列表）
- ✅ 提交管理（暂存/提交/修改）
- ✅ 远程操作（推送/拉取）
- ✅ 状态、日志、差异查看
- ✅ 标签、储藏、重置等高级操作
