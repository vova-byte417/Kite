/**
 * 代码生成 Skill - 主入口
 *
 * 提供模板驱动的代码生成能力
 *
 * @author vova
 * @version 1.0.0
 */

import { SkillExport, ExecutionContext } from '../../skill-system/src/types';

// ==================== 输入类型定义 ====================

export interface GenerateClassInput {
  /** 操作类型 */
  operation: 'generate-class';
  /** 类名 */
  className: string;
  /** 类属性列表 */
  properties?: Array<{
    name: string;
    type: string;
    visibility?: 'public' | 'private' | 'protected';
    defaultValue?: string;
    description?: string;
  }>;
  /** 类方法列表 */
  methods?: Array<{
    name: string;
    returnType: string;
    parameters?: Array<{ name: string; type: string }>;
    visibility?: 'public' | 'private' | 'protected';
    body?: string;
  }>;
  /** 是否添加构造函数 */
  withConstructor?: boolean;
  /** 是否添加 Getter/Setter */
  withGettersSetters?: boolean;
  /** 语言类型 */
  language?: 'typescript' | 'javascript' | 'python' | 'java';
  /** 类描述 */
  description?: string;
}

export interface GenerateInterfaceInput {
  /** 操作类型 */
  operation: 'generate-interface';
  /** 接口名 */
  interfaceName: string;
  /** 接口属性列表 */
  properties: Array<{
    name: string;
    type: string;
    optional?: boolean;
    description?: string;
  }>;
  /** 接口方法列表 */
  methods?: Array<{
    name: string;
    returnType: string;
    parameters?: Array<{ name: string; type: string }>;
  }>;
  /** 继承的接口 */
  extends?: string[];
  /** 语言类型 */
  language?: 'typescript' | 'java';
}

export interface GenerateEnumInput {
  /** 操作类型 */
  operation: 'generate-enum';
  /** 枚举名 */
  enumName: string;
  /** 枚举值列表 */
  values: Array<{
    name: string;
    value?: string | number;
    description?: string;
  }>;
  /** 语言类型 */
  language?: 'typescript' | 'javascript' | 'python' | 'java';
}

export interface GenerateFunctionInput {
  /** 操作类型 */
  operation: 'generate-function';
  /** 函数名 */
  functionName: string;
  /** 参数列表 */
  parameters?: Array<{
    name: string;
    type: string;
    optional?: boolean;
    defaultValue?: string;
  }>;
  /** 返回类型 */
  returnType?: string;
  /** 函数体代码 */
  body?: string;
  /** 是否异步 */
  async?: boolean;
  /** 语言类型 */
  language?: 'typescript' | 'javascript' | 'python' | 'java';
  /** 函数描述 */
  description?: string;
}

export interface GenerateComponentInput {
  /** 操作类型 */
  operation: 'generate-component';
  /** 组件名 */
  componentName: string;
  /** 组件 Props */
  props?: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
  }>;
  /** 组件状态 */
  state?: Array<{
    name: string;
    type: string;
    defaultValue?: string;
  }>;
  /** 框架类型 */
  framework: 'react' | 'vue' | 'angular';
  /** 是否使用 TypeScript */
  typescript?: boolean;
  /** 是否使用 Hooks */
  useHooks?: boolean;
}

export interface GenerateFileHeaderInput {
  /** 操作类型 */
  operation: 'generate-header';
  /** 文件名 */
  fileName: string;
  /** 文件描述 */
  description: string;
  /** 作者名 */
  author?: string;
  /** 版本号 */
  version?: string;
  /** 许可证 */
  license?: string;
  /** 导入语句 */
  imports?: Array<{
    module: string;
    names?: string[];
    default?: string;
  }>;
}

export interface GenerateCRUDInput {
  /** 操作类型 */
  operation: 'generate-crud';
  /** 实体名称 */
  entityName: string;
  /** 实体字段 */
  fields: Array<{
    name: string;
    type: string;
    primary?: boolean;
    nullable?: boolean;
  }>;
  /** 输出类型 */
  outputType: 'repository' | 'service' | 'controller' | 'full';
  /** ORM 类型 */
  orm?: 'typeorm' | 'prisma' | 'sequelize' | 'mongoose';
  /** 语言类型 */
  language?: 'typescript' | 'javascript' | 'java' | 'python';
}

export type CodeGenerationInput =
  | GenerateClassInput
  | GenerateInterfaceInput
  | GenerateEnumInput
  | GenerateFunctionInput
  | GenerateComponentInput
  | GenerateFileHeaderInput
  | GenerateCRUDInput;

