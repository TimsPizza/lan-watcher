import React, { useMemo, useState } from "react";
import { Device } from "../types";
import { getDeviceIcon, getDeviceTypeLabel } from "../utils/deviceIcons";
import { useUpdateDeviceAlias } from "../hooks/useDevices";
import { useDeviceStore } from "../store/useDeviceStore";
import { formatLastSeen, formatFirstSeen } from "../utils/timeUtils";
import { FiEdit2 } from "react-icons/fi";

interface DeviceTableProps {
  devices: Device[];
  isLoading?: boolean;
  className?: string;
}

interface EditingState {
  deviceId: string | null;
  value: string;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices,
  isLoading = false,
  className = "",
}) => {
  const [editingAlias, setEditingAlias] = useState<EditingState>({
    deviceId: null,
    value: "",
  });
  const updateAliasMutation = useUpdateDeviceAlias();

  const {
    filteredDevices,
    searchQuery,
    deviceFilter,
    setSearchQuery,
    setDeviceFilter,
  } = useDeviceStore();

  const displayDevices = useMemo(() => {
    const orig =
      filteredDevices.length > 0 || searchQuery || deviceFilter !== "all"
        ? filteredDevices
        : devices;
    const sorted = orig.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return 0;
    });
    return sorted;
  }, [filteredDevices, searchQuery, deviceFilter, devices]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (filter: "all" | "online" | "offline") => {
    setDeviceFilter(filter);
  };

  const getFilterCount = (filter: "all" | "online" | "offline") => {
    switch (filter) {
      case "all":
        return devices.length;
      case "online":
        return devices.filter((d) => d.is_online).length;
      case "offline":
        return devices.filter((d) => !d.is_online).length;
      default:
        return 0;
    }
  };

  const handleEditAlias = (device: Device) => {
    setEditingAlias({
      deviceId: device.id,
      value: device.custom_name || "",
    });
  };

  const handleSaveAlias = (deviceId: string) => {
    updateAliasMutation.mutate({
      deviceId,
      customName: editingAlias.value.trim() || "",
    });
    setEditingAlias({ deviceId: null, value: "" });
  };

  const handleCancelEdit = () => {
    setEditingAlias({ deviceId: null, value: "" });
  };

  if (isLoading) {
    return (
      <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
        <div className="p-6">
          {/* 搜索和过滤器骨架 */}
          <div className="mb-6 animate-pulse space-y-4">
            <div className="h-10 rounded bg-gray-200"></div>
            <div className="flex space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 w-20 rounded bg-gray-200"></div>
              ))}
            </div>
          </div>

          {/* 表格骨架 */}
          <div className="animate-pulse">
            <div className="mb-2 h-12 rounded bg-gray-200"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-1 h-16 rounded bg-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className}`}>
      <div className="p-6">
        {/* 标题和设备数量 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">设备列表</h2>
          <span className="text-sm text-gray-500">
            共 {displayDevices.length} 个设备
          </span>
        </div>

        {/* 搜索框 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索设备（IP、MAC、主机名、别名、厂商）"
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 过滤器 */}
        <div className="mb-6 flex space-x-2">
          {(["all", "online", "offline"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                deviceFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter === "all" && "全部"}
              {filter === "online" && "在线"}
              {filter === "offline" && "离线"}
              <span className="ml-1 text-xs">({getFilterCount(filter)})</span>
            </button>
          ))}
        </div>

        {/* 设备表格 */}
        {displayDevices.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-2 text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.94-6.071 2.461"
                />
              </svg>
            </div>
            <p className="text-gray-500">
              {searchQuery ? "没有找到匹配的设备" : "暂无设备数据"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                清除搜索条件
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* 表格头部 */}
            <div className="grid grid-cols-12 gap-4 border-b bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
              <div className="col-span-3">设备</div>
              <div className="col-span-2">IP地址</div>
              <div className="col-span-2">制造商</div>
              <div className="col-span-2">MAC地址</div>
              <div className="col-span-2">上次在线</div>
              <div className="col-span-1">状态</div>
            </div>

            {/* 设备行 */}
            <div className="max-h-[400px] divide-y divide-gray-100 overflow-y-auto">
              {displayDevices.map((device) => (
                <div
                  key={device.id}
                  className={`group grid grid-cols-12 gap-4 px-4 py-4 transition-colors hover:brightness-95 ${
                    device.is_online ? "bg-gray-50" : "bg-red-50"
                  }`}
                >
                  {/* 设备列（图标+名称） */}
                  <div className="col-span-3 flex items-center space-x-3">
                    {/* 设备图标 */}
                    <div className="flex-shrink-0">{getDeviceIcon(device)}</div>

                    {/* 设备名称和别名编辑 */}
                    <div className="min-w-0 flex-1">
                      {editingAlias.deviceId === device.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingAlias.value}
                            onChange={(e) =>
                              setEditingAlias((prev) => ({
                                ...prev,
                                value: e.target.value,
                              }))
                            }
                            placeholder="输入设备别名"
                            className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveAlias(device.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveAlias(device.id)}
                              disabled={updateAliasMutation.isLoading}
                              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="rounded bg-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="truncate font-medium text-gray-900">
                              {device.custom_name ||
                                device.hostname ||
                                "未知设备"}
                            </span>
                            <button
                              onClick={() => handleEditAlias(device)}
                              className={`hidden rounded bg-blue-50 p-1 text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 group-hover:block`}
                              disabled={updateAliasMutation.isLoading}
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            {getDeviceTypeLabel(device)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IP地址列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="font-mono text-sm text-gray-900">
                      {device.ip_address}
                    </span>
                  </div>

                  {/* 制造商列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="truncate text-sm text-gray-700">
                      {device.vendor || "未知"}
                    </span>
                  </div>

                  {/* MAC地址列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="truncate font-mono text-sm text-gray-600">
                      {device.mac_address || "未知"}
                    </span>
                  </div>

                  {/* 上次在线列 */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-sm text-gray-600">
                      {formatLastSeen(device.last_seen)}
                    </span>
                  </div>

                  {/* 状态列 */}
                  <div className="col-span-1 flex items-center">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          device.is_online ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></div>
                      <span className="text-xs font-medium text-gray-600">
                        {device.is_online ? "在线" : "离线"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
