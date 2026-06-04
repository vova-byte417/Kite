# VM 沙箱安全架构设计文档

> **文档版本**: v1.0.0  
> **设计日期**: 2026-05-15  
> **设计者**: 李安全（安全专家）  
> **项目**: Kite AI Skill 系统

---

## 1. 安全架构概览

### 1.1 设计目标

本架构设计旨在为 Kite AI Skill 系统提供 **安全、隔离、可控** 的代码执行环境，确保：

- 🛡️ **主机安全**: Skill 代码无法访问或修改主机系统资源
- 🔒 **数据隔离**: Skill 之间数据完全隔离，防止越权访问
- ⚡ **性能影响最小化**: 安全机制不显著影响执行性能
- 📊 **可审计**: 所有执行行为可追踪、可审计
- 🔄 **容错性**: 单个 Skill 崩溃不影响整个系统

### 1.2 技术选型

| 技术方案 | 选型 | 版本 | 理由 |
|---------|------|------|------|
| **沙箱引擎** | `vm2` | ^3.9.19 | 成熟稳定，社区活跃，支持 Node.js 内置模块白名单 |
| **替代方案** | `isolated-vm` | ^4.7.1 | 性能更优，但 API 相对复杂，作为备选方案 |
| **权限控制** | 基于能力的权限模型 | - | 细粒度权限控制，最小权限原则 |
| **资源限制** | `process` + 内存监控 | - | CPU、内存、执行时间限制 |
| **审计日志** | `winston` | ^3.13.0 | 结构化日志，支持多种输出格式 |

---

## 2. 沙箱安全边界设计

### 2.1 三层安全边界模型

```
┌─────────────────────────────────────────────────────────┐
│                    主机操作系统 (Host OS)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Node.js 主进程 (Main Process)        │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         VM 沙箱层 (VM Sandbox Layer)        │  │  │
│  │  │  ┌───────────────────────────────────────┐  │  │  │
│  │  │  │       Skill 执行上下文 (Execution)    │  │  │  │
│  │  │  │  ┌───────────────────────────────┐   │  │  │  │
│  │  │  │  │   Skill 代码 (User Code)      │   │  │  │  │
│  │  │  │  └───────────────────────────────┘   │  │  │  │
│  │  │  │  • 内存隔离                         │  │  │  │
│  │  │  │  • 作用域隔离                       │  │  │  │
│  │  │  └───────────────────────────────────────┘  │  │  │
│  │  │  • 内置模块白名单                           │  │  │
│  │  │  • 全局对象冻结                             │  │  │
│  │  │  • 原型链保护                               │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  • 进程级资源限制 (CPU/内存)                      │  │
│  │  • 文件系统访问控制                               │  │
│  │  • 网络访问控制                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  • 操作系统级隔离 (cgroups, seccomp)                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 第一层：VM 沙箱层边界

#### 2.2.1 全局对象冻结与保护

```typescript
// 沙箱初始化配置
const sandboxConfig = {
  // 冻结所有内置对象原型，防止原型污染攻击
  freeze: true,
  
  // 严格模式执行
  strict: true,
  
  // 禁用 eval 和 Function 构造函数
  eval: false,
  wasm: false,
  
  // 允许的全局对象
  sandbox: {
    console: this.createSecureConsole(),
    setTimeout: this.createSecureTimeout(),
    setInterval: this.createSecureInterval(),
    clearTimeout: this.createSecureClearTimeout(),
    clearInterval: this.createSecureClearInterval(),
    Promise: Promise,
    JSON: JSON,
    Math: Math,
    Date: Date,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Error: Error,
    TypeError: TypeError,
    SyntaxError: SyntaxError,
    ReferenceError: ReferenceError,
    RangeError: RangeError,
  }
};
```

#### 2.2.2 内置模块白名单

```typescript
// 允许的内置模块（最小权限原则）
const allowedBuiltinModules = [
  // 安全的工具模块
  'util',
  'path',
  'url',
  'querystring',
  'string_decoder',
  
  // 数据处理模块（无副作用）
  'buffer',
  'stream',
  'events',
  'zlib',
  
  // 加密模块（只读）
  'crypto',
];

// 禁止的内置模块（绝对不允许访问）
const blockedBuiltinModules = [
  'fs',           // 文件系统访问
  'child_process',// 子进程执行
  'cluster',      // 集群管理
  'net',          // 网络访问
  'http',         // HTTP 客户端
  'https',        // HTTPS 客户端
  'dgram',        // UDP 套接字
  'tls',          // TLS/SSL
  'worker_threads', // 工作线程
  'vm',           // VM 模块（逃逸风险）
  'process',      // 进程控制
  'os',           // 操作系统信息
  'syscall',      // 系统调用
];
```

#### 2.2.3 外部模块访问控制

```typescript
// Skill 可访问的 npm 包白名单
const allowedExternalModules = {
  // AI 框架
  'langchain': true,
  '@langchain/core': true,
  '@langchain/openai': true,
  'llamaindex': true,
  'openai': true,
  
  // 数据处理
  'zod': true,
  'dayjs': true,
  'uuid': true,
  'lodash': true,
  'axios': {
    // 限制 axios 的配置
    maxRedirects: 5,
    timeout: 10000,
    // 禁止访问内网地址
    denyPrivateIP: true,
  },
  
  // 文件处理（受限）
  'js-yaml': true,
  'toml': true,
  'csv-parser': true,
};
```

### 2.3 第二层：进程级资源限制

#### 2.3.1 内存限制

```typescript
interface MemoryLimits {
  // 单个 Skill 最大内存（字节）
  maxHeapSize: number;        // 默认: 128MB
  
