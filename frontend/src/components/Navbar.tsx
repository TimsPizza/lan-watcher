import React from 'react';

interface NavbarProps {
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ className = '' }) => {
  return (
    <nav className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo和标题 */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">NetTrack</span>
            </div>
          </div>

          {/* 导航菜单 */}
          <div className="flex items-center space-x-8">
            <a
              href="#"
              className="text-blue-600 border-b-2 border-blue-600 px-1 pt-1 pb-4 text-sm font-medium"
            >
              设备监控
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium"
            >
              网络分析
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-gray-700 px-1 pt-1 pb-4 text-sm font-medium"
            >
              设置
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}; 