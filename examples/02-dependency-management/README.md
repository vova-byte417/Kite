# 02-dependency-management - 依赖管理示例

本目录展示 Skill 系统强大的依赖管理功能，包括拓扑排序、循环检测、依赖树可视化等。

---

## 📁 文件列表

| 文件名 | 功能说明 | 难度 |
|--------|---------|------|
| `01-dependency-check.ts` | 依赖满足性检查 | ⭐⭐ 基础 |
| `02-topology-sort.ts` | 拓扑排序和执行顺序 | ⭐⭐⭐ 进阶 |
| `03-cycle-detection.ts` | 循环依赖检测和处理 | ⭐⭐⭐ 进阶 |
| `04-dependency-tree.ts` | 依赖树可视化和层级分析 | ⭐⭐ 基础 |

---

## 🚀 运行示例

```bash
# 推荐先运行拓扑排序示例（最完整）
npx tsx 02-topology-sort.ts

# 然后运行循环检测
npx tsx 03-cycle-detection.ts
```

---

## 🧠 核心概念

### 什么是依赖管理？

当多个 Skill 需要按特定顺序执行时（比如数据读取 → 处理 → 输出），
依赖管理器负责：
- 确定正确的执行顺序
- 检测无法执行的情况（循环依赖）
- 找出可以并行执行的批次
- 构建完整的依赖关系图

### DAG (有向无环图)

Skill 之间的依赖关系构成一个 DAG：
```
    reader        # 第 1 层（无依赖）
   /      \
  v        v
transform  enrich  # 第 2 层（并行）
   \        /
    v      v
    validator      # 第 3 层
        |
        v
    generator      # 第 4 层
```

### 关键术语

| 术语 | 说明 |
|------|------|
| **直接依赖** | Skill 显式声明依赖的其他 Skill |
| **递归依赖** | 直接依赖加上依赖的依赖（所有层级） |
| **反向依赖** | 依赖当前 Skill 的其他 Skill |
| **拓扑顺序** | 满足所有依赖约束的线性执行顺序 |
| **执行批次** | 同一层级可并行执行的 Skill 组 |
| **循环依赖** | A→B→C→A 形成的环形依赖，无法执行 |

---

## 💡 依赖配置方式

### 声明 Skill 依赖

```typescript
// 注册时声明依赖
manager.registerSkill({
  name: 'data-processor',
  version: '1.0.0',
  entryPoint: './processor.ts',

  // 依赖声明
  dependencies: [
    {
      skillId: 'data-reader',      // 依赖的 Skill ID
      minVersion: '1.0.0',          // 最低版本要求
      maxVersion: '2.0.0',          // 最高版本限制
      optional: false                // 是否可选依赖
    }
  ]
});
```

### 依赖类型

| 类型 | 说明 | 失败处理 |
|------|------|---------|
| **必需依赖** (optional: false) | 必须满足才能执行 | 加载/执行失败 |
| **可选依赖** (optional: true) | 有更好，没有也能运行 | 警告后继续 |

---

## 🎯 典型应用场景

### 场景 1: 数据处理管道

```
读取 → 清洗 → 转换 → 验证 → 存储
```

使用依赖管理确保每一步在上一步完成后才执行。

### 场景 2: 构建系统

```
编译 (并行) → 测试 (并行) → 打包 → 发布
```

同类型任务可以并行执行，提升效率。

### 场景 3: 工作流引擎

复杂的业务流程，根据前置条件决定后续步骤。

---

## 🔧 API 速查

### 依赖检查

```typescript
// 检查单个 Skill 的依赖
const check = manager.checkSkillDependencies('skill-id');
console.log('依赖满足:', check.satisfied);
console.log('缺失依赖:', check.missing);
console.log('版本不匹配:', check.versionMismatch);

// 检查所有 Skill
const allChecks = manager.checkAllDependencies();
```

### 拓扑排序

```typescript
// 计算整个图的拓扑顺序
const topology = manager.computeDependencyTopology();

console.log('执行顺序:', topology.order);       // 线性顺序
console.log('执行批次:', topology.levels);      // 可并行的层级
```