// ==================== 输出类型定义 ====================

export interface CodeGenerationOutput {
  success: boolean;
  /** 生成的代码 */
  code: string;
  /** 代码语言 */
  language: string;
  /** 代码类型 */
  codeType: string;
  /** 文件扩展名建议 */
  fileExtension: string;
}

// ==================== 代码生成器 ====================

/**
 * TypeScript 类生成器
 */
function generateTypeScriptClass(input: GenerateClassInput): string {
  const lines: string[] = [];

  // JSDoc 注释
  if (input.description) {
    lines.push('/**');
    lines.push(` * ${input.description}`);
    lines.push(` * @author 代码生成器`);
    lines.push(' */');
  }

  // 类定义
  lines.push(`class ${input.className} {`);
  lines.push('');

  // 属性
  if (input.properties) {
    for (const prop of input.properties) {
      const visibility = prop.visibility || 'public';
      const optional = prop.type.endsWith('?') ? '?' : '';
      const defaultValue = prop.defaultValue ? ` = ${prop.defaultValue}` : '';
      if (prop.description) {
        lines.push(`  /** ${prop.description} */`);
      }
      lines.push(`  ${visibility} ${prop.name}${optional}: ${prop.type.replace('?', '')}${defaultValue};`);
      lines.push('');
    }
  }

  // 构造函数
  if (input.withConstructor && input.properties) {
    lines.push('  constructor(');
    const params = input.properties
      .filter(p => p.visibility !== 'private')
      .map(p => `${p.name}: ${p.type.replace('?', '')}`)
      .join(',\n      ');
    lines.push(`      ${params}`);
    lines.push('  ) {');
    for (const prop of input.properties) {
      lines.push(`    this.${prop.name} = ${prop.name};`);
    }
    lines.push('  }');
    lines.push('');
  }

  // Getters & Setters
  if (input.withGettersSetters && input.properties) {
    for (const prop of input.properties) {
      const capitalized = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
      lines.push(`  get${capitalized}(): ${prop.type.replace('?', '')} {`);
      lines.push(`    return this.${prop.name};`);
      lines.push('  }');
      lines.push('');
      lines.push(`  set${capitalized}(value: ${prop.type.replace('?', '')}): void {`);
      lines.push(`    this.${prop.name} = value;`);
      lines.push('  }');
      lines.push('');
    }
  }

  // 方法
  if (input.methods) {
    for (const method of input.methods) {
      const visibility = method.visibility || 'public';
      const params = method.parameters
        ?.map(p => `${p.name}: ${p.type}`)
        .join(', ') || '';
      lines.push(`  ${visibility} ${method.name}(${params}): ${method.returnType} {`);
      lines.push(method.body || `    // TODO: 实现 ${method.name} 方法`);
      lines.push('  }');
      lines.push('');
    }
  }

  lines.push('}');
  lines.push('');
  lines.push(`export default ${input.className};`);

  return lines.join('\n');
}

/**
 * TypeScript 接口生成器
 */
function generateTypeScriptInterface(input: GenerateInterfaceInput): string {
  const lines: string[] = [];

  lines.push(`interface ${input.interfaceName}${input.extends?.length ? ` extends ${input.extends.join(', ')}` : ''} {`);
  lines.push('');

  for (const prop of input.properties) {
    const optional = prop.optional ? '?' : '';
    if (prop.description) {
      lines.push(`  /** ${prop.description} */`);
    }
    lines.push(`  ${prop.name}${optional}: ${prop.type};`);
    lines.push('');
  }

  if (input.methods) {
    for (const method of input.methods) {
      const params = method.parameters
        ?.map(p => `${p.name}: ${p.type}`)
        .join(', ') || '';
      lines.push(`  ${method.name}(${params}): ${method.returnType};`);
      lines.push('');
    }
  }

  lines.push('}');
  lines.push('');
  lines.push(`export default ${input.interfaceName};`);

  return lines.join('\n');
}

/**
 * TypeScript 枚举生成器
 */
