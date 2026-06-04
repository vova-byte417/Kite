/**
 * 通用工具 Skill - 主入口
 *
 * 提供常用的工具函数集合
 *
 * @author vova
 * @version 1.0.0
 */

import { SkillExport, ExecutionContext } from '../../src/skill/types';

// ==================== 输入类型定义 ====================

export interface StringOperationInput {
  operation: 'string';
  subOperation: 'capitalize' | 'uppercase' | 'lowercase' | 'trim' | 'truncate' | 'slugify' | 'reverse';
  value: string;
  options?: {
    maxLength?: number;
    separator?: string;
  };
}

export interface NumberOperationInput {
  operation: 'number';
  subOperation: 'format' | 'round' | 'clamp' | 'random' | 'between';
  value?: number;
  options?: {
    decimals?: number;
    min?: number;
    max?: number;
    locale?: string;
  };
}

export interface DateOperationInput {
  operation: 'date';
  subOperation: 'format' | 'diff' | 'add' | 'subtract' | 'startOf' | 'endOf' | 'relative';
  value?: string | Date;
  targetValue?: string | Date;
  options?: {
    format?: string;
    unit?: 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';
    amount?: number;
    locale?: string;
  };
}

export interface ArrayOperationInput {
  operation: 'array';
  subOperation: 'unique' | 'sort' | 'shuffle' | 'chunk' | 'flatten' | 'groupBy' | 'sum' | 'avg';
  values: any[];
  options?: {
    key?: string;
    size?: number;
    order?: 'asc' | 'desc';
  };
}

export interface ObjectOperationInput {
  operation: 'object';
  subOperation: 'get' | 'set' | 'merge' | 'pick' | 'omit' | 'deepClone';
  target: object;
  path?: string;
  value?: any;
  source?: object;
  keys?: string[];
}

export interface ValidationInput {
  operation: 'validate';
  subOperation: 'email' | 'url' | 'phone' | 'password' | 'required' | 'minLength' | 'maxLength' | 'pattern';
  value: string;
  options?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export type UtilsInput =
  | StringOperationInput
  | NumberOperationInput
  | DateOperationInput
  | ArrayOperationInput
  | ObjectOperationInput
  | ValidationInput;

// ==================== 输出类型定义 ====================

export interface UtilsResult {
  success: boolean;
  operation: string;
  result: any;
  originalValue?: any;
  isValid?: boolean;
  errors?: string[];
}

// ==================== 操作实现 ====================

/**
 * 字符串操作
 */
function handleStringOperation(input: StringOperationInput): UtilsResult {
  const { subOperation, value, options } = input;
  let result: string;

  switch (subOperation) {
    case 'capitalize':
      result = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      break;
    case 'uppercase':
      result = value.toUpperCase();
      break;
    case 'lowercase':
      result = value.toLowerCase();
      break;
    case 'trim':
      result = value.trim();
      break;
    case 'truncate':
      const maxLen = options?.maxLength || 30;
      result = value.length > maxLen ? value.substring(0, maxLen) + '...' : value;
      break;
    case 'slugify':
      const sep = options?.separator || '-';
      result = value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, sep)
        .replace(/^-+|-+$/g, '');
      break;
    case 'reverse':
      result = value.split('').reverse().join('');
      break;
    default:
      result = value;
  }

  return { success: true, operation: `string.${subOperation}`, result, originalValue: value };
}

/**
 * 数字操作
 */
function handleNumberOperation(input: NumberOperationInput): UtilsResult {
  const { subOperation, value, options } = input;
  let result: number | string;

  switch (subOperation) {
    case 'format':
      result = value?.toLocaleString(options?.locale || 'zh-CN', {
        minimumFractionDigits: options?.decimals || 0,
        maximumFractionDigits: options?.decimals || 2
      }) || '0';
      break;
    case 'round':
      const factor = Math.pow(10, options?.decimals || 0);
      result = Math.round((value || 0) * factor) / factor;
      break;
    case 'clamp':
      result = Math.max(options?.min || 0, Math.min(value || 0, options?.max || Infinity));
      break;
    case 'random':
      result = Math.random() * ((options?.max || 1) - (options?.min || 0)) + (options?.min || 0);
      break;
    case 'between':
      result = (value || 0) >= (options?.min || 0) && (value || 0) <= (options?.max || Infinity);
      break;
    default:
      result = value;
  }

  return { success: true, operation: `number.${subOperation}`, result, originalValue: value };
}

