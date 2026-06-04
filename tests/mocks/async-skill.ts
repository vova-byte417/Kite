import { SkillExport } from '@/skill/types';

let callCount = 0;

/**
 * 异步 Skill - 用于测试超时、重试和失败场景
 */
const AsyncSkill: SkillExport = {
  async execute(input: { delay?: number; shouldFail?: boolean; failNTimes?: number }) {
    const delay = input.delay || 100;
    const shouldFail = input.shouldFail || false;
    const failNTimes = input.failNTimes || 0;

    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, delay));

    // 模拟前 N 次失败
    if (failNTimes > 0 && callCount < failNTimes) {
      callCount++;
      throw new Error(`Simulated failure ${callCount}/${failNTimes}`);
    }

    callCount = 0;
    return { success: true, delay, processed: true };
  },

  async validateInput(input: any) {
    return true;
  },

  onLoad: async () => {
    console.log('[AsyncSkill] Loaded');
  },

  onUnload: async () => {
    console.log('[AsyncSkill] Unloaded');
  }
};

export default AsyncSkill;
