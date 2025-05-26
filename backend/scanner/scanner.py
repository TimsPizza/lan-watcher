import asyncio
import subprocess
import json
import re
import socket
import ipaddress
from typing import List, Dict, Optional
from datetime import datetime
import concurrent.futures
from dataclasses import dataclass

@dataclass
class DeviceInfo:
    ip: str
    mac: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    is_online: bool = False
    response_time: Optional[int] = None
    open_ports: List[int] = None

class NetworkScanner:
    def __init__(self):
        # 延迟导入避免循环依赖
        pass
    
    def _get_vendor_from_oui_db(self, mac: str) -> Optional[str]:
        """从OUI数据库查找厂商信息"""
        if not mac:
            return None
        
        try:
            from models.oui_parser import oui_parser
            return oui_parser.lookup_vendor(mac)
        except Exception as e:
            print(f"Error looking up vendor for {mac}: {e}")
            return self._get_vendor_fallback(mac)
    
    def _get_vendor_fallback(self, mac: str) -> Optional[str]:
        """备用厂商查找（硬编码的常见厂商）"""
        if not mac:
            return None
        
        # 简化的常见厂商映射
        common_vendors = {
            "00:50:56": "VMware",
            "08:00:27": "VirtualBox", 
            "52:54:00": "QEMU",
            "00:0C:29": "VMware",
            "00:1B:21": "Intel",
            "00:23:24": "Apple",
            "D8:9E:F3": "Apple",
            "AC:DE:48": "Apple",
        }
        
        oui = mac.replace(':', '').replace('-', '').upper()[:6]
        # 转换为带冒号格式进行匹配
        oui_formatted = ':'.join([oui[i:i+2] for i in range(0, 6, 2)]).upper()
        
        return common_vendors.get(oui_formatted)
    
    async def get_local_subnet(self) -> str:
        """获取本地子网"""
        try:
            # 获取默认网关
            result = subprocess.run(['route', '-n', 'get', 'default'], 
                                 capture_output=True, text=True)
            
            for line in result.stdout.split('\n'):
                if 'interface:' in line:
                    interface = line.split(':')[1].strip()
                    break
            
            # 获取接口IP
            result = subprocess.run(['ifconfig', interface], 
                                 capture_output=True, text=True)
            
            ip_pattern = r'inet (\d+\.\d+\.\d+\.\d+)'
            match = re.search(ip_pattern, result.stdout)
            
            if match:
                ip = match.group(1)
                # 假设是/24子网
                network = ipaddress.IPv4Network(f"{ip}/24", strict=False)
                return str(network)
                
        except Exception as e:
            print(f"Error getting subnet: {e}")
            
        # 默认返回常见的私有网络
        return "192.168.1.0/24"
    
    async def ping_host(self, ip: str) -> Optional[DeviceInfo]:
        """Ping单个主机"""
        try:
            # 使用ping命令
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '1000', ip],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if result.returncode == 0:
                # 提取响应时间
                time_pattern = r'time=(\d+\.?\d*) ms'
                time_match = re.search(time_pattern, result.stdout)
                response_time = int(float(time_match.group(1))) if time_match else None
                
                return DeviceInfo(
                    ip=ip,
                    is_online=True,
                    response_time=response_time
                )
        except Exception as e:
            print(f"Ping error for {ip}: {e}")
        
        return None
    
    async def arp_scan(self, subnet: str) -> List[DeviceInfo]:
        """ARP扫描发现设备"""
        devices = []
        
        try:
            # 使用arp-scan命令（如果有的话）
            result = subprocess.run(
                ['arp-scan', '-l'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    # 解析arp-scan输出
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        ip = parts[0].strip()
                        mac = parts[1].strip()
                        
                        if self._is_valid_ip(ip):
                            vendor = self._get_vendor_from_oui_db(mac)
                            devices.append(DeviceInfo(
                                ip=ip,
                                mac=mac,
                                vendor=vendor,
                                is_online=True
                            ))
        except FileNotFoundError:
            # 如果没有arp-scan，使用ARP表
            devices = await self._scan_arp_table()
        except Exception as e:
            print(f"ARP scan error: {e}")
            devices = await self._scan_arp_table()
        
        return devices
    
    async def _scan_arp_table(self) -> List[DeviceInfo]:
        """扫描系统ARP表"""
        devices = []
        
        try:
            result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
            
            # 解析ARP表输出
            for line in result.stdout.split('\n'):
                # 匹配格式: hostname (ip) at mac [ether] on interface
                arp_pattern = r'(\S+) \((\d+\.\d+\.\d+\.\d+)\) at ([a-fA-F0-9:]{17})'
                match = re.search(arp_pattern, line)
                
                if match:
                    hostname, ip, mac = match.groups()
                    vendor = self._get_vendor_from_oui_db(mac)
                    
                    devices.append(DeviceInfo(
                        ip=ip,
                        mac=mac,
                        hostname=hostname if hostname != '?' else None,
                        vendor=vendor,
                        is_online=True
                    ))
        except Exception as e:
            print(f"ARP table scan error: {e}")
        
        return devices
    
    async def scan_subnet(self, subnet: str, scan_type: str = "ping") -> List[DeviceInfo]:
        """扫描整个子网"""
        devices = []
        
        try:
            network = ipaddress.IPv4Network(subnet, strict=False)
            
            if scan_type == "arp":
                devices = await self.arp_scan(subnet)
            elif scan_type == "ping":
                # 并发ping扫描
                with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
                    loop = asyncio.get_event_loop()
                    tasks = []
                    
                    for ip in network.hosts():
                        task = loop.run_in_executor(
                            executor, 
                            self._sync_ping, 
                            str(ip)
                        )
                        tasks.append(task)
                    
                    results = await asyncio.gather(*tasks)
                    devices = [d for d in results if d is not None]
            
            # 为在线设备尝试获取主机名
            for device in devices:
                if device.is_online and not device.hostname:
                    device.hostname = await self._get_hostname(device.ip)
                    
        except Exception as e:
            print(f"Subnet scan error: {e}")
        
        return devices
    
    def _sync_ping(self, ip: str) -> Optional[DeviceInfo]:
        """同步ping方法，用于线程池"""
        try:
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '1000', ip],
                capture_output=True,
                text=True,
                timeout=2
            )
            
            if result.returncode == 0:
                time_pattern = r'time=(\d+\.?\d*) ms'
                time_match = re.search(time_pattern, result.stdout)
                response_time = int(float(time_match.group(1))) if time_match else None
                
                return DeviceInfo(
                    ip=ip,
                    is_online=True,
                    response_time=response_time
                )
        except Exception:
            pass
        
        return None
    
    async def _get_hostname(self, ip: str) -> Optional[str]:
        """获取主机名"""
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            return hostname
        except Exception:
            return None
    
    def _get_vendor_from_mac(self, mac: str) -> Optional[str]:
        """根据MAC地址获取厂商信息（已弃用，使用_get_vendor_from_oui_db）"""
        return self._get_vendor_from_oui_db(mac)
    
    def _is_valid_ip(self, ip: str) -> bool:
        """验证IP地址格式"""
        try:
            ipaddress.IPv4Address(ip)
            return True
        except ValueError:
            return False

# 扫描器实例
scanner = NetworkScanner() 