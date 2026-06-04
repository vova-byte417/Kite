/**
 * 数据分析 Skill - 提供数据清洗、统计分析和可视化能力
 */

/**
 * 执行 Skill 的核心逻辑
 * @param input 输入数据
 * @param context 执行上下文
 */
export const execute = async (input: any, context?: any) => {
  console.log(`[数据分析] 开始执行，任务ID: ${context?.taskId || 'unknown'}`);

  // 处理通用输入格式（来自 ai-assistant）
  let taskInput = input;
  
  // 如果是通用格式，提取任务信息
  if (input.task || input.parsedTask) {
    taskInput = {
      operation: 'analyze',
      task: input.task || input.parsedTask?.projectType || 'analyze',
      description: input.parsedTask?.description || input.task || '',
      tags: input.parsedTask?.tags || [],
      subtasks: input.subtasks || input.parsedTask?.subtasks || [],
    };
  }

  // 根据操作类型执行不同的处理
  const operation = taskInput.operation || 'analyze';
  
  let result;
  switch (operation) {
    case 'read-csv':
      result = await readCSV(taskInput);
      break;
    case 'clean':
      result = await cleanData(taskInput);
      break;
    case 'analyze':
    default:
      // 如果是自然语言任务，执行完整的数据分析流程
      if (taskInput.task || taskInput.description) {
        result = await executeNaturalLanguageTask(taskInput);
      } else {
        result = await analyzeData(taskInput);
      }
      break;
  }

  console.log(`[数据分析] 处理完成`);
  return result;
};

/**
 * 执行自然语言任务
 */
async function executeNaturalLanguageTask(input: any): Promise<any> {
  const { task, description, tags, subtasks } = input;
  const fullDescription = task || description || '';
  
  // 根据任务描述判断需要执行的操作
  const needsCSVGeneration = fullDescription.includes('csv') || fullDescription.includes('CSV') || 
                           tags?.includes('csv') || tags?.includes('random');
  const needsCleaning = fullDescription.includes('清洗') || fullDescription.includes('clean') || 
                       tags?.includes('clean') || tags?.includes('data-cleaning');
  const needsAnalysis = fullDescription.includes('分析') || fullDescription.includes('统计') || 
                       tags?.includes('statistics') || tags?.includes('analysis');

  // 生成随机 CSV 数据（如果需要）
  let csvData: any[] = [];
  let csvContent = '';
  
  if (needsCSVGeneration) {
    // 解析维度（如 "100*100"）
    const dimensionMatch = fullDescription.match(/(\d+)\s*[*x×]\s*(\d+)/);
    const rows = dimensionMatch ? parseInt(dimensionMatch[1]) : 100;
    const cols = dimensionMatch ? parseInt(dimensionMatch[2]) : 100;
    
    console.log(`[数据分析] 生成 ${rows}x${cols} 的随机数据...`);
    csvData = generateRandomData(rows, cols);
    csvContent = arrayToCSV(csvData);
    console.log(`[数据分析] 已生成 ${rows * cols} 个随机数`);
  }

  // 数据清洗（如果需要且有数据）
  let cleanedData = csvData;
  if (needsCleaning && csvData.length > 0) {
    console.log('[数据分析] 执行数据清洗...');
    const cleanResult = await cleanData({ data: csvData });
    cleanedData = cleanResult.cleanedData;
    console.log(`[数据分析] 数据清洗完成，原始: ${cleanResult.originalCount} 行，清洗后: ${cleanResult.cleanedCount} 行`);
  }

  // 统计分析（如果需要）
  let analysisResult: any = {};
  if (needsAnalysis && cleanedData.length > 0) {
    console.log('[数据分析] 执行统计分析...');
    analysisResult = await analyzeData({ data: cleanedData });
  }

  return {
    success: true,
    generatedCSV: csvContent ? { rows: csvData.length, columns: csvData[0] ? Object.keys(csvData[0]).length : 0 } : null,
    cleaningResult: needsCleaning && csvData.length > 0 ? {
      originalCount: csvData.length,
      cleanedCount: cleanedData.length,
    } : null,
    analysis: analysisResult,
    summary: buildSummary(fullDescription, csvData.length > 0, cleanedData.length > 0, !!analysisResult),
  };
}

