import React from 'react';
import { Device } from '../types';
import { DeviceCard } from './DeviceCard';
import { useDeviceStore } from '../store/useDeviceStore';

interface DeviceListProps {
  devices: Device[];
  isLoading?: boolean;
  className?: string;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  isLoading = false,
  className = ''
}) => {
  const {
    filteredDevices,
    searchQuery,
    deviceFilter,
    setSearchQuery,
    setDeviceFilter
  } = useDeviceStore();

  // 使用store中的过滤结果，如果没有则使用传入的devices
  const displayDevices = filteredDevices.length > 0 || searchQuery || deviceFilter !== 'all' 
    ? filteredDevices 
    : devices;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (filter: 'all' | 'online' | 'offline') => {
    setDeviceFilter(filter);
  };

  const getFilterCount = (filter: 'all' | 'online' | 'offline') => {
    switch (filter) {
      case 'all':
        return devices.length;
      case 'online':
        return devices.filter(d => d.is_online).length;
      case 'offline':
        return devices.filter(d => !d.is_online).length;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {/* 搜索栏骨架 */}
          <div className="h-10 bg-gray-200 rounded"></div>
          
          {/* 过滤器骨架 */}
          <div className="flex space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          
          {/* 设备卡片骨架 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      {/* 标题 */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">设备列表</h2>
        <span className="text-sm text-gray-500">
          共 {displayDevices.length} 个设备
        </span>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索设备（IP、MAC、主机名、别名、厂商）"
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 过滤器 */}
      <div className="flex space-x-2 mb-6">
        {(['all', 'online', 'offline'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterChange(filter)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              deviceFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' && '全部'}
            {filter === 'online' && '在线'}
            {filter === 'offline' && '离线'}
            <span className="ml-1 text-xs">
              ({getFilterCount(filter)})
            </span>
          </button>
        ))}
      </div>

      {/* 设备网格 */}
      {displayDevices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.94-6.071 2.461"/>
            </svg>
          </div>
          <p className="text-gray-500">
            {searchQuery ? '没有找到匹配的设备' : '暂无设备数据'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              清除搜索条件
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              className="h-full"
            />
          ))}
        </div>
      )}

      {/* 加载更多按钮（如果需要分页的话） */}
      {/* 这里可以添加分页或无限滚动功能 */}
    </div>
  );
}; 