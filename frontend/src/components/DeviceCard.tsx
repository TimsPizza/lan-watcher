import React, { useState } from 'react';
import { Device } from '../types';
import { useUpdateDeviceAlias } from '../hooks/useDevices';

interface DeviceCardProps {
  device: Device;
  className?: string;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, className = '' }) => {
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState(device.custom_name || '');
  const updateAliasMutation = useUpdateDeviceAlias();

  const handleAliasSubmit = () => {
    if (aliasValue.trim() !== (device.custom_name || '')) {
      updateAliasMutation.mutate({
        deviceId: device.id,
        aliasData: { custom_name: aliasValue.trim() || '' }
      });
    }
    setIsEditingAlias(false);
  };

  const handleAliasCancel = () => {
    setAliasValue(device.custom_name || '');
    setIsEditingAlias(false);
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

  const getStatusColor = () => {
    return device.is_online ? 'bg-green-500' : 'bg-gray-400';
  };

  const getStatusText = () => {
    return device.is_online ? '在线' : '离线';
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-4">
        {/* 状态指示器和主要信息 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-600">{getStatusText()}</span>
          </div>
          <button
            onClick={() => setIsEditingAlias(true)}
            className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
            disabled={updateAliasMutation.isLoading}
          >
            设置别名
          </button>
        </div>

        {/* 设备名称/别名 */}
        <div className="mb-2">
          {isEditingAlias ? (
            <div className="space-y-2">
              <input
                type="text"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
                placeholder="输入设备别名"
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAliasSubmit();
                  if (e.key === 'Escape') handleAliasCancel();
                }}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleAliasSubmit}
                  disabled={updateAliasMutation.isLoading}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
                <button
                  onClick={handleAliasCancel}
                  className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-gray-900">
              {device.custom_name || device.hostname || device.ip_address}
            </h3>
          )}
        </div>

        {/* IP地址 */}
        <div className="mb-2">
          <span className="text-sm text-gray-500">IP地址：</span>
          <span className="text-sm font-mono text-gray-900">{device.ip_address}</span>
        </div>

        {/* MAC地址 */}
        {device.mac_address && (
          <div className="mb-2">
            <span className="text-sm text-gray-500">MAC：</span>
            <span className="text-sm font-mono text-gray-700">{device.mac_address}</span>
          </div>
        )}

        {/* 主机名（如果与别名不同） */}
        {device.hostname && device.hostname !== device.custom_name && (
          <div className="mb-2">
            <span className="text-sm text-gray-500">主机名：</span>
            <span className="text-sm text-gray-700">{device.hostname}</span>
          </div>
        )}

        {/* 厂商信息 */}
        {device.vendor && (
          <div className="mb-2">
            <span className="text-sm text-gray-500">厂商：</span>
            <span className="text-sm text-gray-700">{device.vendor}</span>
          </div>
        )}

        {/* 设备类型 */}
        {device.device_type && (
          <div className="mb-2">
            <span className="text-sm text-gray-500">类型：</span>
            <span className="text-sm text-gray-700">{device.device_type}</span>
          </div>
        )}

        {/* 开放端口 */}
        {device.open_ports && (
          <div className="mb-2">
            <span className="text-sm text-gray-500">开放端口：</span>
            <span className="text-sm text-gray-700">{device.open_ports}</span>
          </div>
        )}

        {/* 时间信息 */}
        <div className="text-xs text-gray-500 mt-3 space-y-1">
          <div>首次发现：{new Date(device.first_seen).toLocaleString('zh-CN')}</div>
          <div>最后在线：{formatLastSeen(device.last_seen)}</div>
        </div>
      </div>
    </div>
  );
}; 