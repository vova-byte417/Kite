/**
 * 示例 02: Skill 注册和发现
 *
 * 本示例展示：
 * 1. 自动发现 Skill（从目录扫描）
 * 2. 手动注册 Skill
 * 3. 注册时配置选项
 * 4. 批量注册
 * 5. 注销 Skill
 * 6. Skill 查询和筛选
 *
 * 预期输出：
 * - 发现的 Skill 列表
 * - 注册结果
 * - Skill 详情
 */

import * as path from 'path';
import { SkillManager, SkillStatus } from '../../skill-system/src';

// Sample Skills 目录
const SAMPLE_SKILLS_DIR = path.resolve(__dirname, '../../sample-skills');

async function main() {
  console.log('='.repeat(70));
  console.log('  示例 02: Skill 注册和发现');
  console.log('='.repeat(70));
  console.log('');

  const manager = new SkillManager({
    scanPaths: [SAMPLE_SKILLS_DIR],
    autoScanOnStartup: false
  });

  await manager.initialize(false);

  // ========================================
  // 1. 自动发现 Skill
  // ========================================
  console.log('📌 1. 自动发现 Skill');
  console.log('-'.repeat(70));

  console.log('   扫描路径:', SAMPLE_SKILLS_DIR);
  const discoveredSkills = await manager.discoverAll();

  console.log('   ✓ 发现完成，共', discoveredSkills.length, '个 Skill');
  console.log('');

  discoveredSkills.forEach((skill, index) => {
    console.log(`   ${index + 1}. ${skill.name}`);
    console.log(`       ID:', skill.id);
    console.log(`       版本:', skill.version);
    console.log(`       状态:', skill.status);
    console.log(`       标签:', skill.tags.join(', ') || '(无)');
    console.log(`       入口:', skill.entryPoint);
    console.log('');
  });

  // ========================================
  // 2. 手动注册单个 Skill
  // ========================================
  console.log('📌 2. 手动注册单个 Skill');
  console.log('-'.repeat(70));

  const manualSkill = manager.registerSkill({
    name: 'custom-logger',
    version: '1.0.0',
    description: '自定义日志 Skill',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['logging', 'utility', 'custom'],
    dependencies: [],
    config: {
      enabled: true,
      timeout: 10000,
      maxRetries: 2,
      concurrency: 5
    },
    metadata: {
      author: '示例开发者',
      category: '工具',
      createdAt: new Date()
    }
  });

  console.log('   ✓ 手动注册成功!');
  console.log('   Skill 名称:', manualSkill.name);
  console.log('   Skill ID:', manualSkill.id);
  console.log('   标签:', manualSkill.tags.join(', '));
  console.log('');

  // ========================================
  // 3. 批量注册多个 Skill
  // ========================================
  console.log('📌 3. 批量注册多个 Skill');
  console.log('-'.repeat(70));

  const batchSkills = [
    {
      name: 'data-validator',
      version: '1.0.0',
      description: '数据验证 Skill',
      entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
      tags: ['validation', 'data']
    },
    {
      name: 'report-generator',
      version: '1.2.0',
      description: '报表生成 Skill',
      entryPoint: path.join(SAMPLE_SKILLS_DIR, 'code-generation/index.ts'),
      tags: ['report', 'generation']
    },
    {
      name: 'email-sender',
      version: '2.0.0',
      description: '邮件发送 Skill',
      entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
      tags: ['email', 'notification']
    }
  ];

  console.log('   批量注册', batchSkills.length, '个 Skill...');
  const registeredBatch = batchSkills.map(skill => manager.registerSkill(skill));

  registeredBatch.forEach((skill, i) => {
    console.log(`   ✓ ${i + 1}. ${skill.name} (${skill.id}');
  });
  console.log('');

  // ========================================
  // 4. 查询所有已注册的 Skill
  // ========================================
  console.log('📌 4. 查询所有已注册的 Skill');
  console.log('-'.repeat(70));

  const allSkills = manager.getAllSkills();
  console.log('   总注册数量:', allSkills.length);
  console.log('');

  allSkills.forEach((skill, index) => {
    console.log(`   ${index + 1}. ${skill.name} (${skill.version}');
  });
  console.log('');

  // ========================================
  // 5. 按名称查找 Skill
  // ========================================
  console.log('📌 5. 按名称查找 Skill');
  console.log('-'.repeat(70));

  const foundSkill = manager.findSkillByName('custom-logger');
  if (foundSkill) {
    console.log('   ✓ 找到 Skill:', foundSkill.name);
    console.log('     ID:', foundSkill.id);
    console.log('     描述:', foundSkill.description);
    console.log('     状态:', foundSkill.status);
  } else {
    console.log('   ❌ 未找到 Skill');
  }
  console.log('');

  // ========================================
  // 6. 搜索 Skill（按标签、状态）
  // ========================================
  console.log('📌 6. 搜索 Skill');
  console.log('-'.repeat(70));

  // 按标签搜索
  const utilitySkills = manager.searchSkills({
    tags: ['utility'],
    sortBy: 'name',
    sortOrder: 'asc'
  });
  console.log('   标签 "utility" 匹配数量:', utilitySkills.length);

  // 按状态搜索
  const readySkills = manager.searchSkills({
    status: [SkillStatus.REGISTERED]
  });
  console.log('   已注册状态的 Skill:', readySkills.length);

  // 按关键词搜索
  const dataSkills = manager.searchSkills({
    query: 'data',
    limit: 5
  });
  console.log('   关键词 "data" 匹配数量:', dataSkills.length);
  console.log('');

  // ========================================
  // 7. 注销 Skill
  // ========================================
  console.log('📌 7. 注销 Skill');
  console.log('-'.repeat(70));

  console.log('   注销前数量:', manager.getAllSkills().length);

  const unregisterResult = await manager.unregisterSkill('custom-logger');
  console.log('   注销 custom-logger:', unregisterResult ? '成功 ✅' : '失败 ❌');

  console.log('   注销后数量:', manager.getAllSkills().length);
  console.log('');

  // ========================================
  // 8. 添加/移除扫描路径
  // ========================================
  console.log('📌 8. 扫描路径管理');
  console.log('-'.repeat(70));

  console.log('   当前扫描路径:', manager.getConfig().scanPaths);

  // 添加新路径
  manager.addScanPath('./additional-skills');
  console.log('   添加后路径:', manager.getConfig().scanPaths);

  // 移除路径
  const removed = manager.removeScanPath('./additional-skills');
  console.log('   移除路径:', removed ? '成功 ✅' : '失败 ❌');
  console.log('   移除后路径:', manager.getConfig().scanPaths);
  console.log('');

  // ========================================
  // 9. 刷新发现（清空重新扫描
  // ========================================
  console.log('📌 9. 刷新发现');
  console.log('-'.repeat(70));

  console.log('   刷新前 Skill 数量:', manager.getAllSkills().length);
  const refreshedSkills = await manager.refreshDiscovery();
  console.log('   刷新后 Skill 数量:', refreshedSkills.length);
  console.log('   ✓ 刷新完成');
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
  console.log('   本示例展示了 Skill 的完整的注册和发现功能：');
  console.log('   1. 从目录自动发现 Skill');
  console.log('   2. 手动注册单个 Skill');
  console.log('   3. 批量注册多个 Skill');
  console.log('   4. Skill 查询和搜索');
  console.log('   5. 注销 Skill');
  console.log('   6. 扫描路径管理');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 示例运行失败:', error);
  process.exit(1);
});
