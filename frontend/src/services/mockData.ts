import { 
  Device, 
  NetworkStats, 
  DayTimelineData, 
  AppSettings, 
  ChartConfig 
} from '../types';
import { format, subDays, addHours, addMinutes, startOfDay, endOfDay } from 'date-fns';

// Mock 设备数据
export const mockDevices: Device[] = [
  {
    id: 1,
    ip_address: '192.168.1.1',
    mac_address: '00:11:22:33:44:55',
    hostname: 'router.local',
    device_type: 'Router',
    vendor: 'TP-Link',
    custom_name: '主路由器',
    first_seen: '2024-01-01T08:00:00Z',
    last_seen: new Date().toISOString(),
    is_online: true,
    open_ports: '22,80,443'
  },
  {
    id: 2,
    ip_address: '192.168.1.10',
    mac_address: '00:11:22:33:44:66',
    hostname: 'desktop-work',
    device_type: 'Computer',
    vendor: 'Intel',
    custom_name: '工作电脑',
    first_seen: '2024-01-01T09:00:00Z',
    last_seen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    is_online: false,
    open_ports: '22,3389'
  },
  {
    id: 3,
    ip_address: '192.168.1.20',
    mac_address: '00:11:22:33:44:77',
    hostname: 'iphone-12',
    device_type: 'Phone',
    vendor: 'Apple',
    custom_name: 'iPhone 12',
    first_seen: '2024-01-01T10:00:00Z',
    last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_online: true,
    open_ports: null
  },
  {
    id: 4,
    ip_address: '192.168.1.30',
    mac_address: '00:11:22:33:44:88',
    hostname: 'macbook-pro',
    device_type: 'Computer',
    vendor: 'Apple',
    custom_name: 'MacBook Pro',
    first_seen: '2024-01-01T11:00:00Z',
    last_seen: new Date().toISOString(),
    is_online: true,
    open_ports: '22,80,443,5000'
  },
  {
    id: 5,
    ip_address: '192.168.1.40',
    mac_address: '00:11:22:33:44:99',
    hostname: 'smart-tv',
    device_type: 'TV',
    vendor: 'Samsung',
    custom_name: '智能电视',
    first_seen: '2024-01-01T12:00:00Z',
    last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_online: false,
    open_ports: '80,8080'
  }
];

// Mock 网络统计数据
export const mockNetworkStats: NetworkStats = {
  total_devices: mockDevices.length,
  online_devices: mockDevices.filter(d => d.is_online).length,
  offline_devices: mockDevices.filter(d => !d.is_online).length,
  recent_scans: 12
};

// Mock 应用设置
export const mockAppSettings: AppSettings = {
  data_retention_days: 30,
  scan_interval_minutes: 5,
  auto_scan_enabled: true,
  chart_refresh_interval_seconds: 30
};

// Mock 图表配置
export const mockChartConfig: ChartConfig = {
  show_offline_periods: true,
  time_format: '24h',
  device_sort_order: 'name'
};

// 生成设备时间线数据
export const generateMockTimelineData = (date: Date): DayTimelineData => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  const devices = mockDevices.map(device => {
    const online_periods: { start_time: string; end_time: string | null }[] = [];
    
    // 为每个设备生成随机的在线时间段
    let currentTime = dayStart;
    let isOnline = Math.random() > 0.5; // 随机初始状态
    
    while (currentTime < dayEnd) {
      if (isOnline) {
        // 在线时段：1-4小时
        const duration = 1 + Math.random() * 3;
        const endTime = addHours(currentTime, duration);
        const actualEndTime = endTime > dayEnd ? dayEnd : endTime;
        
        online_periods.push({
          start_time: currentTime.toISOString(),
          end_time: actualEndTime >= dayEnd ? null : actualEndTime.toISOString()
        });
        
        currentTime = actualEndTime;
      } else {
        // 离线时段：30分钟-2小时
        const duration = 0.5 + Math.random() * 1.5;
        currentTime = addHours(currentTime, duration);
      }
      
      isOnline = !isOnline;
      
      // 避免无限循环
      if (currentTime >= dayEnd) break;
    }
    
    // 确保每个设备至少有一些在线时间
    if (online_periods.length === 0) {
      const startTime = addHours(dayStart, Math.random() * 8);
      const endTime = addHours(startTime, 1 + Math.random() * 4);
      
      online_periods.push({
        start_time: startTime.toISOString(),
        end_time: endTime > dayEnd ? null : endTime.toISOString()
      });
    }
    
    return {
      device_id: device.id,
      device_name: device.custom_name || device.hostname || device.ip_address,
      ip_address: device.ip_address,
      online_periods
    };
  });
  
  return {
    date: dateStr,
    devices
  };
};

// Mock API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API 服务
export const mockApiService = {
  // 获取设备列表
  async getDevices(): Promise<Device[]> {
    await delay(500);
    return mockDevices;
  },

  // 获取网络统计
  async getNetworkStats(): Promise<NetworkStats> {
    await delay(300);
    return mockNetworkStats;
  },

  // 获取时间线数据
  async getTimelineData(date: Date): Promise<DayTimelineData> {
    await delay(800);
    return generateMockTimelineData(date);
  },

  // 获取应用设置
  async getAppSettings(): Promise<AppSettings> {
    await delay(200);
    return { ...mockAppSettings };
  },

  // 更新应用设置
  async updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    await delay(500);
    Object.assign(mockAppSettings, settings);
    return { ...mockAppSettings };
  },

  // 获取图表配置
  async getChartConfig(): Promise<ChartConfig> {
    await delay(100);
    return { ...mockChartConfig };
  },

  // 更新图表配置
  async updateChartConfig(config: Partial<ChartConfig>): Promise<ChartConfig> {
    await delay(300);
    Object.assign(mockChartConfig, config);
    return { ...mockChartConfig };
  }
}; 