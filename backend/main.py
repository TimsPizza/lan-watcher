import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from typing import List, Optional
from datetime import datetime, date
import uvicorn
import json

from service.services import device_service, scan_config_service
from storage.file_storage import (
    Device,
    ScanRecord,
    ScanSession,
    AppSettings,
    ChartConfig,
    file_storage,
)
from models.oui_parser import init_oui_database
from models.scan_config import ScanConfig
from pydantic import BaseModel

# 创建FastAPI应用
app = FastAPI(
    title="LAN Device Tracker", description="局域网设备追踪器API", version="1.0.0"
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
    device_id: str
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


class ScanConfigModel(BaseModel):
    # 网络配置
    subnet_cidr: Optional[str] = None
    auto_detect_subnet: bool = True
    exclude_ips: List[str] = []

    # 性能参数
    scan_rate: int = 100
    max_workers: int = 50
    scan_timeout: str = "3s"
    max_retries: int = 2

    # 功能开关
    resolve_hostnames: bool = True
    fetch_vendor_info: bool = True
    arp_lookup_enabled: bool = True
    fallback_enabled: bool = True

    # 高级选项
    ping_methods: List[str] = ["icmp", "tcp_syn"]
    tcp_ping_ports: List[int] = [22, 80, 443]
    ack_ping_ports: List[int] = [80]

    # 扫描类型配置
    enable_port_scan: bool = False
    port_range: str = "1-1000"


class ConfigValidationResult(BaseModel):
    valid: bool
    errors: List[str] = []


class NetworkTestResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    network_address: Optional[str] = None
    broadcast_address: Optional[str] = None
    num_hosts: Optional[int] = None
    prefix_length: Optional[int] = None


class PresetInfo(BaseModel):
    name: str
    display_name: str
    description: str


@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    global periodic_scan_task

    # 初始化文件存储系统
    try:
        print("Initializing file storage system...")
        file_storage.cleanup()  # 清理过期数据
        print("File storage system ready")
    except Exception as e:
        print(f"Warning: File storage initialization failed: {e}")

    # 初始化OUI数据库（如果需要）
    try:
        print("Initializing OUI database...")
        count = init_oui_database()
        print(f"OUI database ready with {count} records")
    except Exception as e:
        print(f"Warning: Could not initialize OUI database: {e}")

    # 初始化扫描器配置
    try:
        from scanner.scanner import init_scanner_config

        init_scanner_config()
        print("Scanner configuration initialized")
    except Exception as e:
        print(f"Warning: Could not initialize scanner config: {e}")

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
    return "hello"


# API路由
@app.get("/api/devices")
async def get_devices():
    """获取所有设备列表"""
    devices = device_service.get_all_devices()
    return devices


@app.get("/api/devices/online")
async def get_online_devices():
    """获取在线设备列表"""
    devices = device_service.get_online_devices()
    return devices


@app.get("/api/devices/{device_id}")
async def get_device(device_id: str):
    """获取单个设备详情"""
    device = device_service.get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.get("/api/devices/{device_id}/history")
async def get_device_history(device_id: str, hours: int = 24):
    """获取设备历史记录"""
    device = device_service.get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    history = device_service.get_device_history(device_id, hours)
    return history


@app.post("/api/scan")
async def scan_network(
    subnet: Optional[str] = None,
    scan_type: str = "ping",
    background_tasks: BackgroundTasks = None,
):
    """手动触发网络扫描"""
    # 检查是否已有扫描在进行
    if device_service.scanning:
        return {"status": "error", "message": "Scan already in progress"}

    # 在后台任务中执行扫描，避免阻塞API响应
    background_tasks.add_task(device_service.scan_network_sync, subnet, scan_type)

    return {
        "status": "started",
        "message": "Scan started in background",
        "subnet": subnet,
        "scan_type": scan_type,
    }


@app.get("/api/stats")
async def get_network_stats():
    """获取网络统计信息"""
    stats = device_service.get_network_stats()
    return stats


@app.get("/api/scan-sessions")
async def get_scan_sessions(limit: int = 10):
    """获取扫描会话历史"""
    sessions = device_service.get_scan_sessions(limit)
    return sessions


@app.get("/api/scan-status")
async def get_scan_status():
    """获取当前扫描状态"""
    return {
        "scanning": device_service.scanning,
        "scan_interval": device_service.scan_interval,
        "last_scan_time": device_service.last_scan_time,
    }


class ScanIntervalRequest(BaseModel):
    interval: int


@app.post("/api/scan-interval")
async def set_scan_interval(request: ScanIntervalRequest):
    """设置扫描间隔（秒）"""
    if request.interval < 60:
        raise HTTPException(
            status_code=400, detail="Scan interval must be at least 60 seconds"
        )

    device_service.scan_interval = request.interval
    return {"status": "success", "scan_interval": request.interval}


@app.put("/api/devices/{device_id}/alias")
async def update_device_alias(device_id: str, alias_data: DeviceAliasUpdate):
    """更新设备别名"""
    try:
        device = device_service.update_device_alias(device_id, alias_data.custom_name)
        return {"status": "success", "device": device}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.put("/api/devices/mac/{mac_address}/alias")
async def update_device_alias_by_mac(mac_address: str, alias_data: DeviceAliasUpdate):
    """通过MAC地址更新设备别名"""
    try:
        device = device_service.update_device_alias_by_mac(
            mac_address, alias_data.custom_name
        )
        return {"status": "success", "device": device}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/devices/search")
async def search_devices(q: str):
    """搜索设备"""
    if not q or len(q.strip()) < 2:
        raise HTTPException(
            status_code=400, detail="Query must be at least 2 characters"
        )

    devices = device_service.search_devices(q.strip())
    return devices


@app.get("/api/oui/{mac_address}")
async def lookup_vendor(mac_address: str):
    """根据MAC地址查找厂商信息"""
    try:
        from models.oui_parser import oui_parser

        # 确保OUI缓存已加载
        cache = oui_parser._load_cache()
        if not cache:
            # 如果缓存为空，尝试重新导入
            oui_parser.import_to_cache()
            cache = oui_parser._load_cache()

        vendor = oui_parser.lookup_vendor(mac_address)
        if vendor:
            return {"mac_address": mac_address, "vendor": vendor}
        else:
            raise HTTPException(status_code=404, detail="Vendor not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/timeline/{date_str}", response_model=DayTimelineData)
async def get_timeline_data(date_str: str):
    """获取指定日期的设备时间线数据"""
    try:
        # 解析日期字符串
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_of_day = datetime.combine(target_date, datetime.min.time()).isoformat()
        end_of_day = datetime.combine(target_date, datetime.max.time()).isoformat()

        # 获取所有设备
        devices = device_service.get_all_devices()

        timeline_devices = []
        for device in devices:
            # 获取该设备在指定日期的扫描记录
            all_records = device_service.get_device_history(
                device.id, 24 * 7
            )  # 获取一周数据确保覆盖

            # 过滤指定日期的记录
            scan_records = [
                record
                for record in all_records
                if start_of_day <= record.scan_time <= end_of_day
            ]

            # 构建在线时间段
            online_periods = []
            if scan_records:
                # 按时间正序排序（重要！）
                scan_records.sort(key=lambda x: x.scan_time)
                
                current_period_start = None
                last_status = None

                for record in scan_records:
                    if record.is_online and last_status != True:
                        # 开始在线时段
                        current_period_start = record.scan_time
                    elif (
                        not record.is_online
                        and last_status == True
                        and current_period_start
                    ):
                        # 结束在线时段
                        online_periods.append(
                            {
                                "start_time": current_period_start,
                                "end_time": record.scan_time,
                            }
                        )
                        current_period_start = None

                    last_status = record.is_online

                # 如果最后一个记录是在线状态，且时段还没结束
                if last_status == True and current_period_start:
                    online_periods.append(
                        {
                            "start_time": current_period_start,
                            "end_time": None,  # 表示仍在线
                        }
                    )

            timeline_devices.append(
                DayTimelineDevice(
                    device_id=device.id,
                    device_name=device.custom_name
                    or device.hostname
                    or device.ip_address,
                    ip_address=device.ip_address,
                    online_periods=online_periods,
                )
            )

        return DayTimelineData(date=date_str, devices=timeline_devices)

    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings", response_model=AppSettingsModel)
async def get_app_settings():
    """获取应用设置"""
    try:
        settings = file_storage.get_settings()
        return AppSettingsModel(
            data_retention_days=settings.data_retention_days,
            scan_interval_minutes=settings.scan_interval_minutes,
            auto_scan_enabled=settings.auto_scan_enabled,
            chart_refresh_interval_seconds=settings.chart_refresh_interval_seconds,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/settings", response_model=AppSettingsModel)
async def update_app_settings(settings: AppSettingsModel):
    """更新应用设置"""
    try:
        # 创建新的设置对象
        new_settings = AppSettings(
            data_retention_days=settings.data_retention_days,
            scan_interval_minutes=settings.scan_interval_minutes,
            auto_scan_enabled=settings.auto_scan_enabled,
            chart_refresh_interval_seconds=settings.chart_refresh_interval_seconds,
        )

        # 保存设置
        file_storage.update_settings(new_settings)

        # 如果扫描间隔发生变化，更新服务
        device_service.scan_interval = settings.scan_interval_minutes * 60

        return settings

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chart-config", response_model=ChartConfigModel)
async def get_chart_config():
    """获取图表配置"""
    try:
        config = file_storage.get_chart_config()
        return ChartConfigModel(
            show_offline_periods=config.show_offline_periods,
            time_format=config.time_format,
            device_sort_order=config.device_sort_order,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chart-config", response_model=ChartConfigModel)
async def update_chart_config(config: ChartConfigModel):
    """更新图表配置"""
    try:
        # 创建新的配置对象
        new_config = ChartConfig(
            show_offline_periods=config.show_offline_periods,
            time_format=config.time_format,
            device_sort_order=config.device_sort_order,
        )

        # 保存配置
        file_storage.update_chart_config(new_config)
        return config

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== 扫描配置管理 API =====


@app.get("/api/scan-config", response_model=ScanConfigModel)
async def get_scan_config():
    """获取当前扫描配置"""
    try:
        config = scan_config_service.get_scan_config()
        return ScanConfigModel(
            subnet_cidr=config.subnet_cidr,
            auto_detect_subnet=config.auto_detect_subnet,
            exclude_ips=config.exclude_ips,
            scan_rate=config.scan_rate,
            max_workers=config.max_workers,
            scan_timeout=config.scan_timeout,
            max_retries=config.max_retries,
            resolve_hostnames=config.resolve_hostnames,
            fetch_vendor_info=config.fetch_vendor_info,
            arp_lookup_enabled=config.arp_lookup_enabled,
            fallback_enabled=config.fallback_enabled,
            ping_methods=config.ping_methods,
            tcp_ping_ports=config.tcp_ping_ports,
            ack_ping_ports=config.ack_ping_ports,
            enable_port_scan=config.enable_port_scan,
            port_range=config.port_range,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/scan-config", response_model=ScanConfigModel)
async def update_scan_config(config: ScanConfigModel):
    """更新扫描配置"""
    try:
        # 转换为ScanConfig对象
        scan_config = ScanConfig(
            subnet_cidr=config.subnet_cidr,
            auto_detect_subnet=config.auto_detect_subnet,
            exclude_ips=config.exclude_ips,
            scan_rate=config.scan_rate,
            max_workers=config.max_workers,
            scan_timeout=config.scan_timeout,
            max_retries=config.max_retries,
            resolve_hostnames=config.resolve_hostnames,
            fetch_vendor_info=config.fetch_vendor_info,
            arp_lookup_enabled=config.arp_lookup_enabled,
            fallback_enabled=config.fallback_enabled,
            ping_methods=config.ping_methods,
            tcp_ping_ports=config.tcp_ping_ports,
            ack_ping_ports=config.ack_ping_ports,
            enable_port_scan=config.enable_port_scan,
            port_range=config.port_range,
        )

        # 保存配置
        updated_config = scan_config_service.update_scan_config(scan_config)
        return config

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan-config/presets", response_model=List[PresetInfo])
async def get_scan_presets():
    """获取可用的预设配置列表"""
    try:
        return scan_config_service.get_available_presets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan-config/presets/{preset_name}", response_model=ScanConfigModel)
async def load_scan_preset(preset_name: str):
    """加载预设配置"""
    try:
        config = scan_config_service.load_preset(preset_name)
        return ScanConfigModel(
            subnet_cidr=config.subnet_cidr,
            auto_detect_subnet=config.auto_detect_subnet,
            exclude_ips=config.exclude_ips,
            scan_rate=config.scan_rate,
            max_workers=config.max_workers,
            scan_timeout=config.scan_timeout,
            max_retries=config.max_retries,
            resolve_hostnames=config.resolve_hostnames,
            fetch_vendor_info=config.fetch_vendor_info,
            arp_lookup_enabled=config.arp_lookup_enabled,
            fallback_enabled=config.fallback_enabled,
            ping_methods=config.ping_methods,
            tcp_ping_ports=config.tcp_ping_ports,
            ack_ping_ports=config.ack_ping_ports,
            enable_port_scan=config.enable_port_scan,
            port_range=config.port_range,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scan-config/validate", response_model=ConfigValidationResult)
async def validate_scan_config(config: ScanConfigModel):
    """验证扫描配置"""
    try:
        config_dict = config.dict()
        result = scan_config_service.validate_config(config_dict)
        return ConfigValidationResult(valid=result["valid"], errors=result["errors"])
    except Exception as e:
        return ConfigValidationResult(valid=False, errors=[str(e)])


@app.post("/api/scan-config/test-network", response_model=NetworkTestResult)
async def test_network_config(subnet_cidr: str):
    """测试网络配置"""
    try:
        result = scan_config_service.test_network_config(subnet_cidr)
        return NetworkTestResult(**result)
    except Exception as e:
        return NetworkTestResult(valid=False, error=str(e))


if __name__ == "__main__":
    import os

    # 从环境变量获取配置，支持自定义监听地址
    host = os.getenv("LAN_WATCHER_HOST", "127.0.0.1")
    port = int(os.getenv("LAN_WATCHER_PORT", "8000"))
    reload = os.getenv("LAN_WATCHER_RELOAD", "true").lower() == "true"

    print(f"Starting LAN Watcher on {host}:{port}")
    print(f"Reload mode: {reload}")

    uvicorn.run("main:app", host=host, port=port, reload=reload)
