import React from 'react';
import { format, subDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock } from 'react-icons/fi';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  maxRetentionDays: number;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateChange,
  maxRetentionDays,
  className = ''
}) => {
  const today = new Date();
  const earliestDate = subDays(today, maxRetentionDays - 1);
  
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  const isEarliest = format(selectedDate, 'yyyy-MM-dd') === format(earliestDate, 'yyyy-MM-dd');

  const handlePrevDay = () => {
    if (!isEarliest) {
      onDateChange(subDays(selectedDate, 1));
    }
  };

  const handleNextDay = () => {
    if (!isToday) {
      onDateChange(addDays(selectedDate, 1));
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (newDate >= earliestDate && newDate <= today) {
      onDateChange(newDate);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 主要日期控制 */}
      <div className="flex items-center justify-center sm:justify-start space-x-3">
        {/* 前一天按钮 */}
        <button
          onClick={handlePrevDay}
          disabled={isEarliest}
          className={`p-3 rounded-xl border transition-all duration-200 ${
            isEarliest
              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
              : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-sm hover:shadow-md'
          }`}
          title={isEarliest ? '已到最早日期' : '前一天'}
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>

        {/* 日期选择器 */}
        <div className="flex items-center space-x-3 px-4 py-3 border border-gray-300 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
          <FiCalendar className="h-5 w-5 text-blue-600" />
          <div className="flex flex-col">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateInputChange}
              min={format(earliestDate, 'yyyy-MM-dd')}
              max={format(today, 'yyyy-MM-dd')}
              className="border-none outline-none bg-transparent text-gray-900 font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* 后一天按钮 */}
        <button
          onClick={handleNextDay}
          disabled={isToday}
          className={`p-3 rounded-xl border transition-all duration-200 ${
            isToday
              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
              : 'border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-sm hover:shadow-md'
          }`}
          title={isToday ? '已到今天' : '后一天'}
        >
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 日期信息和状态 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        {/* 格式化日期显示 */}
        <div className="flex items-center space-x-3">
          <div className="text-center sm:text-left">
            <div className="font-semibold text-gray-900 text-lg">
              {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
            </div>
            <div className="text-sm text-gray-500">
              {format(selectedDate, 'EEEE', { locale: zhCN })}
            </div>
          </div>
          {isToday && (
            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              <FiClock className="h-3 w-3 mr-1" />
              今天
            </span>
          )}
        </div>

        {/* 数据保留信息 */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <FiClock className="h-3 w-3" />
          <span>数据保留 {maxRetentionDays} 天</span>
        </div>
      </div>

      {/* 快速日期选择 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onDateChange(today)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
            isToday
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
          }`}
        >
          今天
        </button>
        <button
          onClick={() => onDateChange(subDays(today, 1))}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
            format(selectedDate, 'yyyy-MM-dd') === format(subDays(today, 1), 'yyyy-MM-dd')
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
          }`}
        >
          昨天
        </button>
        <button
          onClick={() => onDateChange(subDays(today, 7))}
          disabled={subDays(today, 7) < earliestDate}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
            subDays(today, 7) < earliestDate
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : format(selectedDate, 'yyyy-MM-dd') === format(subDays(today, 7), 'yyyy-MM-dd')
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
          }`}
        >
          7天前
        </button>
      </div>
    </div>
  );
}; 