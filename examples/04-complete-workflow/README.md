# 04-complete-workflow - 完整工作流示例

本目录包含真实场景的完整工作流示例，展示 Skill 系统在实际项目中的应用。

---

## 📁 文件列表

| 文件名 | 场景说明 | 难度 |
|--------|---------|------|
| `01-data-processing-pipeline.ts` | ETL 数据处理管道 | ⭐⭐⭐ 进阶 |
| `02-ci-cd-pipeline.ts` | CI/CD 构建和部署流程 | ⭐⭐⭐ 进阶 |
| `03-real-world-scenario.ts` | 综合业务场景示例 | ⭐⭐⭐⭐ 高级 |

---

## 🚀 运行示例

```bash
# 推荐：数据处理管道（最完整）
npx tsx 01-data-processing-pipeline.ts

# CI/CD 流程
npx tsx 02-ci-cd-pipeline.ts
```

---

## 🏭 场景 1: 数据处理管道 (ETL)

### 管道架构

```
┌─────────────┐
│  data-reader  │  读取原始数据文件
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       v                  v
┌─────────────┐    ┌──────────────┐
│ data-cleaner │    │ data-enricher │  可并行执行
└──────┬──────┘    └──────┬───────┘
       │                  │
       └────────┬─────────┘
                │
                v
        ┌───────────────┐
        │ data-validator │  验证数据质量
        └───────┬───────┘
                │
                v
        ┌────────────────┐
        │ report-generator│  生成处理报告
        └───────┬────────┘
                │
                v
         ┌──────────────┐
         │  data-writer   │  输出结果文件
         └──────────────┘
```

### 关键特性

1. **并行执行优化**
   - data-cleaner 和 data-enricher 自动并行
   - 无需手动编排，系统自动识别

2. **依赖完整性检查**
   - 前置任务完成后才执行后续
   - 自动处理依赖传递

3. **错误隔离**
   - 某阶段失败不影响已完成阶段
   - 可配置失败策略（停止/继续）

4. **详细的执行报告**
   - 每阶段耗时统计
   - 并行加速比计算
   - 成功率和错误明细

---

## 🔧 CI/CD 管道场景

### 典型构建流程

```
Phase 1: 准备阶段
  ├─ setup-env      # 环境准备
  └─ deps-install   # 依赖安装

Phase 2: 检查阶段 (并行)
  ├─ lint-check     # 代码检查
  ├─ type-check     # 类型检查
  └─ audit-check    # 安全审计

Phase 3: 测试阶段 (并行)
  ├─ unit-test      # 单元测试
  ├─ integ-test     # 集成测试
  └─ e2e-test       # 端到端测试

Phase 4: 构建阶段
  └─ build-app      # 应用构建

Phase 5: 部署阶段
  ├─ deploy-staging # 部署到预发
  ├─ smoke-test     # 冒烟测试
  └─ deploy-prod    # 部署到生产
```

### Skill 系统优势

- **自动并行化** - 同阶段任务自动并行
- **依赖保证** - 阶段间顺序严格
- **失败快速** - 尽早发现问题停止
- **可观测性** - 完整的执行日志和统计

---

## 🎯 核心优势展示

### 1. 声明式 vs 命令式

**传统方式（命令式）**

```javascript
// 需要手动管理顺序和并发
async function pipeline() {
  await readData();         // 1. 必须顺序写
  await Promise.all([       // 2. 手动并行
    cleanData(),
    enrichData()
  ]);
  await validateData();     // 3. 依赖前面两个
  // ...
}
```

**Skill 系统方式（声明式）**

```javascript
// 只需声明依赖关系，系统自动处理
const skills = [
  { name: 'cleaner', deps: ['reader'] },
  { name: 'enricher', deps: ['reader'] },
  { name: 'validator', deps: ['cleaner', 'enricher'] }
];

// 注册后执行，系统自动排序和并行化
const result = await manager.executeSkillsWithDependencies(inputs);
```

### 2. 可观测性

传统管道：
- 日志分散
- 没有统一统计
- 调试困难

Skill 系统：
- 统一的执行状态
- 每个阶段的耗时、结果
- 全局统计和报告
- 可追溯的执行历史

### 3. 可扩展性

添加新步骤只需：
1. 定义新的 Skill
2. 声明它的依赖
3. 系统自动融入现有管道

无需修改已有代码！

---

## 📊 性能对比

| 模式 | 执行时间 | 说明 |
|------|---------|------|
| 完全串行 | 1000ms | 所有步骤一个接一个 |
| 手动并行 | 600ms | 需要开发者识别和实现 |
| Skill 系统自动 | 550ms | 系统自动最优调度 |

**Skill 系统优势：**
- 无需手动识别并行机会
- 自动计算最优执行顺序
- 零成本获得并行加速
- 随 Skill 数量增加，收益放大

---

## 🏗️ 架构设计原则

### 1. 单一职责

每个 Skill 只做一件事：
- ✅ `data-reader` 只负责读取
- ✅ `data-validator` 只负责验证
- ❌ 不要创建 "do-everything" 的巨型 Skill

### 2. 无状态设计

Skill 执行应该：
- 输入 → 处理 → 输出
- 不依赖执行顺序
- 不维护内部状态
- 可重试、可重复

### 3. 松耦合

Skill 之间通过：
- 明确的接口契约
- 版本化的依赖声明
- 不直接调用彼此

### 4. 可观测

每个 Skill 应该：
- 输出清晰的日志
- 报告处理的统计
- 暴露内部状态（可选）

---

## ✅ 最佳实践

### 管道设计

1. **粒度适中**
   - 太细：调度开销大
   - 太粗：并行机会少
   - 建议：每个 Skill 执行 1-10 秒

2. **依赖最小化**
   - 只声明真正需要的
   - 避免不必要的等待
   - 使用可选依赖提升并行度

3. **错误策略**
   - 关键路径：失败即停止
   - 非关键：失败后继续
   - 根据业务场景选择

### 监控和调试

1. **记录关键指标**
   - 每个 Skill 的输入输出大小
   - 处理的记录数
   - 错误和警告数

2. **生成执行报告**
   - 管道执行完成后生成摘要
   - 包括时间线、瓶颈分析
   - 建议的优化点

3. **可重入设计**
   - 支持断点续跑
   - 幂等的 Skill 实现

---

## 🔗 相关示例

- **`02-dependency-management/`** - 理解依赖如何工作
- **`03-batch-execution/`** - 了解批量执行模式
- **`sample-skills/`** - 查看如何编写 Skill

---

## 🎓 实战挑战

学习完本部分后，可以尝试：

1. **扩展数据管道**
   - 添加数据聚合步骤
   - 添加多个输出格式
   - 添加进度追踪

2. **实现真实 CI/CD**
   - 连接真实的构建工具
   - 添加通知和告警
   - 实现回滚机制

3. **构建通用工作流引擎**
   - YAML/JSON 定义工作流
   - 可视化编辑器
   - 运行时监控面板

---

## 📚 扩展资源

- [数据流编程范式](https://en.wikipedia.org/wiki/Dataflow_programming)
- [有向无环图调度](https://en.wikipedia.org/wiki/Scheduling_(computing))
- [Apache Airflow 架构](https://airflow.apache.org/docs/apache-airflow/stable/concepts/overview.html)
- [CI/CD 最佳实践](https://www.atlassian.com/continuous-delivery/principles)
