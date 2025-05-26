import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NetworkStats } from '../components/NetworkStats';
import { ScanControl } from '../components/ScanControl';
import { DeviceTable } from '../components/DeviceTable';
import {
  useDevices,
  useNetworkStats,
  useScanStatus,
} from '../hooks/useDevices';
import { useDeviceStore } from '../store/useDeviceStore';
import { FiMonitor, FiBarChart, FiActivity, FiSettings } from 'react-icons/fi';

export const Dashboard: React.FC = () => {
  const {
    devices,
    networkStats,
    scanStatus,
    isLoading,
    error,
    setDevices,
  } = useDeviceStore();

  // 获取数据
  const devicesQuery = useDevices();
  const networkStatsQuery = useNetworkStats();
  const scanStatusQuery = useScanStatus();

  // 当组件挂载时，确保设备数据被同步到store
  useEffect(() => {
    if (devicesQuery.data && devicesQuery.data !== devices) {
      setDevices(devicesQuery.data);
    }
  }, [devicesQuery.data, devices, setDevices]);

  // 错误显示
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载错误</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              devicesQuery.refetch();
              networkStatsQuery.refetch();
              scanStatusQuery.refetch();
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
        <p className="text-gray-600 mt-1">网络设备监控概览</p>
      </div>

      {/* 快速导航卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/devices"
          className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiMonitor className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-700">
                设备管理
              </h3>
              <p className="text-sm text-gray-500">查看和管理所有设备</p>
            </div>
          </div>
        </Link>

        <Link
          to="/timeline"
          className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiBarChart className="h-8 w-8 text-green-600 group-hover:text-green-700" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-700">
                时间线图表
              </h3>
              <p className="text-sm text-gray-500">设备在线状态历史</p>
            </div>
          </div>
        </Link>

        <Link
          to="/status"
          className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiActivity className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-purple-700">
                网络状态
              </h3>
              <p className="text-sm text-gray-500">实时网络监控</p>
            </div>
          </div>
        </Link>

        <Link
          to="/settings"
          className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FiSettings className="h-8 w-8 text-orange-600 group-hover:text-orange-700" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-orange-700">
                系统设置
              </h3>
              <p className="text-sm text-gray-500">配置应用参数</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 统计和控制面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 网络统计 - 占2列 */}
        <div className="lg:col-span-2">
          <NetworkStats 
            stats={networkStats}
            isLoading={networkStatsQuery.isLoading}
          />
        </div>
        
        {/* 扫描控制 - 占1列 */}
        <div className="lg:col-span-1">
          <ScanControl 
            scanStatus={scanStatus}
            isLoading={scanStatusQuery.isLoading}
          />
        </div>
      </div>

      {/* 最近设备活动 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近设备活动</h2>
            <Link
              to="/devices"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              查看全部
            </Link>
          </div>
        </div>
        <DeviceTable 
          devices={devices.slice(0, 5)} // 只显示前5个设备
          isLoading={devicesQuery.isLoading}
        />
      </div>
    </div>
  );
}; 