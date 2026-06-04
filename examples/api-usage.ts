/**
 * Skill System API 使用示例
 *
 * 演示如何使用 Skill API 进行 Skill 的注册、加载、执行、依赖管理等操作
 *
 * @author vova
 * @version 2.1.0
 */

import { SkillManager, SkillApiServer, ApiErrorCode } from '../src';

// ============================================================================
// 示例 1: 初始化 API 服务器
// ============================================================================

async function example1_initApiServer() {
  console.log('=== 示例 1: 初始化 API 服务器 ===');

  // 1. 创建 SkillManager 实例
  const manager = new SkillManager({
    scanPaths: ['./examples/skills'],
    autoScanOnStartup: false,
  });

  // 2. 创建 API 服务器
  const apiServer = new SkillApiServer(manager, '/api/v1');

  // 3. 获取所有已注册的路由
  const routes = apiServer.getRoutes();
  console.log(`已注册 ${routes.length} 个 API 端点:`);
  routes.forEach((route) => {
    console.log(`  ${route.method.padEnd(7)} ${route.pathPattern.padEnd(50)} [${route.tag}]`);
  });

  // 4. 获取 OpenAPI 规范
  const openapi = apiServer.generateOpenApiSpec();
  console.log(`\nOpenAPI 版本: ${openapi.openapi}`);
  console.log(`API 标题: ${openapi.info.title}`);

  return { manager, apiServer };
}

// ============================================================================
// 示例 2: 使用处理器直接调用 API（无需 HTTP 服务器）
// ============================================================================

async function example2_useHandlers() {
  console.log('\n=== 示例 2: 使用处理器直接调用 API ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers']; // 内部访问用于演示

  // 1. 注册 Skill
  const registerResult = await handlers.registerSkill({
    name: 'demo-skill',
    version: '1.0.0',
    description: '演示用 Skill',
    entryPoint: './examples/skills/demo/index.js',
    tags: ['demo', 'test'],
    dependencies: [],
  });

  console.log('注册 Skill:', {
    success: registerResult.success,
    skillId: (registerResult.data as any)?.skillId,
  });

  // 2. 获取 Skill 列表
  const listResult = await handlers.listSkills();
  console.log(`Skill 列表总数: ${(listResult.data as any).total}`);

  // 3. 获取系统概览
  const overview = await handlers.getSystemOverview();
  console.log('系统概览:', {
    totalSkills: (overview.data as any).totalSkills,
    successRate: (overview.data as any).successRate,
  });
}

// ============================================================================
// 示例 3: 模拟 HTTP 请求处理
// ============================================================================

