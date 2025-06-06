import { DeviceTable } from "@/components/DeviceTable";
import { useDevices } from "@/hooks/useDevices";
import { Device } from "@/types";
import React, { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";

export const DevicesPage: React.FC = () => {
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  // 使用真实的API hooks
  const { data: devices = [], isLoading, refetch } = useDevices();

  // 过滤设备
  useEffect(() => {
    let filtered = devices;

    // 状态过滤
    if (statusFilter === "online") {
      filtered = filtered.filter((device) => device.is_online);
    } else if (statusFilter === "offline") {
      filtered = filtered.filter((device) => !device.is_online);
    }

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (device) =>
          device.ip_address.toLowerCase().includes(term) ||
          (device.hostname && device.hostname.toLowerCase().includes(term)) ||
          (device.custom_name &&
            device.custom_name.toLowerCase().includes(term)) ||
          (device.vendor && device.vendor.toLowerCase().includes(term)) ||
          (device.mac_address &&
            device.mac_address.toLowerCase().includes(term)),
      );
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter]);

  const handleRefresh = () => {
    refetch();
    toast.success("刷新成功");
  };

  const onlineDevices = devices.filter((d) => d.is_online).length;
  const offlineDevices = devices.filter((d) => !d.is_online).length;

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设备管理</h1>
          <p className="mt-1 text-gray-600">管理和监控所有网络设备</p>
        </div>

        <div className="mt-4 flex items-center space-x-4 lg:mt-0">
          {/* 统计数据 */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">{onlineDevices} 在线</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-gray-600">{offlineDevices} 离线</span>
            </div>
            <div className="text-gray-600">总计 {devices.length} 设备</div>
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 设备表格 */}
      <DeviceTable devices={filteredDevices} isLoading={isLoading} />

      {/* 空状态 */}
      {!isLoading && filteredDevices.length === 0 && (
        <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
          <div className="text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "没有找到匹配的设备"
              : "暂无设备数据"}
          </div>
          {(searchTerm || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              清除过滤器
            </button>
          )}
        </div>
      )}
    </div>
  );
};
