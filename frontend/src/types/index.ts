export interface Device {
  id: string;
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
  id: string;
  device_id: string;
  scan_time: string;
  is_online: boolean;
  response_time: number | null;
}

export interface ScanSession {
  id: string;
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
  status: "success" | "error";
  message?: string;
  subnet?: string;
  devices_found?: number;
  scan_type?: string;
  duration?: number;
}

export interface ScanStatus {
  scanning: boolean;
  scan_interval: number;
  last_scan_time: string | null;
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
  device_id: string;
  device_name: string;
  ip_address: string;
  timestamp: string;
  is_online: boolean;
}

// 新增：设备在线时间段
export interface DeviceOnlinePeriod {
  device_id: string;
  device_name: string;
  ip_address: string;
  start_time: string;
  end_time: string | null; // null表示当前仍在线
}

// 新增：某一天的设备时间线数据
export interface DayTimelineData {
  date: string;
  devices: {
    device_id: string;
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
  time_format: "12h" | "24h";
  device_sort_order: "name" | "ip" | "last_seen";
}

// ===== 扫描配置相关类型 =====

// 扫描配置接口
export interface ScanConfig {
  // 网络配置
  subnet_cidr: string | null;
  auto_detect_subnet: boolean;
  exclude_ips: string[];

  // 性能参数
  scan_rate: number;
  max_workers: number;
  scan_timeout: string;
  max_retries: number;

  // 功能开关
  resolve_hostnames: boolean;
  fetch_vendor_info: boolean;
  arp_lookup_enabled: boolean;
  fallback_enabled: boolean;

  // 高级选项
  ping_methods: string[];
  tcp_ping_ports: number[];
  ack_ping_ports: number[];

  // 扫描类型配置
  enable_port_scan: boolean;
  port_range: string;
}

// 预设配置信息
export interface ScanPreset {
  name: string;
  display_name: string;
  description: string;
}

// 配置验证结果
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

// 网络测试结果
export interface NetworkTestResult {
  valid: boolean;
  network_address?: string;
  broadcast_address?: string;
  num_hosts?: number;
  prefix_length?: number;
  error?: string;
}

// 扫描配置更新请求
export interface ScanConfigUpdateRequest {
  config: Partial<ScanConfig>;
}

// 扫描配置响应
export interface ScanConfigResponse extends ApiResponse<ScanConfig> {
  data: ScanConfig;
}

// ===== 设备活动相关类型 =====

// 设备历史记录类型
export interface DeviceHistoryRecord {
  id: string;
  device_id: string;
  scan_time: string;
  is_online: boolean;
  response_time: number;
}

// 设备活动类型
export interface DeviceActivity {
  device: Device;
  activityType: "online" | "offline" | "first_seen";
  timestamp: string;
  timeAgo: string;
  previousState?: boolean;
}
