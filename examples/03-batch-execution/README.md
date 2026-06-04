# 03-batch-execution - 批量执行示例

本目录展示 Skill 系统的三种批量执行模式。

---

## 📁 文件列表

| 文件名 | 执行模式 | 说明 |
|--------|---------|------|
| `01-parallel.ts` | 并行执行 | 所有 Skill 同时执行 |
| `02-serial.ts` | 串行执行 | 按顺序一个接一个 |
| `03-dependency-driven.ts` | 依赖驱动 | 按依赖拓扑排序 |

---

## 🚀 快速开始

```bash
# 对比三种模式
npx tsx 01-parallel.ts
npx tsx 02-serial.ts
npx tsx 03-dependency-driven.ts
```

---

## 🎯 三种执行模式对比

| 模式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **并行 Parallel** | 独立任务 | 最快，充分利用资源 | 无顺序保证 |
| **串行 Serial** | 有顺序要求 | 顺序可控，简单 | 最慢 |
| **依赖驱动 Dependency** | 有依赖关系 | 自动最优调度 | 需要预先声明依赖 |

---

## 💡 模式详解

### 1. 并行执行 Parallel

```typescript
// 所有任务同时开始
//
// Time →
// Skill A: ████████████ (1200ms)
// Skill B: ████████        (800ms)
// Skill C: ██████████     (1000ms)
//
// 总耗时: ~1200ms = 最长单个任务时间

const results = await manager.executeSkillsParallel(requests, maxConcurrency);
```

**配置选项：**
- `maxConcurrency`: 最大并发数（默认：CPU 核心数）

**使用场景：**
- 批量数据处理
- 独立的 API 调用
- 多个文件并行处理

---

### 2. 串行执行 Serial

```typescript
// 任务一个接一个执行
//
// Time →
// Skill A: ████████████ (1200ms)
// Skill B:              ████████ (800ms)
// Skill C:                        ██████████ (1000ms)
//
// 总耗时: ~3000ms = 所有任务之和

const results = await manager.executeSkillsSerial(requests);
```

**特点：**
- 严格按输入顺序执行
- 前一个完成后才开始下一个
- 资源利用率低但可控

**使用场景：**
- 有严格顺序要求
- 资源竞争激烈
- 需要逐步处理的任务

---

### 3. 依赖驱动执行 Dependency-Driven

```typescript
// 按依赖关系自动确定最优顺序
//
// Time →
// reader:    ████
// cleaner:       ████   } 并行
// enricher:      ████   }
// validator:         █████
// generator:              ██████
//
// 总耗时: ~各阶段之和，而不是各任务之和

const result = await manager.executeSkillsWithDependencies(inputs, {
  continueOnFailure: false,
  parallelInBatch: true
});
```

**智能特性：**
- 自动拓扑排序
- 自动识别可并行批次
- 正确处理传递依赖
- 失败传播机制

---

## 🔧 API 参考

### 并行执行

```typescript
interface ParallelOptions {
  maxConcurrency?: number;       // 最大并发数
  continueOnFailure?: boolean;   // 失败时继续
}

const results = await manager.executeSkillsParallel(
  requests: SkillExecutionRequest[],
  maxConcurrency?: number
): SkillExecutionResponse[];
```

### 串行执行

```typescript
const results = await manager.executeSkillsSerial(
  requests: SkillExecutionRequest[]
): SkillExecutionResponse[];
```

### 依赖驱动执行

```typescript
interface DependencyExecuteOptions {
  continueOnFailure?: boolean;   // 失败时继续后续批次
  parallelInBatch?: boolean;     // 批次内是否并行
}

const result = await manager.executeSkillsWithDependencies(
  inputs: Record<string, any>,   // Skill ID → 输入
  options?: DependencyExecuteOptions
): {
  success: boolean;
  results: Record<string, SkillExecutionResponse>;
  failedBatches: number[];
  completedBatches: number;
  totalBatches: number;
};
```

---

## 📊 性能对比

| 任务数 | 并行 | 串行 | 依赖驱动 |
|--------|------|------|---------|
| 5个 | 200ms | 1000ms | 400ms |
| 10个 | 250ms | 2000ms | 500ms |
| 20个 | 300ms | 4000ms | 600ms |

**假设：** 每个任务 200ms，平均 3 个并行批次

---

## ✅ 选择指南

### 我应该用哪种模式？

问自己以下问题：

1. **任务之间有依赖关系吗？**
   - ✅ 有 → **依赖驱动模式**
   - ❌ 没有 → 继续

2. **执行顺序重要吗？**
   - ✅ 重要 → **串行模式**
   - ❌ 不重要 → 继续

3. **任务数量多吗/每个耗时久吗？**
   - ✅ 是的 → **并行模式**
   - ❌ 不多 → 都可以，串行更简单

---

## 🎯 真实场景示例

### 示例 1: 图片批量处理

```typescript
// 场景：100 张图片需要缩放、压缩、加水印
// 选择：并行模式，因为图片之间独立

const requests = imagePaths.map(path => ({
  skillId: 'image-processor',
  input: { path, action: 'resize+compress+watermark' }
}));

const results = await manager.executeSkillsParallel(requests, 8);
```

### 示例 2: 多步骤工作流

```typescript
// 场景：lint → test → build → deploy 必须按顺序
// 选择：串行模式，因为有严格顺序

const steps = ['lint', 'test', 'build', 'deploy'];
const requests = steps.map(step => ({
  skillId: step,
  input: { /* ... */ }
}));

const results = await manager.executeSkillsSerial(requests);
```

### 示例 3: 复杂数据管道

```typescript
// 场景：有依赖关系的数据处理
// 选择：依赖驱动模式，自动最优调度

const inputs = {
  'reader': { file: 'data.csv' },
  'cleaner': { removeNull: true },
  'validator': { schema: 'v2' },
  'exporter': { format: 'json' }
};

const result = await manager.executeSkillsWithDependencies(inputs);
```

---

## ⚠️ 注意事项

### 并行模式

- 注意资源限制（数据库连接、API 限流）
- 设置合理的 `maxConcurrency`
- 考虑幂等性，防止重复执行问题

### 串行模式

- 前序失败会影响后续
- 总时间是各任务之和
- 适合资源敏感场景

### 依赖驱动模式

- 必须正确声明依赖关系
- 循环依赖会导致无法执行
- 批次内并行，批次间串行

---

## 🔗 相关示例

- **`02-dependency-management/`** - 深入理解依赖
- **`04-complete-workflow/`** - 真实应用场景
