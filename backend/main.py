import asyncio
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import uvicorn
import json

from database.database import get_db, create_tables
from service.services import device_service
from models.models import Device, ScanRecord, ScanSession, AppSettings, ChartConfig
from models.oui_parser import init_oui_database
from pydantic import BaseModel

# 创建FastAPI应用
app = FastAPI(
    title="LAN Device Tracker",
    description="局域网设备追踪器API",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局任务标志
periodic_scan_task = None

# Pydantic模型
class DeviceAliasUpdate(BaseModel):
    custom_name: str

class DeviceSearchQuery(BaseModel):
    query: str

class NetworkStats(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    recent_scans: int

class ScanResult(BaseModel):
    status: str
    message: Optional[str] = None
    subnet: Optional[str] = None
    devices_found: Optional[int] = None
    scan_type: Optional[str] = None
    duration: Optional[float] = None

class DeviceOnlinePeriod(BaseModel):
    start_time: str
    end_time: Optional[str] = None

class DayTimelineDevice(BaseModel):
    device_id: int
    device_name: str
    ip_address: str
    online_periods: List[DeviceOnlinePeriod]

class DayTimelineData(BaseModel):
    date: str
    devices: List[DayTimelineDevice]

class AppSettingsModel(BaseModel):
    data_retention_days: int
    scan_interval_minutes: int
    auto_scan_enabled: bool
    chart_refresh_interval_seconds: int

class ChartConfigModel(BaseModel):
    show_offline_periods: bool
    time_format: str  # '12h' or '24h'
    device_sort_order: str  # 'name', 'ip', or 'last_seen'

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    global periodic_scan_task
    
    # 运行数据库迁移
    try:
        from database.migrations import migrate_database
        migrate_database()
    except Exception as e:
        print(f"Warning: Database migration failed: {e}")
    
    # 创建数据库表
    create_tables()
    
    # 初始化OUI数据库（如果需要）
    try:
        print("Initializing OUI database...")
        count = init_oui_database()
        print(f"OUI database ready with {count} records")
    except Exception as e:
        print(f"Warning: Could not initialize OUI database: {e}")
    
    # 启动周期性扫描任务
    periodic_scan_task = asyncio.create_task(device_service.start_periodic_scan())
    print("Periodic scan task started")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    global periodic_scan_task
    
    if periodic_scan_task:
        periodic_scan_task.cancel()
        try:
            await periodic_scan_task
        except asyncio.CancelledError:
            print("Periodic scan task cancelled")

@app.get("/")
async def root():
    """根路径，返回简单的HTML页面"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>LAN Device Tracker</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .card { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .online { border-left: 4px solid #4CAF50; }
            .offline { border-left: 4px solid #f44336; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
            button:hover { background: #0056b3; }
            .stats { display: flex; gap: 20px; margin: 20px 0; }
            .stat-card { background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center; }
        </style>
    </head>
    <body>
        <h1>局域网设备追踪器</h1>
        <div class="stats" id="stats"></div>
        <button onclick="scanNetwork()">立即扫描</button>
        <button onclick="loadDevices()">刷新设备列表</button>
        <div id="status"></div>
        <div id="devices"></div>

        <script>
            async function loadStats() {
                try {
                    const response = await fetch('/api/stats');
                    const stats = await response.json();
                    document.getElementById('stats').innerHTML = `
                        <div class="stat-card">
                            <h3>${stats.total_devices}</h3>
                            <p>总设备数</p>
                        </div>
                        <div class="stat-card">
                            <h3>${stats.online_devices}</h3>
                            <p>在线设备</p>
                        </div>
                        <div class="stat-card">
                            <h3>${stats.offline_devices}</h3>
                            <p>离线设备</p>
                        </div>
                        <div class="stat-card">
                            <h3>${stats.recent_scans}</h3>
                            <p>最近扫描次数</p>
                        </div>
                    `;
                } catch (error) {
                    console.error('加载统计数据失败:', error);
                }
            }

            async function loadDevices() {
                try {
                    const response = await fetch('/api/devices');
                    const devices = await response.json();
                    
                    const devicesHtml = devices.map(device => `
                        <div class="card ${device.is_online ? 'online' : 'offline'}">
                            <h3>${device.custom_name || device.hostname || device.ip_address}</h3>
                            ${device.custom_name ? `<p><strong>自定义名称:</strong> ${device.custom_name}</p>` : ''}
                            <p><strong>IP:</strong> ${device.ip_address}</p>
                            <p><strong>MAC:</strong> ${device.mac_address || '未知'}</p>
                            <p><strong>主机名:</strong> ${device.hostname || '未知'}</p>
                            <p><strong>厂商:</strong> ${device.vendor || '未知'}</p>
                            <p><strong>状态:</strong> ${device.is_online ? '在线' : '离线'}</p>
                            <p><strong>最后见到:</strong> ${new Date(device.last_seen).toLocaleString()}</p>
                            <button onclick="editAlias(${device.id}, '${device.custom_name || ''}')">设置别名</button>
                        </div>
                    `).join('');
                    
                    document.getElementById('devices').innerHTML = devicesHtml;
                    await loadStats();
                } catch (error) {
                    document.getElementById('devices').innerHTML = '<p>加载设备列表失败</p>';
                    console.error('加载设备失败:', error);
                }
            }

            async function scanNetwork() {
                document.getElementById('status').innerHTML = '<p>正在扫描网络...</p>';
                try {
                    const response = await fetch('/api/scan', { method: 'POST' });
                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        document.getElementById('status').innerHTML = `
                            <p>扫描完成！发现 ${result.devices_found} 个设备，耗时 ${result.duration.toFixed(2)} 秒</p>
                        `;
                        await loadDevices();
                    } else {
                        document.getElementById('status').innerHTML = `<p>扫描失败: ${result.message}</p>`;
                    }
                } catch (error) {
                    document.getElementById('status').innerHTML = '<p>扫描请求失败</p>';
                    console.error('扫描失败:', error);
                }
            }

            async function editAlias(deviceId, currentName) {
                const newName = prompt('请输入设备别名:', currentName);
                if (newName !== null) {
                    try {
                        const response = await fetch(`/api/devices/${deviceId}/alias`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({custom_name: newName})
                        });
                        
                        if (response.ok) {
                            await loadDevices();
                        } else {
                            alert('设置别名失败');
                        }
                    } catch (error) {
                        alert('设置别名失败: ' + error.message);
                    }
                }
            }

            // 页面加载时自动加载设备列表
            loadDevices();
            
            // 每30秒刷新一次数据
            setInterval(loadDevices, 30000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# API路由
@app.get("/api/devices")
async def get_devices(db: Session = Depends(get_db)):
    """获取所有设备列表"""
    devices = device_service.get_all_devices(db)
    return devices

@app.get("/api/devices/online")
async def get_online_devices(db: Session = Depends(get_db)):
    """获取在线设备列表"""
    devices = device_service.get_online_devices(db)
    return devices

@app.get("/api/devices/{device_id}")
async def get_device(device_id: int, db: Session = Depends(get_db)):
    """获取单个设备详情"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@app.get("/api/devices/{device_id}/history")
async def get_device_history(
    device_id: int, 
    hours: int = 24, 
    db: Session = Depends(get_db)
):
    """获取设备历史记录"""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    history = device_service.get_device_history(db, device_id, hours)
    return history

@app.post("/api/scan")
async def scan_network(
    subnet: Optional[str] = None,
    scan_type: str = "ping",
    background_tasks: BackgroundTasks = None
):
    """手动触发网络扫描"""
    result = await device_service.scan_network(subnet, scan_type)
    return result

@app.get("/api/stats")
async def get_network_stats(db: Session = Depends(get_db)):
    """获取网络统计信息"""
    stats = device_service.get_network_stats(db)
    return stats

@app.get("/api/scan-sessions")
async def get_scan_sessions(limit: int = 10, db: Session = Depends(get_db)):
    """获取扫描会话历史"""
    sessions = device_service.get_scan_sessions(db, limit)
    return sessions

@app.get("/api/scan-status")
async def get_scan_status():
    """获取当前扫描状态"""
    return {
        "scanning": device_service.scanning,
        "scan_interval": device_service.scan_interval
    }

class ScanIntervalRequest(BaseModel):
    interval: int

@app.post("/api/scan-interval")
async def set_scan_interval(request: ScanIntervalRequest):
    """设置扫描间隔（秒）"""
    if request.interval < 60:
        raise HTTPException(status_code=400, detail="Scan interval must be at least 60 seconds")
    
    device_service.scan_interval = request.interval
    return {"status": "success", "scan_interval": request.interval}

@app.put("/api/devices/{device_id}/alias")
async def update_device_alias(
    device_id: int, 
    alias_data: DeviceAliasUpdate,
    db: Session = Depends(get_db)
):
    """更新设备别名"""
    try:
        device = device_service.update_device_alias(db, device_id, alias_data.custom_name)
        return {"status": "success", "device": device}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.put("/api/devices/mac/{mac_address}/alias")
async def update_device_alias_by_mac(
    mac_address: str, 
    alias_data: DeviceAliasUpdate,
    db: Session = Depends(get_db)
):
    """通过MAC地址更新设备别名"""
    try:
        device = device_service.update_device_alias_by_mac(db, mac_address, alias_data.custom_name)
        return {"status": "success", "device": device}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/devices/search")
async def search_devices(q: str, db: Session = Depends(get_db)):
    """搜索设备"""
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    
    devices = device_service.search_devices(db, q.strip())
    return devices

@app.get("/api/oui/{mac_address}")
async def lookup_vendor(mac_address: str):
    """根据MAC地址查找厂商信息"""
    try:
        from models.oui_parser import oui_parser
        vendor = oui_parser.lookup_vendor(mac_address)
        if vendor:
            return {"mac_address": mac_address, "vendor": vendor}
        else:
            raise HTTPException(status_code=404, detail="Vendor not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/timeline/{date_str}", response_model=DayTimelineData)
async def get_timeline_data(date_str: str, db: Session = Depends(get_db)):
    """获取指定日期的设备时间线数据"""
    try:
        # 解析日期字符串
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # 获取所有设备
        devices = db.query(Device).all()
        
        timeline_devices = []
        for device in devices:
            # 获取该设备在指定日期的扫描记录
            start_of_day = datetime.combine(target_date, datetime.min.time())
            end_of_day = datetime.combine(target_date, datetime.max.time())
            
            scan_records = db.query(ScanRecord).filter(
                ScanRecord.device_id == device.id,
                ScanRecord.scan_time >= start_of_day,
                ScanRecord.scan_time <= end_of_day
            ).order_by(ScanRecord.scan_time).all()
            
            # 构建在线时间段
            online_periods = []
            if scan_records:
                current_period_start = None
                last_status = None
                
                for record in scan_records:
                    if record.is_online and last_status != True:
                        # 开始在线时段
                        current_period_start = record.scan_time.isoformat()
                    elif not record.is_online and last_status == True and current_period_start:
                        # 结束在线时段
                        online_periods.append({
                            "start_time": current_period_start,
                            "end_time": record.scan_time.isoformat()
                        })
                        current_period_start = None
                    
                    last_status = record.is_online
                
                # 如果最后一个记录是在线状态，且时段还没结束
                if last_status == True and current_period_start:
                    online_periods.append({
                        "start_time": current_period_start,
                        "end_time": None  # 表示仍在线
                    })
            
            timeline_devices.append(DayTimelineDevice(
                device_id=device.id,
                device_name=device.custom_name or device.hostname or device.ip_address,
                ip_address=device.ip_address,
                online_periods=online_periods
            ))
        
        return DayTimelineData(
            date=date_str,
            devices=timeline_devices
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings", response_model=AppSettingsModel)
async def get_app_settings(db: Session = Depends(get_db)):
    """获取应用设置"""
    try:
        # 默认设置
        default_settings = {
            "data_retention_days": 30,
            "scan_interval_minutes": 5,
            "auto_scan_enabled": True,
            "chart_refresh_interval_seconds": 30
        }
        
        # 从数据库获取设置
        settings = {}
        for key in default_settings.keys():
            setting = db.query(AppSettings).filter(AppSettings.key == key).first()
            if setting:
                # 尝试解析为适当的类型
                try:
                    if key in ["data_retention_days", "scan_interval_minutes", "chart_refresh_interval_seconds"]:
                        settings[key] = int(setting.value)
                    elif key == "auto_scan_enabled":
                        settings[key] = setting.value.lower() == "true"
                    else:
                        settings[key] = setting.value
                except:
                    settings[key] = default_settings[key]
            else:
                settings[key] = default_settings[key]
        
        return AppSettingsModel(**settings)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings", response_model=AppSettingsModel)
async def update_app_settings(settings: AppSettingsModel, db: Session = Depends(get_db)):
    """更新应用设置"""
    try:
        settings_dict = settings.dict()
        
        for key, value in settings_dict.items():
            # 查找现有设置
            existing_setting = db.query(AppSettings).filter(AppSettings.key == key).first()
            
            if existing_setting:
                existing_setting.value = str(value)
                existing_setting.updated_at = datetime.utcnow()
            else:
                new_setting = AppSettings(key=key, value=str(value))
                db.add(new_setting)
        
        db.commit()
        
        # 如果扫描间隔发生变化，更新服务
        if hasattr(device_service, 'scan_interval'):
            device_service.scan_interval = settings.scan_interval_minutes * 60
        
        return settings
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chart-config", response_model=ChartConfigModel)
async def get_chart_config(db: Session = Depends(get_db)):
    """获取图表配置"""
    try:
        # 默认配置
        default_config = {
            "show_offline_periods": True,
            "time_format": "24h",
            "device_sort_order": "name"
        }
        
        # 从数据库获取配置
        config = {}
        for key in default_config.keys():
            setting = db.query(ChartConfig).filter(ChartConfig.key == key).first()
            if setting:
                if key == "show_offline_periods":
                    config[key] = setting.value.lower() == "true"
                else:
                    config[key] = setting.value
            else:
                config[key] = default_config[key]
        
        return ChartConfigModel(**config)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/chart-config", response_model=ChartConfigModel)
async def update_chart_config(config: ChartConfigModel, db: Session = Depends(get_db)):
    """更新图表配置"""
    try:
        config_dict = config.dict()
        
        for key, value in config_dict.items():
            # 查找现有配置
            existing_config = db.query(ChartConfig).filter(ChartConfig.key == key).first()
            
            if existing_config:
                existing_config.value = str(value)
                existing_config.updated_at = datetime.utcnow()
            else:
                new_config = ChartConfig(key=key, value=str(value))
                db.add(new_config)
        
        db.commit()
        return config
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import os
    
    # 从环境变量获取配置，支持自定义监听地址
    host = os.getenv("LAN_WATCHER_HOST", "127.0.0.1")
    port = int(os.getenv("LAN_WATCHER_PORT", "8000"))
    reload = os.getenv("LAN_WATCHER_RELOAD", "true").lower() == "true"
    
    print(f"Starting LAN Watcher on {host}:{port}")
    print(f"Reload mode: {reload}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload
    )
