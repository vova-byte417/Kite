/**
 * 示例 01: SkillManager 初始化和配置
 *
 * 本示例展示：
 * 1. 使用默认配置初始化 SkillManager
 * 2. 自定义配置初始化
 * 3. 配置项详解
 * 4. 获取和修改配置
 * 5. 销毁和重新初始化
 *
 * 预期输出：
 * - 系统初始化日志
 * - 配置项打印
 * - 系统状态信息
 */

import { SkillManager } from '../../skill-system/src';

async function main() {
  console.log('='.repeat(70));
  console.log('  示例 01: SkillManager 初始化和配置');
  console.log('='.repeat(70));
  console.log('');

  // ========================================
  // 1. 使用默认配置初始化
  // ========================================
  console.log('📌 1. 使用默认配置初始化');
  console.log('-'.repeat(70));

  const defaultManager = new SkillManager();
  await defaultManager.initialize(false); // 不自动扫描

  console.log('   ✓ 默认配置初始化完成');
  console.log('   扫描路径:', defaultManager.getConfig().scanPaths);
  console.log('   自动扫描:', defaultManager.getConfig().autoScanOnStartup);
  console.log('   沙箱启用:', defaultManager.getConfig().loaderConfig.enableSandbox);
  console.log('   默认超时:', defaultManager.getConfig().executorConfig.defaultTimeout, 'ms');
  console.log('   默认重试:', defaultManager.getConfig().executorConfig.defaultMaxRetries, '次');
  console.log('');

  // 销毁
  await defaultManager.destroy();
  console.log('   ✓ 已销毁默认配置实例');
  console.log('');

  // ========================================
  // 2. 使用自定义配置初始化
  // ========================================
  console.log('📌 2. 使用自定义配置初始化');
  console.log('-'.repeat(70));

  const customConfig = {
    scanPaths: [
      './sample-skills/file-io',
      './sample-skills/code-generation',
      './sample-skills/utils'
    ],
    autoScanOnStartup: true,
    loaderConfig: {
      enableSandbox: true,
      defaultTimeout: 60000, // 60 秒超时
      defaultMaxRetries: 3,
      autoRunOnLoad: true
    },
    executorConfig: {
      defaultTimeout: 30000,
      defaultMaxRetries: 2,
      retryStrategy: 'exponential' as const,
      retryDelayBase: 1000,
      retryDelayMultiplier: 2
    },
    dependencyConfig: {
      strictMode: true,
      autoCheckOnLoad: true,
      maxDependencyDepth: 20,
      continueOnFailure: false
    }
  };

  const customManager = new SkillManager(customConfig);
  await customManager.initialize(true);

  console.log('   ✓ 自定义配置初始化完成');
  console.log('   扫描路径数量:', customManager.getConfig().scanPaths.length);
  console.log('   扫描路径:', customManager.getConfig().scanPaths);
  console.log('   严格模式:', customManager.getConfig().dependencyConfig.strictMode);
  console.log('   最大依赖深度:', customManager.getConfig().dependencyConfig.maxDependencyDepth);
  console.log('');

  // ========================================
  // 3. 获取系统概览
  // ========================================
  console.log('📌 3. 获取系统概览');
  console.log('-'.repeat(70));

  const overview = customManager.getOverview();
  console.log('   系统概览:');
  console.log('     - 总 Skill 数:', overview.totalSkills);
  console.log('     - 已加载:', overview.loadedSkills);
  console.log('     - 就绪状态:', overview.readySkills);
  console.log('     - 错误状态:', overview.errorSkills);
  console.log('     - 总执行次数:', overview.totalExecutions);
  console.log('     - 成功率:', Math.round(overview.successRate * 100) + '%');
  console.log('');

  // ========================================
  // 4. 检查安全模式状态
  // ========================================
  console.log('📌 4. 检查安全模式状态');
  console.log('-'.repeat(70));

  console.log('   是否在安全模式:', customManager.isInSafeMode() ? '是' : '否');
  console.log('   进入安全模式...');
  customManager.enterSafeMode();
  console.log('   是否在安全模式:', customManager.isInSafeMode() ? '是 ✅' : '否');
  console.log('   退出安全模式...');
  customManager.exitSafeMode();
  console.log('   是否在安全模式:', customManager.isInSafeMode() ? '是' : '否 ✅');
  console.log('');

  // ========================================
  // 5. 更新运行时配置
  // ========================================
  console.log('📌 5. 更新运行时配置');
  console.log('-'.repeat(70));

  customManager.updateExecutorConfig({
    defaultTimeout: 45000,
    defaultMaxRetries: 5
  });
  console.log('   ✓ 已更新 Executor 配置');
  console.log('   新超时时间:', customManager.getConfig().executorConfig.defaultTimeout, 'ms');
  console.log('');

  // ========================================
  // 6. 销毁和重新初始化
  // ========================================
  console.log('📌 6. 销毁和重新初始化');
  console.log('-'.repeat(70));

  await customManager.destroy();
  console.log('   ✓ 已销毁实例');
  console.log('   重新初始化...');
  await customManager.initialize(true);
  console.log('   ✓ 重新初始化完成');
  console.log('');

  // ========================================
  // 7. 获取内部组件实例（高级用法）
  // ========================================
  console.log('📌 7. 访问内部组件实例');
  console.log('-'.repeat(70));

  console.log('   Executor 实例:', typeof customManager.getExecutor());
  console.log('   Loader 实例:', typeof customManager.getLoader());
  console.log('   Discoverer 实例:', typeof customManager.getDiscoverer());
  console.log('   DependencyManager 实例:', typeof customManager.getDependencyManager());
  console.log('');

  // ========================================
  // 清理
  // ========================================
  console.log('🧹 清理资源...');
  await customManager.unloadAllSkills();
  await customManager.destroy();
  console.log('   ✓ 所有资源已清理');
  console.log('');

  console.log('='.repeat(70));
  console.log('  ✅ 示例运行完成！');
  console.log('='.repeat(70));
  console.log('');
  console.log('📚 总结:');
  console.log('   本示例展示了 SkillManager 的完整生命周期管理：');
  console.log('   1. 多种配置方式（默认/自定义）');
  console.log('   2. 系统初始化和销毁');
  console.log('   3. 运行时配置更新');
  console.log('   4. 安全模式切换');
  console.log('   5. 系统状态监控');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 示例运行失败:', error);
  process.exit(1);
});
