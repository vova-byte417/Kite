# 代码生成 Skill (code-generation)

**版本**: 1.0.0  
**作者**: vova  
**分类**: 开发工具  
**标签**: `code`, `generation`, `template`, `class`, `interface`, `component`

---

## 概述

代码生成 Skill 提供模板驱动的代码生成能力，支持生成：
- TypeScript/JavaScript 类、接口、枚举、函数
- React/Vue/Angular 组件
- CRUD 代码（Repository/Service/Controller）
- 文件头注释
- 以及更多结构化代码

---

## Skill 配置

### 注册配置

```json
{
  "name": "code-generation",
  "version": "1.0.0",
  "description": "模板驱动的代码生成工具，支持多种语言和代码结构",
  "entryPoint": "./sample-skills/code-generation/index.js",
  "tags": ["code", "generation", "template", "class", "interface", "component"],
  "dependencies": [],
  "config": {
    "enabled": true,
    "timeout": 30000,
    "maxRetries": 2
  },
  "metadata": {
    "author": "vova",
    "category": "development",
    "icon": "⚡"
  }
}
```

---

## 使用指南

### 基本调用方式

```typescript
import skillManager from '../skill-system';

// 生成 TypeScript 类
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-class',
  className: 'User',
  properties: [
    { name: 'id', type: 'string', description: '用户ID' },
    { name: 'name', type: 'string', description: '用户名' },
    { name: 'email', type: 'string', description: '邮箱地址' }
  ],
  withConstructor: true,
  language: 'typescript'
});

console.log(result.code);
```

---

## 操作类型详解

### 1. 生成类 (`operation: 'generate-class'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-class'` |
| `className` | string | 是 | - | 类名（建议 PascalCase） |
| `properties` | Array | 否 | [] | 类属性列表 |
| `methods` | Array | 否 | [] | 类方法列表 |
| `withConstructor` | boolean | 否 | false | 是否生成构造函数 |
| `withGettersSetters` | boolean | 否 | false | 是否生成 Getter/Setter |
| `language` | string | 否 | 'typescript' | 目标语言 |
| `description` | string | 否 | - | 类描述（JSDoc） |

**Property 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 属性名 |
| `type` | string | 属性类型 |
| `visibility` | string | 访问修饰符：public/private/protected |
| `defaultValue` | string | 默认值 |
| `description` | string | 属性描述 |

**Method 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 方法名 |
| `returnType` | string | 返回类型 |
| `parameters` | Array | 参数列表 |
| `visibility` | string | 访问修饰符 |
| `body` | string | 方法体代码 |

**输出**:

```typescript
{
  success: true,
  code: string,           // 生成的代码
  language: string,       // 代码语言
  codeType: string,       // 代码类型：class
  fileExtension: string   // 建议文件扩展名：.ts
}
```

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-class',
  className: 'Product',
  description: '产品实体类',
  properties: [
    { name: 'id', type: 'string', visibility: 'private', description: '产品ID' },
    { name: 'name', type: 'string', description: '产品名称' },
    { name: 'price', type: 'number', description: '价格' },
    { name: 'stock', type: 'number', defaultValue: '0', description: '库存数量' }
  ],
  methods: [
    {
      name: 'updateStock',
      returnType: 'void',
      parameters: [{ name: 'quantity', type: 'number' }],
      body: '    this.stock += quantity;'
    }
  ],
  withConstructor: true,
  withGettersSetters: true,
  language: 'typescript'
});
```

**生成的代码示例**:

```typescript
/**
 * 产品实体类
 * @author 代码生成器
 */
class Product {
  /** 产品ID */
  private id: string;

  /** 产品名称 */
  name: string;

  /** 价格 */
  price: number;

  /** 库存数量 */
  stock: number = 0;

  constructor(
      id: string,
      name: string,
      price: number,
      stock: number
  ) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.stock = stock;
  }

  getId(): string {
    return this.id;
  }

  setId(value: string): void {
    this.id = value;
  }

  // ... 其他 Getter/Setter

  updateStock(quantity: number): void {
    this.stock += quantity;
  }
}

export default Product;
```

---

### 2. 生成接口 (`operation: 'generate-interface'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-interface'` |
| `interfaceName` | string | 是 | - | 接口名 |
| `properties` | Array | 是 | - | 接口属性列表 |
| `methods` | Array | 否 | [] | 接口方法列表 |
| `extends` | Array | 否 | [] | 继承的接口名列表 |
| `language` | string | 否 | 'typescript' | 目标语言 |

