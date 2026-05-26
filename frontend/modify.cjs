const fs = require('fs');
let code = fs.readFileSync('src/pages/Leaves.jsx', 'utf8');

// 1. Add ArrowUpDown import
if (!code.includes('ArrowUpDown')) {
  code = code.replace('import { Calendar as CalendarIcon, Clock', 'import { Calendar as CalendarIcon, Clock, ArrowUpDown');
}

// 2. Add SortHeader component and sorting logic
if (!code.includes('const [sortConfig')) {
  const sortLogic = `
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      key = '';
      direction = '';
    }
    setSortConfig({ key, direction });
  };

  const getSortValue = (item, key) => {
    switch(key) {
      case 'seq': return item.id;
      case 'code': return item.employee?.code || '';
      case 'name': return item.employee?.name || '';
      case 'type': return item.leaveType?.name || '';
      case 'leave_type': return item.leaveType?.name || '';
      case 'start': return item.start_date + ' ' + item.start_time;
      case 'end': return item.end_date + ' ' + item.end_time;
      case 'date': return item.date;
      case 'time': return item.start_time;
      case 'hours': return parseFloat(item.days || 0) * 8; 
      case 'reason': return item.reason || '';
      case 'status': return item.status;
      case 'carried_over': return parseFloat(item.carried_over_hours || 0);
      case 'annual': return parseFloat(item.annual_hours || 0);
      case 'total': return parseFloat(item.total_hours || 0);
      case 'used': return parseFloat(item.used_days || 0);
      case 'remaining': return parseFloat(item.remaining_days || 0);
      case 'usage': return item.total_hours ? (item.used_days * 8) / item.total_hours : 0;
      default: return '';
    }
  };

  const sortItems = (items) => {
    if (!sortConfig.key) return items;
    return [...items].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortHeader = ({ id, label, align = 'left', className = '' }) => (
    <th 
      className={\`px-4 py-2 text-\${align} border-r border-gray-300 cursor-pointer hover:bg-indigo-50 transition-colors select-none group \${className}\`}
      onClick={() => handleSort(id)}
    >
      <div className={\`flex items-center gap-1 justify-\${align === 'center' ? 'center' : 'start'}\`}>
        {label}
        {sortConfig.key === id ? (
          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-600" /> : <ChevronDown size={14} className="text-indigo-600" />
        ) : (
          <ArrowUpDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </th>
  );
`;
  code = code.replace('const [processingOtId, setProcessingOtId] = useState(null);', 'const [processingOtId, setProcessingOtId] = useState(null);\n' + sortLogic);
}

// 3. Wrap filtered arrays with sortItems()
code = code.replace(/const filteredRequests = requests.filter\(r => \{\s*const matchesStatus.*?\s*const matchesEmp.*?\s*return matchesStatus && matchesEmp;\s*\}\);/s, 
  'const filteredRequests = sortItems(requests.filter(r => {' +
  'const matchesStatus = requestStatusFilter === \'all\' || r.status === requestStatusFilter;' +
  'const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);' +
  'return matchesStatus && matchesEmp;' +
  '}));');

code = code.replace(/const filteredOvertimeRequests = overtimeRequests.filter\(r => \{\s*const matchesStatus.*?\s*const matchesEmp.*?\s*return matchesStatus && matchesEmp;\s*\}\);/s,
  'const filteredOvertimeRequests = sortItems(overtimeRequests.filter(r => {' +
  'const matchesStatus = requestStatusFilter === \'all\' || r.status === requestStatusFilter;' +
  'const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(r.employeeId);' +
  'return matchesStatus && matchesEmp;' +
  '}));');

code = code.replace(/const filteredQuotas = quotas.filter\(q => \{\s*const matchesEmp.*?\s*return matchesEmp;\s*\}\);/s,
  'const filteredQuotas = sortItems(quotas.filter(q => {' +
  'const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(q.employeeId);' +
  'return matchesEmp;' +
  '}));');

