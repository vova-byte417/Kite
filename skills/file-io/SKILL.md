# 文件读写 Skill (file-io)

**版本**: 1.0.0  
**作者**: vova  
**分类**: 工具类  
**标签**: `file`, `io`, `filesystem`, `read`, `write`, `delete`

---

## 概述

文件读写 Skill 提供完整的文件系统操作能力，包括：
- 读取/写入文件
- 复制/移动/删除文件
- 创建目录
- 列出目录内容
- 获取文件元数据

---

## Skill 配置

### 注册配置

```json
{
  "name": "file-io",
  "version": "1.0.0",
  "description": "文件系统操作 Skill，提供文件读写、目录管理等功能",
  "entryPoint": "./sample-skills/file-io/index.js",
  "tags": ["file", "io", "filesystem", "read", "write", "delete"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 30000,
    "maxRetries": 2
  },
  "metadata": {
    "author": "vova",
    "category": "utility",
    "icon": "📁"
  }
}
```

---

## 使用指南

### 基本调用方式

```typescript
import skillManager from '../skill-system';

// 读取文件
const result = await skillManager.executeSkill('file-io', {
  operation: 'read',
  filePath: '/path/to/file.txt',
  encoding: 'utf-8'
});

console.log(result.content);
```

---

## 操作类型详解

### 1. 读取文件 (`operation: 'read'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'read'` |
| `filePath` | string | 是 | - | 要读取的文件路径 |
| `encoding` | string | 否 | `'utf-8'` | 文件编码格式 |
| `binary` | boolean | 否 | `false` | 是否以二进制模式读取（返回 base64） |

**输出**:

```typescript
{
  success: true,
  content: string,      // 文件内容
  filePath: string,     // 文件路径
  size: number          // 文件大小（字节）
}
```

**示例**:

```typescript
// 读取文本文件
const result = await skillManager.executeSkill('file-io', {
  operation: 'read',
  filePath: './config.json',
  encoding: 'utf-8'
});

// 读取二进制文件（图片）
const imageResult = await skillManager.executeSkill('file-io', {
  operation: 'read',
  filePath: './logo.png',
  binary: true
});
```

---

### 2. 写入文件 (`operation: 'write'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'write'` |
| `filePath` | string | 是 | - | 写入目标文件路径 |
| `content` | string/Buffer | 是 | - | 要写入的内容 |
| `encoding` | string | 否 | `'utf-8'` | 文件编码格式 |
| `append` | boolean | 否 | `false` | 是否追加写入 |

**输出**:

```typescript
{
  success: true,
  filePath: string,     // 写入的文件路径
  size: number,         // 写入后的文件大小
  operation: string     // 'write' 或 'append'
}
```

**示例**:

```typescript
// 写入新文件
await skillManager.executeSkill('file-io', {
  operation: 'write',
  filePath: './output.txt',
  content: 'Hello, World!',
  encoding: 'utf-8'
});

// 追加写入
await skillManager.executeSkill('file-io', {
  operation: 'write',
  filePath: './log.txt',
  content: '\n[INFO] 新的日志条目',
  append: true
});
```

---

### 3. 删除文件/目录 (`operation: 'delete'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'delete'` |
| `filePath` | string | 是 | - | 要删除的文件/目录路径 |
| `recursive` | boolean | 否 | `false` | 是否递归删除目录 |

**输出**:

```typescript
{
  success: true,
  filePath: string      // 已删除的路径
}
```

**示例**:

```typescript
// 删除单个文件
await skillManager.executeSkill('file-io', {
  operation: 'delete',
  filePath: './temp.txt'
});

// 递归删除目录及其内容
await skillManager.executeSkill('file-io', {
  operation: 'delete',
  filePath: './temp-dir',
  recursive: true
});
```

---

### 4. 列出目录 (`operation: 'list'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'list'` |
| `dirPath` | string | 是 | - | 要列出的目录路径 |
| `recursive` | boolean | 否 | `false` | 是否递归列出子目录 |
| `extension` | string | 否 | - | 按扩展名过滤文件 |

**输出**:

```typescript
{
  success: true,
  dirPath: string,      // 目录路径
  files: Array<{        // 文件列表
    name: string,       // 文件名
    path: string,       // 相对路径
    isDirectory: boolean, // 是否是目录
    size?: number       // 文件大小（仅文件）
  }>,
  count: number         // 文件总数
}
```