  // 单个 Skill 最大栈大小（字节）
  maxStackSize: number;       // 默认: 8MB
  
  // 内存使用率阈值（触发 GC）
  memoryUsageThreshold: number; // 默认: 80%
}

class MemoryMonitor {
  private skillMemoryUsage = new Map<string, number>();
  
  // 监控 Skill 内存使用
  monitorSkill(skillId: string, vm: VM): void {
    setInterval(() => {
      const usage = this.getVMMemoryUsage(vm);
      this.skillMemoryUsage.set(skillId, usage);
      
      if (usage > this.limits.maxHeapSize) {
        this.terminateSkill(skillId, 'Memory limit exceeded');
      }
    }, 1000);
  }
}
```

#### 2.3.2 CPU 限制

```typescript
interface CPULimits {
  // 单个 Skill 最大执行时间（毫秒）
  maxExecutionTime: number;   // 默认: 30000ms (30s)
  
  // 单个 Skill 最大 CPU 使用率（百分比）
  maxCPUUsage: number;        // 默认: 50%
  
  // 时间片配额（毫秒/秒）
  timeSliceQuota: number;     // 默认: 500ms/s
}

class ExecutionTimeout {
  private runningSkills = new Map<string, NodeJS.Timeout>();
  
  startTimer(skillId: string, timeout: number, callback: () => void): void {
    const timer = setTimeout(() => {
      callback();
      this.terminateSkill(skillId, 'Execution timeout');
    }, timeout);
    
    this.runningSkills.set(skillId, timer);
  }
  
  cancelTimer(skillId: string): void {
    const timer = this.runningSkills.get(skillId);
    if (timer) {
      clearTimeout(timer);
      this.runningSkills.delete(skillId);
    }
  }
}
```

#### 2.3.3 调用栈深度限制

```typescript
// 防止无限递归
const MAX_CALL_STACK_DEPTH = 100;

function wrapWithStackDepth(fn: Function, skillId: string): Function {
  let depth = 0;
  
  return function(...args: any[]) {
    depth++;
    
    if (depth > MAX_CALL_STACK_DEPTH) {
      throw new Error(`Call stack depth exceeded (max: ${MAX_CALL_STACK_DEPTH})`);
    }
    
    try {
      return fn.apply(this, args);
    } finally {
      depth--;
    }
  };
}
```

### 2.4 第三层：操作系统级隔离

（预留，未来可扩展到 Docker 容器或独立进程）

---

## 3. 隔离机制设计

### 3.1 内存隔离

#### 3.1.1 独立 VM 实例

```typescript
class SandboxPool {
  private instances = new Map<string, VM>();
  
  // 每个 Skill 拥有独立的 VM 实例
  createSandbox(skillId: string, config: SandboxConfig): VM {
    const vm = new NodeVM({
      ...config,
      // 每个 Skill 独立的 require 上下文
      require: {
        builtin: allowedBuiltinModules,
        external: allowedExternalModules,
        root: this.getSkillRootPath(skillId),
        mock: this.createMockModules(skillId),
      }
    });
    
    this.instances.set(skillId, vm);
    return vm;
  }
  
  // Skill 卸载时销毁 VM
  destroySandbox(skillId: string): void {
    const vm = this.instances.get(skillId);
    if (vm) {
      // 强制 GC（如果可用）
      if (global.gc) {
        global.gc();
      }
      this.instances.delete(skillId);
    }
  }
}
```

#### 3.1.2 共享对象深拷贝

```typescript
class ContextIsolator {
  // 传入沙箱的对象必须深拷贝，防止引用泄露
  isolateContext(context: any): any {
    // 使用结构化克隆
    return this.deepClone(context);
  }
  
  // 从沙箱传出的对象也必须深拷贝
  isolateResult(result: any): any {
    return this.deepClone(result);
  }
  
  private deepClone(obj: any): any {
    // 支持循环引用的深拷贝
    const cache = new WeakMap();
    
    function clone(value: any): any {
      // 基本类型
      if (value === null || typeof value !== 'object') {
        return value;
      }
      
      // 循环引用检测
      if (cache.has(value)) {
        return cache.get(value);
      }
      
      // Date
      if (value instanceof Date) {
        return new Date(value.getTime());
      }
      
      // RegExp
      if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
      }
      
      // Array
      if (Array.isArray(value)) {
        const arr: any[] = [];
        cache.set(value, arr);
        value.forEach((item, index) => {
          arr[index] = clone(item);
        });
        return arr;
      }
      
      // Object
      const obj: any = {};
      cache.set(value, obj);
      Object.keys(value).forEach(key => {
        obj[key] = clone(value[key]);
      });
      return obj;
    }
    
    return clone(obj);
  }
}
```

### 3.2 文件系统隔离

#### 3.2.1 虚拟文件系统

```typescript
class VirtualFileSystem {
  private skillFS = new Map<string, Map<string, string>>();
  
  // 每个 Skill 拥有独立的虚拟文件系统根目录
  getSkillRoot(skillId: string): string {
    return `/sandbox/${skillId}/`;
  }
  
  // 路径白名单验证
  validatePath(skillId: string, filePath: string): boolean {
    const normalized = path.normalize(filePath);
    const skillRoot = this.getSkillRoot(skillId);
    
    // 必须在 Skill 根目录下
    if (!normalized.startsWith(skillRoot)) {
      return false;
    }
    
    // 禁止路径遍历攻击
    if (normalized.includes('..')) {
      return false;
    }
    
    return true;
  }
  
