import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiMonitor, 
  FiBarChart, 
  FiSettings, 
  FiActivity 
} from 'react-icons/fi';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavigationItem[] = [
  { name: '仪表板', path: '/', icon: FiHome },
  { name: '设备列表', path: '/devices', icon: FiMonitor },
  { name: '时间线图表', path: '/timeline', icon: FiBarChart },
  { name: '网络状态', path: '/status', icon: FiActivity },
  { name: '设置', path: '/settings', icon: FiSettings },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="bg-white w-64 min-h-screen border-r border-gray-200 flex flex-col">
      {/* Logo区域 */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">局域网监控器</h1>
        <p className="text-sm text-gray-500 mt-1">LAN Watcher</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2024 LAN Watcher</p>
        </div>
      </div>
    </div>
  );
}; 