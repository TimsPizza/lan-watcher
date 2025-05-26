import re
import os
from typing import List, Tuple
from sqlalchemy.orm import Session
from database.database import SessionLocal, create_tables
from models.models import OuiVendor

class OuiParser:
    def __init__(self, oui_file_path: str = "oui.txt"):
        self.oui_file_path = oui_file_path
    
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
                
                # 匹配OUI记录行，格式如: "001B21     (hex)		Intel Corporate"
                oui_match = re.match(r'^([0-9A-F]{6})\s+\(hex\)\s+(.+)$', line)
                if oui_match:
                    # 保存前一个记录
                    if current_oui and current_vendor:
                        address = '\n'.join(current_address_lines).strip()
                        oui_records.append((current_oui, current_vendor, address))
                    
                    # 开始新记录
                    current_oui = oui_match.group(1)
                    current_vendor = oui_match.group(2).strip()
                    current_address_lines = []
                    continue
                
                # 匹配base 16记录行，格式如: "001B21     (base 16)		Intel Corporate"
                base16_match = re.match(r'^([0-9A-F]{6})\s+\(base 16\)\s+(.+)$', line)
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
    
    def import_to_database(self, batch_size: int = 1000) -> int:
        """将OUI数据导入数据库"""
        # 确保表已创建
        create_tables()
        
        db = SessionLocal()
        try:
            # 检查是否已经导入过数据
            existing_count = db.query(OuiVendor).count()
            if existing_count > 0:
                print(f"Database already contains {existing_count} OUI records. Skipping import.")
                return existing_count
            
            print("Parsing OUI file...")
            oui_records = self.parse_oui_file()
            print(f"Found {len(oui_records)} OUI records")
            
            print("Importing to database...")
            imported_count = 0
            
            for i in range(0, len(oui_records), batch_size):
                batch = oui_records[i:i + batch_size]
                oui_objects = []
                
                for oui, vendor_name, vendor_address in batch:
                    oui_obj = OuiVendor(
                        oui=oui,
                        vendor_name=vendor_name,
                        vendor_address=vendor_address
                    )
                    oui_objects.append(oui_obj)
                
                db.add_all(oui_objects)
                db.commit()
                imported_count += len(batch)
                
                if imported_count % (batch_size * 10) == 0:
                    print(f"Imported {imported_count}/{len(oui_records)} records...")
            
            print(f"Successfully imported {imported_count} OUI records")
            return imported_count
            
        except Exception as e:
            db.rollback()
            print(f"Error importing OUI data: {e}")
            raise
        finally:
            db.close()
    
    def lookup_vendor(self, mac_address: str) -> str:
        """根据MAC地址查找厂商信息"""
        if not mac_address:
            return None
        
        # 提取OUI (前6位)
        oui = mac_address.replace(':', '').replace('-', '').upper()[:6]
        
        db = SessionLocal()
        try:
            vendor = db.query(OuiVendor).filter(OuiVendor.oui == oui).first()
            return vendor.vendor_name if vendor else None
        finally:
            db.close()

def init_oui_database():
    """初始化OUI数据库"""
    parser = OuiParser()
    return parser.import_to_database()

# 创建全局实例
oui_parser = OuiParser() 