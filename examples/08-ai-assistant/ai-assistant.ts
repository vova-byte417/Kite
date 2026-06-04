/**
 * AI 助手示例 - 集成 DeepSeek API
 * 
 * 本示例演示如何使用 DeepSeek API 解析用户输入的项目描述，
 * 自动匹配和执行相关 Skill 来完成用户的任务。
 * 
 * 使用方式:
 * 1. 设置环境变量 DEEPSEEK_API_KEY
 * 2. 运行: npx ts-node examples/08-ai-assistant/ai-assistant.ts
 * 
 * @requires deepseek-chat
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { SkillManager, SkillExecutionResult, Skill } from '../../src';

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== DeepSeek API 配置 ====================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '***REMOVED***';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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

interface ExecutionPlan {
  task: ParsedTask;
  matchedSkills: MatchedSkill[];
  executionOrder: string[];
  parallelBatches: string[][];
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
  aiResponse: string;
}

// ==================== DeepSeek API 客户端 ====================
class DeepSeekClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string = DEEPSEEK_API_URL) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * 调用 DeepSeek API 解析用户输入
   */
  async parseProjectPrompt(prompt: string): Promise<ParsedTask> {
    const systemPrompt = `
你是一个专业的项目任务解析器。请分析用户的项目描述，输出结构化的任务信息。

输出格式要求（JSON格式）：
{
  "projectType": "项目类型，如：数据分析、代码生成、文件处理、网页爬虫等",
  "categories": ["类别标签列表，如：data, code, file, web"],
  "tags": ["技能标签列表，用于匹配Skill"],
  "subtasks": ["分解后的子任务列表"],
  "requiredSkills": ["需要的技能名称或类型"]
}

请严格按照JSON格式输出，不要包含任何额外的解释文本。

用户项目描述：
`;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt.trim() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API 调用失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';

    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(content);
      return {
        originalPrompt: prompt,
        projectType: parsed.projectType || '未知',
        categories: parsed.categories || [],
        tags: parsed.tags || [],
        subtasks: parsed.subtasks || [],
        requiredSkills: parsed.requiredSkills || [],
        description: prompt,
      };
    } catch {
      // 如果JSON解析失败，尝试提取JSON片段
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            originalPrompt: prompt,
            projectType: parsed.projectType || '未知',
            categories: parsed.categories || [],
            tags: parsed.tags || [],
            subtasks: parsed.subtasks || [],
            requiredSkills: parsed.requiredSkills || [],
            description: prompt,
          };
        } catch {
          // 如果还是失败，返回默认解析结果
          return this.fallbackParse(prompt);
        }
      }
      return this.fallbackParse(prompt);
    }
  }

  /**
   * 降级解析 - 基于关键词匹配
   */
  private fallbackParse(prompt: string): ParsedTask {
    const keywords: Record<string, string[]> = {
      'data': ['数据', '分析', '统计', 'csv', 'json', 'dataset', '处理'],
      'code': ['代码', '生成', '编写', 'script', 'function', 'class'],
      'file': ['文件', '读写', '保存', '加载', '导出', 'import', 'export'],
      'web': ['网页', '爬虫', '抓取', 'scrape', 'api', 'http'],
      'image': ['图片', '图像', '处理', '生成', 'resize', 'compress'],
      'test': ['测试', '验证', 'unit', 'check'],
      'git': ['git', '仓库', 'commit', 'push', 'pull'],
      'translate': ['翻译', '语言', '英文', '中文'],
    };

    const matchedCategories: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const [category, terms] of Object.entries(keywords)) {
      if (terms.some(term => lowerPrompt.includes(term))) {
        matchedCategories.push(category);
      }
    }

    // 简单推断项目类型
    let projectType = '未知';
    if (matchedCategories.includes('data')) projectType = '数据分析';
    else if (matchedCategories.includes('code')) projectType = '代码生成';
    else if (matchedCategories.includes('file')) projectType = '文件处理';
    else if (matchedCategories.includes('web')) projectType = '网页爬虫';

    return {
      originalPrompt: prompt,
      projectType,
      categories: matchedCategories,
      tags: matchedCategories,
      subtasks: ['分析需求', '执行任务', '生成结果'],
      requiredSkills: matchedCategories,
      description: prompt,
    };
  }
}

// ==================== 项目自动执行器 ====================
class ProjectAutoExecutor {
  private manager: SkillManager;
  private aiClient: DeepSeekClient;

