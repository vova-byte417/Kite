/**
 * VM 沙箱安全管理器 - 实现文件
 * 
 * 实现 vm2 沙箱的安全配置、权限控制、资源监控、审计日志
 * 
 * @author 李安全
 * @version 1.0.0
 */

import { NodeVM, VMScript } from 'vm2';
import * as winston from 'winston';
import { EventEmitter } from 'events';

// ==================== 类型定义 ====================

export enum PermissionCategory {
  BASIC = 'basic',
  FILESYSTEM_READ = 'fs:read',
  FILESYSTEM_WRITE = 'fs:write',
  FILESYSTEM_DELETE = 'fs:delete',
  NETWORK_HTTP = 'network:http',
  NETWORK_WEBSOCKET = 'network:websocket',
  SYSTEM_ENV = 'system:env',
  SYSTEM_PROCESS = 'system:process',
  CROSS_SKILL_CALL = 'cross:call',
  CROSS_SKILL_READ = 'cross:read',
  DANGEROUS_EVAL = 'dangerous:eval',
  DANGEROUS_MODULE = 'dangerous:module',
}

export enum AuditEventType {
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

export interface SandboxConfig {
  freeze?: boolean;
  strict?: boolean;
  eval?: boolean;
  wasm?: boolean;
  asyncTimeout?: number;
}

export interface ResourceLimits {
  maxHeapSize: number;
  maxStackSize: number;
  maxExecutionTime: number;
  maxCallStackDepth: number;
}

export interface SkillPermissions {
  skillId: string;
  permissions: PermissionCategory[];
  expiresAt?: number;
  grantedBy: 'system' | 'admin' | 'user';
  grantedAt: number;
}

export interface AuditLogEntry {
  timestamp: number;
  eventType: AuditEventType;
  skillId: string;
  userId?: string;
  details: any;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  level: string;
  message: string;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

// ==================== 默认配置 ====================

const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  freeze: true,
  strict: true,
  eval: false,
  wasm: false,
  asyncTimeout: 30000,
};

const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxHeapSize: 128 * 1024 * 1024,
  maxStackSize: 8 * 1024 * 1024,
  maxExecutionTime: 30000,
  maxCallStackDepth: 100,
};

const DEFAULT_PERMISSIONS: PermissionCategory[] = [
  PermissionCategory.BASIC,
];

const ALLOWED_BUILTIN_MODULES = [
  'util', 'path', 'url', 'querystring', 'string_decoder',
  'buffer', 'stream', 'events', 'zlib', 'crypto',
];

const BLOCKED_BUILTIN_MODULES = [
  'fs', 'child_process', 'cluster', 'net', 'http', 'https',
  'dgram', 'tls', 'worker_threads', 'vm', 'process', 'os',
];

// ==================== 审计日志类 ====================

class AuditLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/audit-security.log',
          level: 'warn',
        }),
        new winston.transports.File({
          filename: 'logs/audit-all.log',
        }),
      ],
    });
  }

  log(entry: AuditLogEntry): void {
    this.logger.log({
      level: this.getLogLevel(entry.riskLevel),
      ...entry,
    });

    if (entry.riskLevel === 'high' || entry.riskLevel === 'critical') {
      this.alertSecurityTeam(entry);
    }
  }

  private getLogLevel(riskLevel: string): string {
    const levelMap: Record<string, string> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error',
    };
    return levelMap[riskLevel] || 'info';
  }

  private alertSecurityTeam(entry: AuditLogEntry): void {
    console.error('[SECURITY ALERT]', JSON.stringify(entry, null, 2));
  }
}

// ==================== 权限管理器类 ====================

class PermissionManager {
  private skillPermissions = new Map<string, SkillPermissions>();

  hasPermission(skillId: string, permission: PermissionCategory): boolean {
    const skillPerms = this.skillPermissions.get(skillId);
    
    if (!skillPerms) {
      return DEFAULT_PERMISSIONS.includes(permission);
    }

    if (skillPerms.expiresAt && Date.now() > skillPerms.expiresAt) {
      return false;
    }

    return skillPerms.permissions.includes(permission);
  }

  grantPermission(
    skillId: string,
    permission: PermissionCategory,
    grantedBy: SkillPermissions['grantedBy'] = 'system',
    expiresAt?: number
  ): void {
    const existing = this.skillPermissions.get(skillId);
    
    if (existing) {
      if (!existing.permissions.includes(permission)) {
        existing.permissions.push(permission);
      }
    } else {
      this.skillPermissions.set(skillId, {
        skillId,
        permissions: [...DEFAULT_PERMISSIONS, permission],
        grantedBy,
        grantedAt: Date.now(),
        expiresAt,
      });
    }
  }