function generateTypeScriptEnum(input: GenerateEnumInput): string {
  const lines: string[] = [];

  lines.push(`enum ${input.enumName} {`);

  for (let i = 0; i < input.values.length; i++) {
    const value = input.values[i];
    const isLast = i === input.values.length - 1;
    const separator = isLast ? '' : ',';

    if (value.description) {
      lines.push(`  /** ${value.description} */`);
    }

    if (value.value !== undefined) {
      lines.push(`  ${value.name} = ${typeof value.value === 'string' ? `'${value.value}'` : value.value}${separator}`);
    } else {
      lines.push(`  ${value.name}${separator}`);
    }
  }

  lines.push('}');
  lines.push('');
  lines.push(`export default ${input.enumName};`);

  return lines.join('\n');
}

/**
 * TypeScript 函数生成器
 */
function generateTypeScriptFunction(input: GenerateFunctionInput): string {
  const lines: string[] = [];

  if (input.description) {
    lines.push('/**');
    lines.push(` * ${input.description}`);
    if (input.parameters) {
      for (const param of input.parameters) {
        lines.push(` * @param ${param.name} - 参数描述`);
      }
    }
    if (input.returnType && input.returnType !== 'void') {
      lines.push(` * @returns 返回值描述`);
    }
    lines.push(' */');
  }

  const asyncKeyword = input.async ? 'async ' : '';
  const params = input.parameters
    ?.map(p => {
      const optional = p.optional ? '?' : '';
      const defaultValue = p.defaultValue ? ` = ${p.defaultValue}` : '';
      return `${p.name}${optional}: ${p.type}${defaultValue}`;
    })
    .join(', ') || '';
  const returnType = input.returnType ? `: ${input.returnType}` : '';

  lines.push(`${asyncKeyword}function ${input.functionName}(${params})${returnType} {`);
  lines.push(input.body || '  // TODO: 实现函数逻辑');
  lines.push('}');
  lines.push('');
  lines.push(`export default ${input.functionName};`);

  return lines.join('\n');
}

/**
 * React 组件生成器
 */
