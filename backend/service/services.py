import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from models.models import Device, ScanRecord, ScanSession
from scanner.scanner import scanner, DeviceInfo
from database.database import SessionLocal

class DeviceService:
    def __init__(self):
        self.scanning = False
        self.scan_interval = 300  # 5分钟扫描一次
        
    def get_device_by_ip(self, db: Session, ip: str) -> Optional[Device]:
        """根据IP获取设备"""
        return db.query(Device).filter(Device.ip_address == ip).first()
    
    def get_all_devices(self, db: Session, skip: int = 0, limit: int = 100) -> List[Device]:
        """获取所有设备"""
        return db.query(Device).offset(skip).limit(limit).all()
    
    def get_online_devices(self, db: Session) -> List[Device]:
        """获取在线设备"""
        return db.query(Device).filter(Device.is_online == True).all()
    
    def get_device_history(self, db: Session, device_id: int, hours: int = 24) -> List[ScanRecord]:
        """获取设备历史记录"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return db.query(ScanRecord)\
            .filter(and_(ScanRecord.device_id == device_id, ScanRecord.scan_time >= since))\
            .order_by(desc(ScanRecord.scan_time))\
            .all()
    
    def create_or_update_device(self, db: Session, device_info: DeviceInfo) -> Device:
        """创建或更新设备信息"""
        device = self.get_device_by_ip(db, device_info.ip)
        
        if device:
            # 更新现有设备
            device.last_seen = datetime.utcnow()
            device.is_online = device_info.is_online
            
            if device_info.mac and not device.mac_address:
                device.mac_address = device_info.mac
            if device_info.hostname and not device.hostname:
                device.hostname = device_info.hostname
            if device_info.vendor and not device.vendor:
                device.vendor = device_info.vendor
        else:
            # 创建新设备
            device = Device(
                ip_address=device_info.ip,
                mac_address=device_info.mac,
                hostname=device_info.hostname,
                vendor=device_info.vendor,
                is_online=device_info.is_online,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            db.add(device)
        
        # 提交以获取ID
        db.commit()
        db.refresh(device)
        
        # 创建扫描记录
        scan_record = ScanRecord(
            device_id=device.id,
            is_online=device_info.is_online,
            response_time=device_info.response_time,
            scan_time=datetime.utcnow()
        )
        db.add(scan_record)
        db.commit()
        
        return device
    
    def mark_device_offline(self, db: Session, device: Device):
        """标记设备为离线"""
        device.is_online = False
        device.last_seen = datetime.utcnow()
        
        # 添加离线记录
        scan_record = ScanRecord(
            device_id=device.id,
            is_online=False,
            scan_time=datetime.utcnow()
        )
        db.add(scan_record)
        db.commit()
    
    async def scan_network(self, subnet: str = None, scan_type: str = "ping") -> dict:
        """扫描网络"""
        if self.scanning:
            return {"status": "error", "message": "Scan already in progress"}
        
        self.scanning = True
        db = SessionLocal()
        
        try:
            # 获取子网
            if not subnet:
                subnet = await scanner.get_local_subnet()
            
            # 创建扫描会话
            scan_session = ScanSession(
                subnet=subnet,
                scan_type=scan_type,
                start_time=datetime.utcnow()
            )
            db.add(scan_session)
            db.commit()
            
            # 执行扫描
            devices_found = await scanner.scan_subnet(subnet, scan_type)
            
            # 获取当前在线设备IP列表
            online_ips = {device.ip for device in devices_found if device.is_online}
            
            # 更新或创建设备记录
            for device_info in devices_found:
                self.create_or_update_device(db, device_info)
            
            # 标记不在扫描结果中的设备为离线
            existing_devices = db.query(Device).filter(Device.is_online == True).all()
            for device in existing_devices:
                if device.ip_address not in online_ips:
                    self.mark_device_offline(db, device)
            
            # 更新扫描会话
            scan_session.end_time = datetime.utcnow()
            scan_session.devices_found = len(devices_found)
            db.commit()
            
            return {
                "status": "success",
                "subnet": subnet,
                "devices_found": len(devices_found),
                "scan_type": scan_type,
                "duration": (scan_session.end_time - scan_session.start_time).total_seconds()
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            self.scanning = False
            db.close()
    
    async def start_periodic_scan(self):
        """启动周期性扫描"""
        while True:
            try:
                print(f"Starting periodic scan at {datetime.now()}")
                result = await self.scan_network()
                print(f"Scan completed: {result}")
                
                await asyncio.sleep(self.scan_interval)
            except Exception as e:
                print(f"Periodic scan error: {e}")
                await asyncio.sleep(60)  # 出错时等待1分钟再重试
    
    def get_scan_sessions(self, db: Session, limit: int = 10) -> List[ScanSession]:
        """获取扫描会话历史"""
        return db.query(ScanSession)\
            .order_by(desc(ScanSession.start_time))\
            .limit(limit)\
            .all()
    
    def get_network_stats(self, db: Session) -> dict:
        """获取网络统计信息"""
        total_devices = db.query(Device).count()
        online_devices = db.query(Device).filter(Device.is_online == True).count()
        offline_devices = total_devices - online_devices
        
        # 最近24小时的扫描次数
        since = datetime.utcnow() - timedelta(hours=24)
        recent_scans = db.query(ScanSession)\
            .filter(ScanSession.start_time >= since)\
            .count()
        
        return {
            "total_devices": total_devices,
            "online_devices": online_devices,
            "offline_devices": offline_devices,
            "recent_scans": recent_scans
        }
    
    def update_device_alias(self, db: Session, device_id: int, custom_name: str) -> Device:
        """更新设备自定义别名"""
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise ValueError("Device not found")
        
        device.custom_name = custom_name.strip() if custom_name else None
        db.commit()
        db.refresh(device)
        return device
    
    def update_device_alias_by_mac(self, db: Session, mac_address: str, custom_name: str) -> Device:
        """通过MAC地址更新设备别名"""
        device = db.query(Device).filter(Device.mac_address == mac_address).first()
        if not device:
            raise ValueError("Device not found")
        
        device.custom_name = custom_name.strip() if custom_name else None
        db.commit()
        db.refresh(device)
        return device
    
    def search_devices(self, db: Session, query: str) -> List[Device]:
        """搜索设备（根据IP、MAC、主机名、别名、厂商）"""
        query = f"%{query}%"
        return db.query(Device).filter(
            db.or_(
                Device.ip_address.like(query),
                Device.mac_address.like(query),
                Device.hostname.like(query),
                Device.custom_name.like(query),
                Device.vendor.like(query)
            )
        ).all()

# 服务实例
device_service = DeviceService() 