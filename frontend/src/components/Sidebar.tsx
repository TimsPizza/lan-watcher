import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiMonitor,
  FiBarChart,
  FiSettings,
  FiActivity,
} from "react-icons/fi";

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { name: "仪表板", path: "/", icon: FiHome },
  { name: "设备列表", path: "/devices", icon: FiMonitor },
  { name: "时间线图表", path: "/timeline", icon: FiBarChart },
  { name: "设置", path: "/settings", icon: FiSettings },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="flex h-screen w-64 flex-col overflow-y-hidden border-r border-gray-200 bg-white">
      <div className="flex h-28 flex-row items-start justify-start border-b border-gray-200 p-6">
        <div className="h-full">
          <img src="/logo.svg" alt="logo" className="h-16 w-16" />
        </div>
        <div className="flex h-full flex-col items-start justify-center">
          <h1 className="text-xl font-bold text-gray-900">局域网监控器</h1>
          <p className="mt-1 text-sm text-gray-500">LAN Watcher</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-r-2 border-blue-700 bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部信息 */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-center text-xs text-gray-500">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2024 LAN Watcher</p>
        </div>
      </div>
    </div>
  );
};