**输出**:

```typescript
{
  success: true,
  code: string,
  language: 'typescript',
  codeType: 'interface',
  fileExtension: '.ts'
}
```

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-interface',
  interfaceName: 'IUserService',
  extends: ['IService'],
  properties: [
    { name: 'name', type: 'string', description: '服务名称' },
    { name: 'version', type: 'string', optional: true }
  ],
  methods: [
    {
      name: 'getUserById',
      returnType: 'Promise<User>',
      parameters: [{ name: 'id', type: 'string' }]
    },
    {
      name: 'createUser',
      returnType: 'Promise<User>',
      parameters: [{ name: 'data', type: 'CreateUserDto' }]
    }
  ]
});
```

---

### 3. 生成枚举 (`operation: 'generate-enum'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-enum'` |
| `enumName` | string | 是 | - | 枚举名 |
| `values` | Array | 是 | - | 枚举值列表 |
| `language` | string | 否 | 'typescript' | 目标语言 |

**Value 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 枚举项名称 |
| `value` | string/number | 枚举项值（可选） |
| `description` | string | 枚举项描述 |

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-enum',
  enumName: 'UserRole',
  values: [
    { name: 'ADMIN', value: 'admin', description: '管理员' },
    { name: 'USER', value: 'user', description: '普通用户' },
    { name: 'GUEST', value: 'guest', description: '访客' }
  ],
  language: 'typescript'
});
```

---

### 4. 生成函数 (`operation: 'generate-function'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-function'` |
| `functionName` | string | 是 | - | 函数名 |
| `parameters` | Array | 否 | [] | 参数列表 |
| `returnType` | string | 否 | 'void' | 返回类型 |
| `body` | string | 否 | - | 函数体代码 |
| `async` | boolean | 否 | false | 是否异步函数 |
| `language` | string | 否 | 'typescript' | 目标语言 |
| `description` | string | 否 | - | 函数描述（JSDoc） |

**Parameter 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 参数名 |
| `type` | string | 参数类型 |
| `optional` | boolean | 是否可选 |
| `defaultValue` | string | 默认值 |

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-function',
  functionName: 'fetchData',
  description: '从 API 异步获取数据',
  async: true,
  parameters: [
    { name: 'url', type: 'string' },
    { name: 'options', type: 'RequestOptions', optional: true }
  ],
  returnType: 'Promise<any>',
  body: `    const response = await fetch(url, options);
    return await response.json();`,
  language: 'typescript'
});
```

---

### 5. 生成组件 (`operation: 'generate-component'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-component'` |
| `componentName` | string | 是 | - | 组件名（PascalCase） |
| `props` | Array | 否 | [] | 组件 Props 列表 |
| `state` | Array | 否 | [] | 组件 State 列表 |
| `framework` | string | 是 | - | 框架：react/vue/angular |
| `typescript` | boolean | 否 | true | 是否使用 TypeScript |
| `useHooks` | boolean | 否 | true | 是否使用 Hooks |

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-component',
  componentName: 'UserProfile',
  framework: 'react',
  typescript: true,
  useHooks: true,
  props: [
    { name: 'userId', type: 'string', required: true },
    { name: 'editable', type: 'boolean', required: false, defaultValue: 'false' }
  ],
  state: [
    { name: 'userData', type: 'User | null', defaultValue: 'null' },
    { name: 'loading', type: 'boolean', defaultValue: 'false' }
  ]
});
```

---

### 6. 生成文件头 (`operation: 'generate-header'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-header'` |
| `fileName` | string | 是 | - | 文件名 |
| `description` | string | 是 | - | 文件描述 |
| `author` | string | 否 | - | 作者名 |
| `version` | string | 否 | - | 版本号 |
| `license` | string | 否 | - | 许可证 |
| `imports` | Array | 否 | [] | 导入语句列表 |

