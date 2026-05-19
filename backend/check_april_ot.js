const { getCompanyClient } = require('./src/db_manager');

async function checkAprilOT() {
  const db = await getCompanyClient('TJS1');
  
  // 查詢 4 月份有加班時數的紀錄，同時撈取打卡時間與班別設定
  const records = await db.dailyRecord.findMany({
    where: {
      date: { startsWith: '2026-04' },
      OR: [
        { overtime1_mins: { gt: 0 } },
        { overtime2_mins: { gt: 0 } }
      ]
    },
    include: {
      employee: { include: { workShift: true } }
    },
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }]
  });

  console.log(`\n找到 ${records.length} 筆 4 月份有加班的紀錄：\n`);
  console.log('員工\t\t日期\t\t\t打卡\t\t\t\t班別加班起迄\t\t\t\t\t一階段(分)\t二階段(分)');
  console.log('-'.repeat(130));

  for (const r of records) {
    const shift = r.employee?.workShift;
    const otRange = shift ? `${shift.overtime_start || '--'}~${shift.overtime_end || '無上限'}` : '無班別';
    console.log(
      `${r.employee?.name || '?'}\t\t${r.date}\t\t${r.clock_in || '--'} ~ ${r.clock_out || '--'}\t\t${otRange}\t\t\t\t\t${r.overtime1_mins}\t\t${r.overtime2_mins}`
    );
  }

  // 另外顯示所有員工的班別設定
  console.log('\n\n--- 所有員工目前的班別加班設定 ---');
  const emps = await db.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { workShift: true },
    select: { name: true, code: true, workShift: true }
  });
  for (const e of emps) {
    const s = e.workShift;
    if (s) {
      console.log(`${e.name}(${e.code}): overtime_start=${s.overtime_start || '--'}, overtime_end=${s.overtime_end || '未設定'}`);
    }
  }
}

checkAprilOT().catch(console.error).finally(() => process.exit(0));
