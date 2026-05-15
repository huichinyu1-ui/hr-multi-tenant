const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const requests = await prisma.leaveRequest.findMany({ take: 5 });
  console.log('--- 原始資料檢查 ---');
  requests.forEach(req => {
    console.log(`ID: ${req.id}`);
    console.log(`Start: [${req.start_date}] Time: [${req.start_time}]`);
    console.log(`End: [${req.end_date}] Time: [${req.end_time}]`);
    
    try {
      const [sYear, sMonth, sDay] = req.start_date.split('-').map(Number);
      const [eYear, eMonth, eDay] = req.end_date.split('-').map(Number);
      const sDateObj = new Date(sYear, sMonth - 1, sDay);
      const eDateObj = new Date(eYear, eMonth - 1, eDay);
      const diffDays = Math.round((eDateObj - sDateObj) / (1000 * 60 * 60 * 24));
      
      console.log(`Parsed diffDays: ${diffDays}`);
      
      let hours = 0;
      if (diffDays === 0) {
        const sTime = (req.start_time || '08:00').split(':');
        const eTime = (req.end_time || '17:00').split(':');
        const sMin = parseInt(sTime[0]) * 60 + (parseInt(sTime[1]) || 0);
        const eMin = parseInt(eTime[0]) * 60 + (parseInt(eTime[1]) || 0);
        console.log(`sMin: ${sMin}, eMin: ${eMin}`);
        let h = (eMin - sMin) / 60;
        hours = h >= 9 ? 8 : (h > 4 ? h - 1 : h);
      } else {
        hours = (diffDays + 1) * 8;
      }
      console.log(`Calculated Hours: ${hours}`);
      console.log(`Days (Hours/8): ${hours / 8}`);
    } catch (e) {
      console.log('Calculation ERROR:', e.message);
    }
    console.log('-------------------');
  });
}

debug();
