/**
 * 文件读写 Skill - 主入口
 *
 * 提供完整的文件系统操作能力
 *
 * @author vova
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SkillExport, ExecutionContext } from '../../skill-system/src/types';

// ==================== 输入类型定义 ====================

export interface FileReadInput {
  /** 操作类型 */
  operation: 'read';
  /** 文件路径 */
  filePath: string;
  /** 编码格式（默认 utf-8） */
  encoding?: BufferEncoding;
  /** 是否以二进制模式读取 */
  binary?: boolean;
}

export interface FileWriteInput {
  /** 操作类型 */
  operation: 'write';
  /** 文件路径 */
  filePath: string;
  /** 写入内容 */
  content: string | Buffer;
  /** 编码格式（默认 utf-8） */
  encoding?: BufferEncoding;
  /** 是否追加写入 */
  append?: boolean;
}

export interface FileDeleteInput {
  /** 操作类型 */
  operation: 'delete';
  /** 文件/目录路径 */
  filePath: string;
  /** 是否递归删除（目录） */
  recursive?: boolean;
}

export interface DirectoryListInput {
  /** 操作类型 */
  operation: 'list';
  /** 目录路径 */
  dirPath: string;
  /** 是否递归列出子目录 */
  recursive?: boolean;
  /** 文件扩展名过滤 */
  extension?: string;
}

export interface FileStatInput {
  /** 操作类型 */
  operation: 'stat';
  /** 文件/目录路径 */
  filePath: string;
}

export interface FileCopyInput {
  /** 操作类型 */
  operation: 'copy';
  /** 源文件路径 */
  source: string;
  /** 目标文件路径 */
  destination: string;
  /** 是否覆盖已存在文件 */
  overwrite?: boolean;
}

export interface FileMoveInput {
  /** 操作类型 */
  operation: 'move';
  /** 源文件路径 */
  source: string;
  /** 目标文件路径 */
  destination: string;
  /** 是否覆盖已存在文件 */
  overwrite?: boolean;
}

export interface DirectoryCreateInput {
  /** 操作类型 */
  operation: 'mkdir';
  /** 目录路径 */
  dirPath: string;
  /** 是否递归创建父目录 */
  recursive?: boolean;
}

export type FileIOInput =
  | FileReadInput
  | FileWriteInput
  | FileDeleteInput
  | DirectoryListInput
  | FileStatInput
  | FileCopyInput
  | FileMoveInput
  | DirectoryCreateInput;

// ==================== 输出类型定义 ====================

export interface FileReadOutput {
  success: boolean;
  content: string;
  filePath: string;
  size: number;
}

export interface FileWriteOutput {
  success: boolean;
  filePath: string;
  size: number;
  operation: string;
}

export interface FileDeleteOutput {
  success: boolean;
  filePath: string;
}

export interface DirectoryListOutput {
  success: boolean;
  dirPath: string;
  files: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
  }>;
  count: number;
}

export interface FileStatOutput {
  success: boolean;
  filePath: string;
  stats: {
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    createdAt: Date;
    modifiedAt: Date;
    accessedAt: Date;
  };
}

export interface FileCopyOutput {
  success: boolean;
  source: string;
  destination: string;
  size: number;
}

export interface FileMoveOutput {
  success: boolean;
  source: string;
  destination: string;
}

export interface DirectoryCreateOutput {
  success: boolean;
  dirPath: string;
  created: boolean;
}

export type FileIOOutput =
  | FileReadOutput
  | FileWriteOutput
  | FileDeleteOutput
  | DirectoryListOutput
  | FileStatOutput
  | FileCopyOutput
  | FileMoveOutput
  | DirectoryCreateOutput;

// ==================== Skill 实现 ====================

/**
 * 验证输入参数
 */
async function validateInput(input: FileIOInput): Promise<boolean> {
  if (!input || !input.operation) {
    return false;
  }

  const validOperations = ['read', 'write', 'delete', 'list', 'stat', 'copy', 'move', 'mkdir'];
  return validOperations.includes(input.operation);
}

/**
 * 读取文件
 */
