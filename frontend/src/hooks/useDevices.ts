import { useMutation, useQuery, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import ApiService from "../services/api";
import { useDeviceStore } from "../store/useDeviceStore";
import { ScanResult, ScanConfig } from "../types";

// 查询键常量
const QUERY_KEYS = {
  DEVICES: "devices",
  ONLINE_DEVICES: "onlineDevices",
  DEVICE: "device",
  DEVICE_HISTORY: "deviceHistory",
  NETWORK_STATS: "networkStats",
  SCAN_STATUS: "scanStatus",
  SCAN_SESSIONS: "scanSessions",
  TIMELINE_DATA: "timelineData",
  APP_SETTINGS: "appSettings",
  CHART_CONFIG: "chartConfig",
} as const;

// 设备相关Hook
export const useDevices = () => {
  const setDevices = useDeviceStore((state) => state.setDevices);
  const setLoading = useDeviceStore((state) => state.setLoading);
  const setError = useDeviceStore((state) => state.setError);

  return useQuery(QUERY_KEYS.DEVICES, () => ApiService.getDevices(), {
    onSuccess: (data) => {
      setDevices(data);
      setError(null);
    },
    onError: (error: any) => {
      const message = error.message || "获取设备列表失败";
      setError(message);
      toast.error(message);
    },
    onSettled: () => setLoading(false),
    refetchInterval: 30000, // 30秒自动刷新
    staleTime: 10000, // 10秒内数据被认为是新鲜的
  });
};

export const useOnlineDevices = () => {
  const setOnlineDevices = useDeviceStore((state) => state.setOnlineDevices);

  return useQuery(
    QUERY_KEYS.ONLINE_DEVICES,
    () => ApiService.getOnlineDevices(),
    {
      onSuccess: setOnlineDevices,
      refetchInterval: 15000, // 15秒刷新在线设备
      staleTime: 5000,
    },
  );
};

export const useDevice = (deviceId: string) => {
  return useQuery(
    [QUERY_KEYS.DEVICE, deviceId],
    () => ApiService.getDevice(deviceId),
    {
      enabled: !!deviceId,
      staleTime: 30000,
    },
  );
};

export const useDeviceHistory = (deviceId: string, hours: number = 24) => {
  return useQuery(
    [QUERY_KEYS.DEVICE_HISTORY, deviceId, hours],
    () => ApiService.getDeviceHistory(deviceId, hours),
    {
      enabled: !!deviceId,
      staleTime: 60000, // 1分钟
    },
  );
};

// 网络统计Hook
export const useNetworkStats = () => {
  const setNetworkStats = useDeviceStore((state) => state.setNetworkStats);

  return useQuery(
    QUERY_KEYS.NETWORK_STATS,
    () => ApiService.getNetworkStats(),
    {
      onSuccess: setNetworkStats,
      refetchInterval: 30000,
      staleTime: 15000,
    },
  );
};

// 扫描相关Hook
export const useScanStatus = () => {
  const setScanStatus = useDeviceStore((state) => state.setScanStatus);

  return useQuery(QUERY_KEYS.SCAN_STATUS, () => ApiService.getScanStatus(), {
    onSuccess: setScanStatus,
    refetchInterval: 2000, // 5秒刷新扫描状态
    staleTime: 1000,
  });
};

export const useScanSessions = (limit: number = 10) => {
  const setScanSessions = useDeviceStore((state) => state.setScanSessions);

  return useQuery(
    [QUERY_KEYS.SCAN_SESSIONS, limit],
    () => ApiService.getScanSessions(limit),
    {
      onSuccess: setScanSessions,
      staleTime: 30000,
    },
  );
};

// 时间线数据Hook
export const useTimelineData = (date: Date) => {
  return useQuery(
    [QUERY_KEYS.TIMELINE_DATA, date.toISOString().split("T")[0]],
    () => ApiService.getTimelineData(date),
    {
      staleTime: 60000, // 1分钟
      enabled: !!date,
    },
  );
};

// 应用设置Hook
export const useAppSettings = () => {
  return useQuery(QUERY_KEYS.APP_SETTINGS, () => ApiService.getAppSettings(), {
    staleTime: 300000, // 5分钟
  });
};

// 图表配置Hook
export const useChartConfig = () => {
  return useQuery(QUERY_KEYS.CHART_CONFIG, () => ApiService.getChartConfig(), {
    staleTime: 300000, // 5分钟
  });
};

// 突变Hook（用于修改操作）
export const useUpdateDeviceAlias = () => {
  const queryClient = useQueryClient();
  const updateDevice = useDeviceStore((state) => state.updateDevice);

  return useMutation(
    ({ deviceId, customName }: { deviceId: string; customName: string }) =>
      ApiService.updateDeviceAlias(deviceId, customName),
    {
      onSuccess: (data, variables) => {
        // 更新本地状态
        updateDevice(variables.deviceId, { custom_name: variables.customName });

        // 刷新相关查询
        queryClient.invalidateQueries(QUERY_KEYS.DEVICES);
        queryClient.invalidateQueries([QUERY_KEYS.DEVICE, variables.deviceId]);

        toast.success("设备别名更新成功");
      },
      onError: (error: any) => {
        const message = error.message || "更新设备别名失败";
        toast.error(message);
      },
    },
  );
};

export const useTriggerScan = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ subnet, scanType }: { subnet?: string; scanType?: string }) =>
      ApiService.scanNetwork(subnet, scanType),
    {
      onSuccess: (data: ScanResult) => {
        toast.success(data.message);

        // 刷新设备列表和统计信息
        queryClient.invalidateQueries(QUERY_KEYS.DEVICES);
        queryClient.invalidateQueries(QUERY_KEYS.NETWORK_STATS);
      },
      onError: (error: any) => {
        const message = error.message || "扫描失败";
        toast.error(message);
      },
    },
  );
};

