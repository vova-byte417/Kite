# 07-error-handling - 错误处理和安全示例

超时、重试、沙箱隔离、安全模式等高级特性。

---

## 📁 文件列表

| 文件名 | 说明 |
|--------|------|
| `01-timeout-retry.ts` | 超时和重试策略 |
| `02-sandbox-security.ts` | 沙箱安全隔离 |
| `03-safe-mode.ts` | 安全模式操作 |

---

## ⏱️ 超时和重试

### 重试策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| `fixed` | 固定间隔重试 | 简单场景 |
| `linear` | 线性递增间隔 | 负载保护 |
| `exponential` | 指数退避 | 网络请求 |
| `exponential_with_jitter` | 带抖动的指数退避 | 大规模系统 |

### 配置示例

```typescript
const manager = new SkillManager({
  executorConfig: {
    defaultTimeout: 30000,           // 30秒超时
    defaultMaxRetries: 3,             // 最多重试3次
    retryStrategy: 'exponential',     // 指数退避
    retryDelayBase: 1000,             // 初始延迟1秒
    retryDelayMultiplier: 2,          // 每次翻倍
    retryMaxDelay: 30000,             // 最大延迟30秒
    timeoutRetriesOnly: true           // 只重试超时错误
  }
});
```

### 单次执行覆盖

```typescript
const result = await manager.executeSkill({
  skillId: 'api-caller',
  input: { url: 'https://api.example.com' },
  options: {
    timeout: 10000,                   // 本次执行超时10秒
    maxRetries: 5,                     // 最多重试5次
    retryStrategy: 'fixed',            // 使用固定间隔
    retryDelay: 2000                   // 重试间隔2秒
  }
});
```

### 可重试错误

默认只重试以下错误：
- `TimeoutError` - 执行超时
- `NetworkError` - 网络错误
- `RateLimitError` - 限流错误
- `TemporaryError` - 标记为临时的错误

```typescript
// 自定义错误是否可重试
executor.setRetryDecider((error) => {
  return error.code === 'ETIMEDOUT' ||
         error.code === 'ECONNRESET';
});
```

---

## 🛡️ 沙箱安全

### VM 沙箱隔离

```typescript
const manager = new SkillManager({
  loaderConfig: {
    enableSandbox: true,              // 启用沙箱（默认开启）
    sandboxConfig: {
      timeout: 5000,                  // 沙箱内执行超时
      allowAsync: true,               // 允许异步操作
      context: {                      // 暴露的上下文
        console: safeConsole,
        fetch: rateLimitedFetch,
        // 只暴露安全的 API
      },
      disallow: [                     // 禁止的操作
        'child_process',
        'fs',
        'net'
      ]
    }
  }
});
```

### 安全检查点

| 检查项 | 说明 |
|--------|------|
| **代码静态分析** | 检测危险模式 |
| **动态执行监控** | 运行时行为分析 |
| **资源限制** | CPU/内存/文件句柄 |
| **网络白名单** | 只允许特定域名 |
| **文件系统隔离** | 只能访问指定目录 |

### 权限系统

```typescript
// 授予网络权限
manager.grantPermission('skill-id', PermissionCategory.NETWORK_HTTP);

// 检查权限
if (manager.hasPermission('skill-id', PermissionCategory.FILE_WRITE)) {
  // 允许写入文件
}

// 撤销权限
manager.revokePermission('skill-id', PermissionCategory.SHELL_EXECUTE);
```

### 权限类别

| 权限 | 说明 |
|------|------|
| `FILE_READ` | 读取文件系统 |
| `FILE_WRITE` | 写入文件系统 |
| `NETWORK_HTTP` | HTTP 网络请求 |
| `NETWORK_TCP` | 任意 TCP 连接 |
| `SHELL_EXECUTE` | 执行系统命令 |
| `CHILD_PROCESS` | 创建子进程 |
| `ENVIRONMENT` | 访问环境变量 |

---

## 🚨 安全模式

### 进入安全模式

```typescript
// 检测到安全事件时自动进入
manager.on('security:alert', (event) => {
  console.log('安全告警:', event);
  manager.enterSafeMode();
});

// 或手动进入
manager.enterSafeMode();
```

