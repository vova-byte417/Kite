/**
 * 示例 05: 完整流程示例
 *
 * 本示例展示从初始化到执行的完整流程：
 * 1. 初始化 SkillManager
 * 2. 发现和注册 Skill
 * 3. 加载 Skill
 * 4. 执行 Skill
 * 5. 获取执行统计
 * 6. 清理资源
 *
 * 这是一个综合示例，展示真实场景的使用方式
 */

import * as path from 'path';
import { SkillManager, SkillExecutionRequest } from '../../skill-system/src';

// Sample Skills 目录
const SAMPLE_SKILLS_DIR = path.resolve(__dirname, '../../sample-skills');

async function main() {
  console.log('='.repeat(70));
  console.log('  示例 05: 完整流程示例');
  console.log('='.repeat(70));
  console.log('');

  // ========================================
  // 1. 初始化 SkillManager
  // ========================================
  console.log('📌 步骤 1: 初始化 SkillManager');
  console.log('-'.repeat(70));

  const manager = new SkillManager({
    scanPaths: [SAMPLE_SKILLS_DIR],
    autoScanOnStartup: false,
    loaderConfig: {
      enableSandbox: true,
      defaultTimeout: 30000,
      defaultMaxRetries: 3
    },
    executorConfig: {
      defaultTimeout: 15000,
      defaultMaxRetries: 2,
      retryStrategy: 'exponential'
    }
  });

  await manager.initialize(false);
  console.log('   ✓ SkillManager 初始化完成');
  console.log('   配置:', JSON.stringify(manager.getConfig(), null, 2));
  console.log('');

  // ========================================
  // 2. 发现 Skill
  // ========================================
  console.log('📌 步骤 2: 发现 Skill');
  console.log('-'.repeat(70));

  const discoveredSkills = await manager.discoverAll();
  console.log('   ✓ 发现', discoveredSkills.length, '个 Skill');
  console.log('');

  discoveredSkills.forEach((skill, i) => {
    console.log(`   ${i + 1}. ${skill.name}`);
    console.log(`       版本: ${skill.version}`);
    console.log(`       描述: ${skill.description}`);
    console.log(`       标签: ${skill.tags.join(', ') || '(无)'}`);
  });
  console.log('');

  // ========================================
  // 3. 手动注册一个额外的 Skill
  // ========================================
  console.log('📌 步骤 3: 手动注册额外 Skill');
  console.log('-'.repeat(70));

  const customSkill = manager.registerSkill({
    name: 'demo-custom-skill',
    version: '1.0.0',
    description: '演示用自定义 Skill',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['demo', 'custom', 'test'],
    config: {
      enabled: true,
      timeout: 10000
    },
    metadata: {
      author: 'Demo User',
      category: 'Demo'
    }
  });

  console.log('   ✓ 注册成功:', customSkill.name);
  console.log('   现在总共有', manager.getAllSkills().length, '个 Skill');
  console.log('');

  // ========================================
  // 4. 按依赖顺序加载
  // ========================================
  console.log('📌 步骤 4: 按依赖顺序加载 Skill');
  console.log('-'.repeat(70));

  const loadResult = await manager.loadSkillsInDependencyOrder();
  console.log('   ✓ 加载完成!');
  console.log('   成功加载:', loadResult.loadedCount, '个');
  console.log('   全部成功:', loadResult.success ? '是 ✅' : '否 ❌');
  console.log('   已加载 Skill 数量:', manager.getLoadedCount());
  console.log('');

  // ========================================
  // 5. 查看系统概览
  // ========================================
  console.log('📌 步骤 5: 查看系统概览');
  console.log('-'.repeat(70));

  const overview = manager.getOverview();
  console.log('   系统概览:');
  console.log('     总 Skill 数:', overview.totalSkills);
  console.log('     已加载:', overview.loadedSkills);
  console.log('     就绪:', overview.readySkills);
  console.log('     错误:', overview.errorSkills);
  console.log('     总执行次数:', overview.totalExecutions);
  console.log('     成功率:', Math.round(overview.successRate * 100) + '%');
  console.log('');

  // ========================================
  // 6. 执行单个 Skill
  // ========================================
  console.log('📌 步骤 6: 执行 Skill');
  console.log('-'.repeat(70));

  const loadedSkills = manager.getLoadedSkills();
  if (loadedSkills.length > 0) {
    const targetSkill = loadedSkills[0];
    console.log('   准备执行:', targetSkill.name);

    const request: SkillExecutionRequest = {
      skillId: targetSkill.id,
      input: {
        operation: 'string',
        subOperation: 'capitalize',
        value: 'hello, skill system!'
      },
      context: {
        userId: 'demo-user-123',
        sessionId: 'demo-session-456',
        requestId: 'req-789'
      },
      options: {
        timeout: 10000,
        maxRetries: 2
      }
    };

    console.log('   开始执行...');
    const result = await manager.executeSkill(request);

    console.log('');
    console.log('   执行结果:');
    console.log('     成功:', result.success ? '✅' : '❌');
    console.log('     Skill ID:', result.skillId);
    console.log('     版本:', result.version);
    console.log('     状态:', result.status);
    console.log('     耗时:', result.duration, 'ms');
    console.log('     重试次数:', result.retries);

    if (result.success && result.result) {
      console.log('     输出结果:', JSON.stringify(result.result, null, 6).replace(/\n/g, '\n     '));
    }

    if (!result.success && result.error) {
      console.log('     错误信息:', result.error);
    }
  }
  console.log('');

  // ========================================
  // 7. 获取执行统计
  // ========================================
  console.log('📌 步骤 7: 获取执行统计');
  console.log('-'.repeat(70));

  const globalStats = manager.getFullGlobalStats();
  console.log('   全局统计:');
  console.log('     总执行次数:', globalStats.totalExecutions);
  console.log('     成功次数:', globalStats.successfulExecutions);
  console.log('     失败次数:', globalStats.failedExecutions);
  console.log('     超时次数:', globalStats.timedOutExecutions);
  console.log('     总重试次数:', globalStats.totalRetries);
  console.log('     平均执行时间:', globalStats.avgExecutionTime, 'ms');
  console.log('     成功率:', Math.round(globalStats.successRate * 100) + '%');
  console.log('');

  // ========================================
  // 8. 搜索和匹配
  // ========================================
  console.log('📌 步骤 8: Skill 搜索和匹配');
  console.log('-'.repeat(70));

  // 搜索
  const searchResults = manager.searchSkills({
    query: 'utility',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  console.log('   搜索 "utility" 找到', searchResults.length, '个 Skill');
  searchResults.forEach(s => console.log('     -', s.name));
  console.log('');

  // 任务匹配
  const taskDescription = '我需要处理字符串数据，进行格式化和验证';
  const matches = manager.matchSkillsForTask(taskDescription, ['string', 'utility']);
  console.log('   任务描述:', taskDescription);
  console.log('   找到', matches.length, '个匹配的 Skill');
  matches.slice(0, 3).forEach(m => {
    console.log(`     - ${m.skill.name} (匹配度: ${Math.round(m.score * 100)}%)`);
  });
  console.log('');

  // ========================================
  // 9. 批量并行执行
  // ========================================
  console.log('📌 步骤 9: 批量并行执行');
  console.log('-'.repeat(70));

  if (loadedSkills.length >= 2) {
    const batchRequests: SkillExecutionRequest[] = [
      {
        skillId: loadedSkills[0].id,
        input: { operation: 'string', subOperation: 'uppercase', value: 'hello world' }
      },
      {
        skillId: loadedSkills[0].id,
        input: { operation: 'string', subOperation: 'reverse', value: 'abcdef' }
      }
    ];

    console.log('   并行执行', batchRequests.length, '个请求...');
    const batchStart = Date.now();
    const batchResults = await manager.executeSkillsParallel(batchRequests, 2);
    const batchTime = Date.now() - batchStart;

    console.log('   批量执行完成! 耗时:', batchTime, 'ms');
    console.log('   成功:', batchResults.filter(r => r.success).length, '/', batchResults.length);
    batchResults.forEach((r, i) => {
      console.log(`     ${i + 1}. ${r.success ? '✅' : '❌'}`, r.skillId, '- 耗时', r.duration, 'ms');
    });
  }
  console.log('');

  // ========================================
  // 10. 清理和总结
  // ========================================
  console.log('📌 步骤 10: 清理资源');
  console.log('-'.repeat(70));

  await manager.unloadAllSkills();
  console.log('   ✓ 已卸载所有 Skill');

  await manager.destroy();
  console.log('   ✓ SkillManager 已销毁');
  console.log('');

  console.log('='.repeat(70));
  console.log('  ✅ 完整流程示例运行完成！');
  console.log('='.repeat(70));
  console.log('');
  console.log('📚 总结:');
  console.log('   本示例展示了 Skill 系统的完整使用流程：');
  console.log('   1. SkillManager 初始化和配置');
  console.log('   2. Skill 自动发现和手动注册');
  console.log('   3. 按依赖顺序加载 Skill');
  console.log('   4. 单个 Skill 执行');
  console.log('   5. 批量并行执行');
  console.log('   6. 执行统计和监控');
  console.log('   7. Skill 搜索和任务匹配');
  console.log('   8. 资源清理');
  console.log('');
  console.log('💡 提示:');
  console.log('   - 查看其他示例了解更多功能');
  console.log('   - 查看 sample-skills 了解如何编写 Skill');
  console.log('   - 查看 skill-system/src/types.ts 了解完整的 API');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 示例运行失败:', error);
  process.exit(1);
});
