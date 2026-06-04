# 06-search-match - 搜索和匹配示例

Skill 的智能搜索和任务匹配功能。

---

## 📁 文件列表

| 文件名 | 说明 |
|--------|------|
| `01-search-skills.ts` | 按标签、名称、描述搜索 |
| `02-task-matching.ts` | 根据任务描述智能匹配 Skill |

---

## 🔍 搜索功能

### 支持的搜索维度

| 维度 | 说明 | 示例 |
|------|------|------|
| **名称** | 按 Skill 名称匹配 | `data` → `data-reader`, `data-cleaner` |
| **标签** | 按标签精确/模糊匹配 | `['processing', 'io']` |
| **描述** | 全文搜索描述 | `clean`, `validate`, `transform` |
| **状态** | 按加载状态过滤 | `READY`, `ERROR`, `DISABLED` |
| **版本** | 按版本号过滤 | `>=1.0.0`, `<2.0.0` |

### 搜索 API

```typescript
const results = manager.searchSkills({
  query: 'data processing',            // 关键词
  tags: ['transform', 'clean'],        // 标签过滤
  status: [SkillStatus.READY],         // 状态过滤
  category: 'data',                    // 分类过滤
  author: 'team-data',                 // 作者过滤
  minVersion: '1.0.0',                 // 最低版本
  maxVersion: '2.0.0',                 // 最高版本
  limit: 10,                           // 结果数量
  offset: 0,                           // 分页偏移
  sortBy: 'name',                      // 排序字段
  sortOrder: 'asc'                     // 排序方向
});
```

---

## 🧠 智能任务匹配

### 工作原理

系统根据任务描述自动找到最适合的 Skill：

1. **文本相似度分析** - 任务描述 vs Skill 描述
2. **标签匹配** - 任务关键词 vs Skill 标签
3. **依赖检查** - 确保依赖链完整
4. **评分排序** - 综合得分排序推荐

### 使用示例

```typescript
const task = '我需要读取一个 CSV 文件，清洗数据，然后生成分析报告';

const matches = manager.matchSkillsForTask(task, [
  'data-processing',
  'report-generation'
]);

console.log('推荐的 Skill:');
matches.slice(0, 3).forEach(match => {
  console.log(`- ${match.skill.name} (得分: ${Math.round(match.score * 100)}%)`);
  console.log(`  匹配字段: ${match.matchedFields.join(', ')}`);
  console.log(`  说明: ${match.explanation}`);
});
```

### 匹配结果格式

```typescript
interface SkillMatchResult {
  skill: SkillRegistration;       // 匹配的 Skill
  score: number;                   // 0-1 得分
  matchedFields: string[];         // 匹配到的字段
  explanation: string;             // 人类可读的说明
}
```

---

## 🎯 使用场景

### 场景 1: 自动化工作流构建

用户描述任务，系统自动组装 Skill 管道：

```
用户: "处理销售数据，生成月度报告"

系统:
  1. csv-reader - 读取销售数据 (92% 匹配)
  2. data-cleaner - 清洗无效数据 (87% 匹配)
  3. sales-analyzer - 销售数据分析 (95% 匹配)
  4. report-generator - 生成 PDF 报告 (89% 匹配)

是否执行这个管道？ [Y/n]
```

### 场景 2: 技能推荐 IDE 插件

开发者在 IDE 中输入要做的事情，系统推荐可用的 Skill：

```
// 输入: "验证用户邮箱格式并发送欢迎邮件"

推荐的 Skill:
  ✅ email-validator (94%)
     验证邮箱格式、检查域名、检查临时邮箱

  ✅ email-sender (88%)
     发送 HTML/纯文本邮件、模板支持、重试机制

  ➕ 可能还需要: user-lookup (62%)
```

---

## 📊 评分算法

### 得分权重

| 因素 | 权重 | 说明 |
|------|------|------|
| 标签精确匹配 | 40% | tags 中的精确匹配 |
| 描述文本相似度 | 30% | description 的语义匹配 |
| 名称关键词 | 20% | name 中的关键词匹配 |
| 元数据匹配 | 10% | category, author 等 |

### 示例计算

```
任务: "读取 CSV 数据"

Skill "csv-reader":
  - 标签精确匹配: csv, reader → 40/40
  - 描述相似度: "读取 CSV 文件..." → 28/30
  - 名称匹配: csv, reader → 20/20
  - 元数据: 分类 "data-io" → 8/10
  --------------------------------
  总分: 96/100 ✓
```

---

## 🔧 高级用法

### 自定义匹配器

```typescript
// 注册自定义匹配器
manager.registerMatcher((taskDescription, skill) => {
  let score = 0;

  // 你的自定义匹配逻辑
  if (taskDescription.includes('紧急') && skill.tags.includes('fast')) {
    score += 0.2;  // 额外加分
  }

  return score;
});
```

### 匹配缓存

```typescript
const manager = new SkillManager({
  matching: {
    enableCache: true,
    cacheTTL: 3600000,  // 1 小时
    cacheMaxSize: 1000
  }
});
```

---

## ✅ 最佳实践

### 1. 编写可匹配的 Skill 描述

**不好的描述:**
```
处理数据
```

**好的描述:**
```
读取 CSV 格式的销售数据文件，执行以下清洗操作：
- 去除重复记录
- 填充缺失字段
- 标准化日期格式
输出: 清洗后的 DataFrame
```

### 2. 使用准确的标签

推荐的标签分类：
```
- 领域: data, email, image, report
- 操作: read, write, clean, validate, transform
- 格式: csv, json, pdf, html
- 技术: pandas, numpy, spark
- 质量: fast, reliable, experimental
```

### 3. 提供使用示例

在 Skill 元数据中包含示例：

```typescript
metadata: {
  examples: [
    '读取销售数据 CSV 文件',
    '清洗用户导出数据'
  ]
}
```

---

## 🔗 相关示例

- **`04-complete-workflow/`** - 查看匹配结果如何应用于真实管道
- **`sample-skills/`** - 学习如何编写可被良好匹配的 Skill

---

## 🎓 进阶挑战

1. **机器学习增强**
   - 基于历史使用数据训练推荐模型
   - 用户反馈循环优化匹配

2. **多语言支持**
   - 中文/英文任务描述的混合匹配
   - 自动翻译和对齐

3. **Skill 组合推荐**
   - 不只是单个 Skill
   - 推荐多个 Skill 的组合
   - 估计总执行时间和成本

4. **技能图谱**
   - Skill 之间的关系
   - 常见的组合模式
   - 执行顺序建议