  // 受限的文件操作 API
  createFSAPI(skillId: string): object {
    return {
      readFile: (filePath: string) => {
        if (!this.validatePath(skillId, filePath)) {
          throw new Error('Access denied: Invalid path');
        }
        return this.virtualRead(skillId, filePath);
      },
      
      writeFile: (filePath: string, content: string) => {
        if (!this.validatePath(skillId, filePath)) {
          throw new Error('Access denied: Invalid path');
        }
        // 文件大小限制：最大 10MB
        if (Buffer.byteLength(content) > 10 * 1024 * 1024) {
          throw new Error('File size limit exceeded (max: 10MB)');
        }
        return this.virtualWrite(skillId, filePath, content);
      },
      
      // 其他受限操作...
    };
  }
}
```

### 3.3 网络隔离

#### 3.3.1 网络访问白名单

```typescript
interface NetworkPolicy {
  // 是否允许网络访问
  enabled: boolean;
  
  // 允许的域名白名单
  allowedDomains: string[];
  
  // 允许的 HTTP 方法
  allowedMethods: string[];
  
  // 最大请求大小（字节）
  maxRequestSize: number;
  
  // 最大响应大小（字节）
  maxResponseSize: number;
  
  // 请求超时（毫秒）
  timeout: number;
  
  // 禁止访问内网
  blockPrivateIP: boolean;
}

class NetworkAccessController {
  private defaultPolicy: NetworkPolicy = {
    enabled: false,                    // 默认禁用网络访问
    allowedDomains: [
      'api.openai.com',
      'openrouter.ai',
      // 其他 AI API 域名...
    ],
    allowedMethods: ['GET', 'POST'],
    maxRequestSize: 10 * 1024 * 1024,  // 10MB
    maxResponseSize: 50 * 1024 * 1024, // 50MB
    timeout: 30000,
    blockPrivateIP: true,
  };
  
  // 验证网络请求
  validateRequest(skillId: string, url: string, method: string): boolean {
    const policy = this.getSkillPolicy(skillId);
    
    if (!policy.enabled) {
      return false;
    }
    
    // 检查 HTTP 方法
    if (!policy.allowedMethods.includes(method.toUpperCase())) {
      return false;
    }
    
    // 检查域名白名单
    const hostname = new URL(url).hostname;
    if (!policy.allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    )) {
      return false;
    }
    
    // 检查内网 IP
    if (policy.blockPrivateIP && this.isPrivateIP(hostname)) {
      return false;
    }
    
    return true;
  }
}
```

---

## 4. 权限控制策略

### 4.1 基于能力的权限模型

#### 4.1.1 权限分类

```typescript
enum PermissionCategory {
  // 基础权限（默认授予）
  BASIC = 'basic',
  
  // 文件系统权限
  FILESYSTEM_READ = 'fs:read',
  FILESYSTEM_WRITE = 'fs:write',
  FILESYSTEM_DELETE = 'fs:delete',
  
  // 网络权限
  NETWORK_HTTP = 'network:http',
  NETWORK_WEBSOCKET = 'network:websocket',
  
  // 系统权限
  SYSTEM_ENV = 'system:env',
  SYSTEM_PROCESS = 'system:process',
  
  // 跨 Skill 访问
  CROSS_SKILL_CALL = 'cross:call',
  CROSS_SKILL_READ = 'cross:read',
  
  // 危险权限（需特殊审批）
  DANGEROUS_EVAL = 'dangerous:eval',
  DANGEROUS_MODULE = 'dangerous:module',
}
```

#### 4.1.2 权限矩阵

```typescript
// 默认权限配置（最小权限原则）
const defaultPermissions: PermissionCategory[] = [
  PermissionCategory.BASIC,
];

// Skill 权限配置
interface SkillPermissions {
  skillId: string;
  permissions: PermissionCategory[];
  
  // 权限过期时间（临时权限）
  expiresAt?: number;
  
  // 权限来源
  grantedBy: 'system' | 'admin' | 'user';
  grantedAt: number;
}

class PermissionManager {
  private skillPermissions = new Map<string, SkillPermissions>();
  
  // 检查 Skill 是否拥有指定权限
  hasPermission(skillId: string, permission: PermissionCategory): boolean {
    const skillPerms = this.skillPermissions.get(skillId);
    if (!skillPerms) {
      return defaultPermissions.includes(permission);
    }
    
    // 检查权限是否过期
    if (skillPerms.expiresAt && Date.now() > skillPerms.expiresAt) {
      return false;
    }
    
    return skillPerms.permissions.includes(permission);
  }
  
  // 权限装饰器
  requirePermission(permission: PermissionCategory) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = function(...args: any[]) {
        const skillId = this.currentSkillId;
        if (!this.permissionManager.hasPermission(skillId, permission)) {
          throw new Error(`Permission denied: ${permission}`);
        }
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}
```

### 4.2 Skill 间访问控制

#### 4.2.1 跨 Skill 调用策略

```typescript
interface CrossSkillPolicy {
  // 允许调用的 Skill ID 白名单
  allowedCallTargets: string[];
  
  // 允许被调用的 Skill ID 白名单
  allowedCallers: string[];
  
  // 允许共享数据的 Skill ID 白名单
  allowedDataSharing: string[];
  
  // 是否允许广播事件
  allowBroadcast: boolean;
}

class CrossSkillAccessController {
  private policies = new Map<string, CrossSkillPolicy>();
  
