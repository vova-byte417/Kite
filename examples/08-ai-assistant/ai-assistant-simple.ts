/**
 * AI 助手简化版 - 无需 API Key 即可运行
 * 
 * 本示例使用内置的关键词匹配来解析用户输入，
 * 自动匹配和执行相关 Skill 来完成用户的任务。
 * 
 * 使用方式:
 * npx ts-node examples/08-ai-assistant/ai-assistant-simple.ts
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { SkillManager, SkillExecutionResult, Skill } from '../../src';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================
interface ParsedTask {
  originalPrompt: string;
  projectType: string;
  categories: string[];
  tags: string[];
  subtasks: string[];
  requiredSkills: string[];
  description: string;
}

interface MatchedSkill {
  skill: Skill;
  score: number;
  matchedFields: string[];
}

interface ProjectExecutionResult {
  success: boolean;
  prompt: string;
  totalDuration: number;
  totalSkills: number;
  successfulExecutions: number;
  failedExecutions: number;
  results: SkillExecutionResult[];
  summary: string;
}

// ==================== 简单任务解析器 ====================
class SimpleTaskParser {
  /**
   * 基于关键词匹配解析用户输入
   */
  parseProjectPrompt(prompt: string): ParsedTask {
    const keywordMapping: Record<string, { type: string; terms: string[]; tags: string[] }> = {
      data: {
        type: '数据分析',
        terms: ['数据', '分析', '统计', 'csv', 'json', 'dataset', '处理', '清洗', '报告'],
        tags: ['data', 'analysis', 'statistics'],
      },
      code: {
        type: '代码生成',
        terms: ['代码', '生成', '编写', 'script', 'function', 'class', 'API', '接口'],
        tags: ['code', 'generate', 'typescript', 'api'],
      },
      file: {
        type: '文件处理',
        terms: ['文件', '读写', '保存', '加载', '导出', 'import', 'export', '读取'],
        tags: ['file', 'io', 'read', 'write'],
      },
      web: {
        type: '网页爬虫',
        terms: ['网页', '爬虫', '抓取', 'scrape', 'api', 'http', '网站'],
        tags: ['web', 'scrape', 'http', 'api'],
      },
      image: {
        type: '图像处理',
        terms: ['图片', '图像', '处理', '生成', 'resize', 'compress'],
        tags: ['image', 'process', 'resize'],
      },
      test: {
        type: '测试验证',
        terms: ['测试', '验证', 'unit', 'check', '检查'],
        tags: ['test', 'validate', 'unit-test'],
      },
      git: {
        type: 'Git操作',
        terms: ['git', '仓库', 'commit', 'push', 'pull', '版本'],
        tags: ['git', 'version', 'repository'],
      },
      translate: {
        type: '文本翻译',
        terms: ['翻译', '语言', '英文', '中文', '转换'],
        tags: ['translate', 'language'],
      },
    };

    const lowerPrompt = prompt.toLowerCase();
    const matchedCategories: string[] = [];
    const matchedTags: string[] = [];
    const subtasks: string[] = [];
    const requiredSkills: string[] = [];
    let projectType = '通用任务';

    for (const [key, config] of Object.entries(keywordMapping)) {
      if (config.terms.some(term => lowerPrompt.includes(term))) {
        matchedCategories.push(key);
        matchedTags.push(...config.tags);
        requiredSkills.push(config.type);
        
        if (!projectType || projectType === '通用任务') {
          projectType = config.type;
        }
      }
    }

    // 根据类别生成子任务
    if (matchedCategories.includes('data')) {
      subtasks.push('读取数据文件', '数据清洗', '统计分析', '生成报告');
    }
    if (matchedCategories.includes('code')) {
      subtasks.push('分析需求', '生成代码', '代码格式化', '验证语法');
    }
    if (matchedCategories.includes('file')) {
      subtasks.push('打开文件', '处理内容', '保存结果');
    }
    if (subtasks.length === 0) {
      subtasks.push('分析需求', '执行任务', '输出结果');
    }

    return {
      originalPrompt: prompt,
      projectType,
      categories: matchedCategories,
      tags: [...new Set(matchedTags)],
      subtasks,
      requiredSkills,
      description: prompt,
    };
  }
}

// ==================== 项目自动执行器 ====================
class ProjectAutoExecutor {
  private manager: SkillManager;
  private parser: SimpleTaskParser;

  constructor() {
    this.parser = new SimpleTaskParser();
    this.manager = new SkillManager({
      scanPaths: [path.resolve(__dirname, '../../skills')],
      autoScanOnStartup: true,
      loaderConfig: {
        enableSandbox: true,
        defaultTimeout: 30000,
        autoRunOnLoad: true,
      },
    });
  }

  /**
   * 初始化执行器
   */
  async initialize(): Promise<void> {
    console.log('🚀 初始化 ProjectAutoExecutor...');
    await this.manager.initialize(true);
    console.log(`✅ 已发现 ${this.manager.getAllSkills().length} 个 Skill`);
    
    // 列出所有可用技能
    const skills = this.manager.getAllSkills();
    if (skills.length > 0) {
      console.log('\n📋 可用技能列表:');
      skills.forEach(skill => {
        console.log(`   - ${skill.name} (${skill.tags.join(', ') || '无标签'})`);
      });
    }
  }

