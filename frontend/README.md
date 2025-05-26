# LAN Watcher Frontend

基于 React + TypeScript + Vite 的局域网设备监控前端界面。

## 功能特性

- 📊 **实时设备监控** - 显示网络中的所有设备及其状态
- 📈 **时间线图表** - 24小时设备在线状态可视化，支持按天翻阅历史数据
- 🔍 **智能搜索** - 支持按IP、MAC、主机名、别名、厂商搜索设备
- 🏷️ **设备别名** - 为设备设置自定义名称，便于识别
- 🎯 **设备分类图标** - 智能识别路由器、手机、电视、监控等设备类型
- 📊 **网络统计** - 显示在线/离线设备数量和扫描统计
- ⚡ **手动扫描** - 支持Ping和ARP扫描模式
- ⚙️ **系统设置** - 可配置数据保留天数、扫描间隔、图表刷新频率
- 🖥️ **多页面导航** - 仪表板、设备管理、时间线图表、网络状态、设置页面
- 📱 **响应式设计** - 适配桌面和移动设备
- 🎨 **表格视图** - 清晰的列表式设备展示
- 🎨 **现代UI** - 使用Tailwind CSS和侧边栏导航

## 技术栈

- **React 18** - 用户界面库
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **React Query** - 数据获取和缓存
- **Zustand** - 状态管理
- **React Router** - 路由管理
- **Tailwind CSS** - 样式框架
- **Radix UI** - 无障碍UI组件
- **React Icons** - 图标库
- **Recharts** - 图表可视化
- **date-fns** - 日期时间处理
- **Axios** - HTTP客户端
- **React Toastify** - 通知组件

## 开发环境

### 安装依赖

```bash
pnpm install
```

### 环境配置

创建 `.env` 文件：

```bash
# API配置
VITE_API_BASE_URL=http://127.0.0.1:8000

# 开发模式配置
VITE_DEV_MODE=true
```

### 启动开发服务器

```bash
pnpm run dev
```

### 构建生产版本

```bash
pnpm run build
```

### 预览生产版本

```bash
pnpm run preview
```

## 项目结构

```
src/
├── components/          # React组件
│   ├── DeviceCard.tsx      # 设备卡片
│   ├── DeviceList.tsx      # 设备列表（卡片视图）
│   ├── DeviceTable.tsx     # 设备表格（列表视图）
│   ├── Sidebar.tsx         # 侧边栏导航
│   ├── TimelineChart.tsx   # 时间线图表
│   ├── DatePicker.tsx      # 日期选择器
│   ├── NetworkStats.tsx    # 网络统计
│   └── ScanControl.tsx     # 扫描控制
├── hooks/              # 自定义Hook
│   └── useDevices.ts       # 设备数据管理
├── routes/             # 路由组件
│   ├── Dashboard.tsx       # 仪表板
│   ├── DevicesPage.tsx     # 设备管理页面
│   ├── TimelinePage.tsx    # 时间线图表页面
│   ├── StatusPage.tsx      # 网络状态页面
│   ├── SettingsPage.tsx    # 设置页面
│   ├── Layout.tsx          # 布局组件
│   └── index.tsx          # 路由配置
├── services/           # API服务
│   ├── api.ts             # API接口
│   └── mockData.ts        # Mock数据服务
├── store/              # 状态管理
│   └── useDeviceStore.ts  # 设备状态
├── styles/             # 样式文件
├── types/              # TypeScript类型
│   └── index.ts           # 类型定义
├── App.tsx             # 主应用组件
└── main.tsx           # 应用入口
```

## API集成

前端与后端FastAPI服务通过以下端点通信：

- `GET /api/devices` - 获取所有设备
- `GET /api/devices/online` - 获取在线设备
- `PUT /api/devices/{id}/alias` - 更新设备别名
- `GET /api/devices/search` - 搜索设备
- `POST /api/scan` - 触发手动扫描
- `GET /api/scan-status` - 获取扫描状态
- `GET /api/stats` - 获取网络统计

## 使用说明

### 设备监控

1. 页面会自动加载和显示网络中的设备
2. 设备卡片显示IP地址、MAC地址、主机名、厂商等信息
3. 绿点表示设备在线，灰点表示设备离线

### 设备搜索

1. 在搜索框中输入关键词
2. 支持搜索IP地址、MAC地址、主机名、设备别名、厂商名称
3. 实时过滤显示匹配的设备

### 设备别名

1. 点击设备卡片上的"设置别名"按钮
2. 输入自定义名称并保存
3. 别名会显示为设备的主要标识

### 手动扫描

1. 在扫描控制面板中选择扫描类型（Ping或ARP）
2. 可选择性输入特定子网，如 `192.168.1.0/24`
3. 点击"开始扫描"按钮

### 自动扫描设置

1. 点击"修改扫描间隔"按钮
2. 输入新的间隔时间（60-3600秒）
3. 保存设置后生效

## 开发指南

### 添加新组件

1. 在 `src/components/` 目录下创建新组件
2. 使用TypeScript和函数式组件
3. 遵循现有的命名和样式约定

### API集成

1. 在 `src/services/api.ts` 中添加新的API方法
2. 在 `src/hooks/useDevices.ts` 中创建对应的Hook
3. 在组件中使用Hook进行数据获取

### 状态管理

1. 全局状态使用Zustand store
2. 组件状态使用React useState
3. 服务器状态使用React Query

### 样式开发

1. 使用Tailwind CSS类名
2. 遵循响应式设计原则
3. 保持一致的颜色和间距

## 部署

### 构建

```bash
pnpm run build
```

### 静态文件部署

构建后的文件在 `dist/` 目录中，可以部署到任何静态文件服务器：

- Nginx
- Apache
- Vercel
- Netlify
- GitHub Pages

### Docker部署

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 故障排除

### 常见问题

1. **API连接失败**
   - 检查后端服务是否启动
   - 确认API地址配置正确
   - 检查CORS设置

2. **设备数据不更新**
   - 查看网络连接
   - 检查扫描服务状态
   - 确认扫描间隔设置

3. **样式显示异常**
   - 确认Tailwind CSS正确加载
   - 检查CSS文件路径
   - 清除浏览器缓存

### 开发调试

- 使用浏览器开发者工具查看网络请求
- 查看控制台日志信息
- 使用React Developer Tools调试组件状态
