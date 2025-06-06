import {
  Device,
  NetworkStats,
  DayTimelineData,
  AppSettings,
  ChartConfig,
  ScanResult,
  ApiResponse,
  ScanConfig,
  ScanPreset,
  ConfigValidationResult,
  NetworkTestResult,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiService {
  private static async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  // 设备相关API
  public static async getDevices(): Promise<Device[]> {
    return ApiService.request<Device[]>("/api/devices");
  }

  public static async getDevice(id: string): Promise<Device> {
    return ApiService.request<Device>(`/api/devices/${id}`);
  }

  public static async getOnlineDevices(): Promise<Device[]> {
    return ApiService.request<Device[]>("/api/devices/online");
  }

  public static async getDeviceHistory(
    deviceId: string,
    hours: number = 24,
  ): Promise<any[]> {
    return ApiService.request<any[]>(
      `/api/devices/${deviceId}/history?hours=${hours}`,
    );
  }

  public static async updateDeviceAlias(
    id: string,
    customName: string,
  ): Promise<ApiResponse<Device>> {
    return ApiService.request<ApiResponse<Device>>(`/api/devices/${id}/alias`, {
      method: "PUT",
      body: JSON.stringify({ custom_name: customName }),
    });
  }

  public static async searchDevices(query: string): Promise<Device[]> {
    return ApiService.request<Device[]>(
      `/api/devices/search?q=${encodeURIComponent(query)}`,
    );
  }

  // 网络统计API
  public static async getNetworkStats(): Promise<NetworkStats> {
    return ApiService.request<NetworkStats>("/api/stats");
  }

  // 扫描相关API
  public static async scanNetwork(
    subnet?: string,
    scanType: string = "ping",
  ): Promise<ScanResult> {
    const body: any = { scan_type: scanType };
    if (subnet) {
      body.subnet = subnet;
    }

    return ApiService.request<ScanResult>("/api/scan", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static async getScanStatus(): Promise<{
    scanning: boolean;
    scan_interval: number;
  }> {
    return ApiService.request("/api/scan-status");
  }

  public static async getScanSessions(limit: number = 10): Promise<any[]> {
    return ApiService.request<any[]>(`/api/scan-sessions?limit=${limit}`);
  }

  public static async setScanInterval(
    intervalSeconds: number,
  ): Promise<{ status: string; scan_interval: number }> {
    return ApiService.request("/api/scan-interval", {
      method: "POST",
      body: JSON.stringify({ interval: intervalSeconds }),
    });
  }

  // 时间线数据API
  public static async getTimelineData(date: Date): Promise<DayTimelineData> {
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD格式
    return ApiService.request<DayTimelineData>(`/api/timeline/${dateStr}`);
  }

  // 应用设置API
  public static async getAppSettings(): Promise<AppSettings> {
    return ApiService.request<AppSettings>("/api/settings");
  }

  public static async updateAppSettings(
    settings: Partial<AppSettings>,
  ): Promise<AppSettings> {
    return ApiService.request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  // 图表配置API
  public static async getChartConfig(): Promise<ChartConfig> {
    return ApiService.request<ChartConfig>("/api/chart-config");
  }

  public static async updateChartConfig(
    config: Partial<ChartConfig>,
  ): Promise<ChartConfig> {
    return ApiService.request<ChartConfig>("/api/chart-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  // OUI查询API
  public static async lookupVendor(
    macAddress: string,
  ): Promise<{ mac_address: string; vendor: string }> {
    return ApiService.request(`/api/oui/${encodeURIComponent(macAddress)}`);
  }

  // ===== 扫描配置 API =====
  
  // 获取当前扫描配置
  public static async getScanConfig(): Promise<ScanConfig> {
    return ApiService.request<ScanConfig>("/api/scan-config");
  }

  // 更新扫描配置
  public static async updateScanConfig(
    config: Partial<ScanConfig>,
  ): Promise<ScanConfig> {
    return ApiService.request<ScanConfig>("/api/scan-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  // 获取可用的预设配置列表
  public static async getScanPresets(): Promise<ScanPreset[]> {
    return ApiService.request<ScanPreset[]>("/api/scan-config/presets");
  }

  // 加载预设配置
  public static async loadScanPreset(presetName: string): Promise<ScanConfig> {
    return ApiService.request<ScanConfig>(`/api/scan-config/presets/${presetName}`, {
      method: "POST",
    });
  }

  // 验证扫描配置
  public static async validateScanConfig(
    config: Partial<ScanConfig>,
  ): Promise<ConfigValidationResult> {
    return ApiService.request<ConfigValidationResult>("/api/scan-config/validate", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  // 测试网络配置
  public static async testNetworkConfig(subnetCidr: string): Promise<NetworkTestResult> {
    return ApiService.request<NetworkTestResult>("/api/scan-config/test-network", {
      method: "POST",
      body: JSON.stringify({ subnet_cidr: subnetCidr }),
    });
  }
}

export default ApiService;