  /**
   * 根据任务描述匹配最合适的 Skill
   */
  private matchSkillsForProject(task: ParsedTask): MatchedSkill[] {
    const matches = this.manager.matchSkillsForTask(
      task.description,
      task.tags
    );

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * 执行项目
   */
  async executeProject(prompt: string): Promise<ProjectExecutionResult> {
    console.log('\n' + '='.repeat(70));
    console.log(`  🚀 开始执行项目: ${prompt}`);
    console.log('='.repeat(70));

    const startTime = Date.now();
    const results: SkillExecutionResult[] = [];

    try {
      // 1. 解析用户需求
      console.log('\n📌 步骤 1: 解析用户需求');
      const task = this.parser.parseProjectPrompt(prompt);
      console.log(`   ✅ 项目类型: ${task.projectType}`);
      console.log(`   📋 识别到的类别: ${task.categories.join(', ')}`);
      console.log(`   🏷️  技能标签: ${task.tags.join(', ')}`);
      
      if (task.subtasks.length > 0) {
        console.log(`   📝 子任务分解:`);
        task.subtasks.forEach((subtask, i) => {
          console.log(`      ${i + 1}. ${subtask}`);
        });
      }

      // 2. 匹配技能
      console.log('\n📌 步骤 2: 匹配相关 Skill');
      const matchedSkills = this.matchSkillsForProject(task);
      
      if (matchedSkills.length === 0) {
        console.log('   ⚠️  未找到匹配的 Skill');
        return {
          success: false,
          prompt,
          totalDuration: Date.now() - startTime,
          totalSkills: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          results: [],
          summary: '未找到匹配的技能',
        };
      }

      console.log(`   ✅ 找到 ${matchedSkills.length} 个匹配的 Skill:`);
      matchedSkills.forEach((match, i) => {
        console.log(`     ${i + 1}. ${match.skill.name} (匹配度: ${Math.round(match.score * 100)}%)`);
      });

      // 3. 执行技能
      console.log('\n📌 步骤 3: 执行技能');
      for (const match of matchedSkills) {
        const skill = match.skill;
        console.log(`   \n   🚀 执行: ${skill.name}`);
        
        try {
          const result = await this.manager.executeSkill({
            skillId: skill.id,
            input: {
              task: prompt,
              parsedTask: task,
              subtasks: task.subtasks,
              timestamp: new Date().toISOString(),
            },
            context: {
              sessionId: `project-${Date.now()}`,
              userId: 'auto-executor',
            },
          });

          results.push(result);
          console.log(`   ${result.success ? '✅' : '❌'} ${skill.name} - 耗时: ${result.duration}ms`);
          
          if (result.success && result.result) {
            const resultStr = typeof result.result === 'string' 
              ? result.result 
              : JSON.stringify(result.result);
            console.log(`      输出: ${resultStr.slice(0, 100)}${resultStr.length > 100 ? '...' : ''}`);
          } else if (!result.success) {
            console.log(`      ❌ 错误: ${result.error}`);
          }
        } catch (error: any) {
          console.log(`   ❌ ${skill.name} - 异常: ${error.message}`);
          results.push({
            success: false,
            error: error.message,
            duration: 0,
          } as SkillExecutionResult);
        }
      }

    } catch (error: any) {
      console.log(`   ❌ 执行失败: ${error.message}`);
    }

    // 4. 汇总结果
    console.log('\n' + '='.repeat(70));
    console.log('📊 项目执行报告');
    console.log('='.repeat(70));

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📋 项目描述: ${prompt}`);
    console.log(`⏱️  总耗时: ${duration}ms`);
    console.log(`✅ 成功执行: ${successCount} 个技能`);
    console.log(`❌ 失败: ${failCount} 个技能`);
    console.log(`📈 成功率: ${results.length > 0 ? Math.round(successCount / results.length * 100) : 0}%`);

    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│                    执行结果汇总                            │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    results.forEach((result, i) => {
      const status = result.success ? '✅' : '❌';
      console.log(`│ ${status} 技能 ${i + 1}: ${result.success ? '成功' : '失败'}`);
    });
    console.log('└─────────────────────────────────────────────────────────────┘');

    return {
      success: failCount === 0,
      prompt,
      totalDuration: duration,
      totalSkills: results.length,
      successfulExecutions: successCount,
      failedExecutions: failCount,
      results,
      summary: results.length > 0 
        ? `成功执行 ${successCount}/${results.length} 个技能，耗时 ${duration}ms`
        : '未执行任何技能',
    };
  }

  /**
   * 销毁资源
   */
  async destroy(): Promise<void> {
    await this.manager.destroy();
  }
}

// ==================== 主函数 ====================
async function main() {
  // 创建执行器
  const executor = new ProjectAutoExecutor();
  
  try {
    // 初始化
    await executor.initialize();
    
    // 示例项目列表
    const projects = [
      '帮我处理一份CSV数据文件，进行数据清洗和统计分析',
      '帮我生成一个简单的用户管理API代码',
      '帮我读取一个JSON文件并处理数据',
    ];

    // 执行示例项目
    for (const project of projects) {
      console.log(`\n\n🌟 示例项目: ${project}`);
      await executor.executeProject(project);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

  } catch (error: any) {
    console.error('❌ 执行失败:', error.message);
  } finally {
    // 清理资源
    await executor.destroy();
    console.log('\n👋 感谢使用 Kite AI 项目助手!');
  }
}

// 运行
main().catch(console.error);
