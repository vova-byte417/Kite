/**
 * 测试运行 Skill - 主入口
 *
 * 提供单元测试和集成测试的执行能力
 *
 * @author vova
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillExport, ExecutionContext } from '../../src/skill/types';

const execAsync = promisify(exec);

// ==================== 输入类型定义 ====================

export interface RunTestsInput {
  /** 操作类型 */
  operation: 'run-tests';
  /** 测试文件或目录路径 */
  testPath?: string;
  /** 测试框架 */
  framework: 'jest' | 'vitest' | 'mocha' | 'cypress';
  /** 测试模式 */
  mode?: 'all' | 'watch' | 'coverage' | 'single';
  /** 要运行的测试用例模式 */
  testNamePattern?: string;
  /** 是否并行运行 */
  parallel?: boolean;
  /** 并发数量 */
  maxWorkers?: number;
  /** 是否生成报告 */
  generateReport?: boolean;
  /** 报告格式 */
  reportFormat?: 'json' | 'html' | 'junit';
  /** 额外的命令行参数 */
  extraArgs?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface GenerateTestFileInput {
  /** 操作类型 */
  operation: 'generate-test';
  /** 目标文件路径 */
  targetFile: string;
  /** 测试文件名 */
  testFileName?: string;
  /** 测试框架 */
  framework: 'jest' | 'vitest' | 'mocha';
  /** 测试类型 */
  testType?: 'unit' | 'integration' | 'e2e';
  /** 要测试的函数/方法名 */
  functions?: string[];
  /** 要测试的类名 */
  className?: string;
  /** 是否使用 TypeScript */
  typescript?: boolean;
  /** 输出目录 */
  outputDir?: string;
}

export interface RunLintInput {
  /** 操作类型 */
  operation: 'run-lint';
  /** 要检查的文件/目录 */
  targetPath?: string;
  /** Lint 工具 */
  linter: 'eslint' | 'prettier' | 'tsc' | 'all';
  /** 是否自动修复 */
  fix?: boolean;
  /** 输出格式 */
  format?: 'stylish' | 'json' | 'unix';
  /** 工作目录 */
  cwd?: string;
}

export interface GenerateCoverageReportInput {
  /** 操作类型 */
  operation: 'coverage-report';
  /** 覆盖率数据文件路径 */
  coveragePath?: string;
  /** 报告格式 */
  format: 'text' | 'html' | 'json' | 'lcov' | 'clover';
  /** 输出目录 */
  outputDir?: string;
  /** 阈值配置 */
  thresholds?: {
    statements?: number;
    branches?: number;
    functions?: number;
    lines?: number;
  };
}

export interface CheckTestExistsInput {
  /** 操作类型 */
  operation: 'check-tests';
  /** 源文件路径 */
  sourcePath: string;
  /** 测试目录 */
  testDir?: string;
  /** 测试文件后缀 */
  testSuffix?: string;
}

export type TestRunnerInput =
  | RunTestsInput
  | GenerateTestFileInput
  | RunLintInput
  | GenerateCoverageReportInput
  | CheckTestExistsInput;

// ==================== 输出类型定义 ====================

export interface TestRunResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  testResults?: Array<{
    testFilePath: string;
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
    errorMessage?: string;
  }>;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  reportPath?: string;
  rawOutput?: string;
}

export interface TestFileGenerationResult {
  success: boolean;
  testFilePath: string;
  content: string;
  testCount: number;
}

export interface LintResult {
  success: boolean;
  totalErrors: number;
  totalWarnings: number;
  filesChecked: number;
  issues?: Array<{
    filePath: string;
    line: number;
    column: number;
    severity: 'error' | 'warning';
    rule: string;
    message: string;
  }>;
  fixed?: number;
}

export interface CoverageReportResult {
  success: boolean;
  reportPath: string;
  format: string;
  summary: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  meetsThresholds?: boolean;
}

export interface TestCheckResult {
  success: boolean;
  hasTests: boolean;
  testFilePath?: string;
  testCount?: number;
  missingTests?: string[];
}

export type TestRunnerOutput =
  | TestRunResult
  | TestFileGenerationResult
  | LintResult
  | CoverageReportResult
  | TestCheckResult;

// ==================== 工具函数 ====================

/**
 * 执行 shell 命令
 */
async function executeCommand(
  command: string,
  cwd?: string,
  timeout?: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: timeout || 60000,
      encoding: 'utf8'
    });
    return { stdout, stderr, code: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      code: error.code || 1
    };
  }
}

/**
 * 解析 Jest 测试输出
 */