**Import 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `module` | string | 模块名/路径 |
| `default` | string | 默认导出名称 |
| `names` | Array | 命名导出列表 |

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-header',
  fileName: 'UserService.ts',
  description: '用户服务 - 提供用户相关的业务逻辑',
  author: 'vova',
  version: '1.0.0',
  license: 'MIT',
  imports: [
    { module: 'react', default: 'React', names: ['useState', 'useEffect'] },
    { module: '../types/user', names: ['User', 'CreateUserDto'] },
    { module: '../config', default: 'config' }
  ]
});
```

---

### 7. 生成 CRUD 代码 (`operation: 'generate-crud'`)

**输入参数**:

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `operation` | string | 是 | - | 必须为 `'generate-crud'` |
| `entityName` | string | 是 | - | 实体名称 |
| `fields` | Array | 是 | - | 实体字段列表 |
| `outputType` | string | 是 | - | 输出类型：repository/service/controller/full |
| `orm` | string | 否 | 'typeorm' | ORM 类型 |
| `language` | string | 否 | 'typescript' | 目标语言 |

**Field 对象**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 字段名 |
| `type` | string | 字段类型 |
| `primary` | boolean | 是否主键 |
| `nullable` | boolean | 是否可空 |

**示例**:

```typescript
const result = await skillManager.executeSkill('code-generation', {
  operation: 'generate-crud',
  entityName: 'Product',
  fields: [
    { name: 'id', type: 'string', primary: true },
    { name: 'name', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'stock', type: 'number', nullable: true }
  ],
  outputType: 'full',
  orm: 'typeorm',
  language: 'typescript'
});
```

---

## 完整示例

### 示例: 完整的实体类 + DTO + Service

```typescript
// 1. 生成实体类
const entityResult = await skillManager.executeSkill('code-generation', {
  operation: 'generate-class',
  className: 'Order',
  description: '订单实体',
  properties: [
    { name: 'id', type: 'string', description: '订单ID' },
    { name: 'userId', type: 'string', description: '用户ID' },
    { name: 'status', type: 'OrderStatus', description: '订单状态' },
    { name: 'totalAmount', type: 'number', description: '总金额' },
    { name: 'createdAt', type: 'Date', description: '创建时间' }
  ],
  withConstructor: true,
  withGettersSetters: true
});

// 2. 生成状态枚举
const enumResult = await skillManager.executeSkill('code-generation', {
  operation: 'generate-enum',
  enumName: 'OrderStatus',
  values: [
    { name: 'PENDING', value: 'pending' },
    { name: 'PAID', value: 'paid' },
    { name: 'SHIPPED', value: 'shipped' },
    { name: 'COMPLETED', value: 'completed' },
    { name: 'CANCELLED', value: 'cancelled' }
  ]
});

// 3. 生成 Service 接口
const interfaceResult = await skillManager.executeSkill('code-generation', {
  operation: 'generate-interface',
  interfaceName: 'IOrderService',
  methods: [
    { name: 'createOrder', returnType: 'Promise<Order>', parameters: [{ name: 'data', type: 'CreateOrderDto' }] },
    { name: 'getOrderById', returnType: 'Promise<Order>', parameters: [{ name: 'id', type: 'string' }] },
    { name: 'updateOrderStatus', returnType: 'Promise<Order>', parameters: [{ name: 'id', type: 'string' }, { name: 'status', type: 'OrderStatus' }] }
  ]
});
```

---

## 最佳实践

1. **命名规范**: 始终使用一致的命名规范（PascalCase for 类/接口，camelCase for 方法/属性）
2. **类型完整**: 确保所有类型定义完整，避免使用 `any`
3. **文档完善**: 为所有公共 API 添加 JSDoc 注释
4. **格式化**: 生成的代码保持良好的缩进和格式

---

## 支持的语言和框架

| 语言/框架 | 状态 | 说明 |
|-----------|------|------|
| TypeScript | ✅ 完全支持 | 所有代码类型 |
| JavaScript | ✅ 支持 | 类/函数/枚举 |
| React (JSX/TSX) | ✅ 支持 | 函数组件 + Hooks |
| Vue 3 | ⏳ 计划中 | Composition API |
| Angular | ⏳ 计划中 | 组件/服务 |
| Python | ⏳ 计划中 | 类/函数 |
| Java | ⏳ 计划中 | POJO/接口 |

---

## 更新日志

### v1.0.0 (2026-05-15)
- ✅ 支持 7 种代码生成操作
- ✅ TypeScript/JavaScript 完全支持
- ✅ React 组件生成（Hooks + TS）
- ✅ CRUD 代码生成
- ✅ JSDoc 注释自动生成