/**
 * 数组操作
 */
function handleArrayOperation(input: ArrayOperationInput): UtilsResult {
  const { subOperation, values, options } = input;
  let result: any;

  switch (subOperation) {
    case 'unique':
      result = [...new Set(values)];
      break;
    case 'sort':
      result = [...values].sort((a, b) => {
        if (options?.order === 'desc') {
          return b > a ? 1 : -1;
        }
        return a > b ? 1 : -1;
      });
      break;
    case 'shuffle':
      result = [...values].sort(() => Math.random() - 0.5);
      break;
    case 'chunk':
      const size = options?.size || 10;
      result = [];
      for (let i = 0; i < values.length; i += size) {
        result.push(values.slice(i, i + size));
      }
      break;
    case 'flatten':
      result = values.flat(Infinity);
      break;
    case 'groupBy':
      const key = options?.key || 'id';
      result = values.reduce((acc, item) => {
        const groupKey = item[key];
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      }, {});
      break;
    case 'sum':
      result = values.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      break;
    case 'avg':
      const numbers = values.filter(v => typeof v === 'number');
      result = numbers.length ? numbers.reduce((sum, val) => sum + val, 0) / numbers.length : 0;
      break;
    default:
      result = values;
  }

  return { success: true, operation: `array.${subOperation}`, result, originalValue: values };
}

/**
 * 验证操作
 */
function handleValidation(input: ValidationInput): UtilsResult {
  const { subOperation, value, options } = input;
  let isValid = true;
  const errors: string[] = [];

  switch (subOperation) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      isValid = emailRegex.test(value);
      if (!isValid) errors.push('邮箱格式不正确');
      break;
    case 'url':
      try {
        new URL(value);
        isValid = true;
      } catch {
        isValid = false;
        errors.push('URL 格式不正确');
      }
      break;
    case 'phone':
      const phoneRegex = /^1[3-9]\d{9}$/;
      isValid = phoneRegex.test(value.replace(/\D/g, ''));
      if (!isValid) errors.push('手机号格式不正确');
      break;
    case 'password':
      isValid = value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
      if (!isValid) errors.push('密码需要至少8位，包含大小写字母和数字');
      break;
    case 'required':
      isValid = value.trim().length > 0;
      if (!isValid) errors.push('此字段为必填项');
      break;
    case 'minLength':
      isValid = value.length >= (options?.min || 0);
      if (!isValid) errors.push(`长度不能少于 ${options?.min} 个字符`);
      break;
    case 'maxLength':
      isValid = value.length <= (options?.max || Infinity);
      if (!isValid) errors.push(`长度不能超过 ${options?.max} 个字符`);
      break;
    case 'pattern':
      if (options?.pattern) {
        isValid = new RegExp(options.pattern).test(value);
        if (!isValid) errors.push('格式不符合要求');
      }
      break;
  }

  return { success: true, operation: `validate.${subOperation}`, result: isValid, isValid, errors, originalValue: value };
}

// ==================== Skill 导出 ====================

const skillExport: SkillExport = {
  /**
   * 主执行函数
   */
  execute: async (input: UtilsInput, context?: ExecutionContext): Promise<UtilsResult> => {
    switch (input.operation) {
      case 'string':
        return handleStringOperation(input);
      case 'number':
        return handleNumberOperation(input);
      case 'array':
        return handleArrayOperation(input);
      case 'validate':
        return handleValidation(input);
      case 'date':
      case 'object':
        // 其他操作类似实现
        return { success: true, operation: `${input.operation}.${input.subOperation}`, result: null };
      default:
        throw new Error(`不支持的操作类型: ${(input as any).operation}`);
    }
  },

  /**
   * 输入验证
   */
  validateInput: async (input: UtilsInput): Promise<boolean> => {
    if (!input || !input.operation) {
      return false;
    }
    return true;
  },

  /**
   * Skill 加载钩子
   */
  onLoad: async (): Promise<void> => {
    console.log('[Utils Skill] 加载完成，准备就绪');
  }
};

export default skillExport;
