import asyncio
import subprocess
import json
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import dataclass, field
import ipaddress

@dataclass
class ServiceInfo:
    port: int
    protocol: str
    service: str
    version: Optional[str] = None
    state: str = "unknown"

@dataclass  
class DeviceInfo:
    ip: str
    mac: Optional[str] = None
    hostname: Optional[str] = None
    vendor: Optional[str] = None
    is_online: bool = False
    response_time: Optional[float] = None
    open_ports: List[int] = field(default_factory=list)
    services: List[ServiceInfo] = field(default_factory=list)
    os_info: Optional[str] = None
    device_type: Optional[str] = None

class NmapScanner:
    """基于nmap的高级网络扫描器"""
    
    def __init__(self, docker_image: str = "instrumentisto/nmap:latest"):
        self.docker_image = docker_image
        self.docker_available = self._check_docker()
    
    def _check_docker(self) -> bool:
        """检查Docker是否可用"""
        try:
            result = subprocess.run(
                ['docker', '--version'], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False
    
    async def _run_nmap_command(self, nmap_args: List[str]) -> str:
        """运行nmap命令"""
        if self.docker_available:
            # 使用Docker运行nmap
            cmd = ['docker', 'run', '--rm', '--network=host', self.docker_image] + nmap_args
        else:
            # 降级到本地nmap（如果有的话）
            cmd = ['nmap'] + nmap_args
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Nmap command failed: {stderr.decode()}")
            
            return stdout.decode()
        
        except Exception as e:
            raise Exception(f"Failed to run nmap: {str(e)}")
    
    async def ping_sweep(self, subnet: str) -> List[DeviceInfo]:
        """快速主机发现扫描"""
        nmap_args = [
            '-sn',  # Ping扫描，不扫描端口
            '-PS22,80,443',  # TCP SYN ping到常见端口
            '-PA80',  # TCP ACK ping  
            '-PE',  # ICMP echo ping
            '--min-rate', '1000',  # 最小发包速率
            '--max-retries', '1',  # 最大重试次数
            '-oX', '-',  # XML输出到stdout
            subnet
        ]
        
        output = await self._run_nmap_command(nmap_args)
        return self._parse_xml_output(output)
    
    async def port_scan(self, targets: List[str], ports: str = "1-1000") -> List[DeviceInfo]:
        """端口扫描"""
        if not targets:
            return []
        
        target_str = ','.join(targets)
        nmap_args = [
            '-sS',  # TCP SYN扫描
            '-sV',  # 服务版本检测
            '-O',   # 操作系统检测
            '--version-intensity', '5',
            '-p', ports,
            '--min-rate', '500',
            '--max-retries', '2',
            '-oX', '-',
            target_str
        ]
        
        output = await self._run_nmap_command(nmap_args)
        return self._parse_xml_output(output)
    
    async def comprehensive_scan(self, subnet: str) -> List[DeviceInfo]:
        """综合扫描：主机发现 + 端口扫描 + 服务识别"""
        # 第一步：快速主机发现
        print(f"正在发现子网 {subnet} 中的活跃主机...")
        devices = await self.ping_sweep(subnet)
        
        if not devices:
            return []
        
        # 第二步：对发现的主机进行详细扫描
        active_ips = [d.ip for d in devices if d.is_online]
        print(f"发现 {len(active_ips)} 个活跃主机，开始详细扫描...")
        
        # 分批扫描避免超时
        batch_size = 10
        detailed_devices = []
        
        for i in range(0, len(active_ips), batch_size):
            batch = active_ips[i:i + batch_size]
            batch_results = await self.port_scan(batch, "1-1000,8080,8443,9000")
            detailed_devices.extend(batch_results)
        
        return detailed_devices
    
    async def service_discovery(self, target: str) -> DeviceInfo:
        """深度服务发现扫描"""
        nmap_args = [
            '-sS', '-sV', '-sC',  # 脚本扫描
            '-O',  # OS检测
            '--version-all',
            '--script', 'default,discovery,safe',
            '-p-',  # 扫描所有端口
            '--min-rate', '300',
            '-T4',  # 时序模板
            '-oX', '-',
            target
        ]
        
        output = await self._run_nmap_command(nmap_args)
        devices = self._parse_xml_output(output)
        return devices[0] if devices else None
    
    def _parse_xml_output(self, xml_output: str) -> List[DeviceInfo]:
        """解析nmap XML输出"""
        devices = []
        
        try:
            root = ET.fromstring(xml_output)
            
            for host in root.findall('host'):
                device = self._parse_host_element(host)
                if device:
                    devices.append(device)
        
        except ET.ParseError as e:
            print(f"XML解析错误: {e}")
        except Exception as e:
            print(f"解析nmap输出时出错: {e}")
        
        return devices
    
    def _parse_host_element(self, host_element) -> Optional[DeviceInfo]:
        """解析单个主机元素"""
        # 获取状态
        status = host_element.find('status')
        if status is None or status.get('state') != 'up':
            return None
        
        # 获取IP地址
        address_elements = host_element.findall('address')
        ip = None
        mac = None
        vendor = None
        
        for addr in address_elements:
            if addr.get('addrtype') == 'ipv4':
                ip = addr.get('addr')
            elif addr.get('addrtype') == 'mac':
                mac = addr.get('addr')
                vendor = addr.get('vendor')
        
        if not ip:
            return None
        
        # 获取主机名
        hostname = None
        hostnames = host_element.find('hostnames')
        if hostnames is not None:
            hostname_elem = hostnames.find('hostname')
            if hostname_elem is not None:
                hostname = hostname_elem.get('name')
        
        # 获取响应时间
        response_time = None
        times = host_element.find('times')
        if times is not None:
            rtt = times.get('rttvar')
            if rtt:
                response_time = float(rtt) / 1000  # 转换为毫秒
        
        # 解析端口和服务信息
        services = []
        open_ports = []
        ports_element = host_element.find('ports')
        
        if ports_element is not None:
            for port in ports_element.findall('port'):
                port_num = int(port.get('portid'))
                protocol = port.get('protocol')
                
                state_elem = port.find('state')
                if state_elem is not None and state_elem.get('state') == 'open':
                    open_ports.append(port_num)
                    
                    # 获取服务信息
                    service_elem = port.find('service')
                    if service_elem is not None:
                        service_info = ServiceInfo(
                            port=port_num,
                            protocol=protocol,
                            service=service_elem.get('name', 'unknown'),
                            version=service_elem.get('version'),
                            state='open'
                        )
                        services.append(service_info)
        
        # 获取操作系统信息
        os_info = None
        os_element = host_element.find('os')
        if os_element is not None:
            osmatch = os_element.find('osmatch')
            if osmatch is not None:
                os_info = osmatch.get('name')
        
        # 推断设备类型
        device_type = self._infer_device_type(services, os_info, open_ports)
        
        return DeviceInfo(
            ip=ip,
            mac=mac,
            hostname=hostname,
            vendor=vendor,
            is_online=True,
            response_time=response_time,
            open_ports=open_ports,
            services=services,
            os_info=os_info,
            device_type=device_type
        )
    
    def _infer_device_type(self, services: List[ServiceInfo], os_info: Optional[str], open_ports: List[int]) -> Optional[str]:
        """根据服务和端口推断设备类型"""
        if not services and not open_ports:
            return None
        
        # 基于端口和服务的设备类型推断
        service_names = [s.service.lower() for s in services]
        
        # 路由器/网关
        if any(port in open_ports for port in [80, 443, 8080]) and any(s in service_names for s in ['http', 'https']):
            if any(port in open_ports for port in [22, 23, 53]):
                return "Router/Gateway"
        
        # 网络打印机
        if any(port in open_ports for port in [515, 631, 9100]):
            return "Network Printer"
        
        # NAS/文件服务器
        if any(port in open_ports for port in [139, 445, 548, 2049]):
            return "NAS/File Server"
        
        # IP摄像头
        if any(port in open_ports for port in [554, 8080, 80]) and 'rtsp' in service_names:
            return "IP Camera"
        
        # 计算机/服务器
        if 22 in open_ports or 3389 in open_ports:
            if os_info:
                if 'windows' in os_info.lower():
                    return "Windows Computer"
                elif any(os in os_info.lower() for os in ['linux', 'unix', 'ubuntu', 'centos']):
                    return "Linux Computer"
                elif 'mac' in os_info.lower():
                    return "Mac Computer"
            return "Computer"
        
        # 移动设备（基于端口特征）
        if len(open_ports) <= 2 and any(port > 1024 for port in open_ports):
            return "Mobile Device"
        
        return "Unknown Device"
    
    async def get_local_subnet(self) -> str:
        """获取本地子网，兼容原有接口"""
        try:
            # 使用nmap自动发现本地网络
            nmap_args = ['--iflist']
            output = await self._run_nmap_command(nmap_args)
            
            # 解析网络接口信息
            lines = output.split('\n')
            for line in lines:
                if 'UP' in line and ('192.168.' in line or '10.' in line or '172.' in line):
                    # 提取网络地址
                    parts = line.split()
                    for part in parts:
                        if '/' in part and any(net in part for net in ['192.168.', '10.', '172.']):
                            return part
        except Exception:
            pass
        
        # 降级到原有方法
        return "192.168.1.0/24"

# 扫描器实例
nmap_scanner = NmapScanner() 