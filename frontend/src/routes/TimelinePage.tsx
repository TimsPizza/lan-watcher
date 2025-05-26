import React, { useState } from 'react';
import { TimelineChart } from '@/components/TimelineChart';
import { DatePicker } from '@/components/DatePicker';
import { 
  useTimelineData, 
  useChartConfig, 
  useAppSettings,
  useUpdateChartConfig 
} from '@/hooks/useDevices';
import { ChartConfig } from '@/types';

export const TimelinePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 使用真实的API hooks
  const { data: timelineData, isLoading: timelineLoading } = useTimelineData(selectedDate);
  const { data: chartConfig, isLoading: configLoading } = useChartConfig();
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings();
  const updateChartConfigMutation = useUpdateChartConfig();

  const isLoading = timelineLoading || configLoading || settingsLoading;

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfigChange = async (newConfig: Partial<ChartConfig>) => {
    if (!chartConfig) return;
    
    try {
      await updateChartConfigMutation.mutateAsync({
        ...chartConfig,
        ...newConfig
      });
    } catch (error) {
      console.error('Failed to update chart config:', error);
    }
  };

  if (!chartConfig || !appSettings) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">设备在线时间线</h1>
        <p className="text-gray-600 mt-1">查看设备在不同时间段的在线状态</p>
      </div>

      {/* 日期选择器和配置 */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* 日期选择器 */}
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            maxRetentionDays={appSettings.data_retention_days}
          />

          {/* 图表配置 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">时间格式:</label>
              <select
                value={chartConfig.time_format}
                onChange={(e) => handleConfigChange({ time_format: e.target.value as '12h' | '24h' })}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="24h">24小时</option>
                <option value="12h">12小时</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">排序:</label>
              <select
                value={chartConfig.device_sort_order}
                onChange={(e) => handleConfigChange({ device_sort_order: e.target.value as any })}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">按名称</option>
                <option value="ip">按IP地址</option>
                <option value="last_seen">按最后上线</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-offline"
                checked={chartConfig.show_offline_periods}
                onChange={(e) => handleConfigChange({ show_offline_periods: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show-offline" className="text-sm font-medium text-gray-700">
                显示离线时段
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 时间线图表 */}
      <TimelineChart
        data={timelineData || null}
        config={chartConfig}
        isLoading={isLoading}
      />

      {/* 统计信息 */}
      {timelineData && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">今日统计</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {timelineData.devices.length}
              </div>
              <div className="text-sm text-gray-500 mt-1">监控设备</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {timelineData.devices.filter(d => 
                  d.online_periods.some(p => p.end_time === null)
                ).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">当前在线</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {timelineData.devices.reduce((total, device) => 
                  total + device.online_periods.length, 0
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">在线时段总数</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 