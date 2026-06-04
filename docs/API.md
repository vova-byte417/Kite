# Kite Skill System API 文档

**版本**: 2.1.0  
**作者**: vova  
**最后更新**: 2026-05-15

## 概述

Skill System API 提供完整的 Skill 管理能力，包括：
- Skill 注册、查询、更新、注销
- Skill 加载、卸载、重新加载
- Skill 执行（单次、批量、依赖驱动）
- Skill 匹配（智能推荐）
- 依赖管理（拓扑排序、循环检测、依赖树）
- 系统管理（配置、健康检查、安全模式）

---

## 基础信息

### API 基础路径
```
/api/v1
```

### 响应格式
所有 API 响应统一采用以下格式：

```json
{
  "success": true,
  "data": { /* 响应数据 */ },
  "timestamp": 1715742000000,
  "requestId": "req_abc123xyz"
}
```

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "SKILL_NOT_FOUND",
    "message": "Skill not found: skill-123",
    "details": { /* 详细错误信息 */ }
  },
  "timestamp": 1715742000000,
  "requestId": "req_abc123xyz"
}
```

### 错误码说明

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| `BAD_REQUEST` | 请求格式错误 | 400 |
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `SKILL_NOT_FOUND` | Skill 不存在 | 404 |
| `SKILL_ALREADY_EXISTS` | Skill 已存在 | 409 |
| `SKILL_NOT_LOADED` | Skill 未加载 | 400 |
| `SKILL_LOAD_FAILED` | Skill 加载失败 | 500 |
| `SKILL_EXECUTION_FAILED` | Skill 执行失败 | 500 |
| `SKILL_EXECUTION_TIMEOUT` | Skill 执行超时 | 408 |
| `DEPENDENCY_MISSING` | 依赖缺失 | 400 |
| `DEPENDENCY_CYCLE` | 检测到循环依赖 | 400 |
| `DEPENDENCY_VERSION_MISMATCH` | 依赖版本不兼容 | 400 |
| `DEPENDENCY_NOT_READY` | 依赖未就绪 | 400 |
| `SAFE_MODE_ACTIVE` | 系统处于安全模式 | 403 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 1. Skill 管理接口

### 1.1 获取 Skill 列表

```http
GET /api/v1/skills
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 按名称搜索 |
| `status` | string | 否 | 按状态过滤（registered/loading/ready/error/disabled） |
| `tags` | string | 否 | 按标签过滤，逗号分隔 |
| `loadedOnly` | boolean | 否 | 只返回已加载的 |
| `includeStats` | boolean | 否 | 是否包含执行统计 |
| `offset` | number | 否 | 分页偏移量（默认 0） |
| `limit` | number | 否 | 每页数量（默认全部） |
| `sortBy` | string | 否 | 排序字段（name/version/createdAt/updatedAt） |
| `sortOrder` | string | 否 | 排序顺序（asc/desc） |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "skill-data-analysis",
        "name": "data-analysis",
        "version": "1.0.0",
        "status": "ready",
        "isLoaded": true,
        "tags": ["data", "analysis", "statistics"],
        "directDependencies": ["skill-utils"],
        "dependents": [],
        "stats": {
          "totalExecutions": 156,
          "successfulExecutions": 148,
          "successRate": 0.9487,
          "avgDuration": 2345
        }
      }
    ],
    "total": 42,
    "offset": 0,
    "limit": 20,
    "hasMore": true
  }
}
```

### 1.2 注册新 Skill

```http
POST /api/v1/skills
```

**请求体**:

```json
{
  "name": "data-export",
  "version": "1.0.0",
  "description": "数据导出 Skill，支持多种格式",
  "entryPoint": "./skills/export/index.js",
  "tags": ["export", "csv", "excel", "json"],
  "dependencies": [
    {
      "skillId": "skill-data-analysis",
      "minVersion": "1.0.0",
      "optional": false
    }
  ],
  "config": {
    "enabled": true,
    "timeout": 30000,
    "maxRetries": 3,
    "retryStrategy": "exponential"
  },
  "metadata": {
    "author": "vova",
    "category": "data-processing"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | Skill 名称（唯一标识） |
| `version` | string | 否 | 版本号（默认 1.0.0） |
| `description` | string | 否 | Skill 描述 |
| `entryPoint` | string | 是 | 入口文件路径 |
| `tags` | string[] | 否 | 标签列表 |
| `dependencies` | object[] | 否 | 依赖列表 |
| `config` | object | 否 | 配置选项 |
| `metadata` | object | 否 | 元数据 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "skillId": "skill-data-export",
    "name": "data-export",
    "version": "1.0.0",
    "status": "registered",
    "createdAt": "2026-05-15T03:21:00.000Z"
  }
}
```

### 1.3 获取 Skill 详情

```http
GET /api/v1/skills/{skillId}
```

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skillId` | string | 是 | Skill ID |

