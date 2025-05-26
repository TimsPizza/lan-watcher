import { NetworkStats } from '@/components/NetworkStats';
import { useNetworkStats } from '@/hooks/useDevices';
import React, { useEffect, useState } from 'react';
import { FiActivity, FiClock, FiServer, FiWifi } from 'react-icons/fi';

export const StatusPage: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 使用真实的API hooks
  const { data: networkStats, isLoading } = useNetworkStats();

  // 更新最后更新时间
  useEffect(() => {
    if (networkStats) {
      setLastUpdate(new Date());
    }
  }, [networkStats]);

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return '未知';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff} 秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">网络状态</h1>
          <p className="text-gray-600 mt-1">实时监控网络运行状态</p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FiClock className="h-4 w-4" />
          <span>最后更新: {formatLastUpdate(lastUpdate)}</span>
        </div>
      </div>

      {/* 网络统计卡片 */}
      <NetworkStats 
        stats={networkStats || null} 
        isLoading={isLoading}
      />

      {/* 状态详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 网络连接状态 */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center mb-4">
            <FiWifi className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">网络连接</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">网络接口</span>
              <span className="text-green-600 font-medium">eth0 (活跃)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">IP 地址</span>
              <span className="font-medium">192.168.1.100</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">子网掩码</span>
              <span className="font-medium">255.255.255.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">网关</span>
              <span className="font-medium">192.168.1.1</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">DNS 服务器</span>
              <span className="font-medium">8.8.8.8, 8.8.4.4</span>
            </div>
          </div>
        </div>

        {/* 扫描状态 */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center mb-4">
            <FiActivity className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">扫描状态</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">扫描状态</span>
              <span className="text-green-600 font-medium flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                运行中
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">扫描间隔</span>
              <span className="font-medium">5 分钟</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">下次扫描</span>
              <span className="font-medium">2 分钟后</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">今日扫描次数</span>
              <span className="font-medium">{networkStats?.recent_scans || 0} 次</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">扫描范围</span>
              <span className="font-medium">192.168.1.0/24</span>
            </div>
          </div>
        </div>
      </div>

      {/* 系统资源状态 */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center mb-4">
          <FiServer className="h-5 w-5 text-purple-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">系统资源</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU 使用率 */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="35, 100"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-semibold text-gray-700">35%</span>
            </div>
            <div className="text-sm text-gray-600">CPU 使用率</div>
          </div>

          {/* 内存使用率 */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-green-600"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="65, 100"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-semibold text-gray-700">65%</span>
            </div>
            <div className="text-sm text-gray-600">内存使用率</div>
          </div>

          {/* 磁盘使用率 */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-yellow-600"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="45, 100"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-semibold text-gray-700">45%</span>
            </div>
            <div className="text-sm text-gray-600">磁盘使用率</div>
          </div>

          {/* 网络流量 */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-600"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="20, 100"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-semibold text-gray-700">20%</span>
            </div>
            <div className="text-sm text-gray-600">网络负载</div>
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-900">设备 192.168.1.20 (iPhone 12) 上线</span>
            </div>
            <span className="text-sm text-gray-500">2 分钟前</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-900">网络扫描完成，发现 5 个设备</span>
            </div>
            <span className="text-sm text-gray-500">5 分钟前</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-900">设备 192.168.1.40 (智能电视) 离线</span>
            </div>
            <span className="text-sm text-gray-500">10 分钟前</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-900">检测到新设备 192.168.1.50</span>
            </div>
            <span className="text-sm text-gray-500">15 分钟前</span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-gray-900">系统启动完成</span>
            </div>
            <span className="text-sm text-gray-500">1 小时前</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 