/**
 * 生成随机数据
 */
function generateRandomData(rows: number, cols: number): any[] {
  const data: any[] = [];
  const headers = Array.from({ length: cols }, (_, i) => `column_${i + 1}`);
  
  for (let i = 0; i < rows; i++) {
    const row: any = { row_id: i + 1 };
    for (let j = 0; j < cols; j++) {
      // 生成随机数，偶尔加入一些异常值
      let value = Math.random() * 1000;
      // 5% 的概率生成 null（模拟缺失值）
      if (Math.random() < 0.05) {
        value = null;
      }
      // 1% 的概率生成极端值
      else if (Math.random() < 0.01) {
        value = value * 100;
      }
      row[headers[j]] = value;
    }
    data.push(row);
  }
  
  return data;
}

/**
 * 将数组转换为 CSV 格式
 */
function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' && v.includes(',')) return `"${v}"`;
      return v;
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * 构建总结
 */
function buildSummary(task: string, generated: boolean, cleaned: boolean, analyzed: boolean): string {
  const parts: string[] = [];
  if (generated) parts.push('CSV数据生成');
  if (cleaned) parts.push('数据清洗');
  if (analyzed) parts.push('统计分析');
  return `已完成${parts.join('、')}任务。`;
}

/**
 * 输入验证
 */
export const validateInput = async (input: any): Promise<boolean> => {
  if (!input || typeof input !== 'object') {
    return false;
  }
  return true;
};

/**
 * Skill 加载钩子
 */
export const onLoad = async () => {
  console.log('[数据分析] Skill 已加载，准备就绪');
};

/**
 * 读取 CSV 数据
 */
async function readCSV(input: any) {
  const { content, delimiter = ',' } = input;
  
  if (!content) {
    throw new Error('CSV content is required');
  }

  // 解析 CSV
  const lines = content.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = parseValue(values[index]);
    });
    return row;
  });

  return {
    success: true,
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length
  };
}

/**
 * 解析值（尝试转换数字和布尔值）
 */
function parseValue(value: string): any {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
  // 尝试解析数字
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  
  // 尝试解析布尔值
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  
  return trimmed;
}

/**
 * 数据清洗
 */
async function cleanData(input: any) {
  const { data } = input;
  
  if (!data || !Array.isArray(data)) {
    throw new Error('Data array is required');
  }

  const result = {
    originalCount: data.length,
    cleanedCount: 0,
    removedRows: [],
    imputedValues: [],
    cleanedData: [],
    statistics: {} as any
  };

  // 统计每列的缺失值
  const missingStats: Record<string, number> = {};
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  columns.forEach(col => {
    missingStats[col] = data.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
  });

  // 执行清洗
  for (let i = 0; i < data.length; i++) {
    const row = { ...data[i] };
    let isValid = true;
    const issues: string[] = [];

    // 检查重复值
    for (let j = i + 1; j < data.length; j++) {
      if (JSON.stringify(row) === JSON.stringify(data[j])) {
        issues.push('duplicate');
        break;
      }
    }

    // 检查缺失值
    let missingCount = 0;
    for (const col of columns) {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        missingCount++;
        // 尝试用均值填充数值列
        if (typeof data[0][col] === 'number') {
          const validValues = data.map(r => r[col]).filter(v => typeof v === 'number');
          if (validValues.length > 0) {
            row[col] = validValues.reduce((a, b) => a + b, 0) / validValues.length;
            result.imputedValues.push({ row: i, column: col, value: row[col] });
          }
        }
      }
    }

    // 如果缺失值太多，标记为无效
    if (missingCount > columns.length / 2) {
      isValid = false;
      issues.push('too many missing values');
    }

    // 检查异常值（数值列）
    for (const col of columns) {
      if (typeof row[col] === 'number') {
        const allValues = data.map(r => r[col]).filter(v => typeof v === 'number');
        if (allValues.length > 0) {
          const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
          const std = Math.sqrt(allValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allValues.length);
          if (Math.abs(row[col] - mean) > 3 * std) {
            issues.push(`outlier in ${col}`);
          }
        }
      }
    }

    if (isValid) {
      result.cleanedData.push(row);
      result.cleanedCount++;
    } else {
      result.removedRows.push({ row: i, reasons: issues });
    }
  }

  result.statistics = {
    missingValues: missingStats,
    duplicateCount: result.removedRows.filter(r => r.reasons.includes('duplicate')).length,
    imputedCount: result.imputedValues.length,
    removalRate: ((data.length - result.cleanedCount) / data.length * 100).toFixed(1)
  };

  return {
    success: true,
    ...result
  };
}

