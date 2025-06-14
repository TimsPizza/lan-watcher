import React, { useState, useEffect } from "react";
import { AppSettings } from "@/types";
import { useAppSettings, useUpdateAppSettings } from "@/hooks/useDevices";
import { ScanConfigForm } from "@/components/ScanConfigForm";
import { FiSave, FiRotateCcw, FiSettings, FiWifi } from "react-icons/fi";
import { toast } from "react-toastify";

export const SettingsPage: React.FC = () => {
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "scan">("general");

  // 使用React Query hooks
  const { data: settings, isLoading, error } = useAppSettings();
  const updateSettingsMutation = useUpdateAppSettings();

  // 初始化本地设置状态
  useEffect(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  }, [settings, localSettings]);

  // 检查是否有修改
  useEffect(() => {
    if (settings && localSettings) {
      const changed =
        JSON.stringify(settings) !== JSON.stringify(localSettings);
      setHasChanges(changed);
    }
  }, [settings, localSettings]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    if (!localSettings) return;

    setLocalSettings({
      ...localSettings,
      [key]: value,
    });
  };

  const handleSave = async () => {
    if (!localSettings) return;

    try {
      await updateSettingsMutation.mutateAsync(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("保存设置失败");
    }
  };

  const handleReset = () => {
    if (settings) {
      setLocalSettings({ ...settings });
      setHasChanges(false);
    }
  };

  if (isLoading || !localSettings) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
    <div className="flex max-h-full flex-col space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FiSettings className="text-blue-600" />
            系统设置
          </h1>
          <p className="mt-1 text-gray-600">配置应用的各项参数</p>
        </div>

        {/* 通用设置的操作按钮，只在通用选项卡显示 */}
        {activeTab === "general" && (
          <div className="flex items-center space-x-3">
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
              disabled={!hasChanges || updateSettingsMutation.isLoading}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSave
                className={`h-4 w-4 ${updateSettingsMutation.isLoading ? "animate-spin" : ""}`}
              />
              <span>
                {updateSettingsMutation.isLoading ? "保存中..." : "保存设置"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 选项卡导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center space-x-2 border-b-2 px-1 py-2 text-sm font-medium ${
              activeTab === "general"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiSettings className="h-4 w-4" />
            <span>通用设置</span>
          </button>

          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center space-x-2 border-b-2 px-1 py-2 text-sm font-medium ${
              activeTab === "scan"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiWifi className="h-4 w-4" />
            <span>扫描配置</span>
          </button>
        </nav>
      </div>

      {/* 通用设置选项卡内容 */}
      {activeTab === "general" && (
        <div className="flex-1 space-y-6 overflow-scroll">
          {/* 数据保留设置 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              数据管理
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  数据保留天数
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="7"
                    max="30"
                    value={localSettings.data_retention_days}
                    onChange={(e) =>
                      handleSettingChange(
                        "data_retention_days",
                        parseInt(e.target.value),
                      )
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                  />
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {localSettings.data_retention_days} 天
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  历史数据将自动删除超过此天数的记录
                </p>
              </div>
            </div>
          </div>

          {/* 扫描设置 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              网络扫描
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    自动扫描
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    启用后将按设定间隔自动扫描网络
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={localSettings.auto_scan_enabled}
                    onChange={(e) =>
                      handleSettingChange("auto_scan_enabled", e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  扫描间隔 (分钟)
                </label>
                <select
                  value={localSettings.scan_interval_minutes}
                  onChange={(e) =>
                    handleSettingChange(
                      "scan_interval_minutes",
                      parseInt(e.target.value),
                    )
                  }
                  disabled={!localSettings.auto_scan_enabled}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={1}>1 分钟</option>
                  <option value={2}>2 分钟</option>
                  <option value={5}>5 分钟</option>
                  <option value={10}>10 分钟</option>
                  <option value={15}>15 分钟</option>
                  <option value={30}>30 分钟</option>
                  <option value={60}>1 小时</option>
                </select>
              </div>
            </div>
          </div>

          {/* 界面设置 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              界面设置
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  图表刷新间隔 (秒)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={localSettings.chart_refresh_interval_seconds}
                    onChange={(e) =>
                      handleSettingChange(
                        "chart_refresh_interval_seconds",
                        parseInt(e.target.value),
                      )
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                  />
                  <div className="w-20 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {localSettings.chart_refresh_interval_seconds} 秒
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  时间线图表的自动刷新频率
                </p>
              </div>
            </div>
          </div>

          {/* 系统信息 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              系统信息
            </h2>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-gray-600">应用版本:</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">构建时间:</span>
                <span className="font-medium">2024-01-26</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">后端状态:</span>
                <span className="font-medium text-green-600">运行中</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">数据库状态:</span>
                <span className="font-medium text-green-600">正常</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 扫描配置选项卡内容 */}
      {activeTab === "scan" && <ScanConfigForm />}

      {/* 底部提示 - 只在通用设置选项卡显示 */}
      {activeTab === "general" && hasChanges && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                您有未保存的更改，请记得点击"保存设置"按钮。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
