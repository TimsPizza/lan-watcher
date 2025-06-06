import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import threading
import uuid
import sys
import os

# 添加父目录到路径以导入模型
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.scan_config import ScanConfig, ScanPresets

@dataclass
class Device:
    """设备信息"""
    id: str
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    custom_name: Optional[str] = None
    first_seen: str = None
    last_seen: str = None
    is_online: bool = False
    open_ports: List[int] = None
    
    def __post_init__(self):
        if self.open_ports is None:
            self.open_ports = []
        if self.first_seen is None:
            self.first_seen = datetime.utcnow().isoformat()
        if self.last_seen is None:
            self.last_seen = datetime.utcnow().isoformat()

@dataclass 
class ScanRecord:
    """扫描记录"""
    id: str
    device_id: str
    scan_time: str
    is_online: bool
    response_time: Optional[int] = None
    
    def __post_init__(self):
        if self.scan_time is None:
            self.scan_time = datetime.utcnow().isoformat()

@dataclass
class ScanSession:
    """扫描会话"""
    id: str
    start_time: str
    end_time: Optional[str] = None
    subnet: Optional[str] = None
    devices_found: int = 0
    scan_type: str = "ping"
    
    def __post_init__(self):
        if self.start_time is None:
            self.start_time = datetime.utcnow().isoformat()

@dataclass
class AppSettings:
    """应用设置"""
    data_retention_days: int = 30
    scan_interval_minutes: int = 5
    auto_scan_enabled: bool = True
    chart_refresh_interval_seconds: int = 30

@dataclass
class ChartConfig:
    """图表配置"""
    show_offline_periods: bool = True
    time_format: str = "24h"  # '12h' or '24h'
    device_sort_order: str = "name"  # 'name', 'ip', or 'last_seen'

