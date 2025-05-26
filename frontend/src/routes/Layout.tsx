import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

const Layout = () => {
  return (
    <div id="layout" className="min-h-screen w-full bg-gray-50 flex">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
