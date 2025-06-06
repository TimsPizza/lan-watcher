import React from 'react';
import { Device } from '../types';
import { formatLastSeen } from '../utils/timeUtils';
import { FiWifi, FiWifiOff, FiActivity, FiClock } from 'react-icons/fi';

interface DeviceActivity {
  device: Device;
  activityType: 'online' | 'offline' | 'first_seen';
  timestamp: string;
  timeAgo: string;
}

interface RecentActivityProps {
  devices: Device[];
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ 
  devices, 
  className = '' 
}) => {
  // 分析设备活动
  const analyzeDeviceActivity = (): DeviceActivity[] => {
    const activities: DeviceActivity[] = [];
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    devices.forEach(device => {
      const lastSeenDate = new Date(device.last_seen + 'Z');
      const firstSeenDate = new Date(device.first_seen + 'Z');
      
      // 如果设备在最近24小时内首次被发现
      if (firstSeenDate >= cutoffTime) {
        activities.push({
          device,
          activityType: 'first_seen',
          timestamp: device.first_seen,
          timeAgo: formatLastSeen(device.first_seen)
        });
      }
      
      // 如果设备在最近有活动
      if (lastSeenDate >= cutoffTime) {
        const timeSinceLastSeen = now.getTime() - lastSeenDate.getTime();
        const minutesSinceLastSeen = Math.floor(timeSinceLastSeen / 60000);
        
        if (device.is_online) {
          // 设备当前在线，且最近有活动
          if (minutesSinceLastSeen <= 10) { // 10分钟内的活动认为是"刚上线"
            activities.push({
              device,
              activityType: 'online',
              timestamp: device.last_seen,
              timeAgo: formatLastSeen(device.last_seen)
            });
          }
        } else {
          // 设备当前离线，显示何时离线的
          if (minutesSinceLastSeen <= 120) { // 2小时内离线的
            activities.push({
              device,
              activityType: 'offline',
              timestamp: device.last_seen,
              timeAgo: formatLastSeen(device.last_seen)
            });
          }
        }
      }
    });

    // 按时间戳排序，最新的在前
    return activities.sort((a, b) => 
      new Date(b.timestamp + 'Z').getTime() - new Date(a.timestamp + 'Z').getTime()
    ).slice(0, 10); // 只显示最近10个活动
  };

  const activities = analyzeDeviceActivity();

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'online':
        return <FiWifi className="text-green-500 w-4 h-4" />;
      case 'offline':
        return <FiWifiOff className="text-red-500 w-4 h-4" />;
      case 'first_seen':
        return <FiActivity className="text-blue-500 w-4 h-4" />;
      default:
        return <FiClock className="text-gray-500 w-4 h-4" />;
    }
  };

  const getActivityText = (activity: DeviceActivity) => {
    const deviceName = activity.device.custom_name || 
                      activity.device.hostname || 
                      activity.device.ip_address;
    
    switch (activity.activityType) {
      case 'online':
        return `${deviceName} 上线`;
      case 'offline':
        return `${deviceName} 离线`;
      case 'first_seen':
        return `发现新设备 ${deviceName}`;
      default:
        return `${deviceName} 活动`;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'online':
        return 'border-l-green-500 bg-green-50';
      case 'offline':
        return 'border-l-red-500 bg-red-50';
      case 'first_seen':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiActivity className="mr-2" />
            最近设备活动
          </h3>
        </div>
        <div className="p-6 text-center">
          <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">暂无最近活动</p>
          <p className="text-sm text-gray-400 mt-1">
            设备状态变化将在这里显示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiActivity className="mr-2" />
          最近设备活动
          <span className="ml-2 text-sm text-gray-500 font-normal">
            ({activities.length})
          </span>
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {activities.map((activity, index) => (
          <div 
            key={`${activity.device.id}-${activity.timestamp}-${index}`}
            className={`px-6 py-4 border-l-4 ${getActivityColor(activity.activityType)} hover:bg-opacity-75 transition-colors`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getActivityIcon(activity.activityType)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.device.ip_address}
                    {activity.device.vendor && (
                      <span className="ml-2">• {activity.device.vendor}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {activity.timeAgo}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {activities.length >= 10 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            显示最近 10 个活动 • 更多历史记录请查看时间线
          </p>
        </div>
      )}
    </div>
  );
}; 