### 1.4 更新 Skill

```http
PATCH /api/v1/skills/{skillId}
```

**请求体**: 与注册接口相同，但所有字段都是可选的。

### 1.5 注销 Skill

```http
DELETE /api/v1/skills/{skillId}
```

**响应**: 204 No Content

---

## 2. Skill 执行接口

### 2.1 执行单个 Skill

```http
POST /api/v1/skills/{skillId}/execute
```

**请求体**:

```json
{
  "input": {
    "data": [1, 2, 3, 4, 5],
    "options": {
      "format": "json",
      "encoding": "utf-8"
    }
  },
  "options": {
    "timeout": 30000,
    "maxRetries": 2,
    "retryStrategy": "exponential",
    "autoLoad": true,
    "ignoreDependencies": false
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | any | 是 | Skill 输入数据 |
| `options` | object | 否 | 执行选项 |
| `options.timeout` | number | 否 | 超时时间（毫秒） |
| `options.maxRetries` | number | 否 | 最大重试次数 |
| `options.retryStrategy` | string | 否 | 重试策略（fixed/linear/exponential） |
| `options.autoLoad` | boolean | 否 | 未加载时自动加载（默认 true） |
| `options.ignoreDependencies` | boolean | 否 | 忽略依赖检查（默认 false） |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "result": {
      "sum": 15,
      "average": 3,
      "count": 5,
      "exportFile": "/tmp/output-123.json"
    },
    "metrics": {
      "duration": 456,
      "memoryUsed": 24576
    }
  }
}
```

### 2.2 批量执行 Skill

```http
POST /api/v1/skills/execute/batch
```

**请求体**:

```json
{
  "requests": [
    {
      "skillId": "skill-data-analysis",
      "input": { "data": [1, 2, 3] }
    },
    {
      "skillId": "skill-data-export",
      "input": { "format": "csv" },
      "options": { "timeout": 60000 }
    }
  ],
  "mode": "dependency",
  "maxConcurrency": 5,
  "continueOnFailure": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requests` | object[] | 是 | 执行请求列表 |
| `mode` | string | 是 | 执行模式：parallel/serial/dependency |
| `maxConcurrency` | number | 否 | 并行数（仅 parallel 模式，默认 5） |
| `continueOnFailure` | boolean | 否 | 失败时是否继续（仅 dependency 模式） |

