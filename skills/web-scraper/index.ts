/**
 * 网页爬虫 Skill - 无 skill.json 配置的示例
 * 会被自动发现并生成默认配置
 */

import { ExecutionContext } from '../../src/skill/types';

/**
 * 执行网页爬取
 */
export const execute = async (input: any, context?: ExecutionContext) => {
  console.log(`[网页爬虫] 开始爬取: ${input.url}`);

  // 模拟爬取过程
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    url: input.url,
    title: '示例页面标题',
    content: '这是从网页中提取的内容...',
    links: ['https://example.com/1', 'https://example.com/2'],
    scrapedAt: new Date().toISOString()
  };
};

/**
 * 加载钩子
 */
export const onLoad = async () => {
  console.log('[网页爬虫] Skill 已加载');
};
