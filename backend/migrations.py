"""
数据库迁移脚本
用于升级数据库结构，保留现有数据
"""

import sqlite3
import os
from typing import List
from database.database import SQLALCHEMY_DATABASE_URL

class Migration:
    def __init__(self, version: int, description: str, up_sql: str, down_sql: str = None):
        self.version = version
        self.description = description
        self.up_sql = up_sql
        self.down_sql = down_sql

class MigrationManager:
    def __init__(self, db_url: str = SQLALCHEMY_DATABASE_URL):
        self.db_url = db_url
        # 从 sqlite:///./lan_watcher.db 提取文件路径
        if db_url.startswith("sqlite:///"):
            self.db_path = db_url.replace("sqlite:///", "")
        else:
            raise ValueError("Currently only SQLite databases are supported")
        
        self.migrations = self._define_migrations()
    
    def _define_migrations(self) -> List[Migration]:
        """定义所有迁移"""
        migrations = []
        
        # 迁移001: 创建迁移版本跟踪表
        migrations.append(Migration(
            version=1,
            description="Create migration tracking table",
            up_sql="""
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version INTEGER UNIQUE NOT NULL,
                description TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        ))
        
        # 迁移002: 添加custom_name字段到devices表
        migrations.append(Migration(
            version=2,
            description="Add custom_name field to devices table",
            up_sql="""
            ALTER TABLE devices ADD COLUMN custom_name VARCHAR(255);
            """,
            down_sql="""
            -- SQLite不支持DROP COLUMN，需要重建表
            CREATE TABLE devices_backup AS SELECT 
                id, ip_address, mac_address, hostname, device_type, vendor,
                first_seen, last_seen, is_online, open_ports
            FROM devices;
            
            DROP TABLE devices;
            
            CREATE TABLE devices (
                id INTEGER NOT NULL PRIMARY KEY,
                ip_address VARCHAR(15) NOT NULL,
                mac_address VARCHAR(17),
                hostname VARCHAR(255),
                device_type VARCHAR(100),
                vendor VARCHAR(255),
                first_seen DATETIME,
                last_seen DATETIME,
                is_online BOOLEAN,
                open_ports TEXT
            );
            
            INSERT INTO devices SELECT * FROM devices_backup;
            DROP TABLE devices_backup;
            
            CREATE UNIQUE INDEX ix_devices_ip_address ON devices (ip_address);
            CREATE INDEX ix_devices_id ON devices (id);
            CREATE INDEX ix_devices_mac_address ON devices (mac_address);
            """
        ))
        
        # 迁移003: 创建OUI厂商表
        migrations.append(Migration(
            version=3,
            description="Create OUI vendors table",
            up_sql="""
            CREATE TABLE IF NOT EXISTS oui_vendors (
                id INTEGER NOT NULL PRIMARY KEY,
                oui VARCHAR(8) NOT NULL UNIQUE,
                vendor_name TEXT NOT NULL,
                vendor_address TEXT
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS ix_oui_vendors_oui ON oui_vendors (oui);
            CREATE INDEX IF NOT EXISTS ix_oui_vendors_id ON oui_vendors (id);
            """
        ))
        
        # 迁移004: 创建应用设置表
        migrations.append(Migration(
            version=4,
            description="Create app settings table",
            up_sql="""
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER NOT NULL PRIMARY KEY,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS ix_app_settings_key ON app_settings (key);
            CREATE INDEX IF NOT EXISTS ix_app_settings_id ON app_settings (id);
            """
        ))
        
        # 迁移005: 创建图表配置表
        migrations.append(Migration(
            version=5,
            description="Create chart config table",
            up_sql="""
            CREATE TABLE IF NOT EXISTS chart_config (
                id INTEGER NOT NULL PRIMARY KEY,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE UNIQUE INDEX IF NOT EXISTS ix_chart_config_key ON chart_config (key);
            CREATE INDEX IF NOT EXISTS ix_chart_config_id ON chart_config (id);
            """
        ))
        
        return migrations
    
    def _ensure_db_exists(self):
        """确保数据库文件存在"""
        if not os.path.exists(self.db_path):
            # 创建空数据库文件
            conn = sqlite3.connect(self.db_path)
            conn.close()
    
    def _get_applied_migrations(self) -> List[int]:
        """获取已应用的迁移版本列表"""
        self._ensure_db_exists()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT version FROM migrations ORDER BY version")
            versions = [row[0] for row in cursor.fetchall()]
            return versions
        except sqlite3.OperationalError:
            # migrations表不存在，返回空列表
            return []
        finally:
            conn.close()
    
    def _apply_migration(self, migration: Migration):
        """应用单个迁移"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 执行迁移SQL
            for sql_statement in migration.up_sql.strip().split(';'):
                sql_statement = sql_statement.strip()
                if sql_statement:
                    cursor.execute(sql_statement)
            
            # 记录迁移
            cursor.execute(
                "INSERT INTO migrations (version, description) VALUES (?, ?)",
                (migration.version, migration.description)
            )
            
            conn.commit()
            print(f"✓ Applied migration {migration.version}: {migration.description}")
            
        except Exception as e:
            conn.rollback()
            print(f"✗ Error applying migration {migration.version}: {e}")
            raise
        finally:
            conn.close()
    
    def migrate(self):
        """执行所有待应用的迁移"""
        applied_versions = self._get_applied_migrations()
        
        print(f"Current database: {self.db_path}")
        print(f"Applied migrations: {applied_versions}")
        
        pending_migrations = [
            m for m in self.migrations 
            if m.version not in applied_versions
        ]
        
        if not pending_migrations:
            print("✓ No pending migrations")
            return
        
        print(f"Pending migrations: {[m.version for m in pending_migrations]}")
        
        for migration in pending_migrations:
            self._apply_migration(migration)
        
        print("✓ All migrations completed successfully")
    
    def status(self):
        """显示迁移状态"""
        applied_versions = self._get_applied_migrations()
        
        print(f"Database: {self.db_path}")
        print("Migration Status:")
        print("-" * 50)
        
        for migration in self.migrations:
            status = "✓ Applied" if migration.version in applied_versions else "✗ Pending"
            print(f"  {migration.version:3d}: {status} - {migration.description}")

def migrate_database():
    """主迁移函数"""
    manager = MigrationManager()
    manager.migrate()

def migration_status():
    """显示迁移状态"""
    manager = MigrationManager()
    manager.status()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        migration_status()
    else:
        migrate_database() 