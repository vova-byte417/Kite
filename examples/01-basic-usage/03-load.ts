/**
 * 示例 03: Skill 加载和卸载
 *
 * 本示例展示：
 * 1. 加载单个 Skill
 * 2. 批量加载所有 Skill
 * 3. 按依赖顺序加载
 * 4. 卸载 Skill
 * 5. 热重载 Skill
 * 6. 检查加载状态
 *
 * 预期输出：
 * - 加载进度日志
 * - 加载结果
 * - 状态变化信息
 */

import * as path from 'path';
import { SkillManager } from '../../skill-system/src';

const SAMPLE_SKILLS_DIR = path.resolve(__dirname, '../../sample-skills');

async function main() {
  console.log('='.repeat(70));
  console.log('  示例 03: Skill 加载和卸载');
  console.log('='.repeat(70));
  console.log('');

  const manager = new SkillManager({
    scanPaths: [SAMPLE_SKILLS_DIR],
    autoScanOnStartup: true
  });

  await manager.initialize(true);

  // ========================================
  // 1. 查看初始加载状态
  // ========================================
  console.log('📌 1. 查看初始状态');
  console.log('-'.repeat(70));
  console.log('   已发现 Skill 数量:', manager.getAllSkills().length);
  console.log('   已加载 Skill 数量:', manager.getLoadedCount());
  console.log('   已加载 Skill ID:', manager.getLoadedSkillIds());
  console.log('');

  // ========================================
  // 2. 加载单个 Skill
  // ========================================
  console.log('📌 2. 加载单个 Skill');
  console.log('-'.repeat(70));

  // 找到第一个可加载的 Skill
  const firstSkill = manager.getAllSkills()[0];

  if (firstSkill) {
    console.log('   准备加载:', firstSkill.name, '(', firstSkill.id, ')');

    const loadResult = await manager.loadSkill(firstSkill.id);

    if (loadResult.success) {
      console.log('   ✓ 加载成功!');
      console.log('     Skill ID:', loadResult.skillId);
      console.log('     加载耗时:', loadResult.loadTime, 'ms');
    } else {
      console.log('   ❌ 加载失败:', loadResult.error);
    }

    // 检查是否已加载
    console.log('');
    console.log('   检查加载状态:');
    console.log('     是否已加载:', manager.isSkillLoaded(firstSkill.id) ? '是 ✅' : '否');
    console.log('     当前已加载数:', manager.getLoadedCount());
  }
  console.log('');

  // ========================================
  // 3. 批量加载所有 Skill
  // ========================================
  console.log('📌 3. 批量加载所有 Skill');
  console.log('-'.repeat(70));

  console.log('   开始批量加载...');
  const loadAllResults = await manager.loadAllSkills();

  const successCount = loadAllResults.filter(r => r.success).length;
  const failCount = loadAllResults.filter(r => !r.success).length;

  console.log('   批量加载完成!');
  console.log('   成功:', successCount, '个');
  console.log('   失败:', failCount, '个');
  console.log('');

  // 打印详细结果
  loadAllResults.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.skillId}: ${result.success ? '成功' : result.error}`);
  });
  console.log('');

  // ========================================
  // 4. 按依赖顺序加载
  // ========================================
  console.log('📌 4. 按依赖顺序加载');
  console.log('-'.repeat(70));

  // 先卸载所有
  await manager.unloadAllSkills();
  console.log('   已清空，准备按依赖顺序加载');

  const orderedLoadResult = await manager.loadSkillsInDependencyOrder();
  console.log('   按依赖顺序加载完成!');
  console.log('   成功加载:', orderedLoadResult.loadedCount, '个');
  console.log('   全部成功:', orderedLoadResult.success ? '是 ✅' : '否');
  console.log('');

  // ========================================
  // 5. 获取已加载的 Skill 列表
  // ========================================
  console.log('📌 5. 获取已加载的 Skill 列表');
  console.log('-'.repeat(70));

  const loadedSkills = manager.getLoadedSkills();
  console.log('   已加载 Skill 列表:');
  loadedSkills.forEach((skill, i) => {
    console.log(`   ${i + 1}. ${skill.name} (${skill.version})`);
    console.log(`       标签: ${skill.tags.join(', ') || '(无)'}');
    console.log(`       状态: ${skill.status}`);
  });
  console.log('');

  // ========================================
  // 6. 卸载单个 Skill
  // ========================================
  console.log('📌 6. 卸载单个 Skill');
  console.log('-'.repeat(70));

  const toUnload = loadedSkills[0];
  if (toUnload) {
    console.log('   准备卸载:', toUnload.name);

    const unloadResult = await manager.unloadSkill(toUnload.id);
    console.log('   卸载结果:', unloadResult ? '成功 ✅' : '失败 ❌');
    console.log('   卸载后已加载数:', manager.getLoadedCount());
  }
  console.log('');

  // ========================================
  // 7. 热重载 Skill
  // ========================================
  console.log('📌 7. 热重载 Skill');
  console.log('-'.repeat(70));

  if (loadedSkills.length > 1) {
    const toReload = loadedSkills[1];
    console.log('   准备热重载:', toReload.name);

    const reloadResult = await manager.reloadSkill(toReload.id);
    if (reloadResult) {
      console.log('   热重载结果:', reloadResult.success ? '成功 ✅' : '失败 ❌');
      if (!reloadResult.success) {
        console.log('   错误信息:', reloadResult.error);
      }
    }
  }
  console.log('');

  // ========================================
  // 8. 卸载所有 Skill
  // ========================================
  console.log('📌 8. 卸载所有 Skill');
  console.log('-'.repeat(70));

  console.log('   卸载前数量:', manager.getLoadedCount());
  await manager.unloadAllSkills();
  console.log('   卸载后数量:', manager.getLoadedCount());
  console.log('   ✓ 全部卸载完成');
  console.log('');

  // ========================================
  // 9. 事件监听（高级用法）
  // ========================================
  console.log('📌 9. 事件监听');
  console.log('-'.repeat(70));

  // 监听加载事件
  manager.on('skill:loaded', (data: any) => {
    console.log('   📢 事件: Skill 已加载 -', data.name);
  });

  manager.on('skill:unloaded', (data: any) => {
    console.log('   📢 事件: Skill 已卸载 -', data.skillId);
  });

  manager.on('skills:all-loaded', (data: any) => {
    console.log('   📢 事件: 全部 Skill 已加载 -', data.success, '/', data.total);
  });

  // 触发事件
  console.log('   重新加载以触发事件...');
  await manager.loadAllSkills();
  console.log('');

  // ========================================
  // 10. 加载批次信息
  // ========================================
  console.log('📌 10. 生成加载批次');
  console.log('-'.repeat(70));

  const loadBatches = manager.generateLoadBatches();
  console.log('   共生成', loadBatches.length, '个加载批次');
  loadBatches.forEach((batch, i) => {
    console.log(`   批次 ${i + 1}:`, batch.join(', ') || '(空)');
  });
  console.log('');

  // ========================================
  // 清理
  // ========================================
  console.log('🧹 清理资源...');
  await manager.unloadAllSkills();
  await manager.destroy();
  console.log('   ✓ 所有资源已清理');
  console.log('');

  console.log('='.repeat(70));
  console.log('  ✅ 示例运行完成！');
  console.log('='.repeat(70));
  console.log('');
  console.log('📚 总结:');
  console.log('   本示例展示了 Skill 的完整生命周期：');
  console.log('   1. 单个 Skill 加载');
  console.log('   2. 批量加载所有 Skill');
  console.log('   3. 按依赖关系顺序加载');
  console.log('   4. 卸载单个/所有 Skill');
  console.log('   5. 热重载 Skill');
  console.log('   6. 加载事件监听');
  console.log('   7. 加载批次生成');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 示例运行失败:', error);
  process.exit(1);
});