**执行模式说明**:
- `parallel`: 所有 Skill 并行执行（默认并发数 5）
- `serial`: 按请求顺序串行执行
- `dependency`: 按依赖拓扑排序执行，确保依赖先执行

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 2,
    "success": 2,
    "failed": 0,
    "totalDuration": 1234,
    "results": [
      {
        "skillId": "skill-data-analysis",
        "index": 0,
        "success": true,
        "result": { "sum": 6 },
        "duration": 456
      },
      {
        "skillId": "skill-data-export",
        "index": 1,
        "success": true,
        "result": { "file": "output.csv" },
        "duration": 789
      }
    ]
  }
}
```

---

## 3. Skill 加载接口

### 3.1 加载 Skill

```http
POST /api/v1/skills/{skillId}/load
```

### 3.2 卸载 Skill

```http
POST /api/v1/skills/{skillId}/unload
```

### 3.3 重新加载 Skill

```http
POST /api/v1/skills/{skillId}/reload
```

### 3.4 按依赖顺序批量加载

```http
POST /api/v1/skills/load/batch
```

**请求体**:
```json
{
  "skillIds": ["skill-a", "skill-b", "skill-c"]
}
```

不传 `skillIds` 则加载所有已注册的 Skill。

---

## 4. Skill 匹配接口

### 4.1 智能匹配 Skill

```http
POST /api/v1/skills/match
```

**请求体**:

```json
{
  "taskDescription": "我需要分析用户行为数据并生成统计报告，最后导出为 Excel 文件",
  "requiredSkills": ["data-analysis", "reporting"],
  "limit": 5,
  "minScore": 0.5
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskDescription` | string | 是 | 任务描述文本 |
| `requiredSkills` | string[] | 否 | 必需的技能标签列表 |
| `limit` | number | 否 | 最多返回数量（默认全部） |
| `minScore` | number | 否 | 最低匹配分数 0-1（默认 0） |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "count": 3,
    "results": [
      {
        "skill": {
          "id": "skill-data-analysis",
          "name": "data-analysis",
          "version": "1.0.0",
          "description": "数据分析工具",
          "tags": ["data", "analysis", "statistics"]
        },
        "score": 0.92,
        "matchedFields": ["tags", "description", "name"],
        "explanation": "匹配度: 92%"
      }
    ]
  }
}
```

---

## 5. 依赖管理接口

### 5.1 检查 Skill 依赖

```http
GET /api/v1/skills/{skillId}/dependencies
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "satisfied": true,
    "missing": [],
    "versionMismatch": [],
    "notReady": [],
    "cycles": []
  }
}
```

### 5.2 检查所有 Skill 依赖

```http
GET /api/v1/dependencies/check-all
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "allSatisfied": false,
    "total": 42,
    "satisfied": 38,
    "withIssues": 4,
    "totalMissing": 2,
    "totalCycles": 1,
    "results": {
      "skill-1": { /* 检查结果 */ },
      "skill-2": { /* 检查结果 */ }
    }
  }
}
```

### 5.3 检测循环依赖

```http
GET /api/v1/dependencies/cycles?skillIds=skill-a,skill-b
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skillIds` | string | 否 | 指定检测范围（逗号分隔），不传则检测全系统 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "cycles": [
      ["skill-a", "skill-b", "skill-c", "skill-a"]
    ]
  }
}
```

### 5.4 计算拓扑排序

```http
GET /api/v1/dependencies/topology?skillIds=skill-a,skill-b
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skillIds` | string | 否 | 指定 Skill 列表（逗号分隔），不传则计算所有 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "order": ["skill-utils", "skill-data-analysis", "skill-data-export"],
    "levels": [
      ["skill-utils"],              // 第 1 层（无依赖）
      ["skill-data-analysis"],      // 第 2 层（依赖 utils）
      ["skill-data-export"]         // 第 3 层（依赖 analysis）
    ]
  }
}
```

**说明**:
- `order`: 线性执行顺序（从先到后）
- `levels`: 可并行层级，同一 level 的 Skill 可同时执行

### 5.5 获取依赖树

```http
GET /api/v1/skills/{skillId}/dependencies/tree?maxDepth=5
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `maxDepth` | number | 否 | 最大深度（默认 10） |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "rootId": "skill-data-export",
    "rootName": "data-export",
    "depth": 3,
    "totalNodes": 5,
    "tree": { /* 树形结构 */ },
    "asciiTree": "data-export\n├── ✓ data-analysis\n│   └── ✓ skill-utils\n└── ✓ file-io"
  }
}
```

### 5.6 添加依赖关系

```http
POST /api/v1/skills/{skillId}/dependencies
```

**请求体**:
```json
{
  "dependencyId": "skill-new-dep",
  "minVersion": "1.0.0",
  "maxVersion": "2.0.0",
  "optional": false
}
```

### 5.7 移除依赖关系

```http
DELETE /api/v1/skills/{skillId}/dependencies/{dependencyId}
```

---

## 6. 系统管理接口

### 6.1 获取系统概览

```http
GET /api/v1/system/overview
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalSkills": 42,
    "loadedSkills": 38,
    "readySkills": 35,
    "errorSkills": 3,
    "totalExecutions": 15678,
    "successRate": 0.9432,
    "isInSafeMode": false,
    "version": "2.1.0",
    "uptime": 86400000
  }
}
```