  revokePermission(skillId: string, permission: PermissionCategory): void {
    const existing = this.skillPermissions.get(skillId);
    if (existing) {
      existing.permissions = existing.permissions.filter(p => p !== permission);
    }
  }
}

// ==================== 资源监控器类 ====================

class ResourceMonitor {
  private limits: ResourceLimits;
  private runningTimers = new Map<string, NodeJS.Timeout>();
  private memoryUsage = new Map<string, number>();

  constructor(limits: ResourceLimits = DEFAULT_RESOURCE_LIMITS) {
    this.limits = limits;
  }

  startExecutionTimer(skillId: string, timeout?: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      throw new Error(`Execution timeout exceeded (max: ${this.limits.maxExecutionTime}ms)`);
    }, timeout || this.limits.maxExecutionTime);

    this.runningTimers.set(skillId, timer);
    return timer;
  }

  cancelExecutionTimer(skillId: string): void {
    const timer = this.runningTimers.get(skillId);
    if (timer) {
      clearTimeout(timer);
      this.runningTimers.delete(skillId);
    }
  }

  monitorMemory(skillId: string, vm: NodeVM): void {
    const checkInterval = setInterval(() => {
      const usage = process.memoryUsage().heapUsed;
      this.memoryUsage.set(skillId, usage);

      if (usage > this.limits.maxHeapSize) {
        clearInterval(checkInterval);
        throw new Error(`Memory limit exceeded (max: ${this.limits.maxHeapSize} bytes)`);
      }
    }, 1000);
  }

  wrapWithCallStackLimit<T extends (...args: any[]) => any>(
    fn: T,
    skillId: string
  ): T {
    let depth = 0;
    const maxDepth = this.limits.maxCallStackDepth;

    return function(this: any, ...args: Parameters<T>): ReturnType<T> {
      depth++;

      if (depth > maxDepth) {
        throw new Error(`Call stack depth exceeded (max: ${maxDepth})`);
      }

      try {
        return fn.apply(this, args);
      } finally {
        depth--;
      }
    } as T;
  }
}

// ==================== 上下文隔离器类 ====================

class ContextIsolator {
  deepClone(obj: any): any {
    const cache = new WeakMap();

    function clone(value: any): any {
      if (value === null || typeof value !== 'object') {
        return value;
      }

      if (cache.has(value)) {
        return cache.get(value);
      }

      if (value instanceof Date) {
        return new Date(value.getTime());
      }

      if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
      }

      if (Array.isArray(value)) {
        const arr: any[] = [];
        cache.set(value, arr);
        value.forEach((item, index) => {
          arr[index] = clone(item);
        });
        return arr;
      }

      if (typeof value === 'function') {
        throw new Error('Functions cannot be passed through sandbox boundary');
      }

      const result: any = {};
      cache.set(value, result);
      Object.keys(value).forEach(key => {
        result[key] = clone(value[key]);
      });
      return result;
    }

    return clone(obj);
  }

  isolateContext(context: any): any {
    return this.deepClone(context);
  }

  isolateResult(result: any): any {
    return this.deepClone(result);
  }
}

// ==================== 代码安全扫描器类 ====================

