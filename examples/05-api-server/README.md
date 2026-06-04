# 05-api-server - API 服务器示例

将 Skill 系统作为 HTTP 服务对外提供。

---

## 📁 文件列表

| 文件名 | 说明 |
|--------|------|
| `01-start-server.ts` | 启动独立的 API 服务器 |
| `02-api-client.ts` | 客户端调用示例 |
| `03-openapi.ts` | OpenAPI 规范文档生成 |

---

## 🚀 快速开始

```bash
# 启动服务器
npx tsx 01-start-server.ts

# 另一个终端运行客户端示例
npx tsx 02-api-client.ts
```

服务器默认地址: `http://localhost:3657`

---

## 🌐 API 端点

### Skill 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/skills` | 列出所有 Skill |
| GET | `/api/v1/skills/:id` | 获取单个 Skill 详情 |
| POST | `/api/v1/skills` | 注册新 Skill |
| PATCH | `/api/v1/skills/:id` | 更新 Skill |
| DELETE | `/api/v1/skills/:id` | 删除 Skill |

### 执行操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/skills/:id/execute` | 执行单个 Skill |
| POST | `/api/v1/skills/execute/batch` | 批量执行 |
| POST | `/api/v1/skills/execute/dependency` | 依赖驱动执行 |

### 加载操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/skills/:id/load` | 加载 Skill |
| POST | `/api/v1/skills/:id/unload` | 卸载 Skill |
| POST | `/api/v1/skills/:id/reload` | 热重载 Skill |

### 系统管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/system/overview` | 系统概览 |
| GET | `/api/v1/system/config` | 获取配置 |
| GET | `/api/v1/system/stats` | 执行统计 |
| GET | `/health` | 健康检查 |

---

## 💻 客户端示例

### 使用 Fetch API

```javascript
// 列出所有 Skill
const response = await fetch('http://localhost:3657/api/v1/skills');
const skills = await response.json();

// 执行 Skill
const result = await fetch('http://localhost:3657/api/v1/skills/data-reader/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: { file: 'data.csv' },
    options: { timeout: 30000 }
  })
});
```

### 使用 axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3657/api/v1'
});

// 批量执行
const { data } = await api.post('/skills/execute/batch', {
  requests: [
    { skillId: 'reader', input: { ... } },
    { skillId: 'processor', input: { ... } }
  ],
  mode: 'parallel',
  maxConcurrency: 4
});
```

---

## 🔒 认证和安全

### API Key 认证

```typescript
// 服务器端配置
const server = new SkillApiServer({
  auth: {
    enabled: true,
    apiKeys: ['your-secret-key-here']
  }
});

// 客户端使用
const result = await fetch(url, {
  headers: {
    'Authorization': 'Bearer your-secret-key-here'
  }
});
```

### CORS 配置

```typescript
const server = new SkillApiServer({
  cors: {
    origin: ['https://your-frontend.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});
```

---

## 📊 监控和指标

### Prometheus 指标

```
GET /metrics
```

暴露的指标：
- `skill_executions_total` - 总执行次数
- `skill_execution_duration_seconds` - 执行时间直方图
- `skill_loaded_count` - 已加载 Skill 数量
- `skill_success_rate` - 成功率

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────┐
│              HTTP API Server                     │
│  Express / Fastify / Hono                        │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│           API Handlers Layer                     │
│  skill.ts │ execute.ts │ system.ts              │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────┐
│          SkillManager Instance                   │
│  discoverer │ loader │ executor │ dependency     │
└─────────────────────────────────────────────────┘
```

---

## ✅ 生产部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start 01-start-server.ts --name skill-api

# 查看状态
pm2 status

# 查看日志
pm2 logs skill-api
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3657
CMD ["node", "dist/examples/05-api-server/01-start-server.js"]
```

### 环境变量

```bash
PORT=3657
HOST=0.0.0.0
NODE_ENV=production
MAX_BODY_SIZE=10mb
REQUEST_TIMEOUT=30000
```

---

## 🔗 相关资源

- OpenAPI 规范: 运行 `03-openapi.ts` 生成 `openapi.json`
- Postman 集合: 可从 OpenAPI 导入
- 性能基准: 参考 `benchmarks/` 目录
