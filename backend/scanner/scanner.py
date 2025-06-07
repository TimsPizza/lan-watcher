import asyncio
import subprocess
import json
import re
import socket
import ipaddress
import xml.etree.ElementTree as ET
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
    def __init__(self, scan_config=None):
        # 扫描配置 - 如果没有提供则使用默认配置
        if scan_config is None:
            try:
                from models.scan_config import ScanPresets
                self.config = ScanPresets.balanced()
            except:
                # 如果导入失败，创建最基本的配置
                self.config = None
        else:
            self.config = scan_config
        
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
        # 如果配置中手动指定了子网，直接返回
        if self.config and self.config.subnet_cidr and not self.config.auto_detect_subnet:
            return self.config.subnet_cidr
            
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
        
        # 降级到传统方法
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
                # 智能推断子网掩码
                ip_obj = ipaddress.IPv4Address(ip)
                if ip_obj.is_private:
                    # 根据私有网络范围推断子网
                    if str(ip).startswith('192.168.'):
                        network = ipaddress.IPv4Network(f"{ip}/24", strict=False)
                    elif str(ip).startswith('10.'):
                        network = ipaddress.IPv4Network(f"{ip}/24", strict=False)  # 也可以是/8，但/24更实用
                    elif str(ip).startswith('172.'):
                        network = ipaddress.IPv4Network(f"{ip}/24", strict=False)  # 也可以是/12
                    else:
                        network = ipaddress.IPv4Network(f"{ip}/24", strict=False)
                    return str(network)
                
        except Exception as e:
            print(f"Error getting subnet: {e}")
            
        # 默认返回常见的私有网络  
        detected_subnet = "192.168.1.0/24"
        
        # 应用配置的子网选择逻辑
        if self.config:
            return self.config.get_effective_subnet(detected_subnet)
        return detected_subnet
    
    async def _run_nmap_command(self, nmap_args: List[str]) -> str:
        """运行nmap命令"""
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
    
    async def ping_host(self, ip: str) -> Optional[DeviceInfo]:
        """Ping单个主机"""
        # 检查是否应该排除该IP
        if self.config and self.config.should_exclude_ip(ip):
            return None
            
        try:
            # 使用配置生成nmap参数
            if self.config:
                nmap_args = self.config.get_nmap_args(ip)
            else:
                nmap_args = ['-sn', '-PE', ip]
            
            output = await self._run_nmap_command(nmap_args)
            devices = self._parse_xml_output(output)
            
            if devices:
                device = devices[0]
                # 根据配置补充主机名和厂商信息
                if not device.hostname and (not self.config or self.config.resolve_hostnames):
                    device.hostname = await self._get_hostname(device.ip)
                if device.mac and not device.vendor and (not self.config or self.config.fetch_vendor_info):
                    device.vendor = self._get_vendor_from_oui_db(device.mac)
                return device
                
        except Exception as e:
            print(f"Nmap ping error for {ip}: {e}")
            # 降级到传统ping
            if self.config and not self.config.fallback_enabled:
                return None
        
        # 降级到传统ping方法
        try:
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
                
                device = DeviceInfo(
                    ip=ip,
                    is_online=True,
                    response_time=response_time
                )
                
                # 尝试获取主机名
                device.hostname = await self._get_hostname(ip)
                
                return device
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
    
    async def scan_ports(self, targets: List[str], ports: str = "1-1000") -> List[DeviceInfo]:
        """端口扫描功能"""
        if not targets:
            return []
        
        try:
            target_str = ','.join(targets)
            nmap_args = [
                '-sS',  # TCP SYN扫描
                '-sV',  # 服务版本检测
                '--version-intensity', '5',
                '-p', ports,
                '--min-rate', '500',
                '--max-retries', '2',
                '-oX', '-',
                target_str
            ]
            
            print(f"使用nmap扫描端口 {ports} 在目标: {target_str}")
            output = await self._run_nmap_command(nmap_args)
            devices = self._parse_xml_output(output)
            
            # 补充主机名和厂商信息
            for device in devices:
                if not device.hostname:
                    device.hostname = await self._get_hostname(device.ip)
                if device.mac and not device.vendor:
                    device.vendor = self._get_vendor_from_oui_db(device.mac)
            
            return devices
            
        except Exception as e:
            print(f"Nmap port scan error: {e}")
            # 如果nmap不可用，返回基础ping结果
            print("nmap端口扫描失败，进行基础连通性检测")
            devices = []
            for target in targets:
                device = await self.ping_host(target)
                if device:
                    devices.append(device)
            
            return devices
    
    async def comprehensive_scan(self, subnet: str) -> List[DeviceInfo]:
        """综合扫描：主机发现 + 端口扫描"""
        try:
            # 第一步：快速主机发现
            print(f"正在发现子网 {subnet} 中的活跃主机...")
            devices = await self.scan_subnet(subnet, "ping")
            
            if not devices:
                return []
            
            # 第二步：对发现的主机进行端口扫描
            active_ips = [d.ip for d in devices if d.is_online]
            print(f"发现 {len(active_ips)} 个活跃主机，开始端口扫描...")
            
            # 分批扫描避免超时
            batch_size = 10
            detailed_devices = []
            
            for i in range(0, len(active_ips), batch_size):
                batch = active_ips[i:i + batch_size]
                batch_results = await self.scan_ports(batch, "22,23,53,80,135,139,443,445,993,995")
                detailed_devices.extend(batch_results)
            
            return detailed_devices
            
        except Exception as e:
            print(f"Comprehensive scan error: {e}")
            return devices if 'devices' in locals() else []
    
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
                response_time = int(float(rtt) / 1000)  # 转换为毫秒
        
        # 解析端口信息（如果有的话）
        open_ports = []
        ports_element = host_element.find('ports')
        
        if ports_element is not None:
            for port in ports_element.findall('port'):
                state_elem = port.find('state')
                if state_elem is not None and state_elem.get('state') == 'open':
                    port_num = int(port.get('portid'))
                    open_ports.append(port_num)
        
        # 如果通过OUI数据库获取到更准确的厂商信息，优先使用
        if mac and not vendor:
            vendor = self._get_vendor_from_oui_db(mac)
        
        return DeviceInfo(
            ip=ip,
            mac=mac,
            hostname=hostname,
            vendor=vendor,
            is_online=True,
            response_time=response_time,
            open_ports=open_ports or []
        )
    
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
            if scan_type == "arp" or scan_type == "ping":
                # 使用nmap进行主机发现（优化后的参数配置）
                nmap_args = [
                    '-sn',  # Ping扫描，不扫描端口
                    '-PE',  # 使用ICMP echo ping（最可靠的方法，避免TCP ping误报）
                    '--min-rate', '100',  # 降低扫描速率避免误报
                    '--max-retries', '2',  # 增加重试次数提高准确性
                    '--host-timeout', '3s',  # 设置主机超时
                    '-oX', '-',  # XML输出
                    subnet
                ]
                
                print(f"使用nmap扫描子网 {subnet}...")
                output = await self._run_nmap_command(nmap_args)
                devices = self._parse_xml_output(output)
                
                # 补充MAC地址信息（通过ARP表）
                arp_devices = await self._scan_arp_table()
                arp_dict = {d.ip: d for d in arp_devices}
                
                # 补充信息：主机名、MAC地址和厂商
                for device in devices:
                    if device.is_online:
                        # 从ARP表补充MAC地址信息
                        if device.ip in arp_dict:
                            arp_device = arp_dict[device.ip]
                            if not device.mac:
                                device.mac = arp_device.mac
                            if not device.vendor:
                                device.vendor = arp_device.vendor
                        
                        # 补充主机名
                        if not device.hostname:
                            device.hostname = await self._get_hostname(device.ip)
                        
                        # 通过OUI数据库获取厂商信息
                        if device.mac and not device.vendor:
                            device.vendor = self._get_vendor_from_oui_db(device.mac)
                
                print(f"nmap扫描完成，发现 {len(devices)} 个设备")
                return devices
                
        except Exception as e:
            print(f"Nmap subnet scan error: {e}, 降级到传统方法")
        
        # 降级到传统方法
        try:
            network = ipaddress.IPv4Network(subnet, strict=False)
            
            if scan_type == "arp":
                devices = await self.arp_scan(subnet)
            elif scan_type == "ping":
                print(f"使用传统ping扫描子网 {subnet}...")
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
            
            # 为在线设备尝试获取主机名和厂商信息
            for device in devices:
                if device.is_online:
                    if not device.hostname:
                        device.hostname = await self._get_hostname(device.ip)
                    if device.mac and not device.vendor:
                        device.vendor = self._get_vendor_from_oui_db(device.mac)
                        
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

# 初始化扫描器配置
def init_scanner_config():
    """初始化扫描器配置"""
    try:
        from storage.file_storage import file_storage
        scanner.config = file_storage.get_scan_config()
        print(f"扫描器配置已加载: {scanner.config}")
    except Exception as e:
        print(f"加载扫描器配置失败: {e}")
        from models.scan_config import ScanPresets
        scanner.config = ScanPresets.balanced()
        print("使用默认平衡配置") 