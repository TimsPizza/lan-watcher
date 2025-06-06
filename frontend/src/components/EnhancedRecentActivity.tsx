import React, { useEffect, useState } from "react";
import {
  FiActivity,
  FiClock,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import ApiService from "../services/api";
import { useDeviceStore } from "../store/useDeviceStore";
import { DeviceActivity } from "../types";
import { formatLastSeen } from "../utils/timeUtils";

interface EnhancedRecentActivityProps {
  className?: string;
}

export const EnhancedRecentActivity: React.FC<EnhancedRecentActivityProps> = ({
  className = "",
}) => {
  const { devices, scanStatus } = useDeviceStore();

  const [activities, setActivities] = useState<DeviceActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 分析设备历史数据，检测状态变化
  const analyzeDeviceActivities = async (): Promise<DeviceActivity[]> => {
    const allActivities: DeviceActivity[] = [];
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    // 分析每个设备的历史数据
    for (const device of devices.slice(0, 20)) {
      // 限制分析前10个设备以提升性能
      try {
        // 获取设备最近2小时的历史数据
        const history = await ApiService.getDeviceHistory(device.id, 2);

        if (history.length === 0) continue;

        // 按时间排序
        const sortedHistory = history.sort(
          (a, b) =>
            new Date(a.scan_time).getTime() - new Date(b.scan_time).getTime(),
        );

        // 检查首次发现
        const firstSeenDate = new Date(device.first_seen + "Z");
        if (firstSeenDate >= cutoffTime) {
          allActivities.push({
            device,
            activityType: "first_seen",
            timestamp: device.first_seen,
            timeAgo: formatLastSeen(device.first_seen),
          });
        }

        // 分析状态变化
        let previousState: boolean | undefined = undefined;

        for (let i = 0; i < sortedHistory.length; i++) {
          const record = sortedHistory[i];
          const recordTime = new Date(record.scan_time + "Z");

          // 只处理最近24小时内的记录
          if (recordTime < cutoffTime) continue;

          // 检测状态变化
          if (
            previousState !== undefined &&
            previousState !== record.is_online
          ) {
            // 状态发生了变化
            const activityType = record.is_online ? "online" : "offline";
            const timeSinceChange = now.getTime() - recordTime.getTime();
            const minutesSinceChange = Math.floor(timeSinceChange / 60000);

            // 只显示最近2小时内的状态变化
            if (minutesSinceChange <= 120) {
              allActivities.push({
                device,
                activityType,
                timestamp: record.scan_time,
                timeAgo: formatLastSeen(record.scan_time),
                previousState,
              });
            }
          }

          previousState = record.is_online;
        }
      } catch (error) {
        console.error(`Error analyzing device ${device.id}:`, error);

        // 降级处理：如果无法获取历史数据，至少显示首次发现的设备
        const firstSeenDate = new Date(device.first_seen + "Z");
        if (firstSeenDate >= cutoffTime) {
          allActivities.push({
            device,
            activityType: "first_seen",
            timestamp: device.first_seen,
            timeAgo: formatLastSeen(device.first_seen),
          });
        }
      }
    }

    // 按时间戳排序，最新的在前
    return allActivities.sort(
      (a, b) =>
        new Date(b.timestamp + "Z").getTime() -
        new Date(a.timestamp + "Z").getTime(),
    );
  };

  // 加载活动数据
  const loadActivities = async () => {
    if (devices.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const newActivities = await analyzeDeviceActivities();
      setActivities(newActivities);
    } catch (error) {
      console.error("Failed to analyze device activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载和设备变化时重新加载
  useEffect(() => {
    loadActivities();
  }, [devices, scanStatus]);

  // 每30秒自动刷新
  useEffect(() => {
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [devices, scanStatus]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "online":
        return <FiWifi className="h-4 w-4 text-green-500" />;
      case "offline":
        return <FiWifiOff className="h-4 w-4 text-red-500" />;
      case "first_seen":
        return <FiActivity className="h-4 w-4 text-blue-500" />;
      default:
        return <FiClock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: DeviceActivity) => {
    const deviceName =
      activity.device.custom_name ||
      activity.device.hostname ||
      activity.device.ip_address;

    switch (activity.activityType) {
      case "online":
        return `${deviceName} 上线`;
      case "offline":
        return `${deviceName} 离线`;
      case "first_seen":
        return `发现新设备 ${deviceName}`;
      default:
        return `${deviceName} 活动`;
    }
  };

  const getActivityDescription = (activity: DeviceActivity) => {
    if (activity.previousState !== undefined) {
      const stateChange = activity.previousState
        ? "在线 → 离线"
        : "离线 → 在线";
      return `状态变化: ${stateChange}`;
    }
    return "";
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "online":
        return "border-l-green-500 bg-green-50";
      case "offline":
        return "border-l-red-500 bg-red-50";
      case "first_seen":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <FiActivity className="mr-2" />
            设备状态变化
          </h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 rounded bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                </div>
                <div className="h-3 w-12 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-lg font-semibold text-gray-900">
              <FiActivity className="mr-2" />
              设备状态变化
            </h3>
            <button
              onClick={loadActivities}
              className="text-gray-400 transition-colors hover:text-gray-600"
              title="刷新活动"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="m-auto p-6 text-center">
          <FiClock className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">暂无最近活动</p>
          <p className="mt-1 text-sm text-gray-400">设备状态变化将在这里显示</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-lg border bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center text-lg font-semibold text-gray-900">
            <FiActivity className="mr-2" />
            设备状态变化
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({activities.length})
            </span>
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">
              {scanStatus?.last_scan_time
                ? formatLastSeen(scanStatus.last_scan_time)
                : "暂无扫描记录"}
            </span>
            <button
              onClick={loadActivities}
              className="text-gray-400 transition-colors hover:text-gray-600"
              title="刷新活动"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[512px] divide-y divide-gray-100 overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={`${activity.device.id}-${activity.timestamp}-${index}`}
            className={`border-l-4 px-6 py-4 ${getActivityColor(activity.activityType)} transition-colors hover:bg-opacity-75`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getActivityIcon(activity.activityType)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {getActivityText(activity)}
                  </p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>
                      {activity.device.ip_address}
                      {activity.device.vendor && (
                        <span className="ml-2">• {activity.device.vendor}</span>
                      )}
                    </div>
                    {getActivityDescription(activity) && (
                      <div className="font-medium text-gray-600">
                        {getActivityDescription(activity)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>{activity.timeAgo}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length >= 10 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-center text-xs text-gray-500">
            显示最近 20 个状态变化 • 更多历史记录请查看时间线
          </p>
        </div>
      )}
    </div>
  );
};
