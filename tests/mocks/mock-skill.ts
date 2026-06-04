import { SkillExport } from '@/skill/types';

/**
 * 最简单的 mock Skill - 用于基础测试
 */
const SimpleMockSkill: SkillExport = {
  async execute(input: any) {
    return {
      success: true,
      message: 'Hello from mock skill!',
      inputReceived: input,
      timestamp: Date.now()
    };
  },

  async validateInput(input: any) {
    return input !== null && typeof input === 'object';
  }
};

export default SimpleMockSkill;
