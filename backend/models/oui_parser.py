import re
import os
import json
from typing import List, Tuple, Dict
from pathlib import Path

class OuiParser:
    def __init__(self, oui_file_path: str = None, cache_file_path: str = None):
        # 获取当前文件所在目录的父目录作为backend根目录
        backend_root = Path(__file__).parent.parent
        
        if oui_file_path is None:
            self.oui_file_path = str(backend_root / "oui.txt")
        else:
            self.oui_file_path = oui_file_path
            
        if cache_file_path is None:
            self.cache_file_path = backend_root / "storage" / "data" / "oui_cache.json"
        else:
            self.cache_file_path = Path(cache_file_path)
        self.cache_file_path.parent.mkdir(parents=True, exist_ok=True)
        self._oui_cache = None
    
    def parse_oui_file(self) -> List[Tuple[str, str, str]]:
        """解析OUI文件，返回(oui, vendor_name, vendor_address)的列表"""
        if not os.path.exists(self.oui_file_path):
            raise FileNotFoundError(f"OUI file not found: {self.oui_file_path}")
        
        oui_records = []
        current_oui = None
        current_vendor = None
        current_address_lines = []
        
        with open(self.oui_file_path, 'r', encoding='utf-8', errors='ignore') as file:
            for line in file:
                line = line.strip()
                
                # 匹配OUI记录行，格式如: "28-6F-B9   (hex)                Nokia Shanghai Bell Co., Ltd."
                # 支持带连字符和不带连字符的格式
                oui_match = re.match(r'^([0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}|[0-9A-F]{6})\s+\(hex\)\s+(.+)$', line)
                if oui_match:
                    # 保存前一个记录
                    if current_oui and current_vendor:
                        address = '\n'.join(current_address_lines).strip()
                        oui_records.append((current_oui, current_vendor, address))
                    
                    # 开始新记录
                    current_oui = oui_match.group(1).replace('-', '')  # 移除连字符，统一格式
                    current_vendor = oui_match.group(2).strip()
                    current_address_lines = []
                    continue
                
                # 匹配base 16记录行，格式如: "28-6F-B9     (base 16)		Nokia Shanghai Bell Co., Ltd."
                base16_match = re.match(r'^([0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2}|[0-9A-F]{6})\s+\(base 16\)\s+(.+)$', line)
                if base16_match:
                    # 这行通常重复厂商名称，跳过或用作验证
                    continue
                
                # 如果当前有OUI记录在处理，收集地址信息
                if current_oui and line and not line.startswith('\t\t\t'):
                    # 清理和格式化地址行
                    if line.strip():
                        current_address_lines.append(line.strip())
        
        # 保存最后一个记录
        if current_oui and current_vendor:
            address = '\n'.join(current_address_lines).strip()
            oui_records.append((current_oui, current_vendor, address))
        
        return oui_records
    
    def _load_cache(self) -> Dict[str, Dict[str, str]]:
        """加载OUI缓存"""
        if self._oui_cache is not None:
            return self._oui_cache
        
        try:
            if self.cache_file_path.exists():
                with open(self.cache_file_path, 'r', encoding='utf-8') as f:
                    self._oui_cache = json.load(f)
            else:
                self._oui_cache = {}
        except (FileNotFoundError, json.JSONDecodeError):
            self._oui_cache = {}
        
        return self._oui_cache
    
    def _save_cache(self, cache_data: Dict[str, Dict[str, str]]):
        """保存OUI缓存"""
        try:
            with open(self.cache_file_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            self._oui_cache = cache_data
        except Exception as e:
            print(f"Error saving OUI cache: {e}")
    
    def import_to_cache(self, batch_size: int = 1000) -> int:
        """将OUI数据导入缓存文件"""
        # 检查是否已经有缓存数据
        cache = self._load_cache()
        if cache:
            print(f"Cache already contains {len(cache)} OUI records. Skipping import.")
            return len(cache)
        
        print("Parsing OUI file...")
        try:
            oui_records = self.parse_oui_file()
            print(f"Found {len(oui_records)} OUI records")
            
            print("Building cache...")
            cache_data = {}
            
            for oui, vendor_name, vendor_address in oui_records:
                cache_data[oui] = {
                    'vendor_name': vendor_name,
                    'vendor_address': vendor_address
                }
            
            # 保存到缓存文件
            self._save_cache(cache_data)
            print(f"Successfully cached {len(cache_data)} OUI records")
            return len(cache_data)
            
        except Exception as e:
            print(f"Error importing OUI data: {e}")
            raise
    
    def lookup_vendor(self, mac_address: str) -> str:
        """根据MAC地址查找厂商信息"""
        if not mac_address:
            return None
        
        # 提取OUI (前6位)
        oui = mac_address.replace(':', '').replace('-', '').upper()[:6]
        
        # 加载缓存
        cache = self._load_cache()
        
        # 查找厂商信息
        vendor_info = cache.get(oui)
        return vendor_info['vendor_name'] if vendor_info else None
    
    def get_vendor_details(self, mac_address: str) -> Dict[str, str]:
        """根据MAC地址获取详细的厂商信息"""
        if not mac_address:
            return None
        
        # 提取OUI (前6位)
        oui = mac_address.replace(':', '').replace('-', '').upper()[:6]
        
        # 加载缓存
        cache = self._load_cache()
        
        # 返回详细信息
        return cache.get(oui)
    
    def get_stats(self) -> Dict[str, int]:
        """获取OUI缓存统计信息"""
        cache = self._load_cache()
        return {
            'total_records': len(cache),
            'cache_size_bytes': self.cache_file_path.stat().st_size if self.cache_file_path.exists() else 0
        }

def init_oui_database():
    """初始化OUI缓存"""
    parser = OuiParser()
    return parser.import_to_cache()

# 创建全局实例
oui_parser = OuiParser() 