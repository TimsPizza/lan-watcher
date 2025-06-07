# 使用python:3.12-slim作为基础镜像
FROM python:3.12-slim AS base

# 设置工作目录
WORKDIR /app

# 安装nmap和uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    iproute2 \
    net-tools \
    nmap \
    curl \
    ca-certificates \
    bash \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# 将uv添加到PATH
ENV PATH="/root/.local/bin:$PATH"

# 复制后端项目文件
COPY backend/ ./backend/
WORKDIR /app/backend

# 使用uv标准工作流程：创建虚拟环境并安装依赖
RUN uv venv && uv sync --frozen

# 复制前端构建文件
COPY frontend/dist/ ./static/

# 创建应用入口脚本以集成静态文件服务
COPY <<EOF /app/backend/app_with_static.py
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# API路由已经在main.py中定义，都有/api/前缀

# 为静态文件创建路由处理
@app.get("/{full_path:path}")
async def serve_static(full_path: str):
    """
    处理静态文件请求
    如果请求的是根路径或不存在的文件，返回index.html
    """
    static_dir = "/app/backend/static"
    
    # 如果是根路径，返回index.html
    if full_path == "" or full_path == "/":
        return FileResponse(os.path.join(static_dir, "index.html"))
    
    # 检查文件是否存在
    file_path = os.path.join(static_dir, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # 如果文件不存在，返回index.html（用于SPA路由）
    return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("LAN_WATCHER_HOST", "0.0.0.0")
    port = int(os.getenv("LAN_WATCHER_PORT", "8000"))
    reload = os.getenv("LAN_WATCHER_RELOAD", "true").lower() == "true"
    
    print(f"Starting LAN Watcher on {host}:{port}")
    print(f"Reload mode: {reload}")
    
    uvicorn.run("app_with_static:app", host=host, port=port, reload=reload)
EOF

# 创建数据目录
RUN mkdir -p /app/backend/storage/data

# 设置环境变量
ENV LAN_WATCHER_HOST=0.0.0.0
ENV LAN_WATCHER_PORT=8000
ENV LAN_WATCHER_RELOAD=false

# 暴露端口
EXPOSE 8000

# 创建启动脚本
RUN echo '#!/bin/bash\n\
cd /app/backend\n\
source .venv/bin/activate\n\
exec python app_with_static.py' > /app/start.sh && \
    chmod +x /app/start.sh

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/stats || exit 1

# 使用非root用户运行（如果不需要特权网络操作）
# RUN useradd -m -u 1000 lanwatcher
# USER lanwatcher

# 启动应用
CMD ["/app/start.sh"] 