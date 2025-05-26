import React from 'react';
import { NetworkStats as NetworkStatsType } from '../types';

interface NetworkStatsProps {
  stats: NetworkStatsType | null;
  isLoading?: boolean;
  className?: string;
}

export const NetworkStats: React.FC<NetworkStatsProps> = ({
  stats,
  isLoading = false,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>暂无统计数据</p>
        </div>
      </div>
    );
  }

  const offlineRate = stats.total_devices > 0 
    ? ((stats.offline_devices / stats.total_devices) * 100).toFixed(1)
    : 0;

  const onlineRate = stats.total_devices > 0 
    ? ((stats.online_devices / stats.total_devices) * 100).toFixed(1)
    : 0;

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">网络统计</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 总设备数 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {stats.total_devices}
          </div>
          <div className="text-sm text-gray-500 mt-1">总设备数</div>
        </div>

        {/* 在线设备 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {stats.online_devices}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            在线设备 ({onlineRate}%)
          </div>
        </div>

        {/* 离线设备 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-500">
            {stats.offline_devices}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            离线设备 ({offlineRate}%)
          </div>
        </div>

        {/* 最近扫描 */}
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {stats.recent_scans}
          </div>
          <div className="text-sm text-gray-500 mt-1">最近扫描</div>
        </div>
      </div>

      {/* 在线率进度条 */}
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>设备在线率</span>
          <span>{onlineRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${onlineRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}; 