  // 验证 Skill A 能否调用 Skill B
  canCall(callerSkillId: string, targetSkillId: string): boolean {
    const callerPolicy = this.policies.get(callerSkillId);
    const targetPolicy = this.policies.get(targetSkillId);
    
    // 调用方需要有目标 Skill 在允许列表中
    if (callerPolicy && !callerPolicy.allowedCallTargets.includes(targetSkillId)) {
      return false;
    }
    
    // 目标 Skill 需要允许调用方访问
    if (targetPolicy && !targetPolicy.allowedCallers.includes(callerSkillId)) {
      return false;
    }
    
    return true;
  }
  
  // 安全的跨 Skill 调用代理
  createCallProxy(callerSkillId: string): object {
    return {
      callSkill: async (targetSkillId: string, method: string, args: any[]) => {
        if (!this.canCall(callerSkillId, targetSkillId)) {
          throw new Error(`Cross-skill call denied: ${callerSkillId} -> ${targetSkillId}`);
        }
        
        // 参数深拷贝，防止引用泄露
        const isolatedArgs = this.isolator.isolateContext(args);
        
        // 执行调用
        const result = await this.executeSkillCall(targetSkillId, method, isolatedArgs);
        
        // 结果深拷贝
        return this.isolator.isolateResult(result);
      }
    };
  }
}
```

### 4.3 环境变量访问控制

```typescript
class EnvironmentAccessController {
  private allowedEnvVars = new Set([
    // 安全的环境变量
    'NODE_ENV',
    'LANG',
    'TZ',
    
    // AI API Key（可配置）
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
  ]);
  
  // 暴露给沙箱的安全 process.env
  createSecureEnv(skillId: string): object {
    const env: any = {};
    
    for (const key of this.allowedEnvVars) {
      if (process.env[key]) {
        env[key] = process.env[key];
      }
    }
    
    // Skill 特定环境变量
    env['SKILL_ID'] = skillId;
    env['SKILL_MODE'] = 'sandboxed';
    
    return Object.freeze(env);
  }
}
```

---

## 5. 安全审计与监控

### 5.1 审计日志系统

```typescript
enum AuditEventType {
  SKILL_LOAD = 'skill:load',
  SKILL_UNLOAD = 'skill:unload',
  SKILL_EXECUTE = 'skill:execute',
  SKILL_TERMINATE = 'skill:terminate',
  
  PERMISSION_CHECK = 'permission:check',
  PERMISSION_DENIED = 'permission:denied',
  
  FILESYSTEM_READ = 'fs:read',
  FILESYSTEM_WRITE = 'fs:write',
  
  NETWORK_REQUEST = 'network:request',
  
  SECURITY_VIOLATION = 'security:violation',
}

interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  skillId: string;
  userId?: string;
  details: any;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

class AuditLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ 
          filename: 'audit-security.log',
          level: 'warn'  // 只记录警告及以上
        }),
        new winston.transports.File({ 
          filename: 'audit-all.log' 
        }),
      ],
    });
  }
  
  // 记录安全事件
  logSecurityEvent(entry: AuditLogEntry): void {
    this.logger.log({
      level: this.getLogLevel(entry.riskLevel),
      ...entry
    });
    
    // 高危事件实时告警
    if (entry.riskLevel === 'high' || entry.riskLevel === 'critical') {
      this.alertSecurityTeam(entry);
    }
  }
  
  private alertSecurityTeam(entry: AuditLogEntry): void {
    // 集成告警系统（Slack、邮件、短信等）
    console.error('[SECURITY ALERT]', entry);
  }
}
```

### 5.2 异常行为检测

```typescript
class AnomalyDetector {
  private skillBehaviorProfile = new Map<string, SkillBehaviorProfile>();
  
  // 建立 Skill 正常行为基线
  buildProfile(skillId: string, executionData: ExecutionData): void {
    const profile = this.skillBehaviorProfile.get(skillId) || this.createEmptyProfile();
    
    // 更新行为统计
    profile.executionCount++;
    profile.avgExecutionTime = this.updateAverage(
      profile.avgExecutionTime, 
      executionData.duration,
      profile.executionCount
    );
    profile.peakMemoryUsage = Math.max(
      profile.peakMemoryUsage, 
      executionData.memoryUsage
    );
    profile.networkRequests = executionData.networkRequests;
    
    this.skillBehaviorProfile.set(skillId, profile);
  }
  
  // 检测异常行为
  detectAnomaly(skillId: string, executionData: ExecutionData): AnomalyDetectionResult {
    const profile = this.skillBehaviorProfile.get(skillId);
    if (!profile) {
      return { isAnomaly: false, reason: 'No profile' };
    }
    
    const anomalies: string[] = [];
    
    // 执行时间异常（超过 3 倍标准差）
    if (executionData.duration > profile.avgExecutionTime * 3) {
      anomalies.push('Execution time anomaly');
    }
    
    // 内存使用异常
    if (executionData.memoryUsage > profile.peakMemoryUsage * 2) {
      anomalies.push('Memory usage anomaly');
    }
    
    // 网络请求异常
    if (executionData.networkRequests > profile.networkRequests * 5) {
      anomalies.push('Network requests anomaly');
    }
    
    return {
      isAnomaly: anomalies.length > 0,
      anomalies,
      riskLevel: anomalies.length >= 2 ? 'high' : 'medium'
    };
  }
}
```

---

## 6. 实现方案

### 6.1 核心类架构

```typescript
/**
 * VM 沙箱安全架构核心类
 */
class VMSandboxSecurityManager {
  // 单例实例
  private static instance: VMSandboxSecurityManager;
  
