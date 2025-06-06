#!/usr/bin/env python3
"""
LAN Watcher 配置管理工具

使用方法:
    python config_manager.py show                  # 显示当前配置
    python config_manager.py presets               # 列出可用预设
    python config_manager.py load <preset>         # 加载预设配置
    python config_manager.py set <key> <value>     # 设置配置项
    python config_manager.py test-network <cidr>   # 测试网络配置
"""

import os
import sys
import argparse
import json
from typing import Any, Dict

# 添加backend目录到路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from models.scan_config import ScanConfig, ScanPresets
from service.services import scan_config_service

def show_config():
    """显示当前配置"""
    try:
        config = scan_config_service.get_scan_config()
        
        print("=== 当前扫描配置 ===\n")
        print(f"网络配置:")
        print(f"  子网 CIDR: {config.subnet_cidr or '自动检测'}")
        print(f"  自动检测子网: {'是' if config.auto_detect_subnet else '否'}")
        print(f"  排除IP: {config.exclude_ips or '无'}")
        
        print(f"\n性能参数:")
        print(f"  扫描速率: {config.scan_rate} 包/秒")
        print(f"  最大工作线程: {config.max_workers}")
        print(f"  扫描超时: {config.scan_timeout}")
        print(f"  最大重试: {config.max_retries}")
        
        print(f"\n功能开关:")
        print(f"  解析主机名: {'是' if config.resolve_hostnames else '否'}")
        print(f"  获取厂商信息: {'是' if config.fetch_vendor_info else '否'}")
        print(f"  ARP表查找: {'是' if config.arp_lookup_enabled else '否'}")
        print(f"  降级扫描: {'是' if config.fallback_enabled else '否'}")
        
        print(f"\n高级选项:")
        print(f"  Ping方法: {', '.join(config.ping_methods)}")
        print(f"  TCP Ping端口: {config.tcp_ping_ports}")
        print(f"  ACK Ping端口: {config.ack_ping_ports}")
        
        print(f"\n扫描类型:")
        print(f"  端口扫描: {'启用' if config.enable_port_scan else '禁用'}")
        print(f"  端口范围: {config.port_range}")
        
    except Exception as e:
        print(f"错误: 无法获取配置 - {e}")
        return False
    
    return True

def list_presets():
    """列出可用预设"""
    try:
        presets = scan_config_service.get_available_presets()
        
        print("=== 可用预设配置 ===\n")
        for preset in presets:
            print(f"{preset['name'].upper()}:")
            print(f"  显示名称: {preset['display_name']}")
            print(f"  描述: {preset['description']}")
            print()
        
        print("使用方法: python config_manager.py load <preset_name>")
        
    except Exception as e:
        print(f"错误: 无法获取预设列表 - {e}")
        return False
    
    return True

def load_preset(preset_name: str):
    """加载预设配置"""
    try:
        config = scan_config_service.load_preset(preset_name)
        print(f"✓ 已加载 '{preset_name}' 预设配置")
        print(f"  扫描速率: {config.scan_rate} 包/秒")
        print(f"  超时时间: {config.scan_timeout}")
        print(f"  Ping方法: {', '.join(config.ping_methods)}")
        
    except ValueError as e:
        print(f"错误: {e}")
        return False
    except Exception as e:
        print(f"错误: 无法加载预设 - {e}")
        return False
    
    return True

def set_config_value(key: str, value: str):
    """设置配置项"""
    try:
        # 获取当前配置
        config = scan_config_service.get_scan_config()
        
        # 配置项映射和类型转换
        config_map = {
            'subnet_cidr': (str, 'subnet_cidr'),
            'auto_detect_subnet': (bool, 'auto_detect_subnet'),
            'scan_rate': (int, 'scan_rate'),
            'max_workers': (int, 'max_workers'),
            'scan_timeout': (str, 'scan_timeout'),
            'max_retries': (int, 'max_retries'),
            'resolve_hostnames': (bool, 'resolve_hostnames'),
            'fetch_vendor_info': (bool, 'fetch_vendor_info'),
            'arp_lookup_enabled': (bool, 'arp_lookup_enabled'),
            'fallback_enabled': (bool, 'fallback_enabled'),
            'enable_port_scan': (bool, 'enable_port_scan'),
            'port_range': (str, 'port_range')
        }
        
        if key not in config_map:
            print(f"错误: 未知的配置项 '{key}'")
            print("可用配置项:", ', '.join(config_map.keys()))
            return False
        
        value_type, attr_name = config_map[key]
        
        # 类型转换
        if value_type == bool:
            parsed_value = value.lower() in ('true', '1', 'yes', 'on', '是')
        elif value_type == int:
            parsed_value = int(value)
        elif value_type == str:
            parsed_value = value if value.lower() != 'null' else None
        else:
            parsed_value = value
        
        # 设置新值
        setattr(config, attr_name, parsed_value)
        
        # 保存配置
        scan_config_service.update_scan_config(config)
        
        print(f"✓ 已设置 {key} = {parsed_value}")
        
    except ValueError as e:
        print(f"错误: 无效的值 '{value}' for '{key}' - {e}")
        return False
    except Exception as e:
        print(f"错误: 无法设置配置 - {e}")
        return False
    
    return True