### 循环检测

```typescript
// 检测整个图中的循环
const cycles = manager.detectCycles();

if (cycles.length > 0) {
  console.log('发现循环:', cycles);
  // [['a', 'b', 'c', 'a']]
}
```

### 依赖查询

```typescript
// 直接依赖
const direct = manager.getDirectDependencies('skill-id');

// 所有递归依赖
const all = manager.getAllDependencies('skill-id');

// 反向依赖（被哪些 Skill 依赖）
const dependents = manager.getDependents('skill-id');
```

### 依赖树可视化

```typescript
// ASCII 依赖树
const tree = manager.printDependencyTree('skill-id');
console.log(tree);

/* 输出示例:
report-generator
├── data-validator
│   ├── data-transform
│   │   └── data-reader
│   └── data-enricher
│       └── data-reader
└── ...
*/
```

### 按依赖顺序执行

```typescript
// 自动按依赖顺序执行所有 Skill
const result = await manager.executeSkillsWithDependencies({
  'skill-a': { input: 'data-a' },
  'skill-b': { input: 'data-b' }
}, {
  continueOnFailure: false,     // 失败时继续/停止
  parallelInBatch: true          // 批次内并行
});
```

---

## ⚠️ 循环依赖处理

### 检测到循环时

```typescript
const cycles = manager.detectCycles();
if (cycles.length > 0) {
  // 1. 报告问题
  console.error('发现循环依赖:', cycles);

  // 2. 尝试手动打破循环（修改依赖关系）
  // ...

  // 3. 或者使用严格模式阻止执行
  const manager = new SkillManager({
    dependencyConfig: { strictMode: true }
  });
}
```

### 常见循环模式

1. **直接循环**: A → B → A
2. **间接循环**: A → B → C → A
3. **自依赖**: A → A (代码错误)

---

## 📊 性能考虑

| 操作 | 时间复杂度 | 说明 |
|------|-----------|------|
| 拓扑排序 | O(V + E) | Kahn 算法 |
| 循环检测 | O(V + E) | DFS 检测 |
| 依赖树构建 | O(V + E) | DFS 遍历 |
| 批量执行 | O(T) | T = 总执行时间 |

对于大多数应用（< 100 个 Skill），性能可以忽略不计。

---

## ✅ 最佳实践

### 1. 依赖设计原则

- ✅ **最小化依赖**: 只声明真正需要的依赖
- ✅ **单向依赖**: 避免双向依赖，考虑提取公共模块
- ✅ **版本约束**: 明确 min/max 版本，避免不兼容
- ✅ **文档化**: 在 Skill 描述中说明依赖原因

### 2. 执行优化

- ✅ 使用 `executeSkillsWithDependencies` 自动处理顺序
- ✅ 同批次 Skill 会自动并行执行
- ✅ 设置合理的超时时间
- ✅ 失败时根据业务需求决定是否继续

### 3. 调试技巧

- 打印依赖树 `printDependencyTree()`
- 检查拓扑顺序 `computeDependencyTopology()`
- 查看执行批次 `generateLoadBatches()`
- 开启详细日志

---

## 🔗 相关示例

- **`03-batch-execution/`** - 学习批量执行模式
- **`04-complete-workflow/01-data-processing-pipeline.ts`** - 真实管道示例

---

## 🎓 进阶挑战

学习完本部分后，可以尝试：

1. 设计一个 5 步以上的数据处理管道
2. 故意制造循环依赖，观察系统如何处理
3. 对比不同依赖图的并行批次数量
4. 实现一个依赖可视化前端组件
5. 添加依赖动态变更支持

---

## 📚 扩展阅读

- [拓扑排序算法](https://en.wikipedia.org/wiki/Topological_sorting)
- [有向无环图 (DAG)](https://en.wikipedia.org/wiki/Directed_acyclic_graph)
- Kahn 算法 vs DFS 算法对比
- 依赖解析算法（如 npm/yarn 的依赖解析）
