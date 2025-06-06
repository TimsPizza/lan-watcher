import { formatLastSeen } from "@/utils";
import { Button } from "@radix-ui/themes";
import React, { useEffect } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiPlay,
  FiRefreshCw,
  FiUserCheck,
  FiUsers,
  FiUserX,
  FiWifi,
} from "react-icons/fi";
import { EnhancedRecentActivity } from "../components/EnhancedRecentActivity";
import {
  useDevices,
  useNetworkStats,
  useScanStatus,
  useTriggerScan,
} from "../hooks/useDevices";
import { useDeviceStore } from "../store/useDeviceStore";

export const Dashboard: React.FC = () => {
  const { devices, scanStatus, error, setDevices } = useDeviceStore();

  // 获取数据
  const devicesQuery = useDevices();
  const networkStatsQuery = useNetworkStats();
  const scanStatusQuery = useScanStatus();
  const triggerScanMutation = useTriggerScan();

  // 当组件挂载时，确保设备数据被同步到store
  useEffect(() => {
    if (devicesQuery.data && devicesQuery.data !== devices) {
      setDevices(devicesQuery.data);
    }
  }, [devicesQuery.data, devices, setDevices]);

  const handleStartScan = () => {
    triggerScanMutation.mutate({
      subnet: undefined,
      scanType: "ping",
    });
    // 刷新按钮状态
    setTimeout(() => {
      scanStatusQuery.refetch();
    }, 500);
  };

  const isScanning = scanStatus?.scanning;
  const onlineDevices = devices.filter((device) => device.is_online);
  const offlineDevices = devices.filter((device) => !device.is_online);

  // 计算新设备（最近24小时内首次发现的设备）
  const newDevices = devices.filter((device) => {
    const firstSeenTime = new Date(device.first_seen);
    const now = new Date();
    const diffHours =
      (now.getTime() - firstSeenTime.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  });

  // 错误显示
  if (error) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="rounded-lg border bg-white p-6 shadow-md">
          <div className="mb-4 text-red-600">
            <FiAlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">加载错误</h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => {
              devicesQuery.refetch();
              networkStatsQuery.refetch();
              scanStatusQuery.refetch();
            }}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* 页面标题 */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <FiWifi className="text-blue-600" />
          网络监控中心
        </h1>
        <p className="mt-2 text-gray-600">实时监控网络设备状态，管理扫描任务</p>
      </div>

      <div className="flex flex-1 flex-col gap-8">
        {/* 扫描控制面板 - 最重要的位置 */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <FiActivity className="text-blue-600" />
                扫描控制
              </h2>
              <p className="mt-1 text-sm text-gray-600">管理网络设备扫描任务</p>
            </div>
            <div className="flex items-center gap-4">
              {isScanning ? (
                <div className="flex items-center gap-2 text-orange-600">
                  <FiRefreshCw className="animate-spin" />
                  <span className="font-medium">扫描进行中...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <FiCheckCircle />
                  <span className="font-medium">就绪</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 扫描按钮 */}
            <div className="w-full rounded-lg border bg-white p-4 shadow-sm">
              <Button
                variant="soft"
                color={isScanning ? "orange" : "blue"}
                onClick={handleStartScan}
                className={`!h-full !w-full`}
                disabled={isScanning}
              >
                {isScanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiRefreshCw className="animate-spin" />
                    扫描中...
                  </span>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center justify-center gap-2">
                      <FiPlay size={24} className="text-green-600" />
                      <span className="text-lg font-bold">手动扫描</span>
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-500">
                      扫描网络中的所有设备
                    </p>
                  </div>
                )}
              </Button>
            </div>

            {/* 扫描状态 */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiActivity className="text-blue-600" />
                扫描状态
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">状态:</span>
                  <span
                    className={`text-sm font-medium ${
                      isScanning ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {isScanning ? "运行中" : "空闲"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">扫描间隔:</span>
                  <span className="font-mono text-sm text-gray-900">
                    {scanStatus?.scan_interval
                      ? `${scanStatus.scan_interval}s`
                      : "自动"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">模式:</span>
                  <span className="text-sm font-medium text-blue-600">
                    自动扫描
                  </span>
                </div>
              </div>
            </div>

            {/* 扫描详情 - Data List 形式 */}
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                <FiActivity className="text-purple-600" />
                扫描详情
              </h3>
              <div className="space-y-3">
                {/* 扫描时间 */}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">扫描时间:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {scanStatus?.last_scan_time
                      ? formatLastSeen(scanStatus.last_scan_time)
                      : "暂无记录"}
                  </span>
                </div>
                
                {/* 在线设备 */}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">在线设备:</span>
                  <span className="text-xs font-medium text-green-600">
                    {onlineDevices.length} 台
                  </span>
                </div>
                
                {/* 离线设备 */}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">离线设备:</span>
                  <span className="text-xs font-medium text-red-600">
                    {offlineDevices.length} 台
                  </span>
                </div>
                
                {/* 新设备 */}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">新设备:</span>
                  <span className="text-xs font-medium text-blue-600">
                    {newDevices.length} 台
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 设备统计概览 */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
            <FiUsers className="text-green-600" />
            设备统计
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <FiUserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-700">在线设备</p>
                  <p className="text-2xl font-bold text-green-700">
                    {onlineDevices.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <FiUserX className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700">离线设备</p>
                  <p className="text-2xl font-bold text-red-700">
                    {offlineDevices.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <FiUsers className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-700">设备总数</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {devices.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <FiActivity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">新设备</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {newDevices.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 在线率指示器 */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            设备在线率
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>在线率</span>
                <span>
                  {devices.length > 0
                    ? Math.round((onlineDevices.length / devices.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{
                    width:
                      devices.length > 0
                        ? `${(onlineDevices.length / devices.length) * 100}%`
                        : "0%",
                  }}
                ></div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">状态</div>
              <div
                className={`text-lg font-bold ${
                  devices.length === 0
                    ? "text-gray-500"
                    : onlineDevices.length / devices.length > 0.8
                      ? "text-green-600"
                      : onlineDevices.length / devices.length > 0.5
                        ? "text-yellow-600"
                        : "text-red-600"
                }`}
              >
                {devices.length === 0
                  ? "无数据"
                  : onlineDevices.length / devices.length > 0.8
                    ? "良好"
                    : onlineDevices.length / devices.length > 0.5
                      ? "一般"
                      : "需要关注"}
              </div>
            </div>
          </div>
        </div>

        {/* 最近活动分析 */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
            <FiActivity className="text-indigo-600" />
            最近活动
          </h2>
          <EnhancedRecentActivity className="" />
        </div>
      </div>
    </div>
  );
};
