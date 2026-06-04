# 通用工具 Skill (utils)

**版本**: 1.0.0  
**作者**: vova  
**分类**: 工具类  
**标签**: `utils`, `string`, `number`, `array`, `date`, `validation`, `helpers`

---

## 概述

通用工具 Skill 提供一组常用的工具函数集合：
- 字符串处理（格式化、转换、截断、URL 友好化）
- 数字处理（格式化、四舍五入、范围限制、随机）
- 数组处理（去重、排序、分组、分片、统计）
- 日期处理（格式化、计算、相对时间）
- 对象操作（深拷贝、合并、属性拾取）
- 数据验证（邮箱、手机号、密码、URL 等）

---

## Skill 配置

### 注册配置

```json
{
  "name": "utils",
  "version": "1.0.0",
  "description": "通用工具函数集合",
  "entryPoint": "./sample-skills/utils/index.js",
  "tags": ["utils", "string", "number", "array", "validation", "helpers"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 5000,
    "maxRetries": 1
  },
  "metadata": {
    "author": "vova",
    "category": "utility",
    "icon": "🔧"
  }
}
```

---

## 使用指南

### 基本调用方式

```typescript
import skillManager from '../skill-system';

// 字符串首字母大写
const result = await skillManager.executeSkill('utils', {
  operation: 'string',
  subOperation: 'capitalize',
  value: 'hello world'
});

console.log(result.result); // "Hello world"
```

---

## 操作类型详解

### 1. 字符串操作 (`operation: 'string'`)

**支持的子操作**:

| 子操作 | 说明 |
|--------|------|
| `capitalize` | 首字母大写 |
| `uppercase` | 全部大写 |
| `lowercase` | 全部小写 |
| `trim` | 去除两端空白 |
| `truncate` | 截断字符串 |
| `slugify` | 转换为 URL 友好格式 |
| `reverse` | 反转字符串 |

**输入参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `operation` | string | 是 | 必须为 `'string'` |
| `subOperation` | string | 是 | 子操作类型 |
| `value` | string | 是 | 输入字符串 |
| `options` | Object | 否 | 选项配置 |

**Options 对象** (truncate/slugify):

| 字段 | 类型 | 说明 |
|------|------|------|
| `maxLength` | number | 最大长度（truncate） |
| `separator` | string | 分隔符（slugify，默认 '-') |

**示例**:

```typescript
// 首字母大写
const capResult = await skillManager.executeSkill('utils', {
  operation: 'string',
  subOperation: 'capitalize',
  value: 'openClAW'
});
console.log(capResult.result); // "Openclaw"

// 截断字符串
const truncResult = await skillManager.executeSkill('utils', {
  operation: 'string',
  subOperation: 'truncate',
  value: '这是一段非常长的文本内容，需要被截断显示',
  options: { maxLength: 15 }
});
console.log(truncResult.result); // "这是一段非常长的文本内容，需要..."

// 转换为 URL 友好格式
const slugResult = await skillManager.executeSkill('utils', {
  operation: 'string',
  subOperation: 'slugify',
  value: 'Hello World! 欢迎使用 OpenClaw'
});
console.log(slugResult.result); // "hello-world-欢迎使用-openclaw"
```

---

### 2. 数字操作 (`operation: 'number'`)

**支持的子操作**:

| 子操作 | 说明 |
|--------|------|
| `format` | 本地化格式化 |
| `round` | 四舍五入 |
| `clamp` | 限制在范围内 |
| `random` | 生成随机数 |
| `between` | 检查是否在范围内 |

**示例**:

```typescript
// 本地化格式化（带千位分隔符）
const formatResult = await skillManager.executeSkill('utils', {
  operation: 'number',
  subOperation: 'format',
  value: 1234567.89,
  options: { decimals: 2, locale: 'zh-CN' }
});
console.log(formatResult.result); // "1,234,567.89"

// 随机数
const randomResult = await skillManager.executeSkill('utils', {
  operation: 'number',
  subOperation: 'random',
  options: { min: 1, max: 100 }
});
console.log(randomResult.result); // 42 (随机数)

// 限制范围
const clampResult = await skillManager.executeSkill('utils', {
  operation: 'number',
  subOperation: 'clamp',
  value: 150,
  options: { min: 0, max: 100 }
});
console.log(clampResult.result); // 100
```

