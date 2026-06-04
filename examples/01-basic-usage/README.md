# 01-basic-usage - 基础使用示例

本目录包含 Skill 系统基础功能的示例代码。

---

## 📁 文件列表

| 文件名 | 功能说明 | 难度 |
|--------|---------|------|
| `01-initialize.ts` | SkillManager 初始化和配置 | ⭐ 入门 |
| `02-register.ts` | Skill 注册、发现、查询 | ⭐ 入门 |
| `03-load.ts` | Skill 加载、卸载、热重载 | ⭐⭐ 基础 |
| `04-execute.ts` | Skill 执行、输入输出、上下文 | ⭐⭐ 基础 |
| `05-complete.ts` | 完整流程综合示例 | ⭐⭐⭐ 进阶 |

---

## 🚀 运行示例

```bash
# 使用 tsx
npx tsx 01-initialize.ts

# 使用 ts-node
npx ts-node 01-initialize.ts
```

---

## 📚 学习路径

### 初学者顺序

1. **`01-initialize.ts`**
   - 了解 SkillManager 的配置选项
   - 学习初始化和销毁流程
   - 查看系统状态和概览

2. **`02-register.ts`**
   - 学习如何自动发现 Skill
   - 手动注册单个和批量 Skill
   - 搜索和查询已注册的 Skill

3. **`03-load.ts`**
   - 加载单个和批量 Skill
   - 按依赖顺序加载
   - 卸载和热重载 Skill

4. **`04-execute.ts`**
   - 执行单个 Skill
   - 理解输入输出格式
   - 使用执行上下文
   - 超时和重试配置

5. **`05-complete.ts`**
   - 综合所有功能的完整示例
   - 真实场景使用方式
   - 最佳实践演示

---

## 💡 核心概念

### 1. SkillManager

SkillManager 是 Skill 系统的统一入口，整合了以下功能：
- SkillDiscoverer - 发现和注册
- SkillLoader - 加载和沙箱隔离
- SkillExecutor - 执行和重试
- SkillDependencyManager - 依赖管理

### 2. 配置选项

```typescript
const config = {
  scanPaths: ['./path/to/skills'],      // 自动扫描路径
  autoScanOnStartup: true,              // 启动时自动扫描
  loaderConfig: {
    enableSandbox: true,                // 启用沙箱隔离
    defaultTimeout: 30000,              // 默认超时
    defaultMaxRetries: 3,               // 默认重试次数
  },
  executorConfig: {
    retryStrategy: 'exponential',       // 重试策略
  },
  dependencyConfig: {
    strictMode: false,                  // 严格模式
    maxDependencyDepth: 50,             // 最大依赖深度
  }
};
```

### 3. Skill 生命周期

```
注册 (Registered)
    ↓
  加载中 (Loading)
    ↓
  就绪 (Ready) ← 热重载
    ↓
  执行中 (Executing)
    ↓
  完成/错误 (Complete/Error)
    ↓
  卸载 (Unloaded)
```

---

## 🔧 常见操作

### 初始化 SkillManager

```typescript
import { SkillManager } from '../src';

const manager = new SkillManager(config);
await manager.initialize(true);  // true = 自动扫描
```

### 注册 Skill

```typescript
// 自动发现
await manager.discoverAll();

// 手动注册
manager.registerSkill({
  name: 'my-skill',
  version: '1.0.0',
  entryPoint: './skills/my-skill.ts',
  tags: ['tag1', 'tag2']
});
```

### 加载 Skill

```typescript
// 加载单个
await manager.loadSkill('skill-id');

// 加载全部
await manager.loadAllSkills();

// 按依赖顺序加载
await manager.loadSkillsInDependencyOrder();
```

### 执行 Skill

```typescript
const result = await manager.executeSkill({
  skillId: 'skill-id',
  input: { /* 输入数据 */ },
  context: { userId: 'user-123' },
  options: { timeout: 10000, maxRetries: 2 }
});
```

---

## ✅ 运行检查清单

运行示例前确保：

- [ ] Node.js 版本 >= 18
- [ ] 已安装依赖 (`npm install`)
- [ ] TypeScript 配置正确
- [ ] sample-skills 目录存在
- [ ] 有读取文件系统的权限

---

## 📝 输出说明

每个示例的控制台输出包含：

1. **标题栏** - 明确标识正在运行的示例
2. **步骤编号** - 清晰的步骤分隔
3. **操作日志** - 正在执行的操作
4. **结果状态** - ✅ 成功 / ❌ 失败
5. **总结部分** - 本示例的核心要点

---

## 🎯 练习建议

学习完本部分后，可以尝试：

1. 修改配置参数，观察行为变化
2. 添加自定义的 Skill 并注册
3. 故意制造错误，观察错误处理
4. 对比不同加载方式的性能差异
5. 尝试批量执行多个 Skill

---

## 🔗 下一步

完成基础示例后，继续学习：
- **`02-dependency-management/`** - 学习依赖管理
- **`03-batch-execution/`** - 学习批量执行
- **`04-complete-workflow/`** - 真实场景示例