// 4. Update table headers in requests
code = code.replace(/{visibleColumns\.requests\?\.includes\('seq'\) && <th className="w-12 p-2 border-r border-gray-300 text-center">#<\/th>}/g,
  '{visibleColumns.requests?.includes(\'seq\') && <SortHeader id="seq" label="#" align="center" className="w-12" /> }');

code = code.replace(/{visibleColumns\.requests\?\.includes\('code'\) && <th className="px-4 py-2 text-left border-r border-gray-300">工號<\/th>}/g,
  '{visibleColumns.requests?.includes(\'code\') && <SortHeader id="code" label="工號" /> }');

code = code.replace(/{visibleColumns\.requests\?\.includes\('name'\) && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名<\/th>}/g,
  '{visibleColumns.requests?.includes(\'name\') && <SortHeader id="name" label="員工姓名" /> }');

code = code.replace(/{visibleColumns\.requests\?\.includes\('type'\) && <th className="px-4 py-2 text-left border-r border-gray-300">假別<\/th>}/g,
  '{visibleColumns.requests?.includes(\'type\') && <SortHeader id="type" label="假別" /> }');

code = code.replace(/{visibleColumns\.requests\?\.includes\('start'\) \|\| visibleColumns\.requests\?\.includes\('end'\) \? <th className="px-4 py-2 text-left border-r border-gray-300">請假期間 \(起 ~ 訖\)<\/th> : null}/g,
  '{visibleColumns.requests?.includes(\'start\') || visibleColumns.requests?.includes(\'end\') ? <SortHeader id="start" label="請假期間 (起 ~ 訖)" /> : null}');

code = code.replace(/{visibleColumns\.requests\?\.includes\('hours'\) && <th className="px-4 py-2 text-center border-r border-gray-300">合計時數<\/th>}/g,
  '{visibleColumns.requests?.includes(\'hours\') && <SortHeader id="hours" label="合計時數" align="center" /> }');

code = code.replace(/{visibleColumns\.requests\?\.includes\('status'\) && <th className="px-4 py-2 text-center border-r border-gray-300">審核狀態<\/th>}/g,
  '{visibleColumns.requests?.includes(\'status\') && <SortHeader id="status" label="審核狀態" align="center" /> }');

// Overtime
code = code.replace(/{visibleColumns\.overtime\?\.includes\('seq'\) && <th className="w-12 p-2 border-r border-gray-300 text-center">#<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'seq\') && <SortHeader id="seq" label="#" align="center" className="w-12" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('code'\) && <th className="px-4 py-2 text-left border-r border-gray-300">工號<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'code\') && <SortHeader id="code" label="工號" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('name'\) && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'name\') && <SortHeader id="name" label="員工姓名" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('date'\) && <th className="px-4 py-2 text-left border-r border-gray-300">日期<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'date\') && <SortHeader id="date" label="日期" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('time'\) && <th className="px-4 py-2 text-left border-r border-gray-300">申請時段<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'time\') && <SortHeader id="time" label="申請時段" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('reason'\) && <th className="px-4 py-2 text-left border-r border-gray-300">加班事由<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'reason\') && <SortHeader id="reason" label="加班事由" /> }');

code = code.replace(/{visibleColumns\.overtime\?\.includes\('status'\) && <th className="px-4 py-2 text-center border-r border-gray-300">審核狀態<\/th>}/g,
  '{visibleColumns.overtime?.includes(\'status\') && <SortHeader id="status" label="審核狀態" align="center" /> }');

// Quotas
code = code.replace(/{visibleColumns\.quotas\?\.includes\('seq'\) && <th className="w-12 p-2 border-r border-gray-300 text-center">#<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'seq\') && <SortHeader id="seq" label="#" align="center" className="w-12" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('code'\) && <th className="px-4 py-2 text-left border-r border-gray-300">工號<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'code\') && <SortHeader id="code" label="工號" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('name'\) && <th className="px-4 py-2 text-left border-r border-gray-300">員工姓名<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'name\') && <SortHeader id="name" label="員工姓名" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('leave_type'\) && <th className="px-4 py-2 text-left border-r border-gray-300">假別項目<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'leave_type\') && <SortHeader id="leave_type" label="假別項目" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('carried_over'\) && <th className="px-4 py-2 text-center border-r border-gray-300 text-orange-600 bg-orange-50\/50">結轉剩餘休假<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'carried_over\') && <SortHeader id="carried_over" label="結轉剩餘休假" align="center" className="text-orange-600 bg-orange-50/50" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('annual'\) && <th className="px-4 py-2 text-center border-r border-gray-300 text-indigo-600 bg-indigo-50\/50">本年度休假<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'annual\') && <SortHeader id="annual" label="本年度休假" align="center" className="text-indigo-600 bg-indigo-50/50" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('total'\) && <th className="px-4 py-2 text-center border-r border-gray-300">年度總額度<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'total\') && <SortHeader id="total" label="年度總額度" align="center" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('used'\) && <th className="px-4 py-2 text-center border-r border-gray-300 text-blue-600">已用時數<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'used\') && <SortHeader id="used" label="已用時數" align="center" className="text-blue-600" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('remaining'\) && <th className="px-4 py-2 text-center border-r border-gray-300 text-emerald-600">剩餘時數<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'remaining\') && <SortHeader id="remaining" label="剩餘時數" align="center" className="text-emerald-600" /> }');

code = code.replace(/{visibleColumns\.quotas\?\.includes\('usage'\) && <th className="px-4 py-2 text-center">使用率<\/th>}/g,
  '{visibleColumns.quotas?.includes(\'usage\') && <SortHeader id="usage" label="使用率" align="center" /> }');

fs.writeFileSync('src/pages/Leaves.jsx', code);
console.log('Leaves.jsx updated successfully!');
