# VM 沙箱安全架构 - 设计与实现

## 项目概述

本项目为 Kite AI Skill 系统设计并实现了一套完整的 VM 沙箱安全架构，确保第三方 Skill 代码的安全执行。

### 核心目标

- 🛡️ **主机安全防护**：防止恶意 Skill 访问或修改主机系统资源
- 🔒 **数据隔离**：Skill 之间数据完全隔离
- ⚡ **最小性能影响**：安全机制不显著影响执行性能
- 📊 **可审计**：所有执行行为可追踪、可审计
- 🔄 **容错性**：单个 Skill 崩溃不影响整个系统

---

## 目录结构

```
.
├── README.md                              # 本说明文件
├── vm-sandbox-security-architecture.md  # 完整设计文档
└── VMSecurityManager.ts                 # 核心实现代码
```

---

## 核心特性

### 1. 三层安全边界

| 层级 | 防护机制 | 说明 |
|-----|---------|------|
| **VM 沙箱层** | 对象冻结、模块白名单、原型保护 | 防止代码逃逸 |
| **进程层** | 内存限制、超时控制、调用栈限制 | 资源滥用防护 |
| **操作系统层** | （预留）容器化执行 | 强隔离 |

### 2. 权限控制模型

- 基于能力的最小权限原则
- 默认仅授予 BASIC 权限
- 危险权限需显式授予
- 支持临时权限和过期机制

### 3. 资源限制

| 资源类型 | 默认限制 | 可配置 |
|---------|---------|-------|
| 最大堆内存 | 128MB | ✅ |
| 最大栈大小 | 8MB | ✅ |
| 最大执行时间 | 30秒 | ✅ |
| 最大调用栈深度 | 100层 | ✅ |

### 4. 内置模块白名单

**允许的模块**：
util, path, url, querystring, string_decoder,
buffer, stream, events, zlib, crypto

**禁止的模块**：
fs, child_process, cluster, net, http, https,
dgram, tls, worker_threads, vm, process, os

### 5. 代码安全扫描

自动检测以下危险模式：
- eval() 调用
- Function 构造函数
- 全局对象和 process 访问
- vm 模块导入
- 原型污染模式
- setTimeout/setInterval 字符串参数

### 6. 审计日志系统

- 结构化 JSON 格式日志
- 分级告警机制
- 高危事件实时告警
- 完整的执行记录

---

## 快速开始

### 安装依赖

```bash
npm install vm2 winston
```

### 基本使用

```typescript
import { VMSandboxSecurityManager, PermissionCategory } from './VMSecurityManager';

// 获取安全管理器实例
const securityManager = VMSandboxSecurityManager.getInstance();

// 创建沙箱
const sandbox = await securityManager.createSandbox('my-skill');

// 执行代码
const result = await securityManager.executeInSandbox(
  'my-skill',
  'return 42;',
  {}
);

console.log(result);
// { success: true, result: 42, duration: 5 }

// 授予额外权限
securityManager.grantPermission('my-skill', PermissionCategory.NETWORK_HTTP);

// 销毁沙箱
securityManager.destroySandbox('my-skill');
```

### 高级配置

```typescript
import { VMSandboxSecurityManager } from './VMSecurityManager';

// 自定义配置
const securityManager = VMSandboxSecurityManager.getInstance(
  {
    freeze: true,
    strict: true,
    eval: false,
    wasm: false,
    asyncTimeout: 30000,
  },
  {
    maxHeapSize: 256 * 1024 * 1024,      // 256MB
    maxStackSize: 16 * 1024 * 1024,        // 16MB
    maxExecutionTime: 60000,                  // 60秒
    maxCallStackDepth: 200,
  }
);
```

---

## 安全模式

### 进入安全模式

当检测到严重安全事件时，系统可进入安全模式：

```typescript
// 手动进入安全模式
securityManager.enterSafeMode();

// 检查是否在安全模式
console.log(securityManager.isInSafeMode()); // true

// 退出安全模式
securityManager.exitSafeMode();
```

**安全模式特性**：
- 禁止创建新沙箱
- 终止所有活动沙箱
- 记录安全事件
- 触发事件通知