def test_network(cidr: str):
    """测试网络配置"""
    try:
        result = scan_config_service.test_network_config(cidr)
        
        if result['valid']:
            print(f"✓ 网络配置有效: {cidr}")
            print(f"  网络地址: {result['network_address']}")
            print(f"  广播地址: {result['broadcast_address']}")
            print(f"  可用主机数: {result['num_hosts']}")
            print(f"  前缀长度: /{result['prefix_length']}")
        else:
            print(f"✗ 网络配置无效: {result['error']}")
            return False
        
    except Exception as e:
        print(f"错误: 无法测试网络配置 - {e}")
        return False
    
    return True

def export_config(filename: str = None):
    """导出配置到文件"""
    try:
        config = scan_config_service.get_scan_config()
        
        # 转换为字典
        config_dict = {
            'subnet_cidr': config.subnet_cidr,
            'auto_detect_subnet': config.auto_detect_subnet,
            'exclude_ips': config.exclude_ips,
            'scan_rate': config.scan_rate,
            'max_workers': config.max_workers,
            'scan_timeout': config.scan_timeout,
            'max_retries': config.max_retries,
            'resolve_hostnames': config.resolve_hostnames,
            'fetch_vendor_info': config.fetch_vendor_info,
            'arp_lookup_enabled': config.arp_lookup_enabled,
            'fallback_enabled': config.fallback_enabled,
            'ping_methods': config.ping_methods,
            'tcp_ping_ports': config.tcp_ping_ports,
            'ack_ping_ports': config.ack_ping_ports,
            'enable_port_scan': config.enable_port_scan,
            'port_range': config.port_range
        }
        
        if not filename:
            filename = 'scan_config_export.json'
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
        
        print(f"✓ 配置已导出到 {filename}")
        
    except Exception as e:
        print(f"错误: 无法导出配置 - {e}")
        return False
    
    return True

def import_config(filename: str):
    """从文件导入配置"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            config_dict = json.load(f)
        
        # 创建配置对象
        config = ScanConfig(**config_dict)
        
        # 保存配置
        scan_config_service.update_scan_config(config)
        
        print(f"✓ 配置已从 {filename} 导入")
        print(f"  扫描速率: {config.scan_rate} 包/秒")
        print(f"  超时时间: {config.scan_timeout}")
        
    except FileNotFoundError:
        print(f"错误: 文件 '{filename}' 不存在")
        return False
    except json.JSONDecodeError as e:
        print(f"错误: 无效的JSON格式 - {e}")
        return False
    except ValueError as e:
        print(f"错误: 无效的配置数据 - {e}")
        return False
    except Exception as e:
        print(f"错误: 无法导入配置 - {e}")
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(
        description="LAN Watcher 配置管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  %(prog)s show                           # 显示当前配置
  %(prog)s presets                        # 列出可用预设
  %(prog)s load balanced                  # 加载平衡模式
  %(prog)s set scan_rate 200              # 设置扫描速率
  %(prog)s set resolve_hostnames false    # 禁用主机名解析
  %(prog)s test-network 192.168.1.0/24   # 测试网络配置
  %(prog)s export my_config.json          # 导出配置
  %(prog)s import my_config.json          # 导入配置
"""
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # show命令
    subparsers.add_parser('show', help='显示当前配置')
    
    # presets命令
    subparsers.add_parser('presets', help='列出可用预设')
    
    # load命令
    load_parser = subparsers.add_parser('load', help='加载预设配置')
    load_parser.add_argument('preset', help='预设名称 (fast/balanced/thorough/stealth)')
    
    # set命令
    set_parser = subparsers.add_parser('set', help='设置配置项')
    set_parser.add_argument('key', help='配置项名称')
    set_parser.add_argument('value', help='配置项值')
    
    # test-network命令
    test_parser = subparsers.add_parser('test-network', help='测试网络配置')
    test_parser.add_argument('cidr', help='网络CIDR (如: 192.168.1.0/24)')
    
    # export命令
    export_parser = subparsers.add_parser('export', help='导出配置到文件')
    export_parser.add_argument('filename', nargs='?', help='输出文件名 (默认: scan_config_export.json)')
    
    # import命令
    import_parser = subparsers.add_parser('import', help='从文件导入配置')
    import_parser.add_argument('filename', help='配置文件名')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # 执行命令
    success = True
    
    if args.command == 'show':
        success = show_config()
    elif args.command == 'presets':
        success = list_presets()
    elif args.command == 'load':
        success = load_preset(args.preset)
    elif args.command == 'set':
        success = set_config_value(args.key, args.value)
    elif args.command == 'test-network':
        success = test_network(args.cidr)
    elif args.command == 'export':
        success = export_config(args.filename)
    elif args.command == 'import':
        success = import_config(args.filename)
    
    return 0 if success else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n操作被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n意外错误: {e}")
        sys.exit(1) 