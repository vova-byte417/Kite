/**
 * Git 操作 Skill - 主入口
 *
 * 提供完整的 Git 版本控制操作能力
 *
 * @author vova
 * @version 1.0.0
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { SkillExport, ExecutionContext } from '../../src/skill/types';

const execAsync = promisify(exec);

// ==================== 输入类型定义 ====================

export interface GitInitInput {
  /** 操作类型 */
  operation: 'init';
  /** 仓库目录 */
  directory?: string;
  /** 是否创建 README.md */
  withReadme?: boolean;
  /** 是否创建 .gitignore */
  withGitignore?: boolean;
  /** Git 忽略模板类型 */
  gitignoreTemplate?: 'node' | 'python' | 'java' | 'react' | 'vue';
}

export interface GitCloneInput {
  /** 操作类型 */
  operation: 'clone';
  /** 仓库 URL */
  repoUrl: string;
  /** 目标目录 */
  targetDir?: string;
  /** 分支名 */
  branch?: string;
  /** 是否深度克隆 */
  depth?: number;
  /** 是否递归克隆子模块 */
  recursive?: boolean;
}

export interface GitCommitInput {
  /** 操作类型 */
  operation: 'commit';
  /** 提交信息 */
  message: string;
  /** 提交描述 */
  description?: string;
  /** 是否添加所有变更 */
  addAll?: boolean;
  /** 要提交的特定文件 */
  files?: string[];
  /** 提交作者 */
  author?: string;
  /** 是否修改上一次提交 */
  amend?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitBranchInput {
  /** 操作类型 */
  operation: 'branch';
  /** 子操作：create/delete/list/switch */
  subOperation: 'create' | 'delete' | 'list' | 'switch' | 'current';
  /** 分支名 */
  branchName?: string;
  /** 基于哪个分支创建 */
  baseBranch?: string;
  /** 是否强制删除 */
  force?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitStatusInput {
  /** 操作类型 */
  operation: 'status';
  /** 是否显示详细信息 */
  verbose?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitLogInput {
  /** 操作类型 */
  operation: 'log';
  /** 显示的提交数量 */
  limit?: number;
  /** 是否显示统计信息 */
  stat?: boolean;
  /** 输出格式 */
  format?: 'oneline' | 'short' | 'full' | 'pretty';
  /** 作者过滤 */
  author?: string;
  /** 分支过滤 */
  branch?: string;
  /** 工作目录 */
  cwd?: string;
}

export interface GitPushInput {
  /** 操作类型 */
  operation: 'push';
  /** 远程仓库名 */
  remote?: string;
  /** 分支名 */
  branch?: string;
  /** 是否强制推送 */
  force?: boolean;
  /** 是否推送所有分支 */
  all?: boolean;
  /** 是否推送标签 */
  tags?: boolean;
  /** 是否设置上游分支 */
  setUpstream?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitPullInput {
  /** 操作类型 */
  operation: 'pull';
  /** 远程仓库名 */
  remote?: string;
  /** 分支名 */
  branch?: string;
  /** 是否 rebase */
  rebase?: boolean;
  /** 是否快进合并 */
  ffOnly?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitAddInput {
  /** 操作类型 */
  operation: 'add';
  /** 要添加的文件/目录 */
  files: string[];
  /** 是否添加所有 */
  all?: boolean;
  /** 是否更新已跟踪文件 */
  update?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitDiffInput {
  /** 操作类型 */
  operation: 'diff';
  /** 比较的分支/提交 */
  from?: string;
  /** 比较的目标 */
  to?: string;
  /** 是否只显示文件名 */
  nameOnly?: boolean;
  /** 是否显示统计信息 */
  stat?: boolean;
  /** 是否显示暂存区变更 */
  cached?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitCheckoutInput {
  /** 操作类型 */
  operation: 'checkout';
  /** 分支名或提交哈希 */
  target: string;
  /** 是否创建新分支 */
  createBranch?: boolean;
  /** 是否强制切换 */
  force?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitMergeInput {
  /** 操作类型 */
  operation: 'merge';
  /** 要合并的分支 */
  sourceBranch: string;
  /** 合并提交信息 */
  message?: string;
  /** 是否不提交 */
  noCommit?: boolean;
  /** 是否快进 */
  ff?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitTagInput {
  /** 操作类型 */
  operation: 'tag';
  /** 子操作 */
  subOperation: 'create' | 'delete' | 'list' | 'push';
  /** 标签名 */
  tagName?: string;
  /** 标签信息 */
  message?: string;
  /** 提交哈希 */
  commit?: string;
  /** 是否注解标签 */
  annotated?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitRemoteInput {
  /** 操作类型 */
  operation: 'remote';
  /** 子操作 */
  subOperation: 'add' | 'remove' | 'rename' | 'list' | 'show';
  /** 远程仓库名 */
  remoteName?: string;
  /** 远程仓库 URL */
  remoteUrl?: string;
  /** 新的远程仓库名 */
  newName?: string;
  /** 工作目录 */
  cwd?: string;
}

export interface GitStashInput {
  /** 操作类型 */
  operation: 'stash';
  /** 子操作 */
  subOperation: 'push' | 'pop' | 'list' | 'apply' | 'drop' | 'clear';
  /** stash 信息 */
  message?: string;
  /** stash 索引 */
  stashIndex?: number;
  /** 是否包含未跟踪文件 */
  includeUntracked?: boolean;
  /** 工作目录 */
  cwd?: string;
}

export interface GitResetInput {
  /** 操作类型 */
  operation: 'reset';
  /** 重置模式 */
  mode: 'soft' | 'mixed' | 'hard';
  /** 目标提交 */
  target?: string;
  /** 工作目录 */
  cwd?: string;
}

export type GitOperationInput =
  | GitInitInput
  | GitCloneInput
  | GitCommitInput
  | GitBranchInput
  | GitStatusInput
  | GitLogInput
  | GitPushInput
  | GitPullInput
  | GitAddInput
  | GitDiffInput
  | GitCheckoutInput
  | GitMergeInput
  | GitTagInput
  | GitRemoteInput
  | GitStashInput
  | GitResetInput;

// ==================== 输出类型定义 ====================

export interface GitCommandResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
}

export interface GitStatusResult extends GitCommandResult {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isClean: boolean;
  ahead: number;
  behind: number;
}

export interface GitLogResult extends GitCommandResult {
  commits: Array<{
    hash: string;
    shortHash: string;
    author: string;
    date: string;
    message: string;
    stats?: {
      filesChanged: number;
      insertions: number;
      deletions: number;
    };
  }>;
}

export interface GitDiffResult extends GitCommandResult {
  files: Array<{
    filename: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    diff?: string;
  }>;
  totalAdditions: number;
  totalDeletions: number;
}

export interface GitBranchResult extends GitCommandResult {
  currentBranch?: string;
  branches?: Array<{
    name: string;
    isCurrent: boolean;
    isRemote: boolean;
  }>;
}

// ==================== 工具函数 ====================

/**
 * 执行 Git 命令
 */
async function executeGitCommand(
  args: string[],
  cwd?: string,
  timeout: number = 30000
): Promise<{ stdout: string; stderr: string; code: number; duration: number }> {
  const startTime = Date.now();
  const command = `git ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout,
      encoding: 'utf8'
    });
    const duration = Date.now() - startTime;
    return { stdout, stderr, code: 0, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      code: error.code || 1,
      duration
    };
  }
}

/**
 * 解析 Git 状态输出
 */
function parseGitStatus(stdout: string): Partial<GitStatusResult> {
  const lines = stdout.trim().split('\n');
  const result: Partial<GitStatusResult> = {
    staged: [],
    unstaged: [],
    untracked: []
  };

  for (const line of lines) {
    if (line.startsWith('##')) {
      // 分支信息: ## main...origin/main [ahead 1, behind 2]
      const branchMatch = line.match(/##\s+([^\s.]+)/);
      if (branchMatch) {
        result.branch = branchMatch[1];
      }
      const aheadMatch = line.match(/ahead\s+(\d+)/);
      const behindMatch = line.match(/behind\s+(\d+)/);
      result.ahead = aheadMatch ? parseInt(aheadMatch[1], 10) : 0;
      result.behind = behindMatch ? parseInt(behindMatch[1], 10) : 0;
    } else if (line.startsWith('A ') || line.startsWith('M ') || line.startsWith('D ')) {
      result.staged?.push(line.substring(2).trim());
    } else if (line.startsWith(' M') || line.startsWith(' D')) {
      result.unstaged?.push(line.substring(2).trim());
    } else if (line.startsWith('??')) {
      result.untracked?.push(line.substring(2).trim());
    }
  }

  result.isClean =
    result.staged?.length === 0 &&
    result.unstaged?.length === 0 &&
    result.untracked?.length === 0;

  return result;
}

// ==================== 操作实现 ====================

/**
 * 初始化仓库
 */
async function gitInit(input: GitInitInput): Promise<GitCommandResult> {
  const dir = input.directory || process.cwd();
  const { stdout, stderr, code, duration } = await executeGitCommand(['init'], dir);

  if (code === 0) {
    // 创建 README.md
    if (input.withReadme) {
      const fs = await import('fs/promises');
      await fs.writeFile(
        path.join(dir, 'README.md'),
        `# ${path.basename(dir)}\n\n项目描述\n`,
        'utf8'
      );
    }

    // 创建 .gitignore
    if (input.withGitignore) {
      const fs = await import('fs/promises');
      const templates: Record<string, string> = {
        node: 'node_modules/\nnpm-debug.log\nyarn-error.log\n.env\n',
        python: '__pycache__/\n*.pyc\nvenv/\n.env\n',
        react: 'node_modules/\nbuild/\n.env\n.DS_Store\n',
        vue: 'node_modules/\ndist/\n.env\n.DS_Store\n',
        java: 'target/\n*.class\n.env\n.idea/\n'
      };
      const content = templates[input.gitignoreTemplate || 'node'] || templates.node;
      await fs.writeFile(path.join(dir, '.gitignore'), content, 'utf8');
    }
  }

  return {
    success: code === 0,
    command: 'git init',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

/**
 * 克隆仓库
 */
async function gitClone(input: GitCloneInput): Promise<GitCommandResult> {
  const args = ['clone'];

  if (input.branch) {
    args.push('-b', input.branch);
  }

  if (input.depth) {
    args.push('--depth', input.depth.toString());
  }

  if (input.recursive) {
    args.push('--recursive');
  }

  args.push(input.repoUrl);

  if (input.targetDir) {
    args.push(input.targetDir);
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args);

  return {
    success: code === 0,
    command: `git clone ${input.repoUrl}`,
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

/**
 * 提交变更
 */
async function gitCommit(input: GitCommitInput): Promise<GitCommandResult> {
  // 先添加文件
  if (input.addAll) {
    await executeGitCommand(['add', '.'], input.cwd);
  } else if (input.files) {
    await executeGitCommand(['add', ...input.files], input.cwd);
  }

  const args = ['commit'];

  if (input.message) {
    args.push('-m', `"${input.message}"`);
    if (input.description) {
      args.push('-m', `"${input.description}"`);
    }
  }

  if (input.author) {
    args.push('--author', `"${input.author}"`);
  }

  if (input.amend) {
    args.push('--amend');
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  return {
    success: code === 0,
    command: 'git commit',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

/**
 * 分支操作
 */
async function gitBranch(input: GitBranchInput): Promise<GitBranchResult> {
  let args: string[] = [];

  switch (input.subOperation) {
    case 'create':
      args = ['checkout', '-b', input.branchName!];
      if (input.baseBranch) {
        args.push(input.baseBranch);
      }
      break;
    case 'delete':
      args = ['branch', input.force ? '-D' : '-d', input.branchName!];
      break;
    case 'list':
      args = ['branch', '-a'];
      break;
    case 'switch':
      args = ['checkout', input.branchName!];
      break;
    case 'current':
      args = ['rev-parse', '--abbrev-ref', 'HEAD'];
      break;
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  const result: GitBranchResult = {
    success: code === 0,
    command: `git branch ${input.subOperation}`,
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };

  if (input.subOperation === 'current') {
    result.currentBranch = stdout.trim();
  } else if (input.subOperation === 'list') {
    result.branches = stdout.trim().split('\n').filter(Boolean).map(line => ({
      name: line.replace(/^\*/, '').trim(),
      isCurrent: line.startsWith('*'),
      isRemote: line.includes('remotes/')
    }));
  }

  return result;
}

/**
 * 查看状态
 */
async function gitStatus(input: GitStatusInput): Promise<GitStatusResult> {
  const args = input.verbose ? ['status'] : ['status', '--porcelain', '-b'];
  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);
  const parsed = parseGitStatus(stdout);

  return {
    success: code === 0,
    command: 'git status',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration,
    branch: parsed.branch || 'unknown',
    staged: parsed.staged || [],
    unstaged: parsed.unstaged || [],
    untracked: parsed.untracked || [],
    isClean: parsed.isClean || false,
    ahead: parsed.ahead || 0,
    behind: parsed.behind || 0
  };
}

/**
 * 查看提交日志
 */
async function gitLog(input: GitLogInput): Promise<GitLogResult> {
  const args = ['log'];

  if (input.limit) {
    args.push(`-n ${input.limit}`);
  }

  if (input.stat) {
    args.push('--stat');
  }

  if (input.format === 'oneline') {
    args.push('--oneline');
  } else if (input.format === 'pretty') {
    args.push('--pretty=format:%h|%an|%ad|%s');
  }

  if (input.author) {
    args.push(`--author="${input.author}"`);
  }

  if (input.branch) {
    args.push(input.branch);
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  const commits: GitLogResult['commits'] = [];
  if (input.format === 'pretty' && stdout.trim()) {
    for (const line of stdout.trim().split('\n')) {
      const [shortHash, author, date, ...msgParts] = line.split('|');
      commits.push({
        hash: '',
        shortHash,
        author,
        date,
        message: msgParts.join('|')
      });
    }
  }

  return {
    success: code === 0,
    command: 'git log',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration,
    commits
  };
}

/**
 * 推送变更
 */
async function gitPush(input: GitPushInput): Promise<GitCommandResult> {
  const args = ['push'];

  if (input.setUpstream) {
    args.push('-u');
  }

  if (input.force) {
    args.push('--force-with-lease');
  }

  if (input.all) {
    args.push('--all');
  }

  if (input.tags) {
    args.push('--tags');
  }

  if (input.remote && input.branch) {
    args.push(input.remote, input.branch);
  } else if (input.remote) {
    args.push(input.remote);
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  return {
    success: code === 0,
    command: 'git push',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

/**
 * 拉取变更
 */
async function gitPull(input: GitPullInput): Promise<GitCommandResult> {
  const args = ['pull'];

  if (input.rebase) {
    args.push('--rebase');
  }

  if (input.ffOnly) {
    args.push('--ff-only');
  }

  if (input.remote && input.branch) {
    args.push(input.remote, input.branch);
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  return {
    success: code === 0,
    command: 'git pull',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

/**
 * 添加文件
 */
async function gitAdd(input: GitAddInput): Promise<GitCommandResult> {
  const args = ['add'];

  if (input.all) {
    args.push('.');
  } else if (input.update) {
    args.push('-u');
  } else if (input.files) {
    args.push(...input.files);
  }

  const { stdout, stderr, code, duration } = await executeGitCommand(args, input.cwd);

  return {
    success: code === 0,
    command: 'git add',
    output: stdout,
    error: stderr || undefined,
    exitCode: code,
    duration
  };
}

// ==================== Skill 导出 ====================

const skillExport: SkillExport = {
  /**
   * 主执行函数
   */
  execute: async (input: GitOperationInput, context?: ExecutionContext): Promise<any> => {
    switch (input.operation) {
      case 'init':
        return await gitInit(input);
      case 'clone':
        return await gitClone(input);
      case 'commit':
        return await gitCommit(input);
      case 'branch':
        return await gitBranch(input);
      case 'status':
        return await gitStatus(input);
      case 'log':
        return await gitLog(input);
      case 'push':
        return await gitPush(input);
      case 'pull':
        return await gitPull(input);
      case 'add':
        return await gitAdd(input);
      // 其他操作实现类似...
      default:
        throw new Error(`不支持的操作类型: ${(input as any).operation}`);
    }
  },

  /**
   * 输入验证
   */
  validateInput: async (input: GitOperationInput): Promise<boolean> => {
    if (!input || !input.operation) {
      return false;
    }

    const validOperations = [
      'init', 'clone', 'commit', 'branch', 'status',
      'log', 'push', 'pull', 'add', 'diff', 'checkout',
      'merge', 'tag', 'remote', 'stash', 'reset'
    ];

    return validOperations.includes(input.operation);
  },

  /**
   * Skill 加载钩子
   */
  onLoad: async (): Promise<void> => {
    console.log('[Git-Operations Skill] 加载完成，准备就绪');
  }
};

export default skillExport;
