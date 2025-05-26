# 局域网设备追踪器

一个基于FastAPI的局域网设备追踪器，可以周期性扫描子网设备并记录它们的在线状态。

## 功能特点

- 🔍 **多种扫描方式**: 支持Ping扫描和ARP扫描
- 📊 **实时监控**: 周期性扫描网络设备，默认5分钟一次
- 💾 **数据存储**: 使用SQLite数据库存储设备信息和历史记录
- 🌐 **Web界面**: 提供简洁的Web界面查看设备状态
- 📱 **RESTful API**: 完整的API接口，支持二次开发
- ⚡ **高性能**: 多线程并发扫描，快速发现设备
- 🏷️ **设备别名**: 支持为设备设置自定义别名
- 🏭 **厂商识别**: 使用IEEE OUI数据库识别设备厂商
- 🔍 **设备搜索**: 支持按IP、MAC、别名、厂商搜索设备
- ⚙️ **灵活配置**: 支持自定义监听地址和端口

## 技术架构

- **后端框架**: FastAPI
- **数据库**: SQLite + SQLAlchemy ORM
- **网络扫描**: 系统ping命令 + ARP表解析
- **并发处理**: asyncio + ThreadPoolExecutor
- **前端**: 原生HTML/CSS/JavaScript

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -e .
```

### 2. 启动服务

推荐使用启动脚本：

```bash
python start.py
```

或者指定监听地址和端口：

```bash
python start.py --host 127.0.0.1 --port 9000
```

也可以直接使用main.py：

```bash
python main.py
```

或者使用uvicorn：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 访问服务

- Web界面: http://localhost:8000
- API文档: http://localhost:8000/docs
- API JSON: http://localhost:8000/redoc

## API接口

### 设备管理

- `GET /api/devices` - 获取所有设备列表
- `GET /api/devices/online` - 获取在线设备列表
- `GET /api/devices/{device_id}` - 获取单个设备详情
- `GET /api/devices/{device_id}/history` - 获取设备历史记录
- `PUT /api/devices/{device_id}/alias` - 更新设备别名
- `PUT /api/devices/mac/{mac_address}/alias` - 通过MAC地址更新设备别名
- `GET /api/devices/search?q={query}` - 搜索设备

### 网络扫描

- `POST /api/scan` - 手动触发网络扫描
- `GET /api/scan-status` - 获取当前扫描状态
- `GET /api/scan-sessions` - 获取扫描会话历史
- `POST /api/scan-interval` - 设置扫描间隔

### 统计信息

- `GET /api/stats` - 获取网络统计信息

### 厂商查询

- `GET /api/oui/{mac_address}` - 根据MAC地址查找厂商信息

## 配置选项

### 扫描间隔

默认5分钟扫描一次，可以通过API调整：

```bash
curl -X POST "http://localhost:8000/api/scan-interval" \
     -H "Content-Type: application/json" \
     -d "300"
```

### 扫描类型

支持两种扫描类型：
- `ping`: Ping扫描，快速但可能被防火墙拦截
- `arp`: ARP扫描，更准确但依赖ARP表

### 数据库

默认使用SQLite数据库，文件位置：`./storage/lan_watcher.db`

可以通过环境变量 `DATABASE_URL` 修改数据库连接：

```bash
export DATABASE_URL="sqlite:///./custom.db"
# 或者使用PostgreSQL
export DATABASE_URL="postgresql://user:pass@localhost/dbname"
```

## 权限要求

某些扫描功能可能需要管理员权限：
- ARP扫描: 需要读取系统ARP表
- ICMP Ping: 在某些系统上需要特殊权限

建议以管理员权限运行，或者配置相应的网络权限。

## 故障排除

### 扫描不到设备

1. 检查网络连接和子网配置
2. 确保防火墙没有阻止ping请求
3. 尝试切换扫描类型（ping/arp）

### 权限错误

1. 以管理员权限运行程序
2. 检查系统网络工具是否安装（ping, arp等）

### 数据库错误

1. 检查文件写入权限
2. 确保SQLite可用
3. 删除损坏的数据库文件重新创建

## 开发指南

### 项目结构

```
backend/
├── main.py          # FastAPI应用主文件
├── models.py        # 数据库模型
├── database.py      # 数据库配置
├── scanner.py       # 网络扫描器
├── services.py      # 业务逻辑服务
├── pyproject.toml   # 项目配置
└── README.md        # 说明文档
```

### 扩展开发

1. **添加新的扫描方法**: 在`scanner.py`中扩展`NetworkScanner`类
2. **增加设备类型检测**: 扩展设备识别逻辑
3. **添加通知功能**: 设备上线/离线通知
4. **Web界面美化**: 替换前端实现

## License

MIT License
