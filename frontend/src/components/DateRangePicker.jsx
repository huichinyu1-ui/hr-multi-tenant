import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateRangePicker({ startDate, endDate, onDateChange }) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  const handleApply = (start, end) => {
    setLocalStart(start);
    setLocalEnd(end);
    onDateChange(start, end);
  };

  const setShortcut = (type) => {
    const today = new Date();
    let start, end;
    
    switch (type) {
      case 'THIS_MONTH':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'LAST_MONTH':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'THIS_YEAR':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }
    
    const formatLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startStr = formatLocal(start);
    const endStr = formatLocal(end);
    handleApply(startStr, endStr);
  };

  const handleInputChange = (field, value) => {
    if (field === 'start') {
      setLocalStart(value);
      if (localEnd && value > localEnd) {
        setLocalEnd(value);
        onDateChange(value, value);
      } else {
        onDateChange(value, localEnd);
      }
    } else {
      setLocalEnd(value);
      if (localStart && value < localStart) {
        setLocalStart(value);
        onDateChange(value, value);
      } else {
        onDateChange(localStart, value);
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1 rounded-lg shadow-inner">
        <div className="flex items-center gap-1">
          <CalendarIcon size={14} className="text-gray-400 ml-1" />
          <input 
            type="date" 
            value={localStart}
            onChange={(e) => handleInputChange('start', e.target.value)}
            className="bg-transparent border-none text-xs md:text-sm font-bold text-indigo-700 focus:ring-0 py-1 pl-1 pr-0 w-28"
          />
        </div>
        <span className="text-gray-400 font-black text-xs">~</span>
        <input 
          type="date" 
          value={localEnd}
          onChange={(e) => handleInputChange('end', e.target.value)}
          className="bg-transparent border-none text-xs md:text-sm font-bold text-indigo-700 focus:ring-0 py-1 pl-1 pr-0 w-28"
        />
      </div>
      
      <div className="flex gap-1">
        <button 
          onClick={() => setShortcut('THIS_MONTH')}
          className="px-2 py-1 text-[10px] md:text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
        >
          本月
        </button>
        <button 
          onClick={() => setShortcut('LAST_MONTH')}
          className="px-2 py-1 text-[10px] md:text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
        >
          上個月
        </button>
        <button 
          onClick={() => setShortcut('THIS_YEAR')}
          className="px-2 py-1 text-[10px] md:text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
        >
          今年
        </button>
      </div>
    </div>
  );
}
