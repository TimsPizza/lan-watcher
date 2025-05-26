export interface Device {
  id: number;
  ip_address: string;
  mac_address: string | null;
  hostname: string | null;
  device_type: string | null;
  vendor: string | null;
  custom_name: string | null;
  first_seen: string;
  last_seen: string;
  is_online: boolean;
  open_ports: string | null;
}

export interface ScanRecord {
  id: number;
  device_id: number;
  scan_time: string;
  is_online: boolean;
  response_time: number | null;
}

export interface ScanSession {
  id: number;
  start_time: string;
  end_time: string | null;
  subnet: string;
  devices_found: number;
  scan_type: string;
}

export interface NetworkStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  recent_scans: number;
}

export interface ScanResult {
  status: 'success' | 'error';
  message?: string;
  subnet?: string;
  devices_found?: number;
  scan_type?: string;
  duration?: number;
}

export interface ScanStatus {
  scanning: boolean;
  scan_interval: number;
}

export interface OuiLookup {
  mac_address: string;
  vendor: string;
}

export interface DeviceAliasUpdate {
  custom_name: string;
}

export interface ApiResponse<T> {
  status: string;
  data?: T;
  message?: string;
}

// 新增：设备时间线数据点
export interface DeviceTimelinePoint {
  device_id: number;
  device_name: string;
  ip_address: string;
  timestamp: string;
  is_online: boolean;
}

// 新增：设备在线时间段
export interface DeviceOnlinePeriod {
  device_id: number;
  device_name: string;
  ip_address: string;
  start_time: string;
  end_time: string | null; // null表示当前仍在线
}

// 新增：某一天的设备时间线数据
export interface DayTimelineData {
  date: string;
  devices: {
    device_id: number;
    device_name: string;
    ip_address: string;
    online_periods: {
      start_time: string;
      end_time: string | null;
    }[];
  }[];
}

// 新增：应用设置
export interface AppSettings {
  data_retention_days: number;
  scan_interval_minutes: number;
  auto_scan_enabled: boolean;
  chart_refresh_interval_seconds: number;
}

// 新增：图表配置
export interface ChartConfig {
  show_offline_periods: boolean;
  time_format: '12h' | '24h';
  device_sort_order: 'name' | 'ip' | 'last_seen';
} 