import { addMinutes, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartConfig, DayTimelineData } from "../types";

interface TimelineChartProps {
  data: DayTimelineData | null;
  config: ChartConfig;
  isLoading?: boolean;
  className?: string;
}

interface TimelineDataPoint {
  time: string;
  timeLabel: string;
  devices: {
    [deviceId: string]: {
      name: string;
      ip: string;
      isOnline: boolean;
    };
  };
}

const COLORS = {
  online: "#10b981", // green-500
  offline: "#ef4444", // red-500
  unknown: "#6b7280", // gray-500
};

// 修复UTC时间处理函数
const parseUTCDateTime = (dateTimeStr: string): Date => {
  // 后端返回格式: "2025-06-06T19:49:37.547103" (UTC时间但无Z后缀)
  if (dateTimeStr.endsWith("Z")) {
    return new Date(dateTimeStr);
  }
  return new Date(dateTimeStr + "Z"); // 添加Z后缀明确指定为UTC
};

const parseUTCDate = (dateStr: string): Date => {
  // 日期格式: "2025-06-06"
  return new Date(dateStr + "T00:00:00Z"); // 转换为UTC的当天开始时间
};

export const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  config,
  isLoading = false,
  className = "",
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // 生成24小时的时间点数据
  const timelineData = useMemo(() => {
    if (!data) return [];

    const result: TimelineDataPoint[] = [];

    // 修复：正确处理UTC日期到本地日期的转换
    // 我们需要获取UTC日期对应的本地日期的开始时间
    const utcDate = parseUTCDate(data.date); // 这是UTC的2025-06-06 00:00:00
    console.log("UTC date from backend:", utcDate.toISOString());

    // 获取本地时区的同一日期（2025-06-06）的开始时间
    const year = parseInt(data.date.split("-")[0]);
    const month = parseInt(data.date.split("-")[1]) - 1; // JavaScript月份从0开始
    const day = parseInt(data.date.split("-")[2]);
    const localDayStart = new Date(year, month, day); // 本地时区的开始时间

    console.log("Local day start (corrected):", localDayStart.toISOString());
    console.log("Local day start (local string):", localDayStart.toString());

    // 每15分钟一个数据点
    for (let i = 0; i < 96; i++) {
      // 24 * 4 = 96个15分钟
      const currentTime = addMinutes(localDayStart, i * 15);
      const timeStr = format(currentTime, "HH:mm");
      const timeLabel =
        config.time_format === "12h"
          ? format(currentTime, "h:mm a", { locale: zhCN })
          : timeStr;

      const devices: {
        [deviceId: string]: { name: string; ip: string; isOnline: boolean };
      } = {};

      // 检查每个设备在这个时间点的状态
      data.devices.forEach((device) => {
        let isOnline = false;

        console.log(
          `\n=== Checking device ${device.device_name} at ${currentTime.toISOString()} ===`,
        );
        console.log(
          `Device has ${device.online_periods.length} online periods`,
        );

        // 如果没有在线时段数据，设备为离线状态
        if (device.online_periods.length === 0) {
          isOnline = false;
          console.log(
            `Device ${device.device_name}: No online periods - marked offline`,
          );
        } else {
          // 检查每个在线时段
          device.online_periods.forEach((period, index) => {
            console.log(
              `Period ${index}: ${period.start_time} - ${period.end_time || "ongoing"}`,
            );

            // 将UTC时间转换为本地时间进行比较
            const startTime = parseUTCDateTime(period.start_time);
            const endTime = period.end_time
              ? parseUTCDateTime(period.end_time)
              : new Date(); // 如果没有结束时间，使用当前时间

            console.log(
              `Parsed times - Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}`,
            );
            console.log(`Current time: ${currentTime.toISOString()}`);
            console.log(
              `Time checks: currentTime >= startTime? ${currentTime >= startTime}, currentTime <= endTime? ${currentTime <= endTime}`,
            );

            // 检查时间顺序是否正确
            if (startTime >= endTime && period.end_time !== null) {
              console.warn(
                `Invalid time period for device ${device.device_name}: start=${startTime.toISOString()} >= end=${endTime.toISOString()}`,
              );
              return; // 跳过无效的时间段
            }

            const isInThisPeriod =
              currentTime >= startTime && currentTime <= endTime;
            console.log(`Is in this period: ${isInThisPeriod}`);

            if (isInThisPeriod) {
              isOnline = true;
              console.log(
                `✓ Device ${device.device_name} is ONLINE during this period`,
              );
            }
          });
        }

        if (isOnline) {
          console.log("device:", device.device_name, "isOnline:", isOnline);
        }

        devices[device.device_id.toString()] = {
          name: device.device_name,
          ip: device.ip_address,
          isOnline,
        };
      });

      result.push({
        time: timeStr,
        timeLabel,
        devices,
      });
    }

    return result;
  }, [data, config.time_format]);

  // 获取所有设备列表
  const deviceList = useMemo(() => {
    if (!data) return [];

    const devices = data.devices.map((device) => ({
      id: device.device_id.toString(),
      name: device.device_name,
      ip: device.ip_address,
    }));

    // 根据配置排序
    switch (config.device_sort_order) {
      case "name":
        return devices.sort((a, b) => a.name.localeCompare(b.name));
      case "ip":
        return devices.sort((a, b) =>
          a.ip.localeCompare(b.ip, undefined, { numeric: true }),
        );
      default:
        return devices;
    }
  }, [data, config.device_sort_order]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timeData = payload[0].payload;
      return (
        <div className="max-w-xs rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
          <p className="mb-3 border-b border-gray-100 pb-2 text-center font-semibold text-gray-900">
            时间: {timeData.timeLabel}
          </p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {Object.entries(timeData.devices).map(
              ([deviceId, device]: [string, any]) => (
                <div
                  key={deviceId}
                  className="flex items-center justify-between"
                >
                  <span className="mr-2 truncate text-sm text-gray-700">
                    {device.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      device.isOnline
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {device.isOnline ? "在线" : "离线"}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl border bg-white p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="mb-4 h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="h-96 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!data || deviceList.length === 0) {
    return (
      <div className={`rounded-xl border bg-white p-8 shadow-sm ${className}`}>
        <div className="text-center text-gray-500">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-300">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            暂无时间线数据
          </h3>
          <p className="text-gray-500">选择的日期没有设备活动记录</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${className}`}
    >
      {/* 图表头部 */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">设备在线时间线</h2>
            <p className="mt-1 text-sm text-gray-600">
              {format(parseUTCDate(data.date), "yyyy年MM月dd日 EEEE", {
                locale: zhCN,
              })}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">在线</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">离线</span>
            </div>
            {config.show_offline_periods && (
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-gray-400 shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700">未知</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="border-b border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">
          设备列表 ({deviceList.length})
        </h3>

        <div className="max-h-48 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deviceList.map((device) => (
              <button
                key={device.id}
                onClick={() =>
                  setSelectedDevice(
                    selectedDevice === device.id ? null : device.id,
                  )
                }
                className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                  selectedDevice === device.id
                    ? "scale-105 border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className="truncate text-sm font-medium text-gray-900">
                  {device.name}
                </div>
                <div className="mt-1 font-mono text-xs text-gray-500">
                  {device.ip}
                </div>
              </button>
            ))}
          </div>
        </div>
        {selectedDevice && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">已选择设备:</span>{" "}
              {deviceList.find((d) => d.id === selectedDevice)?.name}
              <button
                onClick={() => setSelectedDevice(null)}
                className="ml-2 text-blue-600 underline hover:text-blue-800"
              >
                取消选择
              </button>
            </p>
          </div>
        )}
      </div>

      {/* 时间线图表 */}
      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                label={{
                  value: "设备数量",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={(entry) => {
                  if (selectedDevice) {
                    // 如果选择了特定设备，只显示该设备的状态
                    const device = entry.devices[selectedDevice];
                    return device ? (device.isOnline ? 1 : 0) : 0;
                  } else {
                    // 显示所有在线设备数量
                    return Object.values(entry.devices).filter(
                      (d: any) => d.isOnline,
                    ).length;
                  }
                }}
                name="在线设备"
                radius={[2, 2, 0, 0]}
              >
                {timelineData.map((entry, index) => {
                  let color = COLORS.offline;

                  if (selectedDevice) {
                    const device = entry.devices[selectedDevice];
                    color =
                      device && device.isOnline
                        ? COLORS.online
                        : COLORS.offline;
                  } else {
                    const onlineCount = Object.values(entry.devices).filter(
                      (d: any) => d.isOnline,
                    ).length;
                    color = onlineCount > 0 ? COLORS.online : COLORS.offline;
                  }

                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