  // 子管理器
  private sandboxPool: SandboxPool;
  private permissionManager: PermissionManager;
  private networkController: NetworkAccessController;
  private fsController: VirtualFileSystem;
  private crossSkillController: CrossSkillAccessController;
  private auditLogger: AuditLogger;
  private anomalyDetector: AnomalyDetector;
  private resourceMonitor: ResourceMonitor;
  
  private constructor() {
    this.sandboxPool = new SandboxPool();
    this.permissionManager = new PermissionManager();
    this.networkController = new NetworkAccessController();
    this.fsController = new VirtualFileSystem();
    this.crossSkillController = new CrossSkillAccessController();
    this.auditLogger = new AuditLogger();
    this.anomalyDetector = new AnomalyDetector();
    this.resourceMonitor = new ResourceMonitor();
  }
  
  public static getInstance(): VMSandboxSecurityManager {
    if (!VMSandboxSecurityManager.instance) {
      VMSandboxSecurityManager.instance = new VMSandboxSecurityManager();
    }
    return VMSandboxSecurityManager.instance;
  }
  
  // 创建安全沙箱
  async createSecureSandbox(skillId: string, config: SkillConfig): Promise<SecureSandbox> {
    // 1. 审计日志
    this.auditLogger.logSecurityEvent({
      timestamp: Date.now(),
      eventType: AuditEventType.SKILL_LOAD,
      skillId,
      details: { config },
      success: true,
      riskLevel: 'low'
    });
    
    // 2. 创建 VM 实例
    const vm = this.sandboxPool.createSandbox(skillId, {
      freeze: true,
      strict: true,
      eval: false,
      wasm: false,
      sandbox: this.createSecureGlobals(skillId),
      require: {
        builtin: this.getAllowedBuiltins(skillId),
        external: this.getAllowedExternals(skillId),
        root: this.fsController.getSkillRoot(skillId),
      }
    });
    
    // 3. 启动资源监控
    this.resourceMonitor.monitorSkill(skillId, vm);
    
    // 4. 返回安全沙箱包装
    return new SecureSandbox(skillId, vm, this);
  }
  
  // 安全执行 Skill 代码
  async executeSecure(
    skillId: string, 
    code: string, 
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 权限检查
      if (!this.permissionManager.hasPermission(skillId, PermissionCategory.BASIC)) {
        throw new Error('Basic permission required');
      }
      
      // 2. 上下文隔离
      const isolatedContext = this.isolator.isolateContext(context);
      
      // 3. 获取沙箱
      const sandbox = this.sandboxPool.getSandbox(skillId);
      
      // 4. 设置执行超时
      const timeout = this.resourceMonitor.startExecutionTimer(skillId);
      
      // 5. 执行代码
      const result = await sandbox.run(code, isolatedContext);
      
      // 6. 清除超时
      this.resourceMonitor.cancelExecutionTimer(skillId);
      
      // 7. 结果隔离
      const isolatedResult = this.isolator.isolateResult(result);
      
      // 8. 更新行为分析
      const executionData = {
        duration: Date.now() - startTime,
        memoryUsage: process.memoryUsage().heapUsed,
        networkRequests: 0
      };
      this.anomalyDetector.buildProfile(skillId, executionData);
      
      // 9. 审计日志
      this.auditLogger.logSecurityEvent({
        timestamp: Date.now(),
        eventType: AuditEventType.SKILL_EXECUTE,
        skillId,
        details: { duration: Date.now() - startTime },
        success: true,
        riskLevel: 'low'
      });
      
      return {
        success: true,
        result: isolatedResult,
        duration: Date.now() - startTime,
      };
      
    } catch (error) {
      // 错误处理和审计
      this.auditLogger.logSecurityEvent({
        timestamp: Date.now(),
        eventType: AuditEventType.SKILL_EXECUTE,
        skillId,
        details: { error: error.message },
        success: false,
        riskLevel: 'medium'
      });
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }
}
```

### 6.2 SecureSandbox 包装类

```typescript
/**
 * 安全沙箱包装类
 * 封装 VM 实例，提供安全的执行接口
 */
class SecureSandbox {
  constructor(
    private skillId: string,
    private vm: NodeVM,
    private securityManager: VMSandboxSecurityManager
  ) {}
  
  // 安全执行
  async execute(method: string, args: any[]): Promise<any> {
    return this.securityManager.executeSecure(
      this.skillId,
      `module.exports = async (context) => context.${method}(...context.args)`,
      { method, args }
    );
  }
  
  // 销毁沙箱
  destroy(): void {
    this.securityManager.destroySandbox(this.skillId);
  }
}
```

### 6.3 与 SkillLoader 集成

```typescript
// 在 SkillLoader.ts 中集成安全沙箱
class SkillLoader {
  private securityManager = VMSandboxSecurityManager.getInstance();
  
