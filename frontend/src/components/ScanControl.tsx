import React, { useState } from 'react';
import { ScanStatus } from '../types';
import { useTriggerScan, useSetScanInterval } from '../hooks/useDevices';

interface ScanControlProps {
  scanStatus: ScanStatus | null;
  isLoading?: boolean;
  className?: string;
}

export const ScanControl: React.FC<ScanControlProps> = ({
  scanStatus,
  isLoading = false,
  className = ''
}) => {
  const [customSubnet, setCustomSubnet] = useState('');
  const [scanType, setScanType] = useState<'ping' | 'arp'>('ping');
  const [intervalValue, setIntervalValue] = useState(scanStatus?.scan_interval || 300);
  const [showIntervalInput, setShowIntervalInput] = useState(false);

  const triggerScanMutation = useTriggerScan();
  const setScanIntervalMutation = useSetScanInterval();

  const handleManualScan = () => {
    triggerScanMutation.mutate({
      subnet: customSubnet.trim() || undefined,
      scanType
    });
  };

  const handleSetInterval = () => {
    if (intervalValue >= 60 && intervalValue <= 3600) {
      setScanIntervalMutation.mutate(intervalValue);
      setShowIntervalInput(false);
    }
  };

  const formatScanInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}分钟`;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">扫描控制</h2>

      {/* 扫描状态指示器 */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            scanStatus?.scanning ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className="text-sm font-medium">
            {scanStatus?.scanning ? '正在扫描...' : '待机状态'}
          </span>
        </div>
        
        {scanStatus && (
          <div className="text-sm text-gray-500">
            自动扫描间隔：{formatScanInterval(scanStatus.scan_interval)}
          </div>
        )}
      </div>

      {/* 手动扫描控件 */}
      <div className="space-y-4 mb-6">
        <h3 className="text-md font-medium text-gray-800">手动扫描</h3>
        
        {/* 扫描类型选择 */}
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="ping"
              checked={scanType === 'ping'}
              onChange={(e) => setScanType(e.target.value as 'ping')}
              className="mr-2"
            />
            Ping扫描
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="arp"
              checked={scanType === 'arp'}
              onChange={(e) => setScanType(e.target.value as 'arp')}
              className="mr-2"
            />
            ARP扫描
          </label>
        </div>

        {/* 自定义子网 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            指定子网（可选）
          </label>
          <input
            type="text"
            value={customSubnet}
            onChange={(e) => setCustomSubnet(e.target.value)}
            placeholder="例如：192.168.1.0/24"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            留空则使用默认网络配置
          </p>
        </div>

        {/* 扫描按钮 */}
        <button
          onClick={handleManualScan}
          disabled={triggerScanMutation.isLoading || scanStatus?.scanning}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {triggerScanMutation.isLoading ? '扫描中...' : '开始扫描'}
        </button>
      </div>

      {/* 间隔设置 */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium text-gray-800 mb-3">自动扫描设置</h3>
        
        {showIntervalInput ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                扫描间隔（秒）
              </label>
              <input
                type="number"
                min="60"
                max="3600"
                value={intervalValue}
                onChange={(e) => setIntervalValue(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                范围：60-3600秒（1分钟-1小时）
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleSetInterval}
                disabled={setScanIntervalMutation.isLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowIntervalInput(false);
                  setIntervalValue(scanStatus?.scan_interval || 300);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowIntervalInput(true)}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors border"
          >
            修改扫描间隔
          </button>
        )}
      </div>
    </div>
  );
}; 