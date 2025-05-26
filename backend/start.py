#!/usr/bin/env python3
"""
LAN Watcher 启动脚本
支持命令行参数配置监听地址、端口等
"""

import argparse
import os
import sys
import uvicorn

def main():
    parser = argparse.ArgumentParser(description='LAN Device Tracker - 局域网设备追踪器')
    
    parser.add_argument(
        '--host', 
        default='0.0.0.0',
        help='监听主机地址 (默认: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--port', 
        type=int, 
        default=8000,
        help='监听端口 (默认: 8000)'
    )
    
    parser.add_argument(
        '--reload', 
        action='store_true',
        help='启用自动重载（开发模式）'
    )
    
    parser.add_argument(
        '--workers', 
        type=int, 
        default=1,
        help='工作进程数量（生产模式）'
    )
    
    parser.add_argument(
        '--init-oui', 
        action='store_true',
        help='强制重新初始化OUI数据库'
    )
    
    parser.add_argument(
        '--skip-migrations', 
        action='store_true',
        help='跳过数据库迁移'
    )
    
    args = parser.parse_args()
    
    # 设置环境变量
    os.environ['LAN_WATCHER_HOST'] = args.host
    os.environ['LAN_WATCHER_PORT'] = str(args.port)
    os.environ['LAN_WATCHER_RELOAD'] = str(args.reload).lower()
    
    # 运行数据库迁移
    if not args.skip_migrations:
        print("Running database migrations...")
        try:
            from .database.migrations import migrate_database
            migrate_database()
            print("Database migrations completed.")
        except Exception as e:
            print(f"Warning: Database migration failed: {e}")
            print("You may need to run migrations manually or delete the database file.")
    
    if args.init_oui:
        print("Initializing OUI database...")
        try:
            from .models.oui_parser import OuiParser
            from .database.database import SessionLocal
            from .models.models import OuiVendor
            
            # 清空现有OUI数据
            db = SessionLocal()
            db.query(OuiVendor).delete()
            db.commit()
            db.close()
            
            # 重新导入
            parser = OuiParser()
            count = parser.import_to_database()
            print(f"Successfully imported {count} OUI records")
            
        except Exception as e:
            print(f"Error initializing OUI database: {e}")
            sys.exit(1)
    
    print(f"Starting LAN Watcher on {args.host}:{args.port}")
    print(f"Reload mode: {args.reload}")
    print(f"Workers: {args.workers}")
    print("Access the web interface at: http://{}:{}".format(
        'localhost' if args.host == '0.0.0.0' else args.host, 
        args.port
    ))
    print("API documentation at: http://{}:{}/docs".format(
        'localhost' if args.host == '0.0.0.0' else args.host, 
        args.port
    ))
    
    # 启动服务器
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1
    )

if __name__ == "__main__":
    main() 