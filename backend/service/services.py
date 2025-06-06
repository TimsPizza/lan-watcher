import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Optional

from scanner.scanner import scanner, DeviceInfo
from storage.file_storage import file_storage, Device, ScanRecord, ScanSession
from models.scan_config import ScanConfig, ScanPresets

class DeviceService:
    def __init__(self):
        self.scanning = False
        self.scan_interval = 300  # 5分钟扫描一次
        self.last_scan_time = None  # 最后一次扫描时间
        
    def get_device_by_ip(self, ip: str) -> Optional[Device]:
        """根据IP获取设备"""
        return file_storage.get_device_by_ip(ip)
    
    def get_device_by_id(self, device_id: str) -> Optional[Device]:
        """根据ID获取设备"""
        return file_storage.get_device_by_id(device_id)
    
    def get_all_devices(self, skip: int = 0, limit: int = 100) -> List[Device]:
        """获取所有设备"""
        return file_storage.get_all_devices(skip, limit)
    
    def get_online_devices(self) -> List[Device]:
        """获取在线设备"""
        return file_storage.get_online_devices()
    
    def get_device_history(self, device_id: str, hours: int = 24) -> List[ScanRecord]:
        """获取设备历史记录"""
        return file_storage.get_device_history(device_id, hours)
    
    def create_or_update_device(self, device_info: DeviceInfo) -> Device:
        """创建或更新设备信息"""
        return file_storage.create_or_update_device(device_info)
    
    def mark_device_offline(self, device: Device):
        """标记设备为离线"""
        file_storage.mark_device_offline(device)
    
    def scan_network_sync(self, subnet: str = None, scan_type: str = "ping") -> dict:
        """同步版本的网络扫描，用于后台任务"""
        import asyncio
        
        # 在新的事件循环中运行异步扫描
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(self.scan_network_async(subnet, scan_type))
        finally:
            loop.close()
    
    async def scan_network_async(self, subnet: str = None, scan_type: str = "ping") -> dict:
        """扫描网络"""
        if self.scanning:
            return {"status": "error", "message": "Scan already in progress"}
        
        self.scanning = True
        
        try:
            # 记录扫描开始时间
            scan_start_time = datetime.utcnow()
            
            # 确保扫描器使用最新配置
            if not scanner.config:
                scanner.config = file_storage.get_scan_config()
            
            # 获取子网
            if not subnet:
                subnet = await scanner.get_local_subnet()
            
            # 创建扫描会话
            scan_session = file_storage.create_scan_session(subnet, scan_type)
            
            # 执行扫描
            devices_found = await scanner.scan_subnet(subnet, scan_type)
            
            # 获取当前在线设备IP列表
            online_ips = {device.ip for device in devices_found if device.is_online}
            
            # 更新或创建设备记录
            for device_info in devices_found:
                self.create_or_update_device(device_info)
            
            # 标记不在扫描结果中的设备为离线
            existing_devices = file_storage.get_online_devices()
            for device in existing_devices:
                if device.ip_address not in online_ips:
                    self.mark_device_offline(device)
            
            # 更新扫描会话
            file_storage.update_scan_session(
                scan_session.id,
                devices_found=len(devices_found)
            )
            
            # 更新最后扫描时间
            self.last_scan_time = scan_start_time.isoformat()
            
            return {
                "status": "success",
                "subnet": subnet,
                "devices_found": len(devices_found),
                "scan_type": scan_type,
                "duration": (datetime.utcnow() - scan_start_time).total_seconds()
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            self.scanning = False
    
    # 保持原有接口兼容性
    async def scan_network(self, subnet: str = None, scan_type: str = "ping") -> dict:
        """异步网络扫描接口（保持兼容性）"""
        return await self.scan_network_async(subnet, scan_type)
    
    async def start_periodic_scan(self):
        """启动周期性扫描"""
        while True:
            try:
                print(f"Starting periodic scan at {datetime.now()}")
                result = await self.scan_network()
                print(f"Scan completed: {result}")
                
                # 定期清理过期数据
                file_storage.cleanup()
                
                await asyncio.sleep(self.scan_interval)
            except Exception as e:
                print(f"Periodic scan error: {e}")
                await asyncio.sleep(60)  # 出错时等待1分钟再重试
    
    def get_scan_sessions(self, limit: int = 10) -> List[ScanSession]:
        """获取扫描会话历史"""
        return file_storage.get_scan_sessions(limit)
    
    def get_network_stats(self) -> dict:
        """获取网络统计信息"""
        return file_storage.get_network_stats()
    
    def update_device_alias(self, device_id: str, custom_name: str) -> Device:
        """更新设备自定义别名"""
        device = file_storage.update_device_alias(device_id, custom_name)
        if not device:
            raise ValueError("Device not found")
        return device
    
    def update_device_alias_by_mac(self, mac_address: str, custom_name: str) -> Device:
        """通过MAC地址更新设备别名"""
        device = file_storage.update_device_alias_by_mac(mac_address, custom_name)
        if not device:
            raise ValueError("Device not found")
        return device
    
    def search_devices(self, query: str) -> List[Device]:
        """搜索设备（根据IP、MAC、主机名、别名、厂商）"""
        return file_storage.search_devices(query)

class ScanConfigService:
    """扫描配置管理服务"""
    
    def get_scan_config(self) -> ScanConfig:
        """获取当前扫描配置"""
        return file_storage.get_scan_config()
    
    def update_scan_config(self, config: ScanConfig) -> ScanConfig:
        """更新扫描配置"""
        # 验证配置
        config.validate()
        file_storage.update_scan_config(config)
        
        # 更新扫描器的配置
        scanner.config = config
        return config
    
    def load_preset(self, preset_name: str) -> ScanConfig:
        """加载预设配置"""
        config = file_storage.load_scan_preset(preset_name)
        
        # 更新扫描器的配置
        scanner.config = config
        return config
    
    def get_available_presets(self) -> List[dict]:
        """获取可用的预设配置列表"""
        presets = [
            {
                "name": "fast",
                "display_name": "快速扫描",
                "description": "适合快速发现设备，扫描速度快但准确性稍低",
                "config": ScanPresets.fast()
            },
            {
                "name": "balanced", 
                "display_name": "平衡模式",
                "description": "速度和准确性的平衡，推荐日常使用",
                "config": ScanPresets.balanced()
            },
            {
                "name": "thorough",
                "display_name": "详细扫描", 
                "description": "最大准确性，扫描时间较长",
                "config": ScanPresets.thorough()
            },
            {
                "name": "stealth",
                "display_name": "隐蔽扫描",
                "description": "减少对网络的影响，扫描速度最慢",
                "config": ScanPresets.stealth()
            }
        ]
        
        # 只返回基本信息，不包含完整配置对象
        return [
            {
                "name": preset["name"],
                "display_name": preset["display_name"], 
                "description": preset["description"]
            }
            for preset in presets
        ]
    
    def validate_config(self, config_data: dict) -> dict:
        """验证配置数据"""
        try:
            config = ScanConfig(**config_data)
            config.validate()
            return {"valid": True, "errors": []}
        except Exception as e:
            return {"valid": False, "errors": [str(e)]}
    
    def test_network_config(self, subnet_cidr: str = None) -> dict:
        """测试网络配置"""
        try:
            if subnet_cidr:
                import ipaddress
                network = ipaddress.IPv4Network(subnet_cidr, strict=False)
                return {
                    "valid": True,
                    "network_address": str(network.network_address),
                    "broadcast_address": str(network.broadcast_address),
                    "num_hosts": network.num_addresses - 2,  # 减去网络地址和广播地址
                    "prefix_length": network.prefixlen
                }
            else:
                return {"valid": False, "error": "未提供子网CIDR"}
        except Exception as e:
            return {"valid": False, "error": str(e)}

# 服务实例
device_service = DeviceService()
scan_config_service = ScanConfigService() 