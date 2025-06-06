import React, { useState } from "react";
import { TimelineChart } from "@/components/TimelineChart";
import { DatePicker } from "@/components/DatePicker";
import {
  useTimelineData,
  useChartConfig,
  useAppSettings,
  useUpdateChartConfig,
} from "@/hooks/useDevices";
import { ChartConfig } from "@/types";
import { FiBarChart, FiSettings, FiCalendar, FiTrendingUp } from "react-icons/fi";

export const TimelinePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 使用真实的API hooks
  const { data: timelineData, isLoading: timelineLoading } =
    useTimelineData(selectedDate);
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
        ...newConfig,
      });
    } catch (error) {
      console.error("Failed to update chart config:", error);
    }
  };

  if (!chartConfig || !appSettings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="mb-6 h-10 w-1/3 rounded bg-gray-200"></div>
              <div className="mb-6 h-20 rounded-xl bg-gray-200"></div>
              <div className="h-96 rounded-xl bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {/* 页面标题和描述 */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiBarChart className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">设备在线时间线</h1>
            </div>
            <p className="text-gray-600 max-w-2xl">
              可视化查看网络设备在不同时间段的在线状态，支持日期选择、设备筛选和多种显示配置
            </p>
          </div>

          {/* 控制面板 */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center space-x-2 mb-4">
                <FiSettings className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">图表配置</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 日期选择器 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">选择日期</label>
                  </div>
                  <DatePicker
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    maxRetentionDays={appSettings.data_retention_days}
                  />
                </div>

                {/* 图表配置选项 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FiTrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">显示设置</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 时间格式 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        时间格式
                      </label>
                      <select
                        value={chartConfig.time_format}
                        onChange={(e) =>
                          handleConfigChange({
                            time_format: e.target.value as "12h" | "24h",
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="24h">24小时制</option>
                        <option value="12h">12小时制</option>
                      </select>
                    </div>

                    {/* 设备排序 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        设备排序
                      </label>
                      <select
                        value={chartConfig.device_sort_order}
                        onChange={(e) =>
                          handleConfigChange({
                            device_sort_order: e.target.value as any,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="name">按设备名称</option>
                        <option value="ip">按IP地址</option>
                        <option value="last_seen">按最后上线时间</option>
                      </select>
                    </div>

                    {/* 离线时段显示 */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        显示选项
                      </label>
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            id="show-offline"
                            checked={chartConfig.show_offline_periods}
                            onChange={(e) =>
                              handleConfigChange({ show_offline_periods: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                          />
                          <span className="text-sm text-gray-700">显示离线时段</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 时间线图表 */}
          <TimelineChart
            data={timelineData || null}
            config={chartConfig}
            isLoading={isLoading}
            className="shadow-lg"
          />

          {/* 统计信息面板 */}
          {timelineData && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <FiTrendingUp className="h-5 w-5 text-green-600" />
                  <span>当日统计概览</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">设备活动情况的详细统计信息</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 监控设备数 */}
                  <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {timelineData.devices.length}
                    </div>
                    <div className="text-sm font-medium text-blue-800">监控设备总数</div>
                    <div className="text-xs text-blue-600 mt-1">
                      在该日期内有活动记录的设备
                    </div>
                  </div>

                  {/* 当前在线设备 */}
                  <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {
                        timelineData.devices.filter((d) =>
                          d.online_periods.some((p) => p.end_time === null),
                        ).length
                      }
                    </div>
                    <div className="text-sm font-medium text-green-800">当前在线设备</div>
                    <div className="text-xs text-green-600 mt-1">
                      截至查询时间仍保持在线状态
                    </div>
                  </div>

                  {/* 在线时段总数 */}
                  <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {timelineData.devices.reduce(
                        (total, device) => total + device.online_periods.length,
                        0,
                      )}
                    </div>
                    <div className="text-sm font-medium text-orange-800">在线时段总数</div>
                    <div className="text-xs text-orange-600 mt-1">
                      所有设备的在线会话总次数
                    </div>
                  </div>
                </div>

                {/* 详细设备信息 */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">设备详情</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            设备名称
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IP地址
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            在线时段数
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            当前状态
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timelineData.devices.slice(0, 10).map((device) => (
                          <tr key={device.device_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {device.device_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {device.ip_address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {device.online_periods.length}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {device.online_periods.some((p) => p.end_time === null) ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  在线
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  离线
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {timelineData.devices.length > 10 && (
                      <div className="px-6 py-3 bg-gray-50 text-center">
                        <p className="text-sm text-gray-500">
                          还有 {timelineData.devices.length - 10} 个设备，更多详情请使用时间线图表查看
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