function parseJestOutput(stdout: string): Partial<TestRunResult> {
  const result: Partial<TestRunResult> = {};

  // 提取测试数量信息
  const testsMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed(?:,\s+(\d+)\s+skipped)?/);
  if (testsMatch) {
    result.passed = parseInt(testsMatch[1], 10);
    result.failed = parseInt(testsMatch[2], 10);
    result.skipped = parseInt(testsMatch[3] || '0', 10);
    result.totalTests = result.passed + result.failed + result.skipped;
  }

  // 提取覆盖率
  const coverageMatch = stdout.match(/Statements\s+:\s+([\d.]+)%/);
  if (coverageMatch) {
    result.coverage = {
      statements: parseFloat(coverageMatch[1]),
      branches: 0,
      functions: 0,
      lines: 0
    };
  }

  // 提取执行时间
  const timeMatch = stdout.match(/Time:\s+([\d.]+)s/);
  if (timeMatch) {
    result.duration = parseFloat(timeMatch[1]) * 1000;
  }

  return result;
}

// ==================== 操作实现 ====================

/**
 * 运行测试
 */
async function runTests(input: RunTestsInput): Promise<TestRunResult> {
  const frameworkCommands: Record<string, string> = {
    jest: 'npx jest',
    vitest: 'npx vitest run',
    mocha: 'npx mocha',
    cypress: 'npx cypress run'
  };

  let command = frameworkCommands[input.framework];

  // 添加测试路径
  if (input.testPath) {
    command += ` ${input.testPath}`;
  }

  // 添加参数
  if (input.mode === 'watch') {
    command += ' --watch';
  } else if (input.mode === 'coverage') {
    command += ' --coverage';
  }

  if (input.testNamePattern) {
    command += ` --testNamePattern="${input.testNamePattern}"`;
  }

  if (input.parallel && input.framework === 'jest') {
    command += ` --maxWorkers=${input.maxWorkers || '50%'}`;
  }

  if (input.extraArgs) {
    command += ` ${input.extraArgs.join(' ')}`;
  }

  const startTime = Date.now();
  const { stdout, stderr, code } = await executeCommand(
    command,
    input.cwd,
    input.timeout
  );
  const duration = Date.now() - startTime;

  const parsed = parseJestOutput(stdout);

  return {
    success: code === 0,
    totalTests: parsed.totalTests || 0,
    passed: parsed.passed || 0,
    failed: parsed.failed || 0,
    skipped: parsed.skipped || 0,
    duration,
    coverage: parsed.coverage,
    rawOutput: stdout + stderr
  };
}

/**
 * 生成测试文件
 */
async function generateTestFile(input: GenerateTestFileInput): Promise<TestFileGenerationResult> {
  const lines: string[] = [];
  const ext = input.typescript ? '.ts' : '.js';
  const testExt = input.typescript ? '.test.ts' : '.test.js';

  // 导入语句
  const fileName = path.basename(input.targetFile, path.extname(input.targetFile));
  const relativePath = path.relative(
    input.outputDir || path.dirname(input.targetFile),
    input.targetFile
  ).replace(/\\/g, '/').replace(path.extname(input.targetFile), '');

  if (input.className) {
    lines.push(`import ${input.className} from '${relativePath}';`);
  } else {
    lines.push(`import * as ${fileName} from '${relativePath}';`);
  }
  lines.push('');

  // 测试套件描述
  const suiteDescription = `${input.testType?.toUpperCase() || 'UNIT'}: ${fileName}`;
  lines.push(`describe('${suiteDescription}', () => {`);
  lines.push('');

  // 为每个函数生成测试
  const functions = input.functions || ['default'];
  for (const funcName of functions) {
    lines.push(`  describe('${funcName}', () => {`);
    lines.push('');
    lines.push(`    it('should be defined', () => {`);
    lines.push(`      expect(${fileName}.${funcName}).toBeDefined();`);
    lines.push('    });');
    lines.push('');
    lines.push(`    it('should work correctly', () => {`);
    lines.push(`      // TODO: 实现测试逻辑`);
    lines.push(`      // const result = ${fileName}.${funcName}(/* args */);`);
    lines.push(`      // expect(result).toBe(/* expected */);`);
    lines.push('    });');
    lines.push('');
    lines.push(`    it('should handle edge cases', () => {`);
    lines.push(`      // TODO: 边界情况测试`);
    lines.push('    });');
    lines.push('');
    lines.push('  });');
    lines.push('');
  }

  lines.push('});');

  const content = lines.join('\n');
  const outputDir = input.outputDir || path.dirname(input.targetFile);
  const testFileName = input.testFileName || `${fileName}${testExt}`;
  const testFilePath = path.join(outputDir, testFileName);

  // 写入文件
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(testFilePath, content, 'utf8');

  return {
    success: true,
    testFilePath,
    content,
    testCount: functions.length * 3
  };
}

