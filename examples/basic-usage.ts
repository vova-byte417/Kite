/**
 * Skill 系统基础使用示例
 *
 * 本示例演示：
 * 1. 初始化 SkillManager
 * 2. 发现和注册 Skill
 * 3. 加载 Skill
 * 4. 执行 Skill
 * 5. 搜索和匹配 Skill
 * 6. 权限管理
 */

import * as path from 'path';
import { SkillManager, PermissionCategory } from '../src';

// 示例 Skill 目录
const SKILLS_DIR = path.resolve(__dirname, '../tests/test-skills');

async function main() {
  console.log('='.repeat(60));
  console.log('  Kite AI Skill 系统 - 使用示例');
  console.log('='.repeat(60));
  console.log('');

  // ========================================
  // 示例 1: 初始化 SkillManager
  // ========================================
  console.log('📌 示例 1: 初始化 SkillManager');
  console.log('-'.repeat(60));

  const manager = new SkillManager({
    scanPaths: [SKILLS_DIR],
    autoScanOnStartup: false,
    loaderConfig: {
      enableSandbox: true,
      defaultTimeout: 30000,
      defaultMaxRetries: 3,
      autoRunOnLoad: true,
    },
  });

  await manager.initialize(false);
  console.log('   ✓ SkillManager 初始化完成');
  console.log('   配置信息:', manager.getConfig());
  console.log('');

  // ========================================
  // 示例 2: 发现 Skill
  // ========================================
  console.log('📌 示例 2: 自动发现 Skill');
  console.log('-'.repeat(60));

  const skills = await manager.discoverAll();
  console.log('   发现 %d 个 Skill:', skills.length);
  skills.forEach((skill) => {
    console.log('   - %s (ID: %s)', skill.name, skill.id);
    console.log('     版本: %s, 状态: %s', skill.version, skill.status);
    console.log('     标签: %s', skill.tags.join(', ') || '(无)');
  });
  console.log('');

  // ========================================
  // 示例 3: 手动注册 Skill
  // ========================================
  console.log('📌 示例 3: 手动注册 Skill');
  console.log('-'.repeat(60));

  const customSkill = manager.registerSkill({
    name: '自定义 Skill',
    description: '通过 API 手动注册的 Skill',
    version: '1.0.0',
    entryPoint: path.join(SKILLS_DIR, 'basic-skill.ts'),
    tags: ['custom', 'manual', 'example'],
    metadata: {
      author: '示例作者',
      category: '示例',
    },
    config: {
      enabled: true,
      timeout: 10000,
      maxRetries: 2,
      concurrency: 1,
    },
  });

  console.log('   注册成功: %s', customSkill.name);
  console.log('   Skill ID: %s', customSkill.id);
  console.log('');

  // ========================================
  // 示例 4: 加载所有 Skill
  // ========================================
  console.log('📌 示例 4: 加载所有 Skill');
  console.log('-'.repeat(60));

  const loadResults = await manager.loadAllSkills();
  const successCount = loadResults.filter((r) => r.success).length;
  const failCount = loadResults.filter((r) => !r.success).length;

  console.log('   加载完成: %d 成功, %d 失败', successCount, failCount);
  console.log('   已加载的 Skill ID:', manager.getLoadedSkillIds());
  console.log('');

  // ========================================
  // 示例 5: 执行单个 Skill
  // ========================================
  console.log('📌 示例 5: 执行单个 Skill');
  console.log('-'.repeat(60));

  const basicSkill = manager.findSkillByName('basic-skill');
  if (basicSkill) {
    console.log('   执行 Skill: %s', basicSkill.name);

    const result = await manager.executeSkill({
      skillId: basicSkill.id,
      input: {
        action: 'greet',
        message: 'Hello from Skill System!',
        timestamp: new Date().toISOString(),
      },
      context: {
        userId: 'user-123',
        sessionId: 'session-456',
      },
    });

    console.log('   执行状态: %s', result.success ? '✅ 成功' : '❌ 失败');
    console.log('   执行耗时: %d ms', result.duration);

    if (result.success) {
      console.log('   返回结果:');
      console.log('     - 消息: %s', result.result.message);
      console.log('     - 输入: %j', result.result.inputReceived);
    } else {
      console.log('   错误信息: %s', result.error);
    }
  }
  console.log('');

  // ========================================
  // 示例 6: 带输入验证的 Skill 执行
  // ========================================
  console.log('📌 示例 6: 带输入验证的 Skill 执行');
  console.log('-'.repeat(60));

  const validationSkill = manager.findSkillByName('validation-skill');
  if (validationSkill) {
    console.log('   执行 Skill: %s', validationSkill.name);

    // 有效输入
    console.log('   --- 有效输入测试 ---');
    const validResult = await manager.executeSkill({
      skillId: validationSkill.id,
      input: { a: 15, b: 25 },
    });
    console.log('   有效输入结果: %s', validResult.success ? '✅ 成功' : '❌ 失败');
    if (validResult.success) {
      console.log('   计算结果: 15 + 25 = %d', validResult.result.result);
    }

    // 无效输入
    console.log('   --- 无效输入测试 ---');
    const invalidResult = await manager.executeSkill({
      skillId: validationSkill.id,
      input: { a: 'not a number', b: 25 },
    });
    console.log('   无效输入结果: %s', !invalidResult.success ? '✅ 正确拒绝' : '❌ 错误接受');
    console.log('   错误信息: %s', invalidResult.error);
  }
  console.log('');

  // ========================================
  // 示例 7: 批量并行执行
  // ========================================
  console.log('📌 示例 7: 批量并行执行');
  console.log('-'.repeat(60));

  const loadedIds = manager.getLoadedSkillIds().slice(0, 3);
  console.log('   并行执行 %d 个 Skill...', loadedIds.length);

  const batchStart = Date.now();
  const batchResults = await manager.executeSkillsParallel(
    loadedIds.map((id) => ({
      skillId: id,
      input: { batch: true, executionTime: Date.now() },
    }))
  );
  const batchTime = Date.now() - batchStart;

  const batchSuccess = batchResults.filter((r) => r.success).length;
  console.log('   批量执行完成: %d/%d 成功', batchSuccess, batchResults.length);
  console.log('   总耗时: %d ms', batchTime);
  console.log('');

  // ========================================
  // 示例 8: 搜索 Skill
  // ========================================
  console.log('📌 示例 8: 搜索 Skill');
  console.log('-'.repeat(60));

  // 按关键词搜索
  const searchResults = manager.searchSkills({
    query: 'skill',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  console.log('   关键词 "skill" 搜索结果: %d 个', searchResults.length);
  searchResults.forEach((s) => console.log('     - %s', s.name));

  // 按标签搜索
  const tagResults = manager.searchSkills({
    tags: ['example', 'test'],
  });
  console.log('   标签搜索结果: %d 个', tagResults.length);

  // 按分类搜索
  const categoryResults = manager.searchSkills({
    category: '测试',
  });
  console.log('   分类搜索结果: %d 个', categoryResults.length);
  console.log('');

  // ========================================
  // 示例 9: 任务匹配
  // ========================================
  console.log('📌 示例 9: 为任务匹配 Skill');
  console.log('-'.repeat(60));

  const taskDescription = '我需要对用户输入进行验证和计算，确保数据格式正确';
  const requiredTags = ['validation'];

  console.log('   任务描述: %s', taskDescription);
  console.log('   需求标签: %s', requiredTags.join(', '));

  const matches = manager.matchSkillsForTask(taskDescription, requiredTags);

  console.log('   找到 %d 个匹配的 Skill:', matches.length);
  matches.forEach((match, i) => {
    console.log('   %d. %s', i + 1, match.skill.name);
    console.log('      匹配度: %d%%', Math.round(match.score * 100));
    console.log('      匹配字段: %s', match.matchedFields.join(', '));
  });
  console.log('');

  // ========================================
  // 示例 10: 权限管理
  // ========================================
  console.log('📌 示例 10: 权限管理');
  console.log('-'.repeat(60));

  if (validationSkill) {
    // 授予权限
    manager.grantPermission(validationSkill.id, PermissionCategory.NETWORK_HTTP);
    console.log('   已授予 NETWORK_HTTP 权限');

    // 检查权限
    const hasPermission = manager.hasPermission(validationSkill.id, PermissionCategory.NETWORK_HTTP);
    console.log('   权限检查: %s', hasPermission ? '✅ 有权限' : '❌ 无权限');

    // 撤销权限
    manager.revokePermission(validationSkill.id, PermissionCategory.NETWORK_HTTP);
    console.log('   已撤销 NETWORK_HTTP 权限');

    const hasPermissionAfter = manager.hasPermission(validationSkill.id, PermissionCategory.NETWORK_HTTP);
    console.log('   撤销后权限检查: %s', !hasPermissionAfter ? '✅ 已撤销' : '❌ 仍有权限');
  }
  console.log('');

  // ========================================
  // 示例 11: 系统状态
  // ========================================
  console.log('📌 示例 11: 系统状态和统计');
  console.log('-'.repeat(60));

  const overview = manager.getOverview();
  console.log('   系统概览:');
  console.log('     - 总 Skill 数: %d', overview.totalSkills);
  console.log('     - 已加载: %d', overview.loadedSkills);
  console.log('     - 就绪状态: %d', overview.readySkills);
  console.log('     - 错误状态: %d', overview.errorSkills);
  console.log('     - 总执行次数: %d', overview.totalExecutions);
  console.log('     - 成功率: %d%%', Math.round(overview.successRate * 100));

  const securityStatus = manager.getSecurityStatus();
  console.log('   安全状态:');
  console.log('     - 安全模式: %s', securityStatus.safeMode ? '是' : '否');
  console.log('     - 活动沙箱: %d', securityStatus.activeSandboxes);
  console.log('');

  // ========================================
  // 示例 12: 卸载和清理
  // ========================================
  console.log('📌 示例 12: 卸载和清理');
  console.log('-'.repeat(60));

  // 卸载单个 Skill
  if (basicSkill) {
    await manager.unloadSkill(basicSkill.id);
    console.log('   已卸载 %s', basicSkill.name);
  }

  // 重新加载
  if (basicSkill) {
    await manager.reloadSkill(basicSkill.id);
    console.log('   已重新加载 %s', basicSkill.name);
  }

  console.log('   当前已加载 Skill 数: %d', manager.getLoadedCount());
  console.log('');

  // ========================================
  // 示例 13: 热重载（可选）
  // ========================================
  console.log('📌 示例 13: 启用热重载');
  console.log('-'.repeat(60));

  // 注意：实际使用时可以通过配置启用
  console.log('   配置项: enableHotReload: true');
  console.log('   配置项: hotReloadInterval: 5000 ms');
  console.log('   启用后，Skill 文件变化时会自动重新加载');
  console.log('');

  // ========================================
  // 清理
  // ========================================
  console.log('🧹 清理资源...');
  await manager.unloadAllSkills();
  await manager.destroy();
  console.log('   ✓ 所有资源已清理');
  console.log('');

  console.log('='.repeat(60));
  console.log('  示例运行完成！');
  console.log('='.repeat(60));
  console.log('');
  console.log('📚 总结:');
  console.log('   本示例展示了 Skill 系统的核心功能:');
  console.log('   1. Skill 发现和注册');
  console.log('   2. 沙箱安全加载');
  console.log('   3. Skill 执行和重试');
  console.log('   4. 输入输出验证');
  console.log('   5. 批量执行');
  console.log('   6. 搜索和任务匹配');
  console.log('   7. 权限管理');
  console.log('   8. 系统监控和统计');
  console.log('');
}

// 运行示例
main().catch((error) => {
  console.error('示例运行失败:', error);
  process.exit(1);
});
