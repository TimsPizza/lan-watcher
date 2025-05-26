from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class OuiVendor(Base):
    """OUI厂商信息表"""
    __tablename__ = "oui_vendors"
    
    id = Column(Integer, primary_key=True, index=True)
    oui = Column(String(8), unique=True, index=True, nullable=False)  # MAC前缀，如 "001B21"
    vendor_name = Column(Text, nullable=False)
    vendor_address = Column(Text)

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(15), unique=True, index=True, nullable=False)
    mac_address = Column(String(17), index=True)
    hostname = Column(String(255))
    device_type = Column(String(100))
    vendor = Column(String(255))  # 从OUI数据库查到的厂商
    custom_name = Column(String(255))  # 用户自定义别名
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    open_ports = Column(Text)  # JSON string of open ports
    
    # 关系
    scan_records = relationship("ScanRecord", back_populates="device")

class ScanRecord(Base):
    __tablename__ = "scan_records"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    scan_time = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, nullable=False)
    response_time = Column(Integer)  # ping 响应时间 (ms)
    
    # 关系
    device = relationship("Device", back_populates="scan_records")

class ScanSession(Base):
    __tablename__ = "scan_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    subnet = Column(String(18))  # 如 192.168.1.0/24
    devices_found = Column(Integer, default=0)
    scan_type = Column(String(50))  # "arp", "ping", "nmap" 

class AppSettings(Base):
    """应用设置表"""
    __tablename__ = "app_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChartConfig(Base):
    """图表配置表"""
    __tablename__ = "chart_config"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 