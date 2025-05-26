import React from 'react';
import { format, subDays, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';

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
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* 日期导航 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevDay}
          disabled={isEarliest}
          className={`p-2 rounded-lg border transition-colors ${
            isEarliest
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <FiChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white">
          <FiCalendar className="h-4 w-4 text-gray-500" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handleDateInputChange}
            min={format(earliestDate, 'yyyy-MM-dd')}
            max={format(today, 'yyyy-MM-dd')}
            className="border-none outline-none bg-transparent text-gray-900"
          />
        </div>

        <button
          onClick={handleNextDay}
          disabled={isToday}
          className={`p-2 rounded-lg border transition-colors ${
            isToday
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 日期信息 */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">
          {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
        </span>
        {isToday && (
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
            今天
          </span>
        )}
      </div>

      {/* 数据保留信息 */}
      <div className="text-xs text-gray-500">
        数据保留 {maxRetentionDays} 天
      </div>
    </div>
  );
}; 