**示例**:

```typescript
// 列出当前目录
const result = await skillManager.executeSkill('file-io', {
  operation: 'list',
  dirPath: './src',
  recursive: true,
  extension: '.ts'
});

console.log(`找到 ${result.count} 个 TypeScript 文件`);
result.files.forEach(file => {
  console.log(`- ${file.path} (${file.size} bytes)`);
});
```

---

### 5. 获取文件状态 (`operation: 'stat'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'stat'` |
| `filePath` | string | 是 | - | 文件/目录路径 |

**输出**:

```typescript
{
  success: true,
  filePath: string,
  stats: {
    size: number,           // 文件大小
    isFile: boolean,        // 是否是文件
    isDirectory: boolean,   // 是否是目录
    createdAt: Date,        // 创建时间
    modifiedAt: Date,       // 修改时间
    accessedAt: Date        // 访问时间
  }
}
```

---

### 6. 复制文件 (`operation: 'copy'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'copy'` |
| `source` | string | 是 | - | 源文件路径 |
| `destination` | string | 是 | - | 目标文件路径 |
| `overwrite` | boolean | 否 | `false` | 是否覆盖已存在文件 |

**输出**:

```typescript
{
  success: true,
  source: string,        // 源文件
  destination: string,   // 目标文件
  size: number           // 文件大小
}
```

---

### 7. 移动文件 (`operation: 'move'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'move'` |
| `source` | string | 是 | - | 源文件路径 |
| `destination` | string | 是 | - | 目标文件路径 |
| `overwrite` | boolean | 否 | `false` | 是否覆盖已存在文件 |

**输出**:

```typescript
{
  success: true,
  source: string,
  destination: string
}
```

---

### 8. 创建目录 (`operation: 'mkdir'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'mkdir'` |
| `dirPath` | string | 是 | - | 目录路径 |
| `recursive` | boolean | 否 | `false` | 是否递归创建父目录 |

**输出**:

```typescript
{
  success: true,
  dirPath: string,
  created: boolean
}
```

---

## 完整示例

### 示例 1: 批量处理文件

```typescript
// 1. 列出所有 .json 文件
const listResult = await skillManager.executeSkill('file-io', {
  operation: 'list',
  dirPath: './data',
  recursive: true,
  extension: '.json'
});

// 2. 读取每个文件并处理
for (const file of listResult.files) {
  const filePath = `./data/${file.path}`;
  const readResult = await skillManager.executeSkill('file-io', {
    operation: 'read',
    filePath
  });

  const data = JSON.parse(readResult.content);
  console.log(`处理文件: ${file.path}, 数据条数: ${data.length}`);
}
```

### 示例 2: 目录备份

```typescript
// 创建备份目录
await skillManager.executeSkill('file-io', {
  operation: 'mkdir',
  dirPath: './backup/2026-05-15',
  recursive: true
});

// 列出并复制所有配置文件
const configFiles = await skillManager.executeSkill('file-io', {
  operation: 'list',
  dirPath: './config',
  extension: '.yaml'
});

for (const file of configFiles.files) {
  await skillManager.executeSkill('file-io', {
    operation: 'copy',
    source: `./config/${file.path}`,
    destination: `./backup/2026-05-15/${file.name}`,
    overwrite: true
  });
}
```

---

## 错误处理

```typescript
try {
  const result = await skillManager.executeSkill('file-io', {
    operation: 'read',
    filePath: './non-existent-file.txt'
  });
} catch (error) {
  console.error('文件操作失败:', error.message);
  // 常见错误:
  // - ENOENT: 文件不存在
  // - EACCES: 权限不足
  // - EISDIR: 路径是目录
}
```

---

## 注意事项

1. **路径安全**: Skill 不提供路径安全检查，调用者需确保路径合法
2. **大文件**: 读取大文件时注意内存占用，建议流式处理
3. **并发**: 高并发写入同一文件可能导致数据冲突
4. **跨平台**: 文件路径分隔符在 Windows 和 Unix 系统上不同

---

## 更新日志

### v1.0.0 (2026-05-15)
- ✅ 初始版本发布
- ✅ 支持 8 种文件操作
- ✅ 完整的类型定义
- ✅ 输入验证支持
