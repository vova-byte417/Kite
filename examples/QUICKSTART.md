# 🚀 快速开始指南

5 分钟上手 Skill 系统

---

## 第一步: 安装

```bash
# 克隆或安装 Skill 系统
npm install kite-skill-system

# 或在本项目中
cd skill-system
npm install
```

---

## 第二步: 30 秒 Hello World

创建 `hello-skill.ts`:

```typescript
// 1. 导入
import { SkillManager } from 'kite-skill-system';

// 2. 初始化
const manager = new SkillManager();
await manager.initialize();

// 3. 注册一个简单的 Skill
manager.registerSkill({
  name: 'hello-skill',
  version: '1.0.0',
  description: '我的第一个 Skill',
  entryPoint: './skills/hello.ts',
  tags: ['demo', 'hello']
});

// 4. 加载并执行
await manager.loadSkill('hello-skill');

const result = await manager.executeSkill({
  skillId: 'hello-skill',
  input: { name: 'World' }
});

console.log('结果:', result);
// { success: true, message: 'Hello, World!' }
```

运行:
```bash
npx tsx hello-skill.ts
```

---

## 第三步: 运行示例

项目中包含 15+ 个完整示例：

### 📚 基础篇 (必看)

```bash
# 初始化和配置
npx tsx 01-basic-usage/01-initialize.ts

# 注册和发现 Skill
npx tsx 01-basic-usage/02-register.ts

# 加载和卸载
npx tsx 01-basic-usage/03-load.ts

# ✨ 推荐：完整流程演示
npx tsx 01-basic-usage/05-complete.ts
```

### ⚡ 进阶篇

```bash
# 依赖管理（核心功能）
npx tsx 02-dependency-management/02-topology-sort.ts

# 三种批量执行模式对比
npx tsx 03-batch-execution/01-parallel.ts
npx tsx 03-batch-execution/02-serial.ts
npx tsx 03-batch-execution/03-dependency-driven.ts

# ✨ 推荐：真实数据管道
npx tsx 04-complete-workflow/01-data-processing-pipeline.ts
```

### 🏭 高级篇

```bash
# API 服务器
npx tsx 05-api-server/01-start-server.ts

# 智能搜索和匹配
npx tsx 06-search-match/02-task-matching.ts

# 错误处理和安全
npx tsx 07-error-handling/01-timeout-retry.ts
```

---

## 第四步: 编写你的第一个 Skill

创建 `skills/math.ts`:

```typescript
import { SkillExport } from 'kite-skill-system';

export default {
  async execute(input: any) {
    const { operation, a, b } = input;

    switch (operation) {
      case 'add': return { result: a + b };
      case 'subtract': return { result: a - b };
      case 'multiply': return { result: a * b };
      case 'divide': return { result: a / b };
      default: throw new Error(`未知操作: ${operation}`);
    }
  },

  validateInput(input: any) {
    return typeof input.a === 'number' &&
           typeof input.b === 'number';
  }
} as SkillExport;
```

然后注册并使用它：

```typescript
manager.registerSkill({
  name: 'math-ops',
  version: '1.0.0',
  description: '数学运算 Skill',
  entryPoint: './skills/math.ts',
  tags: ['math', 'calculator']
});

const result = await manager.executeSkill({
  skillId: 'math-ops',
  input: { operation: 'add', a: 10, b: 20 }
});

console.log('10 + 20 =', result.result); // 30
```

---

## 🎯 接下来学什么?

| 如果你想... | 看这个 |
|------------|--------|
| 构建数据处理管道 | `04-complete-workflow/01-data-processing-pipeline.ts` |
| 搭建 CI/CD 系统 | `04-complete-workflow/02-ci-cd-pipeline.ts` |
| 作为服务对外提供 API | `05-api-server/` |
| 理解依赖管理原理 | `02-dependency-management/` |
| 优化错误处理 | `07-error-handling/` |
| 实现智能推荐 | `06-search-match/` |

---

## 💡 常见问题

### Q: Skill 可以用 JavaScript 写吗？

可以！TypeScript 是推荐方式，但纯 JS 完全支持。

### Q: 能在浏览器中运行吗？

核心逻辑可以，沙箱模式和文件操作需要适配。

### Q: 性能如何？

- 单个 Skill 启动开销: ~5ms
- 调度开销: <1ms
- 支持 1000+ 并行执行

### Q: 与 Serverless 有什么区别？

Skill 系统是:
- ✅ 更轻量（无需容器）
- ✅ 内置依赖编排
- ✅ 统一的监控和重试
- ✅ 智能搜索和匹配

---

## 📖 更多资源

- **API 文档** - 运行 `npm run docs`
- **示例集合** - `examples/` 目录有 15+ 个示例
- **Skill 模板** - `sample-skills/` 目录
- **最佳实践** - 各示例目录下的 README.md

---

## 🤝 需要帮助？

1. 先看示例 - 80% 的问题都能在示例中找到答案
2. 查看 README - 每个目录都有详细说明
3. 检查类型定义 - TypeScript 类型是最好的文档

---

## ⏱️ 学习路线图

```
第 5 分钟
  ✅ 运行 hello world
  ✅ 理解基础概念

第 15 分钟
  ✅ 运行完整流程示例
  ✅ 掌握注册/加载/执行

第 30 分钟
  ✅ 理解依赖管理
  ✅ 运行数据管道示例

第 1 小时
  ✅ 掌握三种批量模式
  ✅ 能设计简单的工作流

第 2 小时
  ✅ 理解错误处理和安全
  ✅ 能搭建 API 服务

第 1 天
  ✅ 能构建真实的业务管道
  ✅ 掌握监控和调试
```

---

## 🎉 开始吧

现在你已经准备好了！

从 `01-basic-usage/05-complete.ts` 开始，
这是最完整的入门示例。

祝你编码愉快！ 🚀