function generateReactComponent(input: GenerateComponentInput): string {
  const lines: string[] = [];
  const ts = input.typescript;
  const componentName = input.componentName;

  // 导入语句
  if (input.useHooks) {
    const hookImports = input.state?.length ? `, { useState${input.state?.some(s => s.type.includes('Effect')) ? ', useEffect' : ''} }` : '';
    lines.push(`import React${hookImports} from 'react';`);
  } else {
    lines.push(`import React from 'react';`);
  }
  lines.push('');

  // Props 接口
  if (ts && input.props?.length) {
    lines.push(`interface ${componentName}Props {`);
    for (const prop of input.props) {
      const optional = prop.required === false ? '?' : '';
      lines.push(`  ${prop.name}${optional}: ${prop.type};`);
    }
    lines.push('}');
    lines.push('');
  }

  // 组件定义
  const propType = ts ? `: ${componentName}Props` : '';
  lines.push(`const ${componentName} = (props${propType}) => {`);

  if (input.useHooks) {
    // State Hooks
    if (input.state) {
      for (const state of input.state) {
        const setterName = `set${state.name.charAt(0).toUpperCase() + state.name.slice(1)}`;
        const defaultValue = state.defaultValue || `''`;
        lines.push(`  const [${state.name}, ${setterName}] = useState${ts ? `<${state.type}>` : ''}(${defaultValue});`);
      }
    }
    lines.push('');
  }

  // Props 解构
  if (input.props?.length) {
    const propNames = input.props.map(p => p.name).join(', ');
    lines.push(`  const { ${propNames} } = props;`);
    lines.push('');
  }

  // 返回 JSX
  lines.push(`  return (`);
  lines.push(`    <div className="${componentName.toLowerCase()}">`);
  lines.push(`      <h2>${componentName}</h2>`);
  lines.push(`      {/* 组件内容 */}`);
  lines.push(`    </div>`);
  lines.push(`  );`);

  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${componentName};`);

  return lines.join('\n');
}

/**
 * 文件头生成器
 */
function generateFileHeader(input: GenerateFileHeaderInput): string {
  const lines: string[] = [];

  // 文件注释头
  lines.push('/**');
  lines.push(` * ${input.fileName}`);
  lines.push(` *`);
  lines.push(` * ${input.description}`);
  lines.push(` *`);
  if (input.author) {
    lines.push(` * @author ${input.author}`);
  }
  if (input.version) {
    lines.push(` * @version ${input.version}`);
  }
  if (input.license) {
    lines.push(` * @license ${input.license}`);
  }
  lines.push(' */');
  lines.push('');

  // 导入语句
  if (input.imports) {
    for (const imp of input.imports) {
      if (imp.default && imp.names?.length) {
        lines.push(`import ${imp.default}, { ${imp.names.join(', ')} } from '${imp.module}';`);
      } else if (imp.default) {
        lines.push(`import ${imp.default} from '${imp.module}';`);
      } else if (imp.names?.length) {
        lines.push(`import { ${imp.names.join(', ')} } from '${imp.module}';`);
      } else {
        lines.push(`import '${imp.module}';`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * CRUD 代码生成器
 */
function generateCRUD(input: GenerateCRUDInput): string {
  const entityLower = input.entityName.toLowerCase();
  const entityName = input.entityName;
  const lines: string[] = [];

  // Repository 层
  if (['repository', 'full'].includes(input.outputType)) {
    lines.push(`import { Repository, EntityRepository } from 'typeorm';`);
    lines.push(`import { ${entityName} } from '../entities/${entityName}';`);
    lines.push('');
    lines.push(`@EntityRepository(${entityName})`);
    lines.push(`class ${entityName}Repository extends Repository<${entityName}> {`);
    lines.push('');
    lines.push(`  async create${entityName}(data: Partial<${entityName}>): Promise<${entityName}> {`);
    lines.push(`    const entity = this.create(data);`);
    lines.push(`    return await this.save(entity);`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  async update${entityName}(id: string, data: Partial<${entityName}>): Promise<${entityName}> {`);
    lines.push(`    await this.update(id, data);`);
    lines.push(`    return await this.findOne(id);`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  async delete${entityName}(id: string): Promise<void> {`);
    lines.push(`    await this.delete(id);`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  async findAll(): Promise<${entityName}[]> {`);
    lines.push(`    return await this.find();`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  async findById(id: string): Promise<${entityName}> {`);
    lines.push(`    return await this.findOne(id);`);
    lines.push(`  }`);
    lines.push('}');
    lines.push('');
    lines.push(`export default ${entityName}Repository;`);
  }

  return lines.join('\n');
}

// ==================== Skill 导出 ====================

const skillExport: SkillExport = {
  /**
   * 主执行函数
   */
  execute: async (input: CodeGenerationInput, context?: ExecutionContext): Promise<CodeGenerationOutput> => {
    let code: string;
    let language: string;
    let codeType: string;
    let fileExtension: string;

    switch (input.operation) {
      case 'generate-class':
        language = input.language || 'typescript';
        codeType = 'class';
        fileExtension = language === 'typescript' ? '.ts' : '.js';
        code = generateTypeScriptClass(input);
        break;

      case 'generate-interface':
        language = input.language || 'typescript';
        codeType = 'interface';
        fileExtension = '.ts';
        code = generateTypeScriptInterface(input);
        break;

      case 'generate-enum':
        language = input.language || 'typescript';
        codeType = 'enum';
        fileExtension = language === 'typescript' ? '.ts' : '.js';
        code = generateTypeScriptEnum(input);
        break;

      case 'generate-function':
        language = input.language || 'typescript';
        codeType = 'function';
        fileExtension = language === 'typescript' ? '.ts' : '.js';
        code = generateTypeScriptFunction(input);
        break;

      case 'generate-component':
        language = input.typescript ? 'typescript' : 'javascript';
        codeType = 'component';
        fileExtension = input.typescript ? '.tsx' : '.jsx';
        code = generateReactComponent(input);
        break;

      case 'generate-header':
        language = 'typescript';
        codeType = 'header';
        fileExtension = '.ts';
        code = generateFileHeader(input);
        break;

      case 'generate-crud':
        language = input.language || 'typescript';
        codeType = 'crud';
        fileExtension = '.ts';
        code = generateCRUD(input);
        break;

      default:
        throw new Error(`不支持的操作类型: ${(input as any).operation}`);
    }

    return {
      success: true,
      code,
      language,
      codeType,
      fileExtension
    };
  },

  /**
   * 输入验证
   */
  validateInput: async (input: CodeGenerationInput): Promise<boolean> => {
    if (!input || !input.operation) {
      return false;
    }

    const validOperations = [
      'generate-class',
      'generate-interface',
      'generate-enum',
      'generate-function',
      'generate-component',
      'generate-header',
      'generate-crud'
    ];

    return validOperations.includes(input.operation);
  },

  /**
   * Skill 加载钩子
   */
  onLoad: async (): Promise<void> => {
    console.log('[Code-Generation Skill] 加载完成，准备就绪');
  }
};

export default skillExport;