async function example3_simulateHttpRequest() {
  console.log('\n=== 示例 3: 模拟 HTTP 请求处理 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);

  // 注册 Skill
  await manager.registerSkill({
    name: 'test-skill',
    entryPoint: './examples/skills/test/index.js',
  });

  // 模拟 HTTP GET /api/v1/skills 请求
  const request = {
    method: 'GET' as const,
    path: '/api/v1/skills',
    query: {
      includeStats: 'true',
      limit: '10',
    },
    headers: {
      'Content-Type': 'application/json',
    },
    requestId: 'demo-request-' + Date.now(),
  };

  const response = await apiServer.handleRequest(request);

  console.log('HTTP 响应状态:', response.statusCode);
  console.log('响应头:', response.headers['Content-Type']);

  const body = JSON.parse(response.body);
  console.log('响应数据:', {
    success: body.success,
    total: body.data?.total,
    count: body.data?.items?.length,
  });
}

// ============================================================================
// 示例 4: 完整的依赖管理流程
// ============================================================================

async function example4_dependencyManagement() {
  console.log('\n=== 示例 4: 完整的依赖管理流程 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers'];

  // 1. 注册三个有依赖关系的 Skill
  console.log('1. 注册 Skill...');
  const skills = [
    { name: 'skill-utils', entryPoint: './s1.js', dependencies: [] },
    { name: 'skill-data', entryPoint: './s2.js', dependencies: [{ skillId: 'skill-utils' }] },
    { name: 'skill-report', entryPoint: './s3.js', dependencies: [{ skillId: 'skill-data' }] },
  ];

  for (const skill of skills) {
    await handlers.registerSkill(skill as any);
  }

  // 2. 检测循环依赖
  console.log('2. 检测循环依赖...');
  const cycles = await handlers.detectCycles();
  console.log('  循环依赖数量:', (cycles.data as any).cycles.length);

  // 3. 计算拓扑排序
  console.log('3. 计算拓扑排序...');
  const topology = await handlers.computeTopology();
  if (topology.data) {
    console.log('  执行顺序:', (topology.data as any).order);
    console.log('  可并行层级:');
    (topology.data as any).levels.forEach((level: string[], idx: number) => {
      console.log(`    Level ${idx}:`, level);
    });
  }

  // 4. 获取依赖树
  console.log('4. 获取依赖树...');
  const treeResult = await handlers.getDependencyTree('skill-report');
  if (treeResult.data) {
    console.log('  依赖树 ASCII 表示:');
    console.log((treeResult.data as any).asciiTree.split('\n').map((line: string) => `    ${line}`).join('\n'));
  }

  // 5. 检查所有依赖
  console.log('5. 检查所有依赖...');
  const checkResult = await handlers.checkAllDependencies();
  if (checkResult.data) {
    console.log('  所有依赖满足:', (checkResult.data as any).allSatisfied);
    console.log('  有问题的 Skill:', (checkResult.data as any).withIssues);
  }
}

// ============================================================================
// 示例 5: 批量操作
// ============================================================================

async function example5_bulkOperations() {
  console.log('\n=== 示例 5: 批量操作 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers'];

  // 1. 批量注册 Skill
  console.log('1. 批量注册 Skill...');
  const bulkRegister = await handlers.bulkOperation({
    operation: 'register',
    skills: [
      { name: 'bulk-skill-1', entryPoint: './b1.js', tags: ['bulk'] },
      { name: 'bulk-skill-2', entryPoint: './b2.js', tags: ['bulk'] },
      { name: 'bulk-skill-3', entryPoint: './b3.js', tags: ['bulk'] },
    ],
  });

  if (bulkRegister.data) {
    console.log('  批量注册结果:', {
      total: (bulkRegister.data as any).total,
      success: (bulkRegister.data as any).success,
      failed: (bulkRegister.data as any).failed,
    });
  }

  // 2. 按标签搜索
  console.log('2. 按标签搜索 Skill...');
  const searchResult = await handlers.listSkills({});
  const bulkSkills = (searchResult.data as any).items.filter((s: any) =>
    s.tags.includes('bulk')
  );
  console.log('  找到批量 Skill 数量:', bulkSkills.length);
}

// ============================================================================
// 示例 6: 智能匹配
// ============================================================================

async function example6_smartMatching() {
  console.log('\n=== 示例 6: 智能匹配 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers'];

  // 注册几个不同类型的 Skill
  const testSkills = [
    { name: 'image-processor', entryPoint: './img.js', tags: ['image', 'processing', 'vision'] },
    { name: 'data-analysis', entryPoint: './data.js', tags: ['data', 'analysis', 'statistics'] },
    { name: 'nlp-processor', entryPoint: './nlp.js', tags: ['nlp', 'text', 'language'] },
    { name: 'report-generator', entryPoint: './report.js', tags: ['report', 'export', 'document'] },
  ];

  for (const skill of testSkills) {
    await handlers.registerSkill(skill as any);
  }

  // 测试不同的任务描述匹配
  const testQueries = [
    '我需要分析用户的购买行为数据并统计销售额',
    '处理一批图片，调整大小并添加水印',
    '分析客户反馈文本，提取关键词和情感倾向',
  ];

  for (const query of testQueries) {
    console.log(`\n  任务描述: ${query}`);
    const matchResult = await handlers.matchSkills({
      taskDescription: query,
      limit: 2,
      minScore: 0.3,
    });

    if (matchResult.data) {
      (matchResult.data as any).results.forEach((r: any, idx: number) => {
        console.log(`    ${idx + 1}. ${r.skill.name} (${(r.score * 100).toFixed(0)}%)`);
      });
    }
  }
}

// ============================================================================
// 示例 7: 错误处理
// ============================================================================

async function example7_errorHandling() {
  console.log('\n=== 示例 7: 错误处理 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers'];

  // 测试场景 1: 查询不存在的 Skill
  console.log('1. 查询不存在的 Skill...');
  const notFound = await handlers.getSkill('non-existent-skill');
  console.log('  success:', notFound.success);
  console.log('  errorCode:', (notFound as any).error?.code);
  console.log('  message:', (notFound as any).error?.message);

  // 测试场景 2: 参数验证失败
  console.log('\n2. 参数验证失败（缺少必填字段）...');
  const validationFail = await handlers.registerSkill({
    name: '', // 空名称
    entryPoint: '', // 空入口
  });
  console.log('  success:', validationFail.success);
  console.log('  errorCode:', (validationFail as any).error?.code);

  // 测试场景 3: 添加会导致循环的依赖
  console.log('\n3. 添加会导致循环的依赖...');

  // 先注册两个 Skill
  await handlers.registerSkill({ name: 'cycle-a', entryPoint: './a.js' });
  await handlers.registerSkill({ name: 'cycle-b', entryPoint: './b.js' });

  // A 依赖 B
  await handlers.addDependency('cycle-a', { dependencyId: 'cycle-b' });

  // B 依赖 A - 这应该导致循环检测失败
  const cycleResult = await handlers.addDependency('cycle-b', { dependencyId: 'cycle-a' });
  console.log('  success:', cycleResult.success);
  console.log('  errorCode:', (cycleResult as any).error?.code);
}

// ============================================================================
// 示例 8: 系统管理
// ============================================================================

async function example8_systemManagement() {
  console.log('\n=== 示例 8: 系统管理 ===');

  const manager = new SkillManager({ autoScanOnStartup: false });
  const apiServer = new SkillApiServer(manager);
  const handlers = apiServer['handlers'];

  // 1. 获取系统配置
  console.log('1. 获取系统配置...');
  const config = await handlers.getSystemConfig();
  if (config.data) {
    console.log('  扫描路径:', (config.data as any).config.scanPaths);
    console.log('  默认超时:', (config.data as any).config.defaultTimeout, 'ms');
    console.log('  沙箱模式:', (config.data as any).config.enableSandbox);
    console.log('  严格依赖模式:', (config.data as any).config.strictDependencyMode);
  }

  // 2. 执行系统操作
  console.log('\n2. 执行系统操作...');

  // 初始化
  await handlers.executeSystemAction('initialize');
  console.log('  系统已初始化');

  // 刷新发现
  await handlers.executeSystemAction('refresh');
  console.log('  Skill 发现已刷新');
}

// ============================================================================
// 运行所有示例
// ============================================================================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Skill System API 使用示例 (v2.1.0)                   ║');
  console.log('║                   作者: vova                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    await example1_initApiServer();
    await example2_useHandlers();
    await example3_simulateHttpRequest();
    await example4_dependencyManagement();
    await example5_bulkOperations();
    await example6_smartMatching();
    await example7_errorHandling();
    await example8_systemManagement();

    console.log('\n✅ 所有示例运行完成！');
    console.log('\n📚 更多信息:');
    console.log('  - API 文档: API.md');
    console.log('  - 代码实现: src/api/');
    console.log('  - 类型定义: src/api/types.ts');

  } catch (error) {
    console.error('❌ 示例运行出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行所有示例
if (require.main === module) {
  runAllExamples();
}

export {
  example1_initApiServer,
  example2_useHandlers,
  example3_simulateHttpRequest,
  example4_dependencyManagement,
  example5_bulkOperations,
  example6_smartMatching,
  example7_errorHandling,
  example8_systemManagement,
};