class FileStorage:
    """基于文件的数据存储"""
    
    def __init__(self, storage_dir: str = "storage/data"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据文件路径
        self.devices_file = self.storage_dir / "devices.json"
        self.scan_records_file = self.storage_dir / "scan_records.json"
        self.scan_sessions_file = self.storage_dir / "scan_sessions.json"
        self.settings_file = self.storage_dir / "settings.json"
        self.chart_config_file = self.storage_dir / "chart_config.json"
        self.scan_config_file = self.storage_dir / "scan_config.json"
        
        # 线程锁
        self._lock = threading.RLock()
        
        # 初始化文件
        self._init_files()
    
    def _init_files(self):
        """初始化数据文件"""
        # 设备文件
        if not self.devices_file.exists():
            self._save_json(self.devices_file, {})
        
        # 扫描记录文件
        if not self.scan_records_file.exists():
            self._save_json(self.scan_records_file, [])
        
        # 扫描会话文件
        if not self.scan_sessions_file.exists():
            self._save_json(self.scan_sessions_file, [])
        
        # 设置文件
        if not self.settings_file.exists():
            self._save_json(self.settings_file, asdict(AppSettings()))
        
        # 图表配置文件
        if not self.chart_config_file.exists():
            self._save_json(self.chart_config_file, asdict(ChartConfig()))
        
        # 扫描配置文件 - 使用默认的平衡模式
        if not self.scan_config_file.exists():
            self._save_json(self.scan_config_file, asdict(ScanPresets.balanced()))
    
    def _load_json(self, file_path: Path) -> Any:
        """加载JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {} if file_path.name in ['devices.json', 'settings.json', 'chart_config.json', 'scan_config.json'] else []
    
    def _save_json(self, file_path: Path, data: Any):
        """保存JSON文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _clean_old_records(self):
        """清理过期记录"""
        try:
            settings = self.get_settings()
            retention_days = settings.data_retention_days
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            cutoff_iso = cutoff_date.isoformat()
            
            # 清理扫描记录
            records = self._load_json(self.scan_records_file)
            filtered_records = [
                record for record in records 
                if record.get('scan_time', '') > cutoff_iso
            ]
            if len(filtered_records) < len(records):
                self._save_json(self.scan_records_file, filtered_records)
            
            # 清理扫描会话
            sessions = self._load_json(self.scan_sessions_file)
            filtered_sessions = [
                session for session in sessions 
                if session.get('start_time', '') > cutoff_iso
            ]
            if len(filtered_sessions) < len(sessions):
                self._save_json(self.scan_sessions_file, filtered_sessions)
                
        except Exception as e:
            print(f"清理过期记录时出错: {e}")
    
    # 设备相关操作
    def get_device_by_ip(self, ip: str) -> Optional[Device]:
        """根据IP获取设备"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            for device_data in devices_data.values():
                if device_data.get('ip_address') == ip:
                    return Device(**device_data)
            return None
    
    def get_device_by_id(self, device_id: str) -> Optional[Device]:
        """根据ID获取设备"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            device_data = devices_data.get(device_id)
            if device_data:
                return Device(**device_data)
            return None
    
    def get_all_devices(self, skip: int = 0, limit: int = 100) -> List[Device]:
        """获取所有设备"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            devices = [Device(**data) for data in devices_data.values()]
            # 按最后见到时间排序
            devices.sort(key=lambda x: x.last_seen, reverse=True)
            return devices[skip:skip+limit]
    
    def get_online_devices(self) -> List[Device]:
        """获取在线设备"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            online_devices = []
            for data in devices_data.values():
                if data.get('is_online', False):
                    online_devices.append(Device(**data))
            return online_devices
    
    def create_or_update_device(self, device_info) -> Device:
        """创建或更新设备信息"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            
            # 查找现有设备
            existing_device_id = None
            for device_id, device_data in devices_data.items():
                if device_data.get('ip_address') == device_info.ip:
                    existing_device_id = device_id
                    break
            
            current_time = datetime.utcnow().isoformat()
            
            if existing_device_id:
                # 更新现有设备
                device_data = devices_data[existing_device_id]
                device_data['last_seen'] = current_time
                device_data['is_online'] = device_info.is_online
                
                # 只在没有值时更新这些字段
                if device_info.mac and not device_data.get('mac_address'):
                    device_data['mac_address'] = device_info.mac
                if device_info.hostname and not device_data.get('hostname'):
                    device_data['hostname'] = device_info.hostname
                if device_info.vendor and not device_data.get('vendor'):
                    device_data['vendor'] = device_info.vendor
                if device_info.open_ports:
                    device_data['open_ports'] = device_info.open_ports
                
                device = Device(**device_data)
            else:
                # 创建新设备
                device_id = self._generate_id()
                device_data = {
                    'id': device_id,
                    'ip_address': device_info.ip,
                    'mac_address': device_info.mac,
                    'hostname': device_info.hostname,
                    'vendor': device_info.vendor,
                    'is_online': device_info.is_online,
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'open_ports': device_info.open_ports or [],
                    'custom_name': None,
                    'device_type': None
                }
                devices_data[device_id] = device_data
                device = Device(**device_data)
            
            # 保存设备数据
            self._save_json(self.devices_file, devices_data)
            
            # 创建扫描记录
            self.add_scan_record(ScanRecord(
                id=self._generate_id(),
                device_id=device.id,
                scan_time=current_time,
                is_online=device_info.is_online,
                response_time=device_info.response_time
            ))
            
            return device
    
    def mark_device_offline(self, device: Device):
        """标记设备为离线"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            if device.id in devices_data:
                devices_data[device.id]['is_online'] = False
                devices_data[device.id]['last_seen'] = datetime.utcnow().isoformat()
                self._save_json(self.devices_file, devices_data)
                
                # 添加离线记录
                self.add_scan_record(ScanRecord(
                    id=self._generate_id(),
                    device_id=device.id,
                    scan_time=datetime.utcnow().isoformat(),
                    is_online=False
                ))
    
    def update_device_alias(self, device_id: str, custom_name: str) -> Optional[Device]:
        """更新设备自定义别名"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            if device_id in devices_data:
                devices_data[device_id]['custom_name'] = custom_name.strip() if custom_name else None
                self._save_json(self.devices_file, devices_data)
                return Device(**devices_data[device_id])
            return None
    
    def update_device_alias_by_mac(self, mac_address: str, custom_name: str) -> Optional[Device]:
        """通过MAC地址更新设备别名"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            for device_id, device_data in devices_data.items():
                if device_data.get('mac_address') == mac_address:
                    device_data['custom_name'] = custom_name.strip() if custom_name else None
                    self._save_json(self.devices_file, devices_data)
                    return Device(**device_data)
            return None
    
    def search_devices(self, query: str) -> List[Device]:
        """搜索设备"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            query_lower = query.lower()
            results = []
            
            for device_data in devices_data.values():
                # 搜索字段
                search_fields = [
                    device_data.get('ip_address', ''),
                    device_data.get('mac_address', ''),
                    device_data.get('hostname', ''),
                    device_data.get('custom_name', ''),
                    device_data.get('vendor', '')
                ]
                
                if any(query_lower in str(field).lower() for field in search_fields if field):
                    results.append(Device(**device_data))
            
            return results
    
    # 扫描记录相关操作
    def add_scan_record(self, scan_record: ScanRecord):
        """添加扫描记录"""
        with self._lock:
            records = self._load_json(self.scan_records_file)
            records.append(asdict(scan_record))
            self._save_json(self.scan_records_file, records)
    
    def get_device_history(self, device_id: str, hours: int = 24) -> List[ScanRecord]:
        """获取设备历史记录"""
        with self._lock:
            records = self._load_json(self.scan_records_file)
            since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
            
            device_records = []
            for record_data in records:
                if (record_data.get('device_id') == device_id and 
                    record_data.get('scan_time', '') >= since):
                    device_records.append(ScanRecord(**record_data))
            
            # 按时间倒序排序
            device_records.sort(key=lambda x: x.scan_time, reverse=True)
            return device_records
    
    # 扫描会话相关操作
    def create_scan_session(self, subnet: str, scan_type: str) -> ScanSession:
        """创建扫描会话"""
        with self._lock:
            session = ScanSession(
                id=self._generate_id(),
                start_time=datetime.utcnow().isoformat(),
                subnet=subnet,
                scan_type=scan_type
            )
            sessions = self._load_json(self.scan_sessions_file)
            sessions.append(asdict(session))
            self._save_json(self.scan_sessions_file, sessions)
            return session
    
    def update_scan_session(self, session_id: str, **kwargs):
        """更新扫描会话"""
        with self._lock:
            sessions = self._load_json(self.scan_sessions_file)
            for session_data in sessions:
                if session_data.get('id') == session_id:
                    session_data.update(kwargs)
                    if 'end_time' not in kwargs:
                        session_data['end_time'] = datetime.utcnow().isoformat()
                    self._save_json(self.scan_sessions_file, sessions)
                    return ScanSession(**session_data)
            return None
    
    def get_scan_sessions(self, limit: int = 10) -> List[ScanSession]:
        """获取扫描会话历史"""
        with self._lock:
            sessions = self._load_json(self.scan_sessions_file)
            # 按开始时间倒序排序
            sessions.sort(key=lambda x: x.get('start_time', ''), reverse=True)
            return [ScanSession(**data) for data in sessions[:limit]]
    
    # 统计信息
    def get_network_stats(self) -> Dict[str, int]:
        """获取网络统计信息"""
        with self._lock:
            devices_data = self._load_json(self.devices_file)
            total_devices = len(devices_data)
            online_devices = sum(1 for data in devices_data.values() if data.get('is_online', False))
            offline_devices = total_devices - online_devices
            
            # 最近24小时的扫描次数
            sessions = self._load_json(self.scan_sessions_file)
            since = (datetime.utcnow() - timedelta(hours=24)).isoformat()
            recent_scans = sum(1 for session in sessions if session.get('start_time', '') >= since)
            
            return {
                "total_devices": total_devices,
                "online_devices": online_devices,
                "offline_devices": offline_devices,
                "recent_scans": recent_scans
            }
    
    # 设置相关操作
    def get_settings(self) -> AppSettings:
        """获取应用设置"""
        with self._lock:
            settings_data = self._load_json(self.settings_file)
            return AppSettings(**settings_data)
    
    def update_settings(self, settings: AppSettings):
        """更新应用设置"""
        with self._lock:
            self._save_json(self.settings_file, asdict(settings))
    
    # 图表配置相关操作
    def get_chart_config(self) -> ChartConfig:
        """获取图表配置"""
        with self._lock:
            config_data = self._load_json(self.chart_config_file)
            return ChartConfig(**config_data)
    
    def update_chart_config(self, config: ChartConfig):
        """更新图表配置"""
        with self._lock:
            self._save_json(self.chart_config_file, asdict(config))
    
    # 扫描配置相关操作
    def get_scan_config(self) -> ScanConfig:
        """获取扫描配置"""
        with self._lock:
            config_data = self._load_json(self.scan_config_file)
            try:
                return ScanConfig(**config_data)
            except Exception as e:
                print(f"扫描配置解析失败，使用默认配置: {e}")
                # 如果配置无效，返回默认平衡配置
                default_config = ScanPresets.balanced()
                self._save_json(self.scan_config_file, asdict(default_config))
                return default_config
    
    def update_scan_config(self, config: ScanConfig):
        """更新扫描配置"""
        with self._lock:
            # 验证配置
            config.validate()
            self._save_json(self.scan_config_file, asdict(config))
    
    def load_scan_preset(self, preset_name: str) -> ScanConfig:
        """加载预设扫描配置"""
        preset_methods = {
            'fast': ScanPresets.fast,
            'balanced': ScanPresets.balanced,
            'thorough': ScanPresets.thorough,
            'stealth': ScanPresets.stealth
        }
        
        if preset_name not in preset_methods:
            raise ValueError(f"未知的预设配置: {preset_name}. 支持: {list(preset_methods.keys())}")
        
        config = preset_methods[preset_name]()
        self.update_scan_config(config)
        return config
    
    # 维护操作
    def cleanup(self):
        """清理过期数据"""
        self._clean_old_records()

# 全局存储实例
file_storage = FileStorage() 