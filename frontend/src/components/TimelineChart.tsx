import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DayTimelineData, ChartConfig } from '../types';
import { format, parseISO, startOfDay, endOfDay, addMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
  online: '#10b981', // green-500
  offline: '#ef4444', // red-500
  unknown: '#6b7280' // gray-500
};

export const TimelineChart: React.FC<TimelineChartProps> = ({
  data,
  config,
  isLoading = false,
  className = ''
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // 生成24小时的时间点数据
  const timelineData = useMemo(() => {
    if (!data) return [];

    const result: TimelineDataPoint[] = [];
    const dayStart = startOfDay(parseISO(data.date));
    
    // 每15分钟一个数据点
    for (let i = 0; i < 96; i++) { // 24 * 4 = 96个15分钟
      const currentTime = addMinutes(dayStart, i * 15);
      const timeStr = format(currentTime, 'HH:mm');
      const timeLabel = config.time_format === '12h' 
        ? format(currentTime, 'h:mm a', { locale: zhCN })
        : timeStr;

      const devices: { [deviceId: string]: { name: string; ip: string; isOnline: boolean } } = {};

      // 检查每个设备在这个时间点的状态
      data.devices.forEach(device => {
        const isOnline = device.online_periods.some(period => {
          const startTime = parseISO(period.start_time);
          const endTime = period.end_time ? parseISO(period.end_time) : endOfDay(parseISO(data.date));
          return currentTime >= startTime && currentTime <= endTime;
        });

        devices[device.device_id.toString()] = {
          name: device.device_name,
          ip: device.ip_address,
          isOnline
        };
      });

      result.push({
        time: timeStr,
        timeLabel,
        devices
      });
    }

    return result;
  }, [data, config.time_format]);

  // 获取所有设备列表
  const deviceList = useMemo(() => {
    if (!data) return [];
    
    const devices = data.devices.map(device => ({
      id: device.device_id.toString(),
      name: device.device_name,
      ip: device.ip_address
    }));

    // 根据配置排序
    switch (config.device_sort_order) {
      case 'name':
        return devices.sort((a, b) => a.name.localeCompare(b.name));
      case 'ip':
        return devices.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
      default:
        return devices;
    }
  }, [data, config.device_sort_order]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timeData = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">时间: {timeData.timeLabel}</p>
          <div className="space-y-1">
            {Object.entries(timeData.devices).map(([deviceId, device]: [string, any]) => (
              <div key={deviceId} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{device.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  device.isOnline 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {device.isOnline ? '在线' : '离线'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || deviceList.length === 0) {
    return (
      <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>暂无时间线数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* 图表头部 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">设备在线时间线</h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(parseISO(data.date), 'yyyy年MM月dd日', { locale: zhCN })}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">在线</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-sm text-gray-600">离线</span>
            </div>
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="p-6 border-b border-gray-200 max-h-40 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {deviceList.map((device) => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selectedDevice === device.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 truncate">
                {device.name}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {device.ip}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 时间线图表 */}
      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              
              {/* 为选中的设备或所有设备绘制条形图 */}
              {(selectedDevice ? [selectedDevice] : deviceList.map(d => d.id)).map((deviceId, index) => {
                const device = deviceList.find(d => d.id === deviceId);
                if (!device) return null;
                
                return (
                  <Bar
                    key={deviceId}
                    dataKey={`devices.${deviceId}.isOnline`}
                    name={device.name}
                    stackId={selectedDevice ? undefined : 'devices'}
                    fill={selectedDevice ? COLORS.online : `hsl(${index * 137.5 % 360}, 70%, 50%)`}
                  >
                    {timelineData.map((entry, entryIndex) => {
                      const deviceData = entry.devices[deviceId];
                      const color = deviceData?.isOnline ? COLORS.online : COLORS.offline;
                      return <Cell key={`cell-${entryIndex}`} fill={color} />;
                    })}
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}; 