async function readFile(input: FileReadInput): Promise<FileReadOutput> {
  const encoding = input.encoding || 'utf-8';
  const content = input.binary
    ? (await fs.readFile(input.filePath)).toString('base64')
    : await fs.readFile(input.filePath, encoding);

  const stats = await fs.stat(input.filePath);

  return {
    success: true,
    content,
    filePath: input.filePath,
    size: stats.size
  };
}

/**
 * 写入文件
 */
async function writeFile(input: FileWriteInput): Promise<FileWriteOutput> {
  const encoding = input.encoding || 'utf-8';

  if (input.append) {
    await fs.appendFile(input.filePath, input.content, encoding);
  } else {
    await fs.writeFile(input.filePath, input.content, encoding);
  }

  const stats = await fs.stat(input.filePath);

  return {
    success: true,
    filePath: input.filePath,
    size: stats.size,
    operation: input.append ? 'append' : 'write'
  };
}

/**
 * 删除文件/目录
 */
async function deleteFile(input: FileDeleteInput): Promise<FileDeleteOutput> {
  await fs.rm(input.filePath, { recursive: input.recursive || false });

  return {
    success: true,
    filePath: input.filePath
  };
}

/**
 * 列出目录内容
 */
async function listDirectory(input: DirectoryListInput): Promise<DirectoryListOutput> {
  const files: DirectoryListOutput['files'] = [];

  async function scanDir(currentPath: string, basePath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: relativePath,
          isDirectory: true
        });

        if (input.recursive) {
          await scanDir(fullPath, basePath);
        }
      } else {
        if (!input.extension || entry.name.endsWith(input.extension)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: relativePath,
            isDirectory: false,
            size: stats.size
          });
        }
      }
    }
  }

  await scanDir(input.dirPath, input.dirPath);

  return {
    success: true,
    dirPath: input.dirPath,
    files,
    count: files.length
  };
}

/**
 * 获取文件状态
 */
async function getFileStat(input: FileStatInput): Promise<FileStatOutput> {
  const stats = await fs.stat(input.filePath);

  return {
    success: true,
    filePath: input.filePath,
    stats: {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    }
  };
}

/**
 * 复制文件
 */
async function copyFile(input: FileCopyInput): Promise<FileCopyOutput> {
  const sourceStats = await fs.stat(input.source);

  await fs.copyFile(
    input.source,
    input.destination,
    input.overwrite ? 0 : fs.constants.COPYFILE_EXCL
  );

  return {
    success: true,
    source: input.source,
    destination: input.destination,
    size: sourceStats.size
  };
}

/**
 * 移动文件
 */
async function moveFile(input: FileMoveInput): Promise<FileMoveOutput> {
  if (input.overwrite) {
    try {
      await fs.access(input.destination);
      await fs.rm(input.destination);
    } catch {
      // 文件不存在，无需删除
    }
  }

  await fs.rename(input.source, input.destination);

  return {
    success: true,
    source: input.source,
    destination: input.destination
  };
}

/**
 * 创建目录
 */
async function createDirectory(input: DirectoryCreateInput): Promise<DirectoryCreateOutput> {
  await fs.mkdir(input.dirPath, { recursive: input.recursive || false });

  return {
    success: true,
    dirPath: input.dirPath,
    created: true
  };
}

// ==================== Skill 导出 ====================

const skillExport: SkillExport = {
  /**
   * 主执行函数
   */
  execute: async (input: FileIOInput, context?: ExecutionContext): Promise<FileIOOutput> => {
    switch (input.operation) {
      case 'read':
        return await readFile(input);
      case 'write':
        return await writeFile(input);
      case 'delete':
        return await deleteFile(input);
      case 'list':
        return await listDirectory(input);
      case 'stat':
        return await getFileStat(input);
      case 'copy':
        return await copyFile(input);
      case 'move':
        return await moveFile(input);
      case 'mkdir':
        return await createDirectory(input);
      default:
        throw new Error(`不支持的操作类型: ${(input as any).operation}`);
    }
  },

  /**
   * 输入验证
   */
  validateInput: validateInput,

  /**
   * Skill 加载钩子
   */
  onLoad: async (): Promise<void> => {
    console.log('[File-IO Skill] 加载完成，准备就绪');
  },

  /**
   * Skill 卸载钩子
   */
  onUnload: async (): Promise<void> => {
    console.log('[File-IO Skill] 已卸载');
  }
};

export default skillExport;