/**
 * 统计分析
 */
async function analyzeData(input: any) {
  const { data } = input;
  
  if (!data || !Array.isArray(data)) {
    throw new Error('Data array is required');
  }

  if (data.length === 0) {
    return {
      success: true,
      recordCount: 0,
      summary: { type: 'empty', fieldsDetected: 0 },
      statistics: { count: 0 }
    };
  }

  const result = {
    success: true,
    recordCount: data.length,
    summary: generateSummary(input, data),
    statistics: calculateStatistics(data),
    timestamp: new Date().toISOString()
  };

  return result;
}

/**
 * 生成数据摘要
 */
function generateSummary(input: any, data: any[]) {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // 检测每列的数据类型
  const fieldTypes: Record<string, string> = {};
  columns.forEach(col => {
    const values = data.map(r => r[col]);
    const types = new Set(values.map(v => typeof v));
    if (types.size === 1) {
      fieldTypes[col] = types.values().next().value;
    } else {
      fieldTypes[col] = 'mixed';
    }
  });

  return {
    type: input.type || 'unknown',
    fieldsDetected: columns.length,
    fieldTypes,
    qualityScore: calculateQualityScore(data, columns)
  };
}

/**
 * 计算数据质量分数
 */
function calculateQualityScore(data: any[], columns: string[]): number {
  let score = 100;
  
  // 缺失值扣分
  let totalMissing = 0;
  for (const col of columns) {
    const missing = data.filter(row => row[col] === null || row[col] === undefined || row[col] === '').length;
    totalMissing += missing;
  }
  const missingRate = totalMissing / (data.length * columns.length);
  score -= missingRate * 50;

  // 重复值扣分
  const uniqueCount = new Set(data.map(row => JSON.stringify(row))).size;
  const duplicateRate = 1 - (uniqueCount / data.length);
  score -= duplicateRate * 30;

  // 数据类型一致性加分
  let typeConsistency = 0;
  for (const col of columns) {
    const types = new Set(data.map(r => typeof r[col]));
    if (types.size === 1) typeConsistency++;
  }
  score += (typeConsistency / columns.length) * 20;

  return Math.max(0, Math.min(100, score));
}

/**
 * 计算统计数据
 */
function calculateStatistics(data: any[]) {
  if (!data || data.length === 0) {
    return { count: 0 };
  }

  const columns = Object.keys(data[0]);
  const stats: any = {
    count: data.length,
    columns
  };

  // 对数值列计算统计指标
  const numericStats: Record<string, any> = {};
  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => typeof v === 'number');
    if (values.length > 0) {
      numericStats[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        sum: values.reduce((a, b) => a + b, 0),
        count: values.length,
        variance: calculateVariance(values),
        std: Math.sqrt(calculateVariance(values))
      };
    }
  }

  // 对类别列计算频率
  const categoricalStats: Record<string, any> = {};
  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => typeof v === 'string');
    if (values.length > 0) {
      const freq: Record<string, number> = {};
      values.forEach(v => {
        freq[v] = (freq[v] || 0) + 1;
      });
      categoricalStats[col] = {
        uniqueCount: Object.keys(freq).length,
        frequencies: freq,
        topValues: Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count, percentage: ((count / values.length) * 100).toFixed(1) }))
      };
    }
  }

  if (Object.keys(numericStats).length > 0) {
    stats.numeric = numericStats;
  }
  if (Object.keys(categoricalStats).length > 0) {
    stats.categorical = categoricalStats;
  }

  // 样本数据
  stats.sample = data.slice(0, Math.min(5, data.length));

  return stats;
}

/**
 * 计算方差
 */
function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}