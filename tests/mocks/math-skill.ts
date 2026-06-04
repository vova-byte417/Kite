import { SkillExport } from '@/skill/types';

/**
 * 数学运算 Skill - 用于测试输入验证和复杂逻辑
 */
const MathSkill: SkillExport = {
  async execute(input: { operation: string; a: number; b: number }) {
    const { operation, a, b } = input;

    switch (operation) {
      case 'add':
        return { result: a + b, operation: 'addition' };
      case 'subtract':
        return { result: a - b, operation: 'subtraction' };
      case 'multiply':
        return { result: a * b, operation: 'multiplication' };
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero');
        }
        return { result: a / b, operation: 'division' };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },

  async validateInput(input: any) {
    if (!input || typeof input !== 'object') return false;
    if (typeof input.a !== 'number' || typeof input.b !== 'number') return false;
    return ['add', 'subtract', 'multiply', 'divide'].includes(input.operation);
  }
};

export default MathSkill;
