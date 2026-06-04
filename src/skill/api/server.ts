/**
 * Skill API - HTTP 服务器
 *
 * 提供 RESTful API 接口的 HTTP 服务器实现
 * 使用纯 TypeScript 实现，不依赖具体的 HTTP 框架
 *
 * @author vova
 * @version 1.0.0
 */

import { SkillManager } from '../index';
import { ApiHandlers } from './handlers';

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

/**
 * HTTP 请求对象
 */
export interface HttpRequest {
  /** 请求方法 */
  method: HttpMethod;
  /** 请求路径 */
  path: string;
  /** 查询参数 */
  query: Record<string, string>;
  /** 请求头 */
  headers: Record<string, string>;
  /** 请求体（JSON） */
  body?: any;
  /** 请求 ID */
  requestId: string;
}

/**
 * HTTP 响应对象
 */
export interface HttpResponse {
  /** 状态码 */
  statusCode: number;
  /** 响应头 */
  headers: Record<string, string>;
  /** 响应体 */
  body: string;
}

/**
 * 路由处理函数
 */
export type RouteHandler = (
  req: HttpRequest,
  params: Record<string, string>
) => Promise<HttpResponse>;

/**
 * 路由定义
 */
export interface Route {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 路径模式（支持 :param 占位符） */
  pathPattern: string;
  /** 处理函数 */
  handler: RouteHandler;
  /** 描述 */
  description: string;
  /** 所属标签 */
  tag: string;
}

/**
 * API 服务器类
 */
export class SkillApiServer {
  private manager: SkillManager;
  private handlers: ApiHandlers;
  private routes: Route[] = [];
  private basePath: string;

  constructor(skillManager: SkillManager, basePath: string = '/api/v1') {
    this.manager = skillManager;
    this.handlers = new ApiHandlers(skillManager);
    this.basePath = basePath;

    // 注册所有路由
    this.registerRoutes();
  }

