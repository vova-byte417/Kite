/**
 * Kite AI Skill System - 项目主入口
 *
 * 此文件导出 Skill 系统的所有模块
 *
 * @version 2.1.0
 * @author Kite AI Team
 */

// 导出完整的 Skill 系统
export * from './skill';

// 默认导出 SkillManager
export { SkillManager as default } from './skill';

// 版本信息
export const VERSION = '2.1.0';
export const NAME = 'kite-skill-system';

console.log(`
╔═══════════════════════════════════════════════════╗
║     Kite AI Skill System v${VERSION}                    ║
╠═══════════════════════════════════════════════════╣
║  完整的 Skill 发现、加载、执行和管理框架          ║
╚═══════════════════════════════════════════════════╝
`);
