import React, { useState, useEffect } from 'react';
import { DeviceTable } from '@/components/DeviceTable';
import { Device } from '@/types';
import { useDevices } from '@/hooks/useDevices';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';

export const DevicesPage: React.FC = () => {
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  // 使用真实的API hooks
  const { data: devices = [], isLoading, refetch } = useDevices();

  // 过滤设备
  useEffect(() => {
    let filtered = devices;

    // 状态过滤
    if (statusFilter === 'online') {
      filtered = filtered.filter(device => device.is_online);
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(device => !device.is_online);
    }

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.ip_address.toLowerCase().includes(term) ||
        (device.hostname && device.hostname.toLowerCase().includes(term)) ||
        (device.custom_name && device.custom_name.toLowerCase().includes(term)) ||
        (device.vendor && device.vendor.toLowerCase().includes(term)) ||
        (device.mac_address && device.mac_address.toLowerCase().includes(term))
      );
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter]);

  const handleRefresh = () => {
    refetch();
  };

  const handleStatusFilterChange = (status: 'all' | 'online' | 'offline') => {
    setStatusFilter(status);
  };

  const onlineDevices = devices.filter(d => d.is_online).length;
  const offlineDevices = devices.filter(d => !d.is_online).length;

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
          <p className="text-gray-600 mt-1">管理和监控所有网络设备</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          {/* 统计数据 */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{onlineDevices} 在线</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">{offlineDevices} 离线</span>
            </div>
            <div className="text-gray-600">
              总计 {devices.length} 设备
            </div>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 过滤器和搜索 */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索设备 (IP、名称、MAC地址、厂商)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 状态过滤器 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">状态:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => handleStatusFilterChange('all')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => handleStatusFilterChange('online')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                  statusFilter === 'online'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                在线
              </button>
              <button
                onClick={() => handleStatusFilterChange('offline')}
                className={`px-4 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                  statusFilter === 'offline'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                离线
              </button>
            </div>
          </div>
        </div>

        {/* 搜索结果提示 */}
        {searchTerm && (
          <div className="mt-3 text-sm text-gray-600">
            找到 {filteredDevices.length} 个匹配的设备
          </div>
        )}
      </div>

      {/* 设备表格 */}
      <DeviceTable 
        devices={filteredDevices} 
        isLoading={isLoading}
      />

      {/* 空状态 */}
      {!isLoading && filteredDevices.length === 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
          <div className="text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? '没有找到匹配的设备' 
              : '暂无设备数据'
            }
          </div>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              清除过滤器
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 