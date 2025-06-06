import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

const Layout = () => {
  return (
    <div
      id="layout"
      className="flex min-h-screen w-full overflow-hidden bg-gray-50"
    >
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-scroll px-6 py-4 max-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
