.PHONY: help build up down logs restart clean backup restore

# 默认目标
help:
	@echo "LAN Watcher Docker 管理命令:"
	@echo ""
	@echo "  make build       - 构建Docker镜像"
	@echo "  make up          - 启动服务 (开发环境)"
	@echo "  make up-prod     - 启动服务 (生产环境)"
	@echo "  make down        - 停止服务"
	@echo "  make logs        - 查看日志"
	@echo "  make restart     - 重启服务"
	@echo "  make clean       - 清理容器和镜像"
	@echo "  make backup      - 备份数据"
	@echo "  make restore     - 恢复数据"
	@echo "  make setup       - 初始化数据目录"
	@echo ""

# 初始化数据目录
setup:
	@echo "正在创建数据目录..."
	mkdir -p data
	chmod 755 data
	@echo "数据目录创建完成"

# 构建镜像
build:
	@echo "正在构建Docker镜像..."
	docker-compose build

# 构建优化镜像
build-prod:
	@echo "正在构建生产环境Docker镜像..."
	docker-compose -f docker-compose.prod.yml build

# 启动服务 (开发环境)
up: setup
	@echo "正在启动LAN Watcher (开发环境)..."
	docker-compose up -d
	@echo "服务已启动，访问: http://localhost:8000"

# 启动服务 (生产环境)
up-prod: setup
	@echo "正在启动LAN Watcher (生产环境)..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "生产服务已启动，访问: http://localhost:8000"

# 停止服务
down:
	@echo "正在停止服务..."
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

# 查看日志
logs:
	docker-compose logs -f lan-watcher

# 查看生产环境日志
logs-prod:
	docker-compose -f docker-compose.prod.yml logs -f lan-watcher

# 重启服务
restart:
	@echo "正在重启服务..."
	docker-compose restart

# 重启生产服务
restart-prod:
	@echo "正在重启生产服务..."
	docker-compose -f docker-compose.prod.yml restart

# 查看状态
status:
	@echo "服务状态:"
	docker-compose ps

# 查看生产状态
status-prod:
	@echo "生产服务状态:"
	docker-compose -f docker-compose.prod.yml ps

# 进入容器shell
shell:
	docker-compose exec lan-watcher /bin/bash

# 进入生产容器shell
shell-prod:
	docker-compose -f docker-compose.prod.yml exec lan-watcher /bin/bash

# 备份数据
backup:
	@echo "正在备份数据..."
	@if [ -d "data" ]; then \
		tar -czf lan-watcher-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz data/; \
		echo "备份完成: lan-watcher-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz"; \
	else \
		echo "错误: data目录不存在"; \
		exit 1; \
	fi

# 恢复数据 (使用: make restore BACKUP=filename.tar.gz)
restore:
	@if [ -z "$(BACKUP)" ]; then \
		echo "错误: 请指定备份文件，例如: make restore BACKUP=backup.tar.gz"; \
		exit 1; \
	fi
	@if [ ! -f "$(BACKUP)" ]; then \
		echo "错误: 备份文件 $(BACKUP) 不存在"; \
		exit 1; \
	fi
	@echo "正在恢复数据从 $(BACKUP)..."
	tar -xzf $(BACKUP)
	@echo "数据恢复完成"

# 清理资源
clean:
	@echo "正在清理Docker资源..."
	docker-compose down --rmi all --volumes --remove-orphans
	docker-compose -f docker-compose.prod.yml down --rmi all --volumes --remove-orphans
	@echo "清理完成"

# 完全重新部署
redeploy: down build up
	@echo "重新部署完成"

# 生产环境完全重新部署
redeploy-prod: down build-prod up-prod
	@echo "生产环境重新部署完成"

# 更新应用
update:
	@echo "正在更新应用..."
	git pull
	make redeploy

# 生产环境更新
update-prod:
	@echo "正在更新生产应用..."
	git pull
	make redeploy-prod

# 监控资源使用
monitor:
	@echo "监控容器资源使用 (按Ctrl+C退出):"
	docker stats lan-watcher

# 查看应用版本信息
version:
	@echo "LAN Watcher 容器化版本"
	@echo "构建时间: $(shell date)"
	@if [ -f ".git/HEAD" ]; then \
		echo "Git版本: $(shell git rev-parse --short HEAD)"; \
	fi 