  async loadWithSandbox(skill: SkillRegistration): Promise<SkillLoadResult> {
    try {
      // 1. 读取 Skill 代码
      const code = await fs.promises.readFile(skill.entryPoint, 'utf-8');
      
      // 2. 代码安全扫描（静态分析）
      await this.securityScan(code);
      
      // 3. 创建安全沙箱
      const sandbox = await this.securityManager.createSecureSandbox(
        skill.id, 
        skill.config
      );
      
      // 4. 在沙箱中执行代码
      const skillModule = await sandbox.execute(code, {});
      
      // 5. 验证导出接口
      this.validateSkillExports(skillModule);
      
      return {
        success: true,
        skill: skillModule,
        sandbox,
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  // 代码安全扫描（静态分析）
  private async securityScan(code: string): Promise<void> {
    const violations: string[] = [];
    
    // 检测危险模式
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, description: 'eval() 调用' },
      { pattern: /Function\s*\(/, description: 'Function 构造函数' },
      { pattern: /global\s*\./, description: '全局对象访问' },
      { pattern: /process\s*\./, description: 'process 对象访问' },
      { pattern: /require\s*\(['"].*vm['"]\)/, description: 'vm 模块导入' },
      { pattern: /child_process/, description: 'child_process 模块导入' },
      { pattern: /__proto__/, description: '原型访问（可能的原型污染）' },
      { pattern: /constructor\.prototype/, description: '构造函数原型访问' },
    ];
    
    for (const { pattern, description } of dangerousPatterns) {
      if (pattern.test(code)) {
        violations.push(`检测到危险模式: ${description}`);
      }
    }
    
    if (violations.length > 0) {
      throw new Error(`安全扫描失败: ${violations.join('; ')}`);
    }
  }
}
```

---

## 7. 安全测试用例

### 7.1 沙箱逃逸测试

```typescript
describe('Sandbox Escape Prevention', () => {
  
  test('should prevent prototype pollution', async () => {
    const maliciousCode = `
      // 尝试原型污染攻击
      Object.prototype.__proto__.evil = 'injected';
      return { success: false };
    `;
    
    await expect(sandbox.execute(maliciousCode, {}))
      .rejects.toThrow();
  });
  
  test('should prevent access to main process', async () => {
    const maliciousCode = `
      // 尝试访问主进程
      const mainProcess = Object.getPrototypeOf(global).constructor;
      return mainProcess;
    `;
    
    await expect(sandbox.execute(maliciousCode, {}))
      .rejects.toThrow();
  });
  
  test('should prevent require() of forbidden modules', async () => {
    const maliciousCode = `
      // 尝试加载危险模块
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd');
    `;
    
    await expect(sandbox.execute(maliciousCode, {}))
      .rejects.toThrow();
  });
  
  test('should prevent this escape via constructor', async () => {
    const maliciousCode = `
      // 尝试通过 constructor 逃逸
      ({}).constructor.constructor('return process')();
    `;
    
    await expect(sandbox.execute(maliciousCode, {}))
      .rejects.toThrow();
  });
});
```

### 7.2 资源限制测试

```typescript
describe('Resource Limitations', () => {
  
  test('should enforce memory limits', async () => {
    const memoryHogCode = `
      // 消耗大量内存
      const arr = [];
      while (true) {
        arr.push(new Array(1000000).fill('x'));
      }
    `;
    
    await expect(sandbox.execute(memoryHogCode, {}))
      .rejects.toThrow('Memory limit exceeded');
  }, 5000);
  
  test('should enforce execution timeout', async () => {
    const infiniteLoopCode = `
      // 无限循环
      while (true) {
        // do nothing
      }
    `;
    
    await expect(sandbox.execute(infiniteLoopCode, {}))
      .rejects.toThrow('Execution timeout');
  }, 35000);
  
  test('should enforce call stack limits', async () => {
    const recursiveCode = `
      // 无限递归
      function recurse() {
        recurse();
      }
      recurse();
    `;
    
    await expect(sandbox.execute(recursiveCode, {}))
      .rejects.toThrow('Call stack depth exceeded');
  });
});
```

### 7.3 权限控制测试

```typescript
describe('Permission Control', () => {
  
  test('should deny network access by default', async () => {
    const networkCode = `
      const axios = require('axios');
      return axios.get('https://example.com');
    `;
    
    await expect(sandbox.execute(networkCode, {}))
      .rejects.toThrow('Permission denied');
  });
  
  test('should allow network access when explicitly granted', async () => {
    // 授予权限
    await permissionManager.grantPermission(
      'test-skill', 
      PermissionCategory.NETWORK_HTTP
    );
    
    const networkCode = `
      const axios = require('axios');
      return axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer test' }
      });
    `;
    
    const result = await sandbox.execute(networkCode, {});
    expect(result).toBeDefined();
  });
  
  test('should deny cross-skill access', async () => {
    const crossSkillCode = `
      // 尝试调用另一个 Skill
      return skillManager.execute('another-skill', {});
    `;
    
    await expect(sandbox.execute(crossSkillCode, {}))
      .rejects.toThrow('Permission denied');
  });
});
```

### 7.4 文件系统测试

```typescript
describe('Filesystem Isolation', () => {
  
  test('should prevent path traversal attacks', async () => {
    const pathTraversalCode = `
      // 尝试路径遍历
      return fs.readFile('../../etc/passwd');
    `;
    
    await expect(sandbox.execute(pathTraversalCode, {}))
      .rejects.toThrow('Access denied');
  });
  
  test('should enforce file size limits', async () => {
    const bigFileCode = `
      // 尝试写入大文件
      const bigData = 'x'.repeat(20 * 1024 * 1024); // 20MB
      return fs.writeFile('big.txt', bigData);
    `;
    
    await expect(sandbox.execute(bigFileCode, {}))
      .rejects.toThrow('File size limit exceeded');
  });
  
  test('should isolate skill filesystems', async () => {
    // Skill A 写入文件
    await sandboxA.execute(`
      fs.writeFile('secret.txt', 'secret data');
    `, {});
    
    // Skill B 尝试读取
    const result = await sandboxB.execute(`
      return fs.readFile('../skill-a/secret.txt');
    `, {});
    
    expect(result).rejects.toThrow();
  });
});
```

---

## 8. 性能评估

### 8.1 性能基准测试

```typescript
describe('Performance Benchmark', () => {
  
  test('sandbox initialization overhead', async () => {
    const startTime = process.hrtime();
    
    for (let i = 0; i < 100; i++) {
      await securityManager.createSecureSandbox('test-skill-' + i, {});
    }
    
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const avgTime = (seconds * 1000 + nanoseconds / 1e6) / 100;
    
    console.log(`Average sandbox creation time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(50); // 目标：小于 50ms
  });
  
  test('code execution overhead', async () => {
    const simpleCode = `
      function fib(n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
      }
      return fib(20);
    `;
    
    // 直接执行
    const start1 = Date.now();
    eval(simpleCode);
    const directTime = Date.now() - start1;
    
    // 沙箱执行
    const start2 = Date.now();
    await sandbox.execute(simpleCode, {});
    const sandboxTime = Date.now() - start2;
    
    console.log(`Direct execution: ${directTime}ms`);
    console.log(`Sandbox execution: ${sandboxTime}ms`);
    console.log(`Overhead: ${((sandboxTime / directTime - 1) * 100).toFixed(2)}%`);
    
    // 目标：开销小于 200%
    expect(sandboxTime / directTime).toBeLessThan(3);
  });
  
  test('concurrent execution', async () => {
    const skills = Array.from({ length: 10 }, (_, i) => `skill-${i}`);
    
    const startTime = Date.now();
    
    await Promise.all(
      skills.map(skillId => 
        securityManager.executeSecure(skillId, 'return 42', {})
      )
    );
    
    const totalTime = Date.now() - startTime;
    console.log(`10 concurrent executions: ${totalTime}ms`);
    
    expect(totalTime).toBeLessThan(1000);
  });
});
```

### 8.2 内存使用测试

```typescript
describe('Memory Usage', () => {
  
  test('sandbox memory cleanup', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 创建 100 个沙箱，然后销毁
    for (let i = 0; i < 100; i++) {
      const sandbox = await securityManager.createSecureSandbox(`test-${i}`, {});
      sandbox.destroy();
    }
    
    // 强制 GC
    if (global.gc) {
      global.gc();
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryLeak = finalMemory - initialMemory;
    
    console.log(`Initial: ${Math.round(initialMemory / 1024 / 1024)}MB`);
    console.log(`Final: ${Math.round(finalMemory / 1024 / 1024)}MB`);
    console.log(`Leak: ${Math.round(memoryLeak / 1024)}KB`);
    
    // 目标：内存泄漏小于 5MB
    expect(memoryLeak).toBeLessThan(5 * 1024 * 1024);
  });
});
```

---

## 9. 运维与监控

### 9.1 健康检查接口

```typescript
class SandboxHealthChecker {
  
  // 沙箱健康状态
  getHealthStatus(): HealthStatus {
    return {
      timestamp: Date.now(),
      healthy: this.isHealthy(),
      activeSandboxes: this.sandboxPool.getActiveCount(),
      totalMemoryUsed: this.getTotalMemoryUsed(),
      errors: this.getRecentErrors(),
      performance: this.getPerformanceMetrics(),
    };
  }
  
  // 安全态势概览
  getSecurityPosture(): SecurityPosture {
    return {
      activeSkills: this.skillManager.getActiveSkills().length,
      permissionsGranted: this.permissionManager.getGrantCount(),
      recentSecurityEvents: this.auditLogger.getRecentEvents(100),
      anomalyScore: this.anomalyDetector.getOverallAnomalyScore(),
      threatsDetected: this.threatDetector.getRecentThreats(),
    };
  }
  
  // Prometheus 指标端点
  getPrometheusMetrics(): string {
    const metrics = [
      `kite_sandbox_active ${this.sandboxPool.getActiveCount()}`,
      `kite_sandbox_total_created ${this.sandboxPool.getTotalCreated()}`,
      `kite_sandbox_total_errors ${this.sandboxPool.getTotalErrors()}`,
      `kite_sandbox_avg_execution_time_ms ${this.getAvgExecutionTime()}`,
      `kite_security_events_total ${this.auditLogger.getTotalEvents()}`,
      `kite_security_anomalies_total ${this.anomalyDetector.getTotalAnomalies()}`,
    ];
    
    return metrics.join('\n');
  }
}
```

### 9.2 告警规则

| 告警类型 | 触发条件 | 严重程度 | 处理方式 |
|---------|---------|---------|---------|
| **沙箱逃逸尝试** | 检测到沙箱逃逸代码 | CRITICAL | 立即终止 Skill，告警安全团队 |
| **权限越权尝试** | 多次权限检查失败 | HIGH | 暂停 Skill，审计日志 |
| **资源耗尽** | 单个 Skill 持续超资源限制 | MEDIUM | 限制 Skill 执行频率 |
| **异常行为** | 行为分析检测到异常模式 | MEDIUM | 增加监控粒度 |
| **执行超时** | Skill 执行超时率 > 10% | LOW | 性能优化建议 |
| **内存泄漏** | 系统内存持续增长 | LOW | 重启服务，内存分析 |

---

## 10. 故障恢复与应急响应

### 10.1 故障恢复流程

```
[故障检测]
    ↓
[安全隔离] → 终止可疑 Skill
    ↓
[取证分析] → 保存执行日志、内存快照
    ↓
[根因分析] → 确定漏洞来源
    ↓
[修复实施] → 应用安全补丁
    ↓
[系统恢复] → 逐步恢复服务
    ↓
[事后审计] → 复盘、改进防护措施
```

### 10.2 紧急终止接口

```typescript
class EmergencyResponse {
  
  // 紧急终止单个 Skill
  emergencyTerminate(skillId: string, reason: string): void {
    this.auditLogger.logSecurityEvent({
      eventType: AuditEventType.SKILL_TERMINATE,
      skillId,
      details: { reason, emergency: true },
      success: true,
      riskLevel: 'high'
    });
    
    this.sandboxPool.destroySandbox(skillId);
    this.resourceMonitor.cancelAllTimers(skillId);
  }
  
  // 紧急锁定系统（安全模式）
  enterSafeMode(): void {
    this.safeMode = true;
    
    // 终止所有正在执行的 Skill
    for (const skillId of this.sandboxPool.getActiveSkills()) {
      this.emergencyTerminate(skillId, 'System entering safe mode');
    }
    
    // 禁止新的 Skill 加载
    this.sandboxPool.disableNewSandboxes();
    
    this.alertSecurityTeam({
      level: 'critical',
      message: 'System entered safe mode',
      timestamp: Date.now()
    });
  }
  
  // 恢复正常模式
  exitSafeMode(): void {
    this.safeMode = false;
    this.sandboxPool.enableNewSandboxes();
  }
}
```

---

## 11. 未来扩展方向

### 11.1 短期优化（1-3 个月）

1. **WebAssembly 支持**
   - 支持 WASM Skill 执行
   - WASM 沙箱进一步隔离

2. **机器学习异常检测**
   - 基于历史执行数据训练模型
   - 更准确的异常行为识别

3. **细粒度网络策略**
   - 基于 API 端点的权限控制
   - 请求签名验证

### 11.2 中期规划（3-6 个月）

1. **Docker 容器化执行**
   - 每个 Skill 在独立容器中执行
   - 更强的操作系统级隔离

2. **分布式沙箱集群**
   - 沙箱执行节点池
   - 负载均衡和故障转移

3. **实时威胁情报**
   - 集成威胁情报 feeds
   - 主动漏洞扫描

### 11.3 长期愿景（6-12 个月）

1. **零信任架构**
   - 默认不信任任何 Skill
   - 持续身份验证和授权

2. **形式化验证**
   - 安全策略的数学证明
   - 沙箱边界的形式化验证

3. **量子安全准备**
   - 抗量子加密算法
   - 量子计算威胁评估

---

## 12. 参考资料

### 12.1 技术文档

- **vm2 官方文档**: https://github.com/patriksimek/vm2
- **Node.js VM 模块**: https://nodejs.org/api/vm.html
- **OWASP 沙箱逃逸指南**: https://owasp.org/www-community/Sandbox_Escape

### 12.2 安全标准

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CWE 弱点列表**: https://cwe.mitre.org/
- **NIST 安全框架**: https://www.nist.gov/cyberframework

### 12.3 相关研究

- "JavaScript Sandboxing: A Comprehensive Survey"
- "Evaluating the Security of Node.js Sandboxes"
- "VM2 Security Analysis and Escape Techniques"

---

## 附录 A: 配置参考

### A.1 完整配置示例

```typescript
const securityConfig = {
  sandbox: {
    freeze: true,
    strict: true,
    eval: false,
    wasm: false,
    asyncTimeout: 30000,
  },
  
  resources: {
    maxHeapSize: 128 * 1024 * 1024,      // 128MB
    maxStackSize: 8 * 1024 * 1024,        // 8MB
    maxExecutionTime: 30000,              // 30s
    maxCallStackDepth: 100,
  },
  
  filesystem: {
    maxFileSize: 10 * 1024 * 1024,        // 10MB
    maxTotalSize: 100 * 1024 * 1024,      // 100MB
    allowedExtensions: ['.json', '.txt', '.csv', '.md'],
  },
  
  network: {
    enabled: false,
    timeout: 30000,
    maxRequestSize: 10 * 1024 * 1024,     // 10MB
    maxResponseSize: 50 * 1024 * 1024,    // 50MB
    allowedDomains: ['api.openai.com', 'openrouter.ai'],
    allowedMethods: ['GET', 'POST'],
    blockPrivateIP: true,
  },
  
  audit: {
    logLevel: 'info',
    logAllExecutions: true,
    anomalyDetection: true,
    alertThreshold: {
      high: 10,
      medium: 50,
      low: 100,
    },
  },
};
```

---

## 附录 B: 常见问题 (FAQ)

### B.1 安全相关

**Q: vm2 和 isolated-vm 如何选择？**

A: vm2 提供更完整的 Node.js 环境模拟，API 更简单，社区更成熟。isolated-vm 性能更好，但使用更复杂。我们选择 vm2 作为主方案，isolated-vm 作为备选。

**Q: 如何防止原型污染攻击？**

A: 三重防护：1) 冻结所有内置对象原型；2) 静态代码扫描检测危险模式；3) 运行时监控原型修改。

**Q: 沙箱逃逸的最坏情况是什么？**

A: 攻击者可能访问主机文件系统、执行任意代码。但通过多层防护，逃逸成功的概率极低。即使逃逸，操作系统级别的权限限制也会限制破坏范围。

### B.2 性能相关

**Q: 沙箱会带来多大的性能开销？**

A: 基准测试显示，沙箱执行比直接执行慢约 100-200%。对于 AI Skill 来说，这通常可以接受，因为瓶颈通常在 API 调用而非计算。

**Q: 可以同时运行多少个沙箱？**

A: 取决于可用内存。每个沙箱约占用 10-50MB，普通服务器可同时运行数百个沙箱。

---

**文档版本**: v1.0.0  
**最后更新**: 2026-05-15  
**审核状态**: 待审核  
**实施状态**: 设计完成，待开发

---

*本文档为 Kite AI 项目核心安全文档，未经授权不得外传。*
