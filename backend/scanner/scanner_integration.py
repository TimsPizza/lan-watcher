"""
网络扫描器集成模块
支持原有扫描器和新的nmap扫描器的切换使用
"""

import asyncio
from typing import List, Optional, Dict, Any
from enum import Enum
from .scanner import NetworkScanner, DeviceInfo as OriginalDeviceInfo  
from .nmap_scanner import NmapScanner, DeviceInfo as NmapDeviceInfo, ServiceInfo

class ScanMode(Enum):
    BASIC = "basic"          # 原有ping+ARP扫描
    NMAP_FAST = "nmap_fast"  # nmap快速扫描
    NMAP_FULL = "nmap_full"  # nmap全面扫描

class IntegratedScanner:
    """集成扫描器，支持多种扫描模式"""
    
    def __init__(self):
        self.basic_scanner = NetworkScanner()
        self.nmap_scanner = NmapScanner()
        self.nmap_available = self.nmap_scanner.docker_available
    
    async def scan_network(self, 
                          subnet: Optional[str] = None, 
                          mode: ScanMode = ScanMode.NMAP_FAST) -> List[Dict[str, Any]]:
        """
        统一网络扫描接口
        
        Args:
            subnet: 目标子网，如果为None则自动检测
            mode: 扫描模式
            
        Returns:
            统一格式的设备信息列表
        """
        if not subnet:
            if mode == ScanMode.BASIC:
                subnet = await self.basic_scanner.get_local_subnet()
            else:
                subnet = await self.nmap_scanner.get_local_subnet()
        
        print(f"开始扫描子网: {subnet}，模式: {mode.value}")
        
        if mode == ScanMode.BASIC or not self.nmap_available:
            return await self._basic_scan(subnet)
        elif mode == ScanMode.NMAP_FAST:
            return await self._nmap_fast_scan(subnet)
        elif mode == ScanMode.NMAP_FULL:
            return await self._nmap_full_scan(subnet)
        else:
            raise ValueError(f"不支持的扫描模式: {mode}")
    
    async def _basic_scan(self, subnet: str) -> List[Dict[str, Any]]:
        """基础扫描模式"""
        print("使用基础ping+ARP扫描...")
        devices = await self.basic_scanner.scan_subnet(subnet, "ping")
        return [self._convert_basic_device(device) for device in devices]
    
    async def _nmap_fast_scan(self, subnet: str) -> List[Dict[str, Any]]:
        """nmap快速扫描模式"""
        print("使用nmap快速扫描...")
        devices = await self.nmap_scanner.ping_sweep(subnet)
        
        # 对发现的设备进行基础端口扫描
        if devices:
            active_ips = [d.ip for d in devices if d.is_online]
            detailed_devices = await self.nmap_scanner.port_scan(active_ips, "22,23,53,80,135,139,443,445,993,995")
            return [self._convert_nmap_device(device) for device in detailed_devices]
        
        return []
    
    async def _nmap_full_scan(self, subnet: str) -> List[Dict[str, Any]]:
        """nmap全面扫描模式"""
        print("使用nmap全面扫描...")
        devices = await self.nmap_scanner.comprehensive_scan(subnet)
        return [self._convert_nmap_device(device) for device in devices]
    
    async def scan_device(self, ip: str, deep: bool = False) -> Optional[Dict[str, Any]]:
        """
        扫描单个设备
        
        Args:
            ip: 目标IP地址
            deep: 是否进行深度扫描
            
        Returns:
            设备详细信息
        """
        if self.nmap_available:
            if deep:
                device = await self.nmap_scanner.service_discovery(ip)
            else:
                devices = await self.nmap_scanner.port_scan([ip])
                device = devices[0] if devices else None
            
            return self._convert_nmap_device(device) if device else None
        else:
            device = await self.basic_scanner.ping_host(ip)
            return self._convert_basic_device(device) if device else None
    
    def _convert_basic_device(self, device: OriginalDeviceInfo) -> Dict[str, Any]:
        """转换基础扫描器设备信息为统一格式"""
        return {
            "ip": device.ip,
            "mac": device.mac,
            "hostname": device.hostname,
            "vendor": device.vendor,
            "is_online": device.is_online,
            "response_time": device.response_time,
            "open_ports": device.open_ports or [],
            "services": [],
            "os_info": None,
            "device_type": self._guess_device_type_basic(device),
            "scan_method": "basic",
            "last_scan": None
        }
    
    def _convert_nmap_device(self, device: NmapDeviceInfo) -> Dict[str, Any]:
        """转换nmap扫描器设备信息为统一格式"""
        services_data = []
        if device.services:
            for service in device.services:
                services_data.append({
                    "port": service.port,
                    "protocol": service.protocol,
                    "service": service.service,
                    "version": service.version,
                    "state": service.state
                })
        
        return {
            "ip": device.ip,
            "mac": device.mac,
            "hostname": device.hostname,
            "vendor": device.vendor,
            "is_online": device.is_online,
            "response_time": device.response_time,
            "open_ports": device.open_ports,
            "services": services_data,
            "os_info": device.os_info,
            "device_type": device.device_type,
            "scan_method": "nmap",
            "last_scan": None
        }
    
    def _guess_device_type_basic(self, device: OriginalDeviceInfo) -> str:
        """基于基础信息推断设备类型"""
        if not device.vendor:
            return "Unknown Device"
        
        vendor_lower = device.vendor.lower()
        
        if any(keyword in vendor_lower for keyword in ['apple', 'iphone', 'ipad']):
            return "Apple Device"
        elif any(keyword in vendor_lower for keyword in ['samsung', 'lg', 'xiaomi', 'huawei']):
            return "Mobile Device"
        elif any(keyword in vendor_lower for keyword in ['tp-link', 'netgear', 'linksys', 'cisco']):
            return "Router/Gateway"
        elif 'vmware' in vendor_lower or 'virtualbox' in vendor_lower:
            return "Virtual Machine"
        elif any(keyword in vendor_lower for keyword in ['intel', 'realtek', 'broadcom']):
            return "Computer"
        else:
            return "Unknown Device"
    
    async def get_scanner_status(self) -> Dict[str, Any]:
        """获取扫描器状态信息"""
        return {
            "basic_scanner_available": True,
            "nmap_scanner_available": self.nmap_available,
            "docker_available": self.nmap_scanner.docker_available,
            "recommended_mode": ScanMode.NMAP_FAST.value if self.nmap_available else ScanMode.BASIC.value
        }

# 全局扫描器实例
integrated_scanner = IntegratedScanner()

# 使用示例
async def example_usage():
    """使用示例"""
    scanner = IntegratedScanner()
    
    # 检查扫描器状态
    status = await scanner.get_scanner_status()
    print("扫描器状态:", status)
    
    # 快速扫描网络
    devices = await scanner.scan_network(mode=ScanMode.NMAP_FAST)
    print(f"发现 {len(devices)} 个设备")
    
    # 扫描单个设备
    if devices:
        device_ip = devices[0]["ip"]
        detailed_info = await scanner.scan_device(device_ip, deep=True)
        print("设备详细信息:", detailed_info)

if __name__ == "__main__":
    asyncio.run(example_usage()) 