  constructor(apiKey: string) {
    this.aiClient = new DeepSeekClient(apiKey);
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
   * 构建任务执行计划
   */
  private buildExecutionPlan(task: ParsedTask): ExecutionPlan {
    const matchedSkills = this.matchSkillsForProject(task);
    
    const plan: ExecutionPlan = {
      task,
      matchedSkills,
      executionOrder: [],
      parallelBatches: [],
    };

    if (matchedSkills.length > 0) {
      const topology = this.manager.computeDependencyTopology();
      plan.executionOrder = topology.order;
      plan.parallelBatches = topology.levels;
    }

    return plan;
  }

  /**
   * 执行项目
   */
  async executeProject(prompt: string): Promise<ProjectExecutionResult> {
    console.log('\n' + '='.repeat(70));
    console.log(`  🚀 开始执行项目: ${prompt}`);
    console.log('='.repeat(70));

    const startTime = Date.now();
    let aiResponse = '';
    const results: SkillExecutionResult[] = [];

    try {
      // 1. 使用 DeepSeek API 解析用户需求
      console.log('\n📌 步骤 1: 解析用户需求 (调用 DeepSeek API)');
      const task = await this.aiClient.parseProjectPrompt(prompt);
      aiResponse = JSON.stringify(task, null, 2);
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
          aiResponse,
        };
      }

      console.log(`   ✅ 找到 ${matchedSkills.length} 个匹配的 Skill:`);
      matchedSkills.forEach((match, i) => {
        console.log(`     ${i + 1}. ${match.skill.name} (匹配度: ${Math.round(match.score * 100)}%)`);
      });

      // 3. 构建执行计划
      console.log('\n📌 步骤 3: 构建执行计划');
      const plan = this.buildExecutionPlan(task);

      // 4. 执行技能
      console.log('\n📌 步骤 4: 执行技能');
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
            console.log(`      输出: ${JSON.stringify(result.result).slice(0, 100)}...`);
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
      console.log(`   ❌ AI 解析失败: ${error.message}`);
      console.log('   🔄 使用降级解析...');
      
      // 使用降级解析
      const task = this.aiClient['fallbackParse'](prompt);
      aiResponse = JSON.stringify(task, null, 2);
      
      // 尝试匹配技能
      const matchedSkills = this.matchSkillsForProject(task);
      
      console.log(`   ✅ 找到 ${matchedSkills.length} 个匹配的 Skill`);
      
      for (const match of matchedSkills) {
        const skill = match.skill;
        console.log(`   \n   🚀 执行: ${skill.name}`);
        
        try {
          const result = await this.manager.executeSkill({
            skillId: skill.id,
            input: { task: prompt },
            context: { sessionId: `project-${Date.now()}` },
          });
          results.push(result);
          console.log(`   ${result.success ? '✅' : '❌'} ${skill.name}`);
        } catch (e: any) {
          console.log(`   ❌ ${skill.name} - ${e.message}`);
        }
      }
    }

    // 5. 汇总结果
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
      aiResponse,
    };
  }

  /**
   * 销毁资源
   */
  async destroy(): Promise<void> {
    await this.manager.destroy();
  }
}

// ==================== 命令行交互模式 ====================
async function runInteractiveMode(executor: ProjectAutoExecutor) {
  console.log('\n' + '🎉'.repeat(70));
  console.log('              Kite AI 项目助手 - 交互模式');
  console.log('🎉'.repeat(70));
  console.log('💡 输入项目描述，我会帮你自动匹配并执行相关技能');
  console.log('📝 输入 "exit" 或 "quit" 退出');
  console.log(''.repeat(70));

  // 模拟命令行输入（实际使用时可以用 readline）
  const prompts = [
    '帮我处理一份CSV数据文件，进行数据清洗和统计分析',
    '帮我生成一个简单的用户管理API代码',
    '帮我抓取一个网页的内容',
  ];

  for (const prompt of prompts) {
    console.log(`\n\n📤 用户输入: ${prompt}`);
    await executor.executeProject(prompt);
    
    // 等待用户输入（模拟）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// ==================== 主函数 ====================
async function main() {
  // 检查 API Key
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-api-key-here') {
    console.error('❌ 请设置环境变量 DEEPSEEK_API_KEY');
    console.error('   export DEEPSEEK_API_KEY=your-api-key');
    process.exit(1);
  }

  // 创建执行器
  const executor = new ProjectAutoExecutor(DEEPSEEK_API_KEY);
  
  try {
    // 初始化
    await executor.initialize();
    
    // 运行交互模式
    await runInteractiveMode(executor);
    
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
