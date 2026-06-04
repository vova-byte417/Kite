/**
 * 示例 02-02: 拓扑排序和执行顺序
 *
 * 本示例展示：
 * 1. 创建有依赖关系的 Skill 图
 * 2. 计算拓扑排序确定执行顺序
 * 3. 可并行层级分析
 * 4. 依赖树可视化
 * 5. 按依赖顺序执行
 *
 * 预期输出：
 * - 拓扑排序结果
 * - 可并行执行的批次
 * - ASCII 依赖树
 * - 按顺序执行的结果
 */

import * as path from 'path';
import { SkillManager } from '../../skill-system/src';

const SAMPLE_SKILLS_DIR = path.resolve(__dirname, '../../sample-skills');

/**
 * 模拟一个数据处理管道的依赖关系：
 *
 *  data-reader  -->  data-transform  -->  data-validator
 *           \                                  /
 *            \-->  data-enricher ----------->
 *                                          |
 *                                          v
 *                                   report-generator
 */
const PIPELINE_SKILLS = [
  {
    name: 'data-reader',
    description: '数据读取器',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'file-io/index.ts'),
    tags: ['reader', 'input', 'pipeline'],
    dependencies: []
  },
  {
    name: 'data-transform',
    description: '数据转换器',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['transform', 'processing', 'pipeline'],
    dependencies: [
      { skillId: 'data-reader', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'data-enricher',
    description: '数据增强器',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['enrich', 'processing', 'pipeline'],
    dependencies: [
      { skillId: 'data-reader', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'data-validator',
    description: '数据验证器',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['validation', 'pipeline'],
    dependencies: [
      { skillId: 'data-transform', minVersion: '1.0.0', optional: false },
      { skillId: 'data-enricher', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'report-generator',
    description: '报表生成器',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'code-generation/index.ts'),
    tags: ['report', 'output', 'pipeline'],
    dependencies: [
      { skillId: 'data-validator', minVersion: '1.0.0', optional: false }
    ]
  }
];

async function main() {
  console.log('='.repeat(70));
  console.log('  示例 02-02: 拓扑排序和执行顺序');
  console.log('='.repeat(70));
  console.log('');

  const manager = new SkillManager({
    scanPaths: [],
    autoScanOnStartup: false
  });

  await manager.initialize(false);

  // ========================================
  // 1. 注册带依赖关系的 Skill
  // ========================================
  console.log('📌 1. 注册带依赖关系的 Skill');
  console.log('-'.repeat(70));

  const registeredSkills = PIPELINE_SKILLS.map(skillDef => {
    return manager.registerSkill({
      ...skillDef,
      version: '1.0.0',
      config: { enabled: true }
    });
  });

  console.log('   ✓ 已注册', registeredSkills.length, '个 Skill');
  registeredSkills.forEach(skill => {
    const depCount = manager.getDirectDependencies(skill.id).length;
    console.log(`     - ${skill.name} (${depCount} 个直接依赖)`);
  });
  console.log('');

  // ========================================
  // 2. 查看直接依赖
  // ========================================
  console.log('📌 2. 查看 Skill 的直接依赖');
  console.log('-'.repeat(70));

  for (const skill of registeredSkills) {
    const deps = manager.getDirectDependencies(skill.id);
    console.log(`   ${skill.name}:`);
    if (deps.length === 0) {
      console.log('     (无依赖)');
    } else {
      deps.forEach(depId => {
        const depSkill = manager.getSkill(depId);
        console.log(`     ↳ ${depSkill?.name || depId}`);
      });
    }
  }
  console.log('');

  // ========================================
  // 3. 查看所有递归依赖
  // ========================================
  console.log('📌 3. 查看 Skill 的所有递归依赖');
  console.log('-'.repeat(70));

  for (const skill of registeredSkills) {
    const allDeps = manager.getAllDependencies(skill.id);
    console.log(`   ${skill.name}: ${allDeps.length} 个依赖`);
  }
  console.log('');

  // ========================================
  // 4. 查看反向依赖（被哪些 Skill 依赖）
  // ========================================
  console.log('📌 4. 查看反向依赖');
  console.log('-'.repeat(70));

  for (const skill of registeredSkills) {
    const dependents = manager.getDependents(skill.id);
    console.log(`   ${skill.name} 被 ${dependents.length} 个 Skill 依赖:`);
    dependents.forEach(depId => {
      const depSkill = manager.getSkill(depId);
      console.log(`     ↳ ${depSkill?.name || depId}`);
    });
  }
  console.log('');

  // ========================================
  // 5. 计算拓扑排序
  // ========================================
  console.log('📌 5. 计算拓扑排序');
  console.log('-'.repeat(70));

  const topology = manager.computeDependencyTopology();

  console.log('   拓扑排序结果（执行顺序）:');
  topology.order.forEach((skillId, index) => {
    const skill = manager.getSkill(skillId);
    console.log(`   ${index + 1}. ${skill?.name || skillId}`);
  });
  console.log('');

  // ========================================
  // 6. 可并行执行的批次
  // ========================================
  console.log('📌 6. 可并行执行的批次');
  console.log('-'.repeat(70));

  console.log('   共', topology.levels.length, '个执行批次:');
  topology.levels.forEach((level, index) => {
    const skillNames = level.map(id => manager.getSkill(id)?.name || id);
    console.log(`   批次 ${index + 1}: ${skillNames.join(', ')}`);
    console.log(`     可并行: ${level.length} 个 Skill 同时执行`);
  });
  console.log('');

  // ========================================
  // 7. 依赖树可视化
  // ========================================
  console.log('📌 7. 依赖树可视化');
  console.log('-'.repeat(70));

  // 从最后的 Skill 开始构建依赖树
  const lastSkill = registeredSkills[registeredSkills.length - 1];
  console.log(`   依赖树 (根节点: ${lastSkill.name}):`);
  console.log('');

  const asciiTree = manager.printDependencyTree(lastSkill.id);
  console.log(asciiTree.split('\n').map(line => '   ' + line).join('\n'));
  console.log('');

  // ========================================
  // 8. 检测是否有循环依赖
  // ========================================
  console.log('📌 8. 循环依赖检测');
  console.log('-'.repeat(70));

  const cycles = manager.detectCycles();
  if (cycles.length === 0) {
    console.log('   ✅ 未检测到循环依赖');
  } else {
    console.log('   ❌ 检测到', cycles.length, '个循环依赖:');
    cycles.forEach(cycle => {
      console.log('     ', cycle.join(' → '));
    });
  }
  console.log('');

  // ========================================
  // 9. 按批次加载 Skill
  // ========================================
  console.log('📌 9. 按批次加载 Skill');
  console.log('-'.repeat(70));

  const loadBatches = manager.generateLoadBatches();
  console.log('   生成', loadBatches.length, '个加载批次');
  console.log('');

  for (let i = 0; i < loadBatches.length; i++) {
    const batch = loadBatches[i];
    console.log(`   加载批次 ${i + 1}: ${batch.length} 个 Skill`);

    // 并行加载当前批次
    const loadPromises = batch.map(skillId => manager.loadSkill(skillId));
    const batchResults = await Promise.all(loadPromises);

    batchResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`     ${status} ${result.skillId}`);
    });
    console.log('');
  }

  console.log('   ✓ 全部加载完成!');
  console.log('   已加载 Skill 数:', manager.getLoadedCount());
  console.log('');

  // ========================================
  // 10. 检查依赖是否全部满足
  // ========================================
  console.log('📌 10. 检查依赖满足状态');
  console.log('-'.repeat(70));

  const allChecks = manager.checkAllDependencies();
  console.log('   全部依赖满足:', allChecks.allSatisfied ? '✅' : '❌');
  console.log('   总检查数:', allChecks.total);
  console.log('   满足数:', allChecks.satisfied);
  console.log('   有问题数:', allChecks.withIssues);
  console.log('');

  if (allChecks.withIssues > 0) {
    console.log('   有问题的 Skill:');
    Object.entries(allChecks.results || {}).forEach(([skillId, result]) => {
      if (!(result as any).satisfied) {
        const skill = manager.getSkill(skillId);
        console.log('     ❌', skill?.name || skillId);
      }
    });
  }
  console.log('');

  // ========================================
  // 11. 按依赖顺序批量执行
  // ========================================
  console.log('📌 11. 按依赖顺序批量执行');
  console.log('-'.repeat(70));

  // 为每个 Skill 准备输入
  const inputs: Record<string, any> = {};
  for (const skill of registeredSkills) {
    inputs[skill.id] = {
      operation: 'string',
      subOperation: 'capitalize',
      value: `hello from ${skill.name}!`
    };
  }

  console.log('   开始按依赖驱动执行...');
  const executeStart = Date.now();

  const executeResult = await manager.executeSkillsWithDependencies(inputs, {
    continueOnFailure: false,
    parallelInBatch: true
  });

  const executeTime = Date.now() - executeStart;

  console.log('');
  console.log('   执行结果:');
  console.log('     成功:', executeResult.success ? '✅' : '❌');
  console.log('     完成批次:', executeResult.completedBatches, '/', executeResult.totalBatches);
  console.log('     失败批次:', executeResult.failedBatches.length);
  console.log('     总耗时:', executeTime, 'ms');
  console.log('');

  console.log('   各 Skill 执行结果:');
  Object.entries(executeResult.results).forEach(([skillId, result]: [string, any]) => {
    const skill = manager.getSkill(skillId);
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${skill?.name || skillId}: ${result.duration} ms`);
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
  console.log('   本示例展示了完整的依赖管理功能：');
  console.log('   1. 创建带依赖关系的 Skill 图');
  console.log('   2. 直接依赖、递归依赖、反向依赖查询');
  console.log('   3. 拓扑排序确定执行顺序');
  console.log('   4. 可并行执行批次分析');
  console.log('   5. ASCII 依赖树可视化');
  console.log('   6. 循环依赖检测');
  console.log('   7. 按批次加载和执行');
  console.log('');
  console.log('💡 应用场景:');
  console.log('   - 数据处理管道');
  console.log('   - CI/CD 工作流');
  console.log('   - 任务编排系统');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 示例运行失败:', error);
  process.exit(1);
});
