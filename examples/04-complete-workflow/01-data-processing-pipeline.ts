/**
 * 完整工作流示例 01: 数据处理管道
 *
 * 本示例模拟一个真实的数据处理场景：
 * 1. 读取原始数据（CSV/JSON）
 * 2. 数据清洗和验证
 * 3. 数据转换和增强
 * 4. 生成处理报告
 * 5. 输出结果文件
 *
 * 展示 Skill 系统如何管理复杂的工作流
 */

import * as path from 'path';
import { SkillManager, SkillExecutionRequest } from '../../skill-system/src';

const SAMPLE_SKILLS_DIR = path.resolve(__dirname, '../../sample-skills');

// ========================================
// 管道定义
// ========================================

/**
 * 数据处理管道的 Skill 定义
 *
 * 执行顺序:
 *   reader → cleaner → transformer → validator → generator → writer
 *
 * 并行机会:
 *   cleaner 和 enricher 可以并行
 */
const PIPELINE_SKILLS = [
  {
    name: 'data-reader',
    description: '读取原始数据文件，支持 CSV、JSON 格式',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'file-io/index.ts'),
    tags: ['reader', 'input', 'io'],
    dependencies: []
  },
  {
    name: 'data-cleaner',
    description: '数据清洗：去重、补全、格式标准化',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['clean', 'transform', 'processing'],
    dependencies: [
      { skillId: 'data-reader', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'data-enricher',
    description: '数据增强：添加元数据、计算衍生字段',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['enrich', 'transform', 'processing'],
    dependencies: [
      { skillId: 'data-reader', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'data-validator',
    description: '数据验证：检查完整性、业务规则',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'utils/index.ts'),
    tags: ['validate', 'quality', 'processing'],
    dependencies: [
      { skillId: 'data-cleaner', minVersion: '1.0.0', optional: false },
      { skillId: 'data-enricher', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'report-generator',
    description: '生成数据处理质量报告',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'code-generation/index.ts'),
    tags: ['report', 'output', 'generator'],
    dependencies: [
      { skillId: 'data-validator', minVersion: '1.0.0', optional: false }
    ]
  },
  {
    name: 'data-writer',
    description: '输出处理后的数据',
    entryPoint: path.join(SAMPLE_SKILLS_DIR, 'file-io/index.ts'),
    tags: ['writer', 'output', 'io'],
    dependencies: [
      { skillId: 'report-generator', minVersion: '1.0.0', optional: false }
    ]
  }
];

async function main() {
  console.log('='.repeat(75));
  console.log('  完整工作流示例: 数据处理管道');
  console.log('='.repeat(75));
  console.log('');

  console.log('📋 管道概述:');
  console.log('   读取 → 清洗 ─┬→ 验证 → 报告 → 输出');
  console.log('                 └→ 增强 ↗');
  console.log('');

  const manager = new SkillManager({
    scanPaths: [],
    autoScanOnStartup: false,
    loaderConfig: {
      enableSandbox: true,
      defaultTimeout: 30000
    },
    dependencyConfig: {
      strictMode: true,
      autoCheckOnLoad: true
    }
  });

  await manager.initialize(false);

  // ========================================
  // 步骤 1: 注册管道 Skill
  // ========================================
  console.log('📌 步骤 1: 注册管道 Skill');
  console.log('-'.repeat(75));

  PIPELINE_SKILLS.forEach(skillDef => {
    manager.registerSkill({
      ...skillDef,
      version: '1.0.0',
      config: { enabled: true }
    });
    console.log(`   ✓ ${skillDef.name}`);
  });

  console.log('');
  console.log('   共注册', PIPELINE_SKILLS.length, '个 Skill');
  console.log('');

  // ========================================
  // 步骤 2: 查看依赖图
  // ========================================
  console.log('📌 步骤 2: 查看依赖关系图');
  console.log('-'.repeat(75));

  const lastSkill = manager.getAllSkills()[manager.getAllSkills().length - 1];
  console.log('');
  console.log(manager.printDependencyTree(lastSkill.id));
  console.log('');

  // ========================================
  // 步骤 3: 计算拓扑顺序
  // ========================================
  console.log('📌 步骤 3: 计算执行顺序');
  console.log('-'.repeat(75));

  const topology = manager.computeDependencyTopology();

  console.log('   线性执行顺序:');
  topology.order.forEach((skillId, i) => {
    const skill = manager.getSkill(skillId);
    console.log(`   ${i + 1}. ${skill?.name || skillId}`);
  });
  console.log('');

  console.log('   可并行执行批次:');
  topology.levels.forEach((level, i) => {
    const names = level.map(id => manager.getSkill(id)?.name || id);
    console.log(`   批次 ${i + 1}: ${names.join(', ')}`);
  });
  console.log('');

  // ========================================
  // 步骤 4: 检查循环依赖
  // ========================================
  console.log('📌 步骤 4: 检查循环依赖');
  console.log('-'.repeat(75));

  const cycles = manager.detectCycles();
  if (cycles.length === 0) {
    console.log('   ✅ 无循环依赖，管道可以正常执行');
  } else {
    console.log('   ❌ 发现循环依赖，管道无法执行!');
    cycles.forEach(c => console.log('     ', c.join(' → ')));
    process.exit(1);
  }
  console.log('');

  // ========================================
  // 步骤 5: 批量加载 Skill
  // ========================================
  console.log('📌 步骤 5: 按批次加载 Skill');
  console.log('-'.repeat(75));

  const loadResult = await manager.loadSkillsInDependencyOrder();

  if (!loadResult.success) {
    console.log('   ❌ 部分 Skill 加载失败:');
    Object.entries(loadResult.results).forEach(([id, result]: [string, any]) => {
      if (!result.success) {
        console.log(`     - ${manager.getSkill(id)?.name || id}: ${result.error}`);
      }
    });
    process.exit(1);
  }

  console.log('   ✅ 全部', loadResult.loadedCount, '个 Skill 加载成功');
  console.log('');

  // ========================================
  // 步骤 6: 准备执行输入
  // ========================================
  console.log('📌 步骤 6: 准备执行输入');
  console.log('-'.repeat(75));

  // 模拟处理 1000 条用户数据
  const sampleData = {
    source: 'users-export-2024.json',
    recordCount: 1000,
    fields: ['id', 'name', 'email', 'created_at'],
    processingDate: new Date().toISOString()
  };

  // 为每个 Skill 准备输入
  const pipelineInputs: Record<string, any> = {};

  for (const skill of manager.getAllSkills()) {
    switch (skill.name) {
      case 'data-reader':
        pipelineInputs[skill.id] = {
          operation: 'read',
          filePath: sampleData.source,
          encoding: 'utf-8'
        };
        break;
      case 'data-cleaner':
        pipelineInputs[skill.id] = {
          operation: 'array',
          subOperation: 'unique',
          values: ['cleaning', 'data']
        };
        break;
      case 'data-enricher':
        pipelineInputs[skill.id] = {
          operation: 'string',
          subOperation: 'capitalize',
          value: 'enriched data'
        };
        break;
      case 'data-validator':
        pipelineInputs[skill.id] = {
          operation: 'validate',
          subOperation: 'email',
          value: 'test@example.com'
        };
        break;
      case 'report-generator':
        pipelineInputs[skill.id] = {
          operation: 'generate-class',
          className: 'DataReport',
          properties: [{ name: 'records', type: 'number' }]
        };
        break;
      case 'data-writer':
        pipelineInputs[skill.id] = {
          operation: 'write',
          filePath: 'output/processed-data.json',
          content: JSON.stringify({ processed: true })
        };
        break;
    }
  }

  console.log('   ✓ 已为', Object.keys(pipelineInputs).length, '个 Skill 准备输入');
  console.log('');

  // ========================================
  // 步骤 7: 按依赖顺序执行整个管道
  // ========================================
  console.log('📌 步骤 7: 执行数据处理管道');
  console.log('-'.repeat(75));
  console.log('   🚀 开始执行...');
  const pipelineStart = Date.now();

  const pipelineResult = await manager.executeSkillsWithDependencies(
    pipelineInputs,
    {
      continueOnFailure: false,  // 任一失败则停止
      parallelInBatch: true       // 批次内并行执行
    }
  );

  const pipelineTime = Date.now() - pipelineStart;

  console.log('');
  console.log('   ✅ 管道执行完成!');
  console.log('');
  console.log('   📊 执行统计:');
  console.log('     总耗时:', pipelineTime, 'ms');
  console.log('     总批次:', pipelineResult.totalBatches);
  console.log('     完成批次:', pipelineResult.completedBatches);
  console.log('     失败批次:', pipelineResult.failedBatches.length);
  console.log('     全部成功:', pipelineResult.success ? '✅' : '❌');
  console.log('');

  // ========================================
  // 步骤 8: 详细执行结果
  // ========================================
  console.log('📌 步骤 8: 各阶段执行详情');
  console.log('-'.repeat(75));

  let totalTime = 0;
  const results = Object.entries(pipelineResult.results) as [string, any][];

  for (const [skillId, result] of results) {
    const skill = manager.getSkill(skillId);
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${skill?.name || skillId}`);
    console.log(`       耗时: ${result.duration} ms`);
    totalTime += result.duration || 0;
  }

  console.log('');
  console.log('   各阶段累加耗时:', totalTime, 'ms');
  console.log('   实际耗时:', pipelineTime, 'ms');
  console.log('   并行加速比:', (totalTime / pipelineTime).toFixed(2), '倍');
  console.log('');

  // ========================================
  // 步骤 9: 系统统计
  // ========================================
  console.log('📌 步骤 9: 系统执行统计');
  console.log('-'.repeat(75));

  const stats = manager.getFullGlobalStats();
  console.log('   执行统计:');
  console.log('     总执行次数:', stats.totalExecutions);
  console.log('     成功次数:', stats.successfulExecutions);
  console.log('     失败次数:', stats.failedExecutions);
  console.log('     重试次数:', stats.totalRetries);
  console.log('     平均执行时间:', stats.avgExecutionTime, 'ms');
  console.log('     成功率:', Math.round(stats.successRate * 100), '%');
  console.log('');

  // ========================================
  // 步骤 10: 生成管道报告
  // ========================================
  console.log('📌 步骤 10: 管道执行报告');
  console.log('-'.repeat(75));
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    📊 数据处理管道执行报告                    │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│  处理文件: users-export-2024.json                              │`);
  console.log(`│  记录数量: ${sampleData.recordCount} 条                                            │`);
  console.log(`│  处理阶段: ${manager.getAllSkills().length} 个                                              │`);
  console.log(`│  执行状态: ${pipelineResult.success ? '✅ 全部成功' : '❌ 部分失败'}                                  │`);
  console.log(`│  总耗时: ${String(pipelineTime).padEnd(6)} ms                                          │`);
  console.log(`│  并行加速: ${(totalTime / pipelineTime).toFixed(2)} 倍                                             │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');

  // ========================================
  // 清理
  // ========================================
  console.log('🧹 清理资源...');
  await manager.unloadAllSkills();
  await manager.destroy();
  console.log('   ✓ 所有资源已清理');
  console.log('');

  console.log('='.repeat(75));
  console.log('  ✅ 数据处理管道示例运行完成！');
  console.log('='.repeat(75));
  console.log('');
  console.log('📚 总结:');
  console.log('   本示例展示了如何使用 Skill 系统构建复杂的工作流:');
  console.log('');
  console.log('   1. 声明式依赖定义 - Skill 自动声明依赖关系');
  console.log('   2. 自动拓扑排序 - 系统计算正确的执行顺序');
  console.log('   3. 智能并行执行 - 识别可并行的阶段自动加速');
  console.log('   4. 错误传播机制 - 某阶段失败时正确处理后续');
  console.log('   5. 完整的统计监控 - 执行情况一目了然');
  console.log('');
  console.log('💡 适用场景:');
  console.log('   - ETL 数据处理管道');
  console.log('   - CI/CD 构建流程');
  console.log('   - 业务工作流编排');
  console.log('   - 多阶段任务处理');
  console.log('');
}

main().catch((error) => {
  console.error('❌ 管道执行失败:', error);
  process.exit(1);
});