/**
 * 运行 Lint
 */
async function runLint(input: RunLintInput): Promise<LintResult> {
  const linters = input.linter === 'all' ? ['eslint', 'prettier', 'tsc'] : [input.linter];
  const results: LintResult[] = [];

  for (const linter of linters) {
    let command = '';
    switch (linter) {
      case 'eslint':
        command = `npx eslint ${input.targetPath || '.'} ${input.fix ? '--fix' : ''} --format ${input.format || 'stylish'}`;
        break;
      case 'prettier':
        command = `npx prettier ${input.targetPath || '.'} ${input.fix ? '--write' : '--check'}`;
        break;
      case 'tsc':
        command = 'npx tsc --noEmit';
        break;
    }

    const { stdout, stderr, code } = await executeCommand(command, input.cwd);

    results.push({
      success: code === 0,
      totalErrors: stderr.split('\n').filter(l => l.includes('error')).length,
      totalWarnings: stderr.split('\n').filter(l => l.includes('warning')).length,
      filesChecked: 0,
      rawOutput: stdout + stderr
    } as LintResult);
  }

  // 合并结果
  return {
    success: results.every(r => r.success),
    totalErrors: results.reduce((sum, r) => sum + r.totalErrors, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.totalWarnings, 0),
    filesChecked: 0
  };
}

/**
 * 生成覆盖率报告
 */
async function generateCoverageReport(input: GenerateCoverageReportInput): Promise<CoverageReportResult> {
  const commands: Record<string, string> = {
    text: 'npx istanbul report text',
    html: 'npx istanbul report html',
    json: 'npx istanbul report json',
    lcov: 'npx istanbul report lcov',
    clover: 'npx istanbul report clover'
  };

  let command = commands[input.format];
  if (input.outputDir) {
    command += ` --dir ${input.outputDir}`;
  }

  const { code } = await executeCommand(command);

  const reportPath = path.join(input.outputDir || './coverage', `coverage.${input.format === 'html' ? 'html' : 'json'}`);

  return {
    success: code === 0,
    reportPath,
    format: input.format,
    summary: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    },
    meetsThresholds: true
  };
}

/**
 * 检查测试是否存在
 */
async function checkTestExists(input: CheckTestExistsInput): Promise<TestCheckResult> {
  const testDir = input.testDir || '__tests__';
  const suffix = input.testSuffix || '.test';
  const fileName = path.basename(input.sourcePath, path.extname(input.sourcePath));
  const testFileName = `${fileName}${suffix}${path.extname(input.sourcePath)}`;
  const testFilePath = path.join(path.dirname(input.sourcePath), testDir, testFileName);

  try {
    await fs.access(testFilePath);
    const content = await fs.readFile(testFilePath, 'utf8');
    const testCount = (content.match(/it\(|test\(/g) || []).length;

    return {
      success: true,
      hasTests: true,
      testFilePath,
      testCount
    };
  } catch {
    return {
      success: true,
      hasTests: false,
      missingTests: [fileName]
    };
  }
}

// ==================== Skill 导出 ====================

const skillExport: SkillExport = {
  /**
   * 主执行函数
   */
  execute: async (input: TestRunnerInput, context?: ExecutionContext): Promise<TestRunnerOutput> => {
    switch (input.operation) {
      case 'run-tests':
        return await runTests(input);
      case 'generate-test':
        return await generateTestFile(input);
      case 'run-lint':
        return await runLint(input);
      case 'coverage-report':
        return await generateCoverageReport(input);
      case 'check-tests':
        return await checkTestExists(input);
      default:
        throw new Error(`不支持的操作类型: ${(input as any).operation}`);
    }
  },

  /**
   * 输入验证
   */
  validateInput: async (input: TestRunnerInput): Promise<boolean> => {
    if (!input || !input.operation) {
      return false;
    }

    const validOperations = [
      'run-tests',
      'generate-test',
      'run-lint',
      'coverage-report',
      'check-tests'
    ];

    return validOperations.includes(input.operation);
  },

  /**
   * Skill 加载钩子
   */
  onLoad: async (): Promise<void> => {
    console.log('[Test-Runner Skill] 加载完成，准备就绪');
  }
};

export default skillExport;