class CodeSecurityScanner {
  private dangerousPatterns = [
    { pattern: /eval\s*\(/, description: 'eval() call detected' },
    { pattern: /Function\s*\(/, description: 'Function constructor detected' },
    { pattern: /global\s*\./, description: 'Global object access detected' },
    { pattern: /process\s*\./, description: 'Process object access detected' },
    { pattern: /require\s*\(['"].*vm['"]\)/, description: 'vm module import detected' },
    { pattern: /child_process/, description: 'child_process module import detected' },
    { pattern: /__proto__/, description: 'Prototype access detected (possible pollution)' },
    { pattern: /constructor\.prototype/, description: 'Constructor prototype access detected' },
    { pattern: /setTimeout\s*\(\s*['"]function/, description: 'setTimeout with string argument' },
    { pattern: /setInterval\s*\(\s*['"]function/, description: 'setInterval with string argument' },
  ];

  scan(code: string): string[] {
    const violations: string[] = [];

    for (const { pattern, description } of this.dangerousPatterns) {
      if (pattern.test(code)) {
        violations.push(description);
      }
    }

    return violations;
  }
}

// ==================== 安全沙箱类 ====================

export class SecureSandbox {
  private vm: NodeVM;
  private scriptCache = new Map<string, VMScript>();

  constructor(
    public readonly skillId: string,
    private config: SandboxConfig,
    private permissionManager: PermissionManager,
    private resourceMonitor: ResourceMonitor,
    private isolator: ContextIsolator,
    private auditLogger: AuditLogger
  ) {
    this.vm = this.createVM();
  }

  private createVM(): NodeVM {
    return new NodeVM({
      ...this.config,
      sandbox: this.createSecureGlobals(),
      require: {
        builtin: ALLOWED_BUILTIN_MODULES,
        external: false,
        context: 'sandbox',
      },
    });
  }

  private createSecureGlobals(): object {
    const skillId = this.skillId;

    return Object.freeze({
      console: this.createSecureConsole(),
      setTimeout: this.wrapGlobalFunction(setTimeout, 'setTimeout'),
      setInterval: this.wrapGlobalFunction(setInterval, 'setInterval'),
      clearTimeout: this.wrapGlobalFunction(clearTimeout, 'clearTimeout'),
      clearInterval: this.wrapGlobalFunction(clearInterval, 'clearInterval'),
      Promise,
      JSON: Object.freeze(JSON),
      Math: Object.freeze(Math),
      Date: Object.freeze(Date),
      Array: Object.freeze(Array),
      Object: Object.freeze(Object),
      String: Object.freeze(String),
      Number: Object.freeze(Number),
      Boolean: Object.freeze(Boolean),
      RegExp: Object.freeze(RegExp),
      Error: Object.freeze(Error),
      TypeError: Object.freeze(TypeError),
      SyntaxError: Object.freeze(SyntaxError),
      ReferenceError: Object.freeze(ReferenceError),
      RangeError: Object.freeze(RangeError),
      SKILL_ID: skillId,
    });
  }

  private createSecureConsole(): object {
    const allowedMethods = ['log', 'info', 'warn', 'error', 'debug'];
    const secureConsole: any = {};

    for (const method of allowedMethods) {
      secureConsole[method] = (...args: any[]) => {
        this.auditLogger.log({
          timestamp: Date.now(),
          eventType: AuditEventType.SKILL_EXECUTE,
          skillId: this.skillId,
          details: { console: method, args: args.slice(0, 10) },
          success: true,
          riskLevel: 'low',
          level: 'info',
          message: `Console ${method} called by skill ${this.skillId}`,
        });
        const consoleMethod = console[method as keyof Console] as (...args: any[]) => void;
        if (typeof consoleMethod === 'function') {
          consoleMethod(...args);
        }
      };
    }

    return Object.freeze(secureConsole);
  }

  private wrapGlobalFunction(fn: Function, name: string): Function {
    const wrapper = (...args: any[]) => {
      if (typeof args[0] === 'string') {
        throw new Error(`String argument not allowed in ${name}() in sandbox`);
      }
      return fn.apply(global, args);
    };

    return wrapper;
  }

  async execute(code: string, context: any = {}): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const isolatedContext = this.isolator.isolateContext(context);

      const script = new VMScript(`
        (function(context) {
          ${code};
        }
      `).compile();

      const result = await this.vm.run(script, 'sandbox.js');
      const isolatedResult = this.isolator.isolateResult(result);

      this.auditLogger.log({
        timestamp: Date.now(),
        eventType: AuditEventType.SKILL_EXECUTE,
        skillId: this.skillId,
        details: { duration: Date.now() - startTime },
        success: true,
        riskLevel: 'low',
        level: 'info',
        message: `Skill ${this.skillId} executed successfully`,
      });

      return {
        success: true,
        result: isolatedResult,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      this.auditLogger.log({
        timestamp: Date.now(),
        eventType: AuditEventType.SKILL_EXECUTE,
        skillId: this.skillId,
        details: { error: (error as Error).message },
        success: false,
        riskLevel: 'medium',
        level: 'warn',
        message: `Skill ${this.skillId} execution failed: ${(error as Error).message}`,
      });

      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  destroy(): void {
    this.scriptCache.clear();
  }
}

// ==================== VM 沙箱安全管理器主类 ====================

export class VMSandboxSecurityManager extends EventEmitter {
  private static instance: VMSandboxSecurityManager;
  
  private sandboxes = new Map<string, SecureSandbox>();
  private permissionManager: PermissionManager;
  private resourceMonitor: ResourceMonitor;
  private isolator: ContextIsolator;
  private auditLogger: AuditLogger;
  private codeScanner: CodeSecurityScanner;
  private safeMode = false;

  private constructor(
    private config: SandboxConfig = DEFAULT_SANDBOX_CONFIG,
    private limits: ResourceLimits = DEFAULT_RESOURCE_LIMITS
  ) {
    super();
    this.permissionManager = new PermissionManager();
    this.resourceMonitor = new ResourceMonitor(limits);
    this.isolator = new ContextIsolator();
    this.auditLogger = new AuditLogger();
    this.codeScanner = new CodeSecurityScanner();
  }

  public static getInstance(
    config?: SandboxConfig,
    limits?: ResourceLimits
  ): VMSandboxSecurityManager {
    if (VMSandboxSecurityManager.instance) {
      return VMSandboxSecurityManager.instance;
    }
    VMSandboxSecurityManager.instance = new VMSandboxSecurityManager(config, limits);
    return VMSandboxSecurityManager.instance;
  }

  async createSandbox(skillId: string, customConfig?: Partial<SandboxConfig>): Promise<SecureSandbox> {
    if (this.safeMode) {
      throw new Error('System is in safe mode, new sandboxes not allowed');
    }

    const mergedConfig = { ...this.config, ...customConfig };

    this.auditLogger.log({
      timestamp: Date.now(),
      eventType: AuditEventType.SKILL_LOAD,
      skillId,
      details: { config: mergedConfig },
      success: true,
      riskLevel: 'low',
      level: 'info',
      message: `Sandbox created for skill ${skillId}`,
    });

    const sandbox = new SecureSandbox(
      skillId,
      mergedConfig,
      this.permissionManager,
      this.resourceMonitor,
      this.isolator,
      this.auditLogger
    );

    this.sandboxes.set(skillId, sandbox);
    return sandbox;
  }

  async executeInSandbox(
    skillId: string,
    code: string,
    context: any = {}
  ): Promise<ExecutionResult> {
    const violations = this.codeScanner.scan(code);
    if (violations.length > 0) {
      this.auditLogger.log({
        timestamp: Date.now(),
        eventType: AuditEventType.SECURITY_VIOLATION,
        skillId,
        details: { violations },
        success: false,
        riskLevel: 'high',
        level: 'error',
        message: `Security violations detected in skill ${skillId}: ${violations.join(', ')}`,
      });

      return {
        success: false,
        error: `Security scan failed: ${violations.join('; ')}`,
        duration: 0,
      };
    }

    let sandbox = this.sandboxes.get(skillId);
    if (!sandbox) {
      sandbox = await this.createSandbox(skillId);
    }

    const timer = this.resourceMonitor.startExecutionTimer(skillId);

    try {
      const result = await sandbox.execute(code, context);
      this.resourceMonitor.cancelExecutionTimer(skillId);
      return result;
    } catch (error) {
      this.resourceMonitor.cancelExecutionTimer(skillId);
      throw error;
    }
  }

  destroySandbox(skillId: string): void {
    const sandbox = this.sandboxes.get(skillId);
    if (sandbox) {
      sandbox.destroy();
      this.sandboxes.delete(skillId);

      this.auditLogger.log({
        timestamp: Date.now(),
        eventType: AuditEventType.SKILL_UNLOAD,
        skillId,
        details: {},
        success: true,
        riskLevel: 'low',
        level: 'info',
        message: `Sandbox destroyed for skill ${skillId}`,
      });
    }
  }

  grantPermission(
    skillId: string,
    permission: PermissionCategory,
    grantedBy: SkillPermissions['grantedBy'] = 'system',
    expiresAt?: number
  ): void {
    this.permissionManager.grantPermission(skillId, permission, grantedBy, expiresAt);
  }

  revokePermission(skillId: string, permission: PermissionCategory): void {
    this.permissionManager.revokePermission(skillId, permission);
  }

  hasPermission(skillId: string, permission: PermissionCategory): boolean {
    return this.permissionManager.hasPermission(skillId, permission);
  }

  enterSafeMode(): void {
    this.safeMode = true;

    for (const skillId of this.sandboxes.keys()) {
      this.destroySandbox(skillId);
    }

    this.auditLogger.log({
      timestamp: Date.now(),
      eventType: AuditEventType.SECURITY_VIOLATION,
      skillId: 'system',
      details: { message: 'System entering safe mode' },
      success: true,
      riskLevel: 'critical',
      level: 'error',
      message: 'System entering safe mode due to security violation',
    });

    this.emit('safe-mode:entered');
  }

  exitSafeMode(): void {
    this.safeMode = false;
    this.emit('safe-mode:exited');
  }

  isInSafeMode(): boolean {
    return this.safeMode;
  }

  getActiveSandboxCount(): number {
    return this.sandboxes.size;
  }

  getSecurityStatus(): any {
    return {
      safeMode: this.safeMode,
      activeSandboxes: this.getActiveSandboxCount(),
      timestamp: Date.now(),
    };
  }
}

// ==================== 导出单例 ====================

export const securityManager = VMSandboxSecurityManager.getInstance();

export default VMSandboxSecurityManager;
