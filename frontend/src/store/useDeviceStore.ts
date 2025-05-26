import { create } from 'zustand';
import { Device, NetworkStats, ScanStatus, ScanSession } from '../types';

interface DeviceStore {
  // 状态
  devices: Device[];
  onlineDevices: Device[];
  networkStats: NetworkStats | null;
  scanStatus: ScanStatus | null;
  scanSessions: ScanSession[];
  searchQuery: string;
  selectedDevice: Device | null;
  isLoading: boolean;
  error: string | null;
  
  // 过滤和搜索
  filteredDevices: Device[];
  deviceFilter: 'all' | 'online' | 'offline';
  
  // Actions
  setDevices: (devices: Device[]) => void;
  setOnlineDevices: (devices: Device[]) => void;
  setNetworkStats: (stats: NetworkStats) => void;
  setScanStatus: (status: ScanStatus) => void;
  setScanSessions: (sessions: ScanSession[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedDevice: (device: Device | null) => void;
  setDeviceFilter: (filter: 'all' | 'online' | 'offline') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 更新单个设备
  updateDevice: (deviceId: number, updates: Partial<Device>) => void;
  
  // 内部方法
  updateFilteredDevices: () => void;
  
  // 清除状态
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  devices: [],
  onlineDevices: [],
  networkStats: null,
  scanStatus: null,
  scanSessions: [],
  searchQuery: '',
  selectedDevice: null,
  isLoading: false,
  error: null,
  filteredDevices: [],
  deviceFilter: 'all' as const,
};

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  ...initialState,
  
  setDevices: (devices) => {
    set({ devices });
    // 更新过滤后的设备列表
    get().updateFilteredDevices();
  },
  
  setOnlineDevices: (onlineDevices) => set({ onlineDevices }),
  
  setNetworkStats: (networkStats) => set({ networkStats }),
  
  setScanStatus: (scanStatus) => set({ scanStatus }),
  
  setScanSessions: (scanSessions) => set({ scanSessions }),
  
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().updateFilteredDevices();
  },
  
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  
  setDeviceFilter: (deviceFilter) => {
    set({ deviceFilter });
    get().updateFilteredDevices();
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  updateDevice: (deviceId, updates) => {
    const { devices } = get();
    const updatedDevices = devices.map(device => 
      device.id === deviceId ? { ...device, ...updates } : device
    );
    set({ devices: updatedDevices });
    get().updateFilteredDevices();
  },
  
  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
  
  // 内部方法：更新过滤后的设备列表
  updateFilteredDevices: () => {
    const { devices, searchQuery, deviceFilter } = get();
    let filtered = devices;
    
    // 按状态过滤
    if (deviceFilter === 'online') {
      filtered = filtered.filter(device => device.is_online);
    } else if (deviceFilter === 'offline') {
      filtered = filtered.filter(device => !device.is_online);
    }
    
    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(device => 
        device.ip_address.toLowerCase().includes(query) ||
        (device.mac_address && device.mac_address.toLowerCase().includes(query)) ||
        (device.hostname && device.hostname.toLowerCase().includes(query)) ||
        (device.custom_name && device.custom_name.toLowerCase().includes(query)) ||
        (device.vendor && device.vendor.toLowerCase().includes(query)) ||
        (device.device_type && device.device_type.toLowerCase().includes(query))
      );
    }
    
    set({ filteredDevices: filtered });
  },
}));

// 为了方便调试，将store暴露到window对象
if (typeof window !== 'undefined') {
  (window as any).deviceStore = useDeviceStore;
} 