import React, { useState } from 'react';
import { Device } from '../types';
import { getDeviceIcon, getDeviceTypeLabel } from '../utils/deviceIcons';
import { useUpdateDeviceAlias } from '../hooks/useDevices';
import { useDeviceStore } from '../store/useDeviceStore';

interface DeviceTableProps {
  devices: Device[];
  isLoading?: boolean;
  className?: string;
}

interface EditingState {
  deviceId: number | null;
  value: string;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  isLoading = false,
  className = ''
}) => {
  const [editingAlias, setEditingAlias] = useState<EditingState>({ deviceId: null, value: '' });
  const updateAliasMutation = useUpdateDeviceAlias();
  
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

  const handleEditAlias = (device: Device) => {
    setEditingAlias({
      deviceId: device.id,
      value: device.custom_name || ''
    });
  };

  const handleSaveAlias = (deviceId: number) => {
    updateAliasMutation.mutate({
      deviceId,
      aliasData: { custom_name: editingAlias.value.trim() || '' }
    });
    setEditingAlias({ deviceId: null, value: '' });
  };

  const handleCancelEdit = () => {
    setEditingAlias({ deviceId: null, value: '' });
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    return `${diffDays}天前`;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
        <div className="p-6">
          {/* 搜索和过滤器骨架 */}
          <div className="animate-pulse space-y-4 mb-6">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="flex space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 w-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          
          {/* 表格骨架 */}
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-2"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded mb-1"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="p-6">
        {/* 标题和设备数量 */}
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

        {/* 设备表格 */}
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
          <div className="overflow-hidden">
            {/* 表格头部 */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-600">
              <div className="col-span-3">设备</div>
              <div className="col-span-2">IP地址</div>
              <div className="col-span-2">制造商</div>
              <div className="col-span-2">MAC地址</div>
              <div className="col-span-2">上次在线</div>
              <div className="col-span-1">状态</div>
            </div>

            {/* 设备行 */}
            <div className="divide-y divide-gray-100">
              {displayDevices.map((device) => (
                <div key={device.id} className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 transition-colors">
                  {/* 设备列（图标+名称） */}
                  <div className="col-span-3 flex items-center space-x-3">
                    {/* 设备图标 */}
                    <div className="flex-shrink-0">
                      {getDeviceIcon(device)}
                    </div>
                    
                    {/* 设备名称和别名编辑 */}
                    <div className="flex-1 min-w-0">
                      {editingAlias.deviceId === device.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingAlias.value}
                            onChange={(e) => setEditingAlias(prev => ({ ...prev, value: e.target.value }))}
                            placeholder="输入设备别名"
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveAlias(device.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveAlias(device.id)}
                              disabled={updateAliasMutation.isLoading}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 truncate">
                              {device.custom_name || device.hostname || '未知设备'}
                            </span>
                            <button
                              onClick={() => handleEditAlias(device)}
                              className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                              disabled={updateAliasMutation.isLoading}
                            >
                              设置别名
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            {getDeviceTypeLabel(device)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IP地址列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="font-mono text-sm text-gray-900">{device.ip_address}</span>
                  </div>

                  {/* 制造商列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-700 truncate">
                      {device.vendor || '未知'}
                    </span>
                  </div>

                  {/* MAC地址列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="font-mono text-sm text-gray-600 truncate">
                      {device.mac_address || '未知'}
                    </span>
                  </div>

                  {/* 上次在线列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {formatLastSeen(device.last_seen)}
                    </span>
                  </div>

                  {/* 状态列 */}
                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        device.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {device.is_online ? '在线' : '离线'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 