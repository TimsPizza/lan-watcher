/**
 * 时间处理工具函数
 * 使用UTC时间确保前后端时间计算一致性
 */

/**
 * 格式化最后在线时间
 * @param lastSeen 后端返回的ISO时间字符串 (UTC格式)
 * @returns 格式化的相对时间字符串
 */
export const formatLastSeen = (lastSeen: string): string => {
  // 将后端的UTC时间字符串转换为Date对象
  // 后端格式: "2025-06-06T19:49:37.547103" (UTC时间但无Z后缀)
  const lastSeenDate = new Date(lastSeen + 'Z'); // 添加Z后缀明确指定为UTC
  
  // 获取当前UTC时间
  const nowUtc = new Date();
  
  // 计算时间差 (毫秒)
  const diffMs = nowUtc.getTime() - lastSeenDate.getTime();
  
  // 转换为分钟、小时、天
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // 处理异常情况
  if (diffMs < 0) {
    // 如果后端时间比当前时间晚，可能是时钟不同步
    return '刚刚';
  }

  // 返回相对时间
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  
  // 超过30天显示具体日期
  return lastSeenDate.toLocaleDateString('zh-CN');
};

/**
 * 格式化首次发现时间
 * @param firstSeen 后端返回的ISO时间字符串 (UTC格式)
 * @returns 本地时间格式的日期时间字符串
 */
export const formatFirstSeen = (firstSeen: string): string => {
  const date = new Date(firstSeen + 'Z'); // 添加Z后缀明确指定为UTC
  return date.toLocaleString('zh-CN');
};

/**
 * 检查设备是否在指定时间内在线
 * @param lastSeen 最后在线时间
 * @param thresholdMinutes 阈值分钟数，默认5分钟
 * @returns 是否被认为是在线状态
 */
export const isRecentlyOnline = (lastSeen: string, thresholdMinutes: number = 5): boolean => {
  const lastSeenDate = new Date(lastSeen + 'Z');
  const nowUtc = new Date();
  const diffMs = nowUtc.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  return diffMins <= thresholdMinutes;
};

/**
 * 格式化扫描会话时间
 * @param startTime 开始时间
 * @param endTime 结束时间（可选）
 * @returns 格式化的时间范围字符串
 */
export const formatScanSessionTime = (startTime: string, endTime?: string): string => {
  const start = new Date(startTime + 'Z').toLocaleString('zh-CN');
  
  if (!endTime) {
    return `${start} - 进行中`;
  }
  
  const end = new Date(endTime + 'Z').toLocaleString('zh-CN');
  return `${start} - ${end}`;
};

/**
 * 计算扫描持续时间
 * @param startTime 开始时间
 * @param endTime 结束时间（可选，默认使用当前时间）
 * @returns 持续时间（秒）
 */
export const calculateScanDuration = (startTime: string, endTime?: string): number => {
  const start = new Date(startTime + 'Z');
  const end = endTime ? new Date(endTime + 'Z') : new Date();
  
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}; 