### 6.2 获取系统配置

```http
GET /api/v1/system/config
```

### 6.3 执行系统操作

```http
POST /api/v1/system/action
```

**请求体**:
```json
{
  "action": "refresh"
}
```

| 操作类型 | 说明 |
|----------|------|
| `initialize` | 初始化系统 |
| `reinitialize` | 重新初始化（清空状态） |
| `refresh` | 刷新发现，重新扫描 Skill 目录 |
| `enterSafeMode` | 进入安全模式，禁止新的执行 |
| `exitSafeMode` | 退出安全模式 |

### 6.4 健康检查

```http
GET /api/v1/health
```

---

## 7. 批量操作接口

### 7.1 批量操作

```http
POST /api/v1/bulk
```

**请求体**:
```json
{
  "operation": "load",
  "skillIds": ["skill-a", "skill-b", "skill-c"]
}
```

| 操作类型 | 说明 |
|----------|------|
| `register` | 批量注册（需要 `skills` 数组） |
| `load` | 批量加载 Skill |
| `unload` | 批量卸载 Skill |
| `reload` | 批量重载 Skill |
| `unregister` | 批量注销 Skill |

**批量注册示例**:
```json
{
  "operation": "register",
  "skills": [
    { "name": "skill-1", "entryPoint": "./s1.js" },
    { "name": "skill-2", "entryPoint": "./s2.js" }
  ]
}
```

---

## 8. 文档接口

### 8.1 OpenAPI 规范文档

```http
GET /api/v1/openapi.json
```

返回完整的 OpenAPI 3.0 规范文档，可直接导入 Swagger UI、Postman 等工具。

---

## 使用示例

### 示例 1: 完整的 Skill 生命周期

```javascript
// 1. 注册新 Skill
const registerResponse = await fetch('/api/v1/skills', {
  method: 'POST',
  body: JSON.stringify({
    name: 'my-skill',
    entryPoint: './skills/my-skill.js',
    tags: ['demo']
  })
});

// 2. 加载 Skill
await fetch(`/api/v1/skills/${skillId}/load`, { method: 'POST' });

// 3. 检查依赖
const deps = await fetch(`/api/v1/skills/${skillId}/dependencies`);

// 4. 执行 Skill
const result = await fetch(`/api/v1/skills/${skillId}/execute`, {
  method: 'POST',
  body: JSON.stringify({ input: { foo: 'bar' } })
});
```

### 示例 2: 按依赖顺序批量执行

```javascript
// 1. 先计算拓扑
const topology = await fetch('/api/v1/dependencies/topology?skillIds=a,b,c');

// 2. 使用依赖驱动模式批量执行
const batchResult = await fetch('/api/v1/skills/execute/batch', {
  method: 'POST',
  body: JSON.stringify({
    requests: [
      { skillId: 'a', input: {...} },
      { skillId: 'b', input: {...} },
      { skillId: 'c', input: {...} }
    ],
    mode: 'dependency',
    continueOnFailure: true
  })
});
```

### 示例 3: 智能匹配并执行

```javascript
// 1. 根据任务描述匹配 Skill
const matchResult = await fetch('/api/v1/skills/match', {
  method: 'POST',
  body: JSON.stringify({
    taskDescription: '分析销售数据并生成月度报表',
    limit: 3
  })
});

// 2. 选择最合适的 Skill 执行
const bestMatch = matchResult.data.results[0];
const executionResult = await fetch(`/api/v1/skills/${bestMatch.skill.id}/execute`, {
  method: 'POST',
  body: JSON.stringify({
    input: { month: '2026-05', dataSource: 'sales' }
  })
});
```

---

## 更新日志

### v2.1.0 (2026-05-15)
- ✅ 新增完整的依赖管理 API
- ✅ 新增批量操作 API
- ✅ 新增智能匹配 API
- ✅ 新增 OpenAPI 文档
- ✅ 支持依赖驱动的批量执行模式

### v2.0.0
- ✅ 基础 Skill 管理 API
- ✅ Skill 执行 API（单/批量）
- ✅ 沙箱安全机制