  /**
   * 创建 JSON 响应
   */
  private jsonResponse(statusCode: number, data: any): HttpResponse {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(data, null, 2),
    };
  }

  /**
   * 创建成功响应
   */
  private ok(data: any): HttpResponse {
    return this.jsonResponse(200, data);
  }

  /**
   * 创建创建成功响应
   */
  private created(data: any): HttpResponse {
    return this.jsonResponse(201, data);
  }

  /**
   * 创建无内容响应
   */
  private noContent(): HttpResponse {
    return this.jsonResponse(204, {});
  }

  /**
   * 解析路径参数
   */
  private matchPath(pattern: string, actualPath: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const actualParts = actualPath.split('/');

    if (patternParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const actualPart = actualParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = actualPart;
      } else if (patternPart !== actualPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * 注册路由
   */
  private registerRoutes(): void {
    // ==================== Skill 管理接口 ====================

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/skills`,
      tag: 'Skill 管理',
      description: '获取 Skill 列表，支持搜索、过滤、分页',
      handler: async (req) => {
        const query = {
          ...req.query,
          offset: req.query.offset ? parseInt(req.query.offset) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          loadedOnly: req.query.loadedOnly === 'true',
          includeStats: req.query.includeStats === 'true',
        };
        const result = await this.handlers.listSkills(query as any);
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills`,
      tag: 'Skill 管理',
      description: '注册新 Skill',
      handler: async (req) => {
        const result = await this.handlers.registerSkill(req.body);
        if (!result.success) {
          return this.jsonResponse(result.error?.code === 'VALIDATION_ERROR' ? 400 : 500, result);
        }
        return this.created(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/skills/:skillId`,
      tag: 'Skill 管理',
      description: '获取单个 Skill 详情',
      handler: async (req, params) => {
        const result = await this.handlers.getSkill(params.skillId);
        if (!result.success) {
          return this.jsonResponse(404, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'PATCH',
      pathPattern: `${this.basePath}/skills/:skillId`,
      tag: 'Skill 管理',
      description: '更新 Skill 信息',
      handler: async (req, params) => {
        const result = await this.handlers.updateSkill(params.skillId, req.body);
        if (!result.success && (result as any).error?.code === 'SKILL_NOT_FOUND') {
          return this.jsonResponse(404, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'DELETE',
      pathPattern: `${this.basePath}/skills/:skillId`,
      tag: 'Skill 管理',
      description: '注销 Skill',
      handler: async (req, params) => {
        const result = await this.handlers.unregisterSkill(params.skillId);
        if (!result.success) {
          return this.jsonResponse(404, result);
        }
        return this.noContent();
      },
    });

    // ==================== Skill 执行接口 ====================

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/:skillId/execute`,
      tag: 'Skill 执行',
      description: '执行单个 Skill',
      handler: async (req, params) => {
        const result = await this.handlers.executeSkill(params.skillId, req.body);
        if (!result.success) {
          const errorCode = (result as any).error?.code;
          const statusMap: Record<string, number> = {
            SKILL_NOT_FOUND: 404,
            SKILL_NOT_LOADED: 400,
            DEPENDENCY_MISSING: 400,
            SAFE_MODE_ACTIVE: 403,
          };
          return this.jsonResponse(statusMap[errorCode] || 500, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/execute/batch`,
      tag: 'Skill 执行',
      description: '批量执行 Skill（支持并行、串行、依赖驱动三种模式）',
      handler: async (req) => {
        const result = await this.handlers.batchExecute(req.body);
        if (!result.success) {
          return this.jsonResponse(500, result);
        }
        return this.ok(result);
      },
    });

    // ==================== Skill 加载/卸载接口 ====================

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/:skillId/load`,
      tag: 'Skill 加载',
      description: '加载 Skill',
      handler: async (req, params) => {
        const result = await this.handlers.loadSkill(params.skillId);
        if (!result.success) {
          return this.jsonResponse(400, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/:skillId/unload`,
      tag: 'Skill 加载',
      description: '卸载 Skill',
      handler: async (req, params) => {
        const result = await this.handlers.unloadSkill(params.skillId);
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/:skillId/reload`,
      tag: 'Skill 加载',
      description: '重新加载 Skill',
      handler: async (req, params) => {
        const result = await this.handlers.reloadSkill(params.skillId);
        if (!result.success) {
          return this.jsonResponse(400, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/load/batch`,
      tag: 'Skill 加载',
      description: '按依赖顺序批量加载 Skill',
      handler: async (req) => {
        const result = await this.handlers.loadSkillsInOrder(req.body?.skillIds);
        return this.ok(result);
      },
    });

    // ==================== Skill 匹配接口 ====================

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/match`,
      tag: 'Skill 匹配',
      description: '根据任务描述匹配最合适的 Skill',
      handler: async (req) => {
        const result = await this.handlers.matchSkills(req.body);
        return this.ok(result);
      },
    });

    // ==================== 依赖管理接口 ====================

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/skills/:skillId/dependencies`,
      tag: '依赖管理',
      description: '检查 Skill 的依赖状态',
      handler: async (req, params) => {
        const result = await this.handlers.checkDependencies(params.skillId);
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/dependencies/check-all`,
      tag: '依赖管理',
      description: '检查所有 Skill 的依赖状态',
      handler: async () => {
        const result = await this.handlers.checkAllDependencies();
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/dependencies/cycles`,
      tag: '依赖管理',
      description: '检测系统中的循环依赖',
      handler: async (req) => {
        const skillIds = req.query.skillIds?.split(',');
        const result = await this.handlers.detectCycles(skillIds);
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/dependencies/topology`,
      tag: '依赖管理',
      description: '计算 Skill 的拓扑排序（执行顺序）',
      handler: async (req) => {
        const skillIds = req.query.skillIds?.split(',');
        const result = await this.handlers.computeTopology(skillIds);
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/skills/:skillId/dependencies/tree`,
      tag: '依赖管理',
      description: '获取 Skill 的依赖树结构',
      handler: async (req, params) => {
        const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth) : undefined;
        const result = await this.handlers.getDependencyTree(params.skillId, maxDepth);
        if (!result.success) {
          return this.jsonResponse(404, result);
        }
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/skills/:skillId/dependencies`,
      tag: '依赖管理',
      description: '为 Skill 添加依赖关系',
      handler: async (req, params) => {
        const result = await this.handlers.addDependency(params.skillId, req.body);
        if (!result.success) {
          return this.jsonResponse(400, result);
        }
        return this.created(result);
      },
    });

    this.routes.push({
      method: 'DELETE',
      pathPattern: `${this.basePath}/skills/:skillId/dependencies/:dependencyId`,
      tag: '依赖管理',
      description: '移除 Skill 的依赖关系',
      handler: async (req, params) => {
        const result = await this.handlers.removeDependency(params.skillId, params.dependencyId);
        return this.ok(result);
      },
    });

    // ==================== 系统管理接口 ====================

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/system/overview`,
      tag: '系统管理',
      description: '获取系统概览信息',
      handler: async () => {
        const result = await this.handlers.getSystemOverview();
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/system/config`,
      tag: '系统管理',
      description: '获取系统配置',
      handler: async () => {
        const result = await this.handlers.getSystemConfig();
        return this.ok(result);
      },
    });

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/system/action`,
      tag: '系统管理',
      description: '执行系统操作（初始化、刷新、安全模式等）',
      handler: async (req) => {
        const result = await this.handlers.executeSystemAction(req.body.action);
        if (!result.success) {
          return this.jsonResponse(400, result);
        }
        return this.ok(result);
      },
    });

    // ==================== 批量操作接口 ====================

    this.routes.push({
      method: 'POST',
      pathPattern: `${this.basePath}/bulk`,
      tag: '批量操作',
      description: '执行批量操作（注册、加载、卸载、重载、注销）',
      handler: async (req) => {
        const result = await this.handlers.bulkOperation(req.body);
        return this.ok(result);
      },
    });

    // ==================== OpenAPI 文档接口 ====================

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/openapi.json`,
      tag: '文档',
      description: '获取 OpenAPI 3.0 规范文档',
      handler: async () => {
        const openapi = this.generateOpenApiSpec();
        return this.ok(openapi);
      },
    });

    this.routes.push({
      method: 'GET',
      pathPattern: `${this.basePath}/health`,
      tag: '系统管理',
      description: '健康检查接口',
      handler: async () => {
        const overview = await this.handlers.getSystemOverview();
        return this.ok({
          status: 'ok',
          timestamp: Date.now(),
          version: '2.1.0',
          ...overview.data,
        });
      },
    });
  }

  /**
   * 处理 HTTP 请求
   */
  async handleRequest(req: HttpRequest): Promise<HttpResponse> {
    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
      return this.jsonResponse(200, {});
    }

    // 移除 basePath 前缀进行匹配
    const pathToMatch = req.path;

    // 查找匹配的路由
    for (const route of this.routes) {
      if (route.method !== req.method) {
        continue;
      }

      const params = this.matchPath(route.pathPattern, pathToMatch);
      if (params) {
        try {
          return await route.handler(req, params);
        } catch (err: any) {
          return this.jsonResponse(500, {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: err.message,
            },
            timestamp: Date.now(),
          });
        }
      }
    }

    // 未找到路由
    return this.jsonResponse(404, {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.path}`,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * 获取所有已注册的路由
   */
  getRoutes(): Route[] {
    return [...this.routes];
  }

  /**
   * 生成 OpenAPI 3.0 规范文档
   */
  generateOpenApiSpec(): any {
    // 按标签分组路由
    const tags = Array.from(new Set(this.routes.map((r) => r.tag)));

    // 构建 paths 对象
    const paths: any = {};

    for (const route of this.routes) {
      // 将路径模式转换为 OpenAPI 格式
      const openapiPath = route.pathPattern.replace(/:([^/]+)/g, '{$1}');

      if (!paths[openapiPath]) {
        paths[openapiPath] = {};
      }

      const method = route.method.toLowerCase();
      paths[openapiPath][method] = {
        tags: [route.tag],
        summary: route.description,
        responses: {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' },
                    timestamp: { type: 'number' },
                    requestId: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: '请求错误' },
          '404': { description: '资源不存在' },
          '500': { description: '服务器错误' },
        },
      };
    }

    return {
      openapi: '3.0.3',
      info: {
        title: 'Kite Skill System API',
        description: 'Skill 系统 RESTful API 接口 - 提供完整的 Skill 注册、加载、执行、依赖管理能力',
        version: '2.1.0',
        contact: {
          name: 'vova',
        },
      },
      servers: [
        {
          url: this.basePath,
          description: 'Skill API Server',
        },
      ],
      tags: tags.map((tag) => ({ name: tag })),
      paths,
      components: {
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'object' },
                },
              },
              timestamp: { type: 'number' },
              requestId: { type: 'string' },
            },
          },
        },
      },
    };
  }

  /**
   * 获取基础路径
   */
  getBasePath(): string {
    return this.basePath;
  }
}

export default SkillApiServer;