---

### 3. 数组操作 (`operation: 'array'`)

**支持的子操作**:

| 子操作 | 说明 |
|--------|------|
| `unique` | 去重 |
| `sort` | 排序 |
| `shuffle` | 随机打乱 |
| `chunk` | 分片 |
| `flatten` | 扁平化 |
| `groupBy` | 按字段分组 |
| `sum` | 求和 |
| `avg` | 求平均值 |

**示例**:

```typescript
// 数组去重
const uniqueResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'unique',
  values: [1, 2, 2, 3, 3, 3, 4, 5]
});
console.log(uniqueResult.result); // [1, 2, 3, 4, 5]

// 数组分片
const chunkResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'chunk',
  values: [1, 2, 3, 4, 5, 6, 7, 8],
  options: { size: 3 }
});
console.log(chunkResult.result); // [[1,2,3], [4,5,6], [7,8]]

// 按字段分组
const groupResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'groupBy',
  values: [
    { name: '张三', department: '技术部' },
    { name: '李四', department: '产品部' },
    { name: '王五', department: '技术部' }
  ],
  options: { key: 'department' }
});
/*
{
  "技术部": [{ name: '张三', ... }, { name: '王五', ... }],
  "产品部": [{ name: '李四', ... }]
}
*/

// 求和与平均值
const sumResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'sum',
  values: [1, 2, 3, 4, 5]
});
console.log(sumResult.result); // 15
```

---

### 4. 数据验证 (`operation: 'validate'`)

**支持的子操作**:

| 子操作 | 说明 |
|--------|------|
| `email` | 邮箱验证 |
| `url` | URL 验证 |
| `phone` | 手机号验证（中国大陆） |
| `password` | 密码强度验证 |
| `required` | 必填验证 |
| `minLength` | 最小长度 |
| `maxLength` | 最大长度 |
| `pattern` | 正则匹配 |

**输出**:

```typescript
{
  success: boolean,      // 操作是否成功
  operation: string,     // 执行的操作
  result: boolean,       // 验证结果
  isValid: boolean,      // 是否有效（与 result 相同）
  errors: string[],      // 错误信息列表
  originalValue: string  // 原始输入值
}
```

**示例 1: 完整的表单验证**

```typescript
async function validateForm(formData: {
  email: string;
  phone: string;
  password: string;
  username: string;
}) {
  const results: Record<string, any> = {};

  // 验证邮箱
  results.email = await skillManager.executeSkill('utils', {
    operation: 'validate',
    subOperation: 'email',
    value: formData.email
  });

  // 验证手机号
  results.phone = await skillManager.executeSkill('utils', {
    operation: 'validate',
    subOperation: 'phone',
    value: formData.phone
  });

  // 验证密码强度
  results.password = await skillManager.executeSkill('utils', {
    operation: 'validate',
    subOperation: 'password',
    value: formData.password
  });

  // 验证用户名长度
  results.username = await skillManager.executeSkill('utils', {
    operation: 'validate',
    subOperation: 'minLength',
    value: formData.username,
    options: { min: 3 }
  });

  // 检查是否全部通过
  const allValid = Object.values(results).every(r => r.isValid);

  if (allValid) {
    console.log('✅ 表单验证通过!');
  } else {
    console.log('❌ 表单验证失败:');
    for (const [field, result] of Object.entries(results)) {
      if (!result.isValid) {
        console.log(`   ${field}: ${result.errors.join(', ')}`);
      }
    }
  }

  return allValid;
}
```

**示例 2: 测试各类验证**

```typescript
// 邮箱验证
const emailResult = await skillManager.executeSkill('utils', {
  operation: 'validate',
  subOperation: 'email',
  value: 'test@example.com'
});
console.log(emailResult.isValid); // true

// 手机号验证
const phoneResult = await skillManager.executeSkill('utils', {
  operation: 'validate',
  subOperation: 'phone',
  value: '13812345678'
});
console.log(phoneResult.isValid); // true

// URL 验证
const urlResult = await skillManager.executeSkill('utils', {
  operation: 'validate',
  subOperation: 'url',
  value: 'https://openclaw.ai'
});
console.log(urlResult.isValid); // true
```

