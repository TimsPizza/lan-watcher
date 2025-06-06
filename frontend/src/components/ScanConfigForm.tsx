import React, { useState, useEffect } from "react";
import { ScanConfig, ScanPreset } from "@/types";
import {
  useScanConfig,
  useUpdateScanConfig,
  useScanPresets,
  useLoadScanPreset,
  useValidateScanConfig,
  useTestNetworkConfig,
} from "@/hooks/useDevices";
import {
  FiSave,
  FiRotateCcw,
  FiCheckCircle,
  FiAlertCircle,
  FiPlay,
} from "react-icons/fi";
import { toast } from "react-toastify";

export const ScanConfigForm: React.FC = () => {
  const [localConfig, setLocalConfig] = useState<ScanConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "basic" | "network" | "performance" | "advanced"
  >("basic");

  // React Query hooks
  const { data: config, isLoading, error } = useScanConfig();
  const { data: presets, isLoading: presetsLoading } = useScanPresets();
  const updateConfigMutation = useUpdateScanConfig();
  const loadPresetMutation = useLoadScanPreset();
  const validateConfigMutation = useValidateScanConfig();
  const testNetworkMutation = useTestNetworkConfig();

  // 初始化本地配置状态
  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  }, [config, localConfig]);

  // 检查是否有修改
  useEffect(() => {
    if (config && localConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(localConfig);
      setHasChanges(changed);
    }
  }, [config, localConfig]);

  const handleConfigChange = (key: keyof ScanConfig, value: any) => {
    if (!localConfig) return;

    setLocalConfig({
      ...localConfig,
      [key]: value,
    });
  };

  const handleSave = async () => {
    if (!localConfig) return;

    try {
      await updateConfigMutation.mutateAsync(localConfig);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save scan config:", error);
    }
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig({ ...config });
      setHasChanges(false);
    }
  };

  const handleLoadPreset = async (presetName: string) => {
    try {
      const presetConfig = await loadPresetMutation.mutateAsync(presetName);
      setLocalConfig(presetConfig);
    } catch (error) {
      console.error("Failed to load preset:", error);
    }
  };

  const handleValidateConfig = async () => {
    if (!localConfig) return;

    try {
      const result = await validateConfigMutation.mutateAsync(localConfig);
      if (result.valid) {
        toast.success("配置验证通过");
      } else {
        toast.error(`配置验证失败: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleTestNetwork = async () => {
    if (!localConfig?.subnet_cidr) {
      toast.warning("请先设置子网CIDR");
      return;
    }

    try {
      await testNetworkMutation.mutateAsync(localConfig.subnet_cidr);
    } catch (error) {
      console.error("Network test failed:", error);
    }
  };

  if (isLoading || !localConfig) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-white p-6">
                <div className="mb-3 h-4 w-1/3 rounded bg-gray-200"></div>
                <div className="h-10 w-full rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-scroll">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">扫描配置</h2>
          <p className="mt-1 text-gray-600">配置网络扫描参数和性能选项</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleValidateConfig}
            disabled={validateConfigMutation.isLoading}
            className="flex items-center space-x-2 rounded-lg border border-blue-300 px-4 py-2 text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCheckCircle className="h-4 w-4" />
            <span>
              {validateConfigMutation.isLoading ? "验证中..." : "验证配置"}
            </span>
          </button>

          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRotateCcw className="h-4 w-4" />
            <span>重置</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || updateConfigMutation.isLoading}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSave
              className={`h-4 w-4 ${updateConfigMutation.isLoading ? "animate-spin" : ""}`}
            />
            <span>
              {updateConfigMutation.isLoading ? "保存中..." : "保存配置"}
            </span>
          </button>
        </div>
      </div>

      {/* 选项卡导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "basic", label: "基础设置" },
            { key: "network", label: "网络配置" },
            { key: "performance", label: "性能调优" },
            { key: "advanced", label: "高级选项" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 基础设置选项卡 */}
      {activeTab === "basic" && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            基础扫描设置
          </h3>

          <div className="space-y-6">
            {/* 预设配置选择 */}
            {presets && presets.length > 0 && (
              <div className="">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  快速预设
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {presets.map((preset: ScanPreset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleLoadPreset(preset.name)}
                      disabled={loadPresetMutation.isLoading}
                      className="rounded-lg border p-4 text-left transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <h4 className="font-medium text-gray-900">
                        {preset.display_name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* 自动检测子网 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  自动检测子网
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  自动检测当前网络的子网范围
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.auto_detect_subnet}
                  onChange={(e) =>
                    handleConfigChange("auto_detect_subnet", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* 主机名解析 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  解析主机名
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  尝试解析设备的主机名
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.resolve_hostnames}
                  onChange={(e) =>
                    handleConfigChange("resolve_hostnames", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* 获取厂商信息 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  获取厂商信息
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  根据MAC地址查询设备厂商
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.fetch_vendor_info}
                  onChange={(e) =>
                    handleConfigChange("fetch_vendor_info", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* 端口扫描 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  启用端口扫描
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  扫描设备开放的端口（会增加扫描时间）
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.enable_port_scan}
                  onChange={(e) =>
                    handleConfigChange("enable_port_scan", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* 端口范围 */}
            {localConfig.enable_port_scan && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  端口扫描范围
                </label>
                <input
                  type="text"
                  value={localConfig.port_range}
                  onChange={(e) =>
                    handleConfigChange("port_range", e.target.value)
                  }
                  placeholder="例如: 1-1000 或 22,80,443"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  支持范围格式（如1-1000）或逗号分隔的端口列表
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 网络配置选项卡 */}
      {activeTab === "network" && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">网络配置</h3>

          <div className="space-y-6">
            {/* 子网CIDR */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                子网CIDR
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={localConfig.subnet_cidr || ""}
                  onChange={(e) =>
                    handleConfigChange("subnet_cidr", e.target.value || null)
                  }
                  placeholder="例如: 192.168.1.0/24"
                  disabled={localConfig.auto_detect_subnet}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
                <button
                  onClick={handleTestNetwork}
                  disabled={
                    testNetworkMutation.isLoading || !localConfig.subnet_cidr
                  }
                  className="flex items-center space-x-2 rounded-lg border border-green-300 px-4 py-2 text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlay className="h-4 w-4" />
                  <span>
                    {testNetworkMutation.isLoading ? "测试中..." : "测试"}
                  </span>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {localConfig.auto_detect_subnet
                  ? "已启用自动检测，将忽略手动设置的CIDR"
                  : "手动指定要扫描的子网范围"}
              </p>
            </div>

            {/* 排除IP */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                排除IP地址
              </label>
              <textarea
                value={localConfig.exclude_ips.join("\n")}
                onChange={(e) =>
                  handleConfigChange(
                    "exclude_ips",
                    e.target.value.split("\n").filter((ip) => ip.trim()),
                  )
                }
                placeholder="每行一个IP地址&#10;例如:&#10;192.168.1.1&#10;192.168.1.254"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                扫描时将跳过这些IP地址，每行一个
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 性能调优选项卡 */}
      {activeTab === "performance" && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">性能调优</h3>

          <div className="space-y-6">
            {/* 扫描速率 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                扫描速率: {localConfig.scan_rate} 包/秒
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={localConfig.scan_rate}
                  onChange={(e) =>
                    handleConfigChange("scan_rate", parseInt(e.target.value))
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {localConfig.scan_rate}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                较高的速率会更快完成扫描，但可能影响网络性能
              </p>
            </div>

            {/* 最大工作线程 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                最大工作线程: {localConfig.max_workers}
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={localConfig.max_workers}
                  onChange={(e) =>
                    handleConfigChange("max_workers", parseInt(e.target.value))
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {localConfig.max_workers}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                更多线程可以并行处理更多设备，但会消耗更多系统资源
              </p>
            </div>

            {/* 扫描超时 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                扫描超时时间
              </label>
              <input
                type="text"
                value={localConfig.scan_timeout}
                onChange={(e) =>
                  handleConfigChange("scan_timeout", e.target.value)
                }
                placeholder="例如: 3s, 1000ms"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                单个设备的扫描超时时间，支持秒(s)和毫秒(ms)
              </p>
            </div>

            {/* 最大重试次数 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                最大重试次数: {localConfig.max_retries}
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={localConfig.max_retries}
                  onChange={(e) =>
                    handleConfigChange("max_retries", parseInt(e.target.value))
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                />
                <div className="w-20 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {localConfig.max_retries}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                扫描失败时的重试次数，提高发现设备的准确性
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 高级选项选项卡 */}
      {activeTab === "advanced" && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">高级选项</h3>

          <div className="space-y-6">
            {/* ARP查找 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  启用ARP查找
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  使用ARP表获取MAC地址和厂商信息
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.arp_lookup_enabled}
                  onChange={(e) =>
                    handleConfigChange("arp_lookup_enabled", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* 降级扫描 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  启用降级扫描
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  当主要扫描方法失败时使用备用方法
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={localConfig.fallback_enabled}
                  onChange={(e) =>
                    handleConfigChange("fallback_enabled", e.target.checked)
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>

            {/* Ping方法 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Ping方法
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["icmp", "tcp_syn", "tcp_ack", "udp"].map((method) => (
                  <label key={method} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={localConfig.ping_methods.includes(method)}
                      onChange={(e) => {
                        const methods = localConfig.ping_methods;
                        if (e.target.checked) {
                          handleConfigChange("ping_methods", [
                            ...methods,
                            method,
                          ]);
                        } else {
                          handleConfigChange(
                            "ping_methods",
                            methods.filter((m) => m !== method),
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {method.toUpperCase()}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                选择用于检测设备的ping方法，多种方法可提高检测率
              </p>
            </div>

            {/* TCP Ping端口 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                TCP Ping端口
              </label>
              <input
                type="text"
                value={localConfig.tcp_ping_ports.join(",")}
                onChange={(e) => {
                  const ports = e.target.value
                    .split(",")
                    .map((p) => parseInt(p.trim()))
                    .filter((p) => !isNaN(p));
                  handleConfigChange("tcp_ping_ports", ports);
                }}
                placeholder="例如: 22,80,443"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                用于TCP SYN ping的端口列表，逗号分隔
              </p>
            </div>

            {/* ACK Ping端口 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                ACK Ping端口
              </label>
              <input
                type="text"
                value={localConfig.ack_ping_ports.join(",")}
                onChange={(e) => {
                  const ports = e.target.value
                    .split(",")
                    .map((p) => parseInt(p.trim()))
                    .filter((p) => !isNaN(p));
                  handleConfigChange("ack_ping_ports", ports);
                }}
                placeholder="例如: 80,443"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                用于TCP ACK ping的端口列表，逗号分隔
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 底部提示 */}
      {hasChanges && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                您有未保存的更改，请记得点击"保存配置"按钮。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