export const useSetScanInterval = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (intervalSeconds: number) => ApiService.setScanInterval(intervalSeconds),
    {
      onSuccess: (data) => {
        // 刷新扫描状态以获取新的间隔设置
        queryClient.invalidateQueries(QUERY_KEYS.SCAN_STATUS);
        toast.success(`扫描间隔已设置为 ${data.scan_interval} 秒`);
      },
      onError: (error: any) => {
        const message = error.message || "设置扫描间隔失败";
        toast.error(message);
      },
    },
  );
};

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (settings: any) => ApiService.updateAppSettings(settings),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(QUERY_KEYS.APP_SETTINGS);
        toast.success("应用设置更新成功");
      },
      onError: (error: any) => {
        const message = error.message || "更新应用设置失败";
        toast.error(message);
      },
    },
  );
};

export const useUpdateChartConfig = () => {
  const queryClient = useQueryClient();

  return useMutation((config: any) => ApiService.updateChartConfig(config), {
    onSuccess: () => {
      queryClient.invalidateQueries(QUERY_KEYS.CHART_CONFIG);
      toast.success("图表配置更新成功");
    },
    onError: (error: any) => {
      const message = error.message || "更新图表配置失败";
      toast.error(message);
    },
  });
};

export const useSearchDevices = (query: string) => {
  return useQuery(
    ["searchDevices", query],
    () => ApiService.searchDevices(query), // 添加 query 参数
    {
      enabled: query.length >= 2,
      staleTime: 30000,
    },
  );
};

// ===== 扫描配置相关 Hooks =====

// 获取当前扫描配置
export const useScanConfig = () => {
  return useQuery(
    "scanConfig",
    () => ApiService.getScanConfig(),
    {
      staleTime: 300000, // 5分钟
    },
  );
};

// 更新扫描配置
export const useUpdateScanConfig = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (config: Partial<ScanConfig>) => ApiService.updateScanConfig(config),
    {
      onSuccess: () => {
        queryClient.invalidateQueries("scanConfig");
        toast.success("扫描配置更新成功");
      },
      onError: (error: any) => {
        const message = error.message || "更新扫描配置失败";
        toast.error(message);
      },
    },
  );
};

// 获取预设配置列表
export const useScanPresets = () => {
  return useQuery(
    "scanPresets",
    () => ApiService.getScanPresets(),
    {
      staleTime: 600000, // 10分钟
    },
  );
};

// 加载预设配置
export const useLoadScanPreset = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (presetName: string) => ApiService.loadScanPreset(presetName),
    {
      onSuccess: (data, presetName) => {
        queryClient.invalidateQueries("scanConfig");
        toast.success(`已加载 "${presetName}" 预设配置`);
      },
      onError: (error: any) => {
        const message = error.message || "加载预设配置失败";
        toast.error(message);
      },
    },
  );
};

// 验证扫描配置
export const useValidateScanConfig = () => {
  return useMutation(
    (config: Partial<ScanConfig>) => ApiService.validateScanConfig(config),
    {
      onError: (error: any) => {
        console.error("配置验证失败:", error);
      },
    },
  );
};

// 测试网络配置
export const useTestNetworkConfig = () => {
  return useMutation(
    (subnetCidr: string) => ApiService.testNetworkConfig(subnetCidr),
    {
      onSuccess: (result) => {
        if (result.valid) {
          toast.success("网络配置测试通过");
        } else {
          toast.warning(result.error || "网络配置测试失败");
        }
      },
      onError: (error: any) => {
        const message = error.message || "网络配置测试失败";
        toast.error(message);
      },
    },
  );
};