---

### 5. 日期操作 (`operation: 'date'`)

**支持的子操作**:

| 子操作 | 说明 |
|--------|------|
| `format` | 日期格式化 |
| `diff` | 计算日期差 |
| `add` | 增加时间 |
| `subtract` | 减少时间 |
| `startOf` | 获取周期开始 |
| `endOf` | 获取周期结束 |
| `relative` | 相对时间显示 |

**示例**:

```typescript
// 日期格式化
const formatResult = await skillManager.executeSkill('utils', {
  operation: 'date',
  subOperation: 'format',
  value: new Date(),
  options: { format: 'YYYY-MM-DD HH:mm:ss' }
});
console.log(formatResult.result); // "2026-05-15 14:30:00"

// 相对时间
const relativeResult = await skillManager.executeSkill('utils', {
  operation: 'date',
  subOperation: 'relative',
  value: new Date(Date.now() - 3600000) // 1小时前
});
console.log(relativeResult.result); // "1小时前"
```

---

## 完整应用示例

### 数据清洗与验证流程

```typescript
async function processUserData(rawData: any[]) {
  console.log('📊 开始处理用户数据...');

  // 1. 清洗数据：去重
  const uniqueResult = await skillManager.executeSkill('utils', {
    operation: 'array',
    subOperation: 'unique',
    values: rawData.map(d => d.email)
  });
  console.log(`✅ 去重后: ${uniqueResult.result.length} 条记录`);

  // 2. 验证每个邮箱
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const email of uniqueResult.result) {
    const validateResult = await skillManager.executeSkill('utils', {
      operation: 'validate',
      subOperation: 'email',
      value: email
    });

    if (validateResult.isValid) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  }

  console.log(`✅ 有效邮箱: ${validEmails.length}`);
  console.log(`❌ 无效邮箱: ${invalidEmails.length}`);

  // 3. 格式化用户姓名
  const formattedNames = await Promise.all(
    rawData.map(user =>
      skillManager.executeSkill('utils', {
        operation: 'string',
        subOperation: 'capitalize',
        value: user.name
      })
    )
  );

  return {
    validEmails,
    invalidEmails,
    formattedNames: formattedNames.map(r => r.result)
  };
}
```

---

## 最佳实践

### 1. 批量处理

对于大量数据，优先使用数组操作进行批量处理，减少多次调用：

```typescript
// ✅ 好的做法：一次调用处理整个数组
const uniqueResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'unique',
  values: largeArray
});

// ❌ 不好的做法：循环调用
for (const item of largeArray) {
  // 单次处理，效率低
}
```

### 2. 链式调用

多个连续的操作可以组合使用：

```typescript
const data = ['b', 'a', 'c', 'a', 'd', 'b'];

// 先去重，再排序
const uniqueResult = await skillManager.executeSkill('utils', {
  operation: 'array', subOperation: 'unique', values: data
});

const sortedResult = await skillManager.executeSkill('utils', {
  operation: 'array',
  subOperation: 'sort',
  values: uniqueResult.result,
  options: { order: 'asc' }
});

console.log(sortedResult.result); // ['a', 'b', 'c', 'd']
```

---

## 性能提示

| 操作 | 时间复杂度 | 推荐数据量 |
|------|-----------|-----------|
| 字符串操作 | O(n) | 无限制 |
| 数组去重 | O(n) | < 100,000 项 |
| 数组排序 | O(n log n) | < 50,000 项 |
| 数组分组 | O(n) | < 100,000 项 |
| 验证操作 | O(1) | 单次调用 |

---

## 更新日志

### v1.0.0 (2026-05-15)
- ✅ 支持字符串操作（7 种）
- ✅ 支持数字操作（5 种）
- ✅ 支持数组操作（8 种）
- ✅ 支持数据验证（8 种）
- ✅ 日期和对象操作框架已搭建
- ✅ 完整的类型定义
- ✅ 详细的使用示例
