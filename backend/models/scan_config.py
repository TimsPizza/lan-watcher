from dataclasses import dataclass, field
from typing import List, Optional
import ipaddress


@dataclass
class ScanConfig:
    """扫描配置类"""

    # 网络配置
    subnet_cidr: Optional[str] = None  # 手动指定子网，如 "192.168.1.0/24"
    auto_detect_subnet: bool = True  # 自动检测子网
    exclude_ips: List[str] = field(default_factory=list)  # 排除的IP地址

    # 性能参数
    scan_rate: int = 100  # nmap扫描速率 (packets/second)
    max_workers: int = 50  # 最大并发扫描工作线程
    scan_timeout: str = "3s"  # 单个扫描超时时间
    max_retries: int = 2  # 最大重试次数

    # 功能开关
    resolve_hostnames: bool = True  # 是否解析主机名
    fetch_vendor_info: bool = True  # 是否获取厂商信息
    arp_lookup_enabled: bool = True  # 是否启用ARP表查找
    fallback_enabled: bool = True  # 是否启用降级扫描方法

    # 高级选项
    ping_methods: List[str] = field(default_factory=lambda: ["icmp"])  # ping方法
    tcp_ping_ports: List[int] = field(
        default_factory=lambda: [22, 80, 443]
    )  # TCP ping端口
    ack_ping_ports: List[int] = field(default_factory=lambda: [80])  # ACK ping端口

    # 扫描类型配置
    enable_port_scan: bool = False  # 是否启用端口扫描
    port_range: str = "1-1000"  # 端口扫描范围

    def __post_init__(self):
        """初始化后验证配置"""
        self.validate()

    def validate(self) -> None:
        """验证配置参数"""
        # 验证子网CIDR格式
        if self.subnet_cidr:
            try:
                ipaddress.IPv4Network(self.subnet_cidr, strict=False)
            except ValueError:
                raise ValueError(f"无效的子网CIDR格式: {self.subnet_cidr}")

        # 验证排除IP格式
        for ip in self.exclude_ips:
            try:
                ipaddress.IPv4Address(ip)
            except ValueError:
                raise ValueError(f"无效的IP地址: {ip}")

        # 验证数值范围
        if not 1 <= self.scan_rate <= 1000:
            raise ValueError("扫描速率必须在1-1000之间")

        if not 1 <= self.max_workers <= 200:
            raise ValueError("最大工作线程数必须在1-200之间")

        if not 0 <= self.max_retries <= 5:
            raise ValueError("最大重试次数必须在0-5之间")

        # 验证超时格式 (支持 "3s", "1000ms" 等格式)
        if not self._validate_timeout_format(self.scan_timeout):
            raise ValueError(f"无效的超时格式: {self.scan_timeout}")

        # 验证ping方法
        valid_methods = ["icmp", "tcp_syn", "tcp_ack", "udp"]
        for method in self.ping_methods:
            if method not in valid_methods:
                raise ValueError(f"无效的ping方法: {method}. 支持: {valid_methods}")

        # 验证端口列表
        for port in self.tcp_ping_ports + self.ack_ping_ports:
            if not 1 <= port <= 65535:
                raise ValueError(f"端口号必须在1-65535之间: {port}")

    def _validate_timeout_format(self, timeout: str) -> bool:
        """验证超时格式"""
        import re

        pattern = r"^\d+(?:\.\d+)?[smh]?$"
        return bool(re.match(pattern, timeout))

    def get_nmap_args(self, target: str) -> List[str]:
        """根据配置生成nmap参数"""
        args = []

        # 基础ping扫描参数
        args.append("-sn")  # 主机发现，不扫描端口

        # 根据ping方法添加参数
        if "icmp" in self.ping_methods:
            args.append("-PE")  # ICMP echo ping

        if "tcp_syn" in self.ping_methods and self.tcp_ping_ports:
            ports_str = ",".join(map(str, self.tcp_ping_ports))
            args.extend(["-PS" + ports_str])  # TCP SYN ping

        if "tcp_ack" in self.ping_methods and self.ack_ping_ports:
            ports_str = ",".join(map(str, self.ack_ping_ports))
            args.extend(["-PA" + ports_str])  # TCP ACK ping

        if "udp" in self.ping_methods:
            args.append("-PU")  # UDP ping
            
        # 性能参数
        args.extend(["--max-retries", str(self.max_retries)])
        args.extend(["--min-rate", str(self.scan_rate)])
        args.extend(["--host-timeout", self.scan_timeout])

        # 输出格式
        args.extend(["-oX", "-"])  # XML输出到stdout

        # 目标
        args.append(target)

        return args

    def should_exclude_ip(self, ip: str) -> bool:
        """检查IP是否应该被排除"""
        return ip in self.exclude_ips

    def get_effective_subnet(self, detected_subnet: str) -> str:
        """获取有效的扫描子网"""
        if self.auto_detect_subnet and not self.subnet_cidr:
            return detected_subnet
        elif self.subnet_cidr:
            return self.subnet_cidr
        else:
            return detected_subnet


# 预设配置模式
class ScanPresets:
    """预设扫描配置"""

    @staticmethod
    def fast() -> ScanConfig:
        """快速扫描模式 - 适合快速发现设备"""
        return ScanConfig(
            scan_rate=300,
            max_workers=100,
            scan_timeout="1s",
            max_retries=1,
            resolve_hostnames=False,
            fetch_vendor_info=False,
            ping_methods=["icmp"],
            tcp_ping_ports=[80],
            ack_ping_ports=[],
        )

    @staticmethod
    def balanced() -> ScanConfig:
        """平衡模式 - 速度和准确性平衡"""
        return ScanConfig(
            scan_rate=100,
            max_workers=50,
            scan_timeout="3s",
            max_retries=2,
            resolve_hostnames=True,
            fetch_vendor_info=True,
            ping_methods=["icmp"],
            tcp_ping_ports=[22, 80, 443],
            ack_ping_ports=[80],
        )

    @staticmethod
    def thorough() -> ScanConfig:
        """详细扫描模式 - 最大准确性"""
        return ScanConfig(
            scan_rate=50,
            max_workers=30,
            scan_timeout="5s",
            max_retries=3,
            resolve_hostnames=True,
            fetch_vendor_info=True,
            ping_methods=["icmp", "tcp_syn", "tcp_ack"],
            tcp_ping_ports=[22, 23, 25, 53, 80, 110, 443, 993, 995],
            ack_ping_ports=[80, 443],
        )

    @staticmethod
    def stealth() -> ScanConfig:
        """隐蔽扫描模式 - 减少网络影响"""
        return ScanConfig(
            scan_rate=10,
            max_workers=10,
            scan_timeout="10s",
            max_retries=1,
            resolve_hostnames=False,
            fetch_vendor_info=True,
            ping_methods=["tcp_syn"],
            tcp_ping_ports=[80, 443],
            ack_ping_ports=[],
        )