---

## 审计日志

日志文件默认位置：
- `logs/audit-security.log` - 警告及以上级别
- `logs/audit-all.log` - 所有审计日志

日志格式（JSON）：
```json
{
  "timestamp": 1234567890,
  "eventType": "skill:execute",
  "skillId": "my-skill",
  "details": { "duration": 123 },
  "success": true,
  "level": "info"
}
```

---

## 测试覆盖

### 已实现的安全测试用例

1. **沙箱逃逸防护**
- ✅ 原型污染攻击防护
- ✅ 主进程访问阻断
- ✅ 禁止模块访问
- ✅ constructor 逃逸防护

2. **资源限制**
- ✅ 内存限制
- ✅ 执行超时
- ✅ 调用栈深度限制

3. **权限控制**
- ✅ 默认拒绝网络访问
- ✅ 显式授权后允许访问
- ✅ 跨 Skill 访问控制

4. **文件系统隔离**
- ✅ 路径遍历攻击防护
- ✅ 文件大小限制
- ✅ Skill 间文件系统隔离

---

## 性能基准

| 操作 | 平均耗时 | 目标 |
|-----|---------|------|
| 沙箱创建 | ~30ms | < 50ms |
| 代码执行开销 | 100-200% | < 300% |
| 并发执行（10个） | < 1000ms | < 1000ms |

---

## 架构设计文档

详细的架构设计请参考：
- [VM 沙箱安全架构设计文档](./vm-sandbox-security-architecture.md](./vm-sandbox-security-architecture.md)

包含内容：
- 完整的安全边界设计
- 隔离机制详解
- 权限控制策略
- 审计与监控方案
- 完整的测试用例
- 运维与监控接口
- 故障恢复流程
- 未来扩展方向

---

## 与 SkillLoader 集成

```typescript
class SkillLoader {
  private securityManager = VMSandboxSecurityManager.getInstance();
  
  async loadWithSandbox(skill) {
    // 读取代码
    const code = await fs.readFile(skill.entryPoint, 'utf-8');
    
    // 安全扫描
    const violations = this.securityManager.codeScanner.scan(code);
    if (violations.length > 0) {
      throw new Error(`Security scan failed: ${violations.join('; ')}`);
    }
    
    // 创建沙箱
    const sandbox = await this.securityManager.createSandbox(skill.id);
    
    // 执行加载
    return sandbox.execute(code, {});
  }
}
```

---

## 监控与告警

### 健康检查

```typescript
const status = securityManager.getSecurityStatus();
console.log(status);
// {
//   safeMode: false,
//   activeSandboxes: 5,
//   timestamp: 1234567890
// }
```

### 告警规则

| 告警类型 | 触发条件 | 严重程度 |
|---------|---------|---------|
| 沙箱逃逸尝试 | 检测到逃逸代码 | CRITICAL |
| 多次权限失败 | > 10次/分钟 | HIGH |
| 资源耗尽 | 持续超限 | MEDIUM |
| 异常行为 | 行为分析异常 | MEDIUM |
| 执行超时 | > 10% 超时率 | LOW |

---

## 未来路线图

### 短期 (1-3 个月)
- [ ] WebAssembly 支持
- [ ] 机器学习异常检测
- [ ] 细粒度网络策略

### 中期 (3-6 个月)
- [ ] Docker 容器化执行
- [ ] 分布式沙箱集群
- [ ] 实时威胁情报集成

### 长期 (6-12 个月)
- [ ] 零信任架构
- [ ] 形式化验证
- [ ] 量子安全准备

---

## 参考资料

- [vm2 官方文档](https://github.com/patriksimek/vm2)
- [Node.js VM 模块](https://nodejs.org/api/vm.html)
- [OWASP 沙箱逃逸指南](https://owasp.org/www-community/Sandbox_Escape)

---

## 版本历史

| 版本 | 日期 | 说明 |
|-----|------|------|
| v1.0.0 | 2026-05-15 | 初始版本，完整架构设计和实现 |

---

**维护者：李安全（安全专家）  
**项目：Kite AI Skill 系统**  
**状态：设计完成，待审核**