### 安全模式下的行为

| 操作 | 正常模式 | 安全模式 |
|------|---------|---------|
| 加载新 Skill | ✅ 允许 | ❌ 禁止 |
| 执行已加载 Skill | ✅ 允许 | ⚠️ 审核后执行 |
| 修改配置 | ✅ 允许 | ❌ 禁止 |
| 网络请求 | ✅ 允许 | ⚠️ 只允许白名单 |
| 文件写入 | ✅ 允许 | ❌ 禁止 |

### 退出安全模式

```typescript
// 检查问题解决后退出
if (await manager.checkSecurityStatus() === 'clear') {
  manager.exitSafeMode();
}
```

---

## 📊 错误统计和监控

### 执行统计

```typescript
const stats = manager.getFullGlobalStats();

console.log('总执行:', stats.totalExecutions);
console.log('成功:', stats.successfulExecutions);
console.log('失败:', stats.failedExecutions);
console.log('超时:', stats.timedOutExecutions);
console.log('重试:', stats.totalRetries);
console.log('成功率:', Math.round(stats.successRate * 100) + '%');
console.log('平均耗时:', stats.avgExecutionTime, 'ms');
console.log('P95 耗时:', stats.p95ExecutionTime, 'ms');
```

### 单个 Skill 统计

```typescript
const skillStats = manager.getSkillStats('skill-id');

console.log('错误率:', skillStats.errorRate);
console.log('平均重试次数:', skillStats.avgRetries);
console.log('常见错误:', skillStats.topErrors);
```

### 告警规则

```typescript
manager.setAlertRules({
  errorRate: { threshold: 0.1, action: 'warn' },      // 错误率 >10% 警告
  timeoutRate: { threshold: 0.05, action: 'alert' },  // 超时 >5% 告警
  retryRate: { threshold: 0.3, action: 'safelock' }   // 重试 >30% 进入安全模式
});
```

---

## 🔍 调试技巧

### 启用详细日志

```typescript
const manager = new SkillManager({
  logging: {
    level: 'debug',
    format: 'json',
    includeTimings: true,
    includePayload: true
  }
});
```

### 错误钩子

```typescript
manager.on('execution:error', ({ skillId, error, retries }) => {
  console.log(`Skill ${skillId} 失败，已重试 ${retries} 次`);
  console.log('错误:', error.message);
});

manager.on('execution:retry', ({ skillId, attempt, delay }) => {
  console.log(`Skill ${skillId} 第 ${attempt} 次重试，延迟 ${delay}ms`);
});
```

---

## ✅ 最佳实践

### 1. 超时配置

| 操作类型 | 推荐超时 | 说明 |
|---------|---------|------|
| 简单计算 | 1-5s | 纯 CPU 操作 |
| 文件读写 | 10-30s | 取决于文件大小 |
| API 调用 | 10-30s | 含网络延迟 |
| 数据库 | 30-60s | 复杂查询 |
| 批量处理 | 5-30min | 大量数据 |

### 2. 重试策略选择

- **外部 API**: 指数退避 + 抖动
- **数据库**: 固定间隔，较少重试
- **文件操作**: 少量重试或不重试
- **消息队列**: 死信队列 + 人工处理

### 3. 安全边界

- ✅ 默认启用沙箱
- ✅ 最小权限原则
- ✅ 网络白名单
- ✅ 审计所有危险操作
- ❌ 不要在生产环境禁用沙箱
- ❌ 不要授予不必要的权限

---

## 🔗 相关示例

- **`01-basic-usage/`** - 基础的执行方式
- **`03-batch-execution/`** - 批量场景的错误处理
- **`04-complete-workflow/`** - 真实管道中的容错设计

---

## 🎓 进阶挑战

1. **熔断器模式**
   - 连续失败自动熔断
   - 半开状态探测恢复
   - 快速失败减少资源浪费

2. **降级策略**
   - 主 Skill 失败时切换到备用
   - 简化模式运行
   - 返回缓存结果

3. **故障注入测试**
   - 随机注入延迟
   - 模拟特定错误
   - 验证系统容错能力
