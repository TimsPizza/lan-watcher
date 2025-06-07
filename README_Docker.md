# LAN Watcher Docker 部署指南

这个文档说明如何使用Docker部署LAN Watcher局域网扫描器。

## 项目概述

LAN Watcher是一个基于FastAPI的局域网设备扫描和监控工具，具有以下特性：
- 使用nmap进行网络扫描
- FastAPI后端提供REST API
- 前端已构建并集成到容器中
- 使用JSON文件进行轻量级数据存储
- 采用uv标准虚拟环境工作流程，确保依赖隔离和版本一致性

## 快速开始

### 1. 构建和启动

```bash
# 克隆项目后，在项目根目录执行
make up
# 或者
docker-compose up -d --build
```

### 2. 访问应用

- 前端界面：http://localhost:8000
- API文档：http://localhost:8000/docs
- API状态：http://localhost:8000/api/stats

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LAN_WATCHER_HOST` | `0.0.0.0` | 监听地址 |
| `LAN_WATCHER_PORT` | `8000` | 监听端口 |
| `LAN_WATCHER_RELOAD` | `false` | 是否启用热重载 |

### 数据持久化

应用数据以JSON格式存储在 `./data` 目录中，包括：
- 设备扫描记录 (devices.json)
- 扫描会话 (scan_sessions.json)
- 扫描记录 (scan_records.json)
- 应用配置 (settings.json)
- 扫描配置 (scan_config.json)
- 图表配置 (chart_config.json)
- OUI厂商数据库缓存 (oui_cache.json)

确保该目录有适当的读写权限：
```bash
mkdir -p data
chmod 755 data
```

### 网络配置

项目使用 `host` 网络模式以便进行局域网扫描。如果您的环境不支持host网络模式，可以使用以下替代配置：

1. 编辑 `docker-compose.yml`
2. 注释掉 `network_mode: host` 行
3. 取消注释端口映射部分：
   ```yaml
   ports:
     - "8000:8000"
   ```

### 权限要求

- 容器需要 `privileged: true` 权限以便nmap进行网络扫描
- 如果不使用特权模式，至少需要以下权限：
  ```yaml
  cap_add:
    - NET_ADMIN
    - NET_RAW
  ```

## 技术栈

- **基础镜像**：[instrumentisto/nmap](https://hub.docker.com/r/instrumentisto/nmap) (Alpine Linux)
- **Python环境**：uv管理的虚拟环境(.venv)
- **后端**：FastAPI + uvicorn  
- **包管理**：uv (标准工作流程：uv venv + uv sync)
- **数据存储**：JSON文件
- **前端**：已构建的静态文件
- **网络工具**：nmap 