// 移除全域 prisma

exports.getCalendarDays = async (req, res) => {
  const { month } = req.query; // e.g. "2023-10"
  try {
    const days = await req.db.calendarDay.findMany({
      where: month ? { date: { startsWith: month } } : undefined,
      orderBy: { date: 'asc' }
    });
    res.json(days);
  } catch (error) {
    res.status(500).json({ error: '獲取行事曆失敗' });
  }
};

exports.upsertCalendarDay = async (req, res) => {
  try {
    const { date, is_workday, description } = req.body;
    const day = await req.db.calendarDay.upsert({
      where: { date },
      update: { is_workday, description },
      create: { date, is_workday, description }
    });
    res.json(day);
  } catch (error) {
    res.status(500).json({ error: '更新行事曆失敗' });
  }
};

exports.generateMonth = async (req, res) => {
  try {
    const { year, month } = req.body; // e.g. 2023, 10
    const daysInMonth = new Date(year, month, 0).getDate();
    let created = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      const is_workday = dayOfWeek !== 0 && dayOfWeek !== 6; // 週一至週五為工作日
      
      await req.db.calendarDay.upsert({
        where: { date: dateStr },
        update: {}, // 如果已存在則不覆寫
        create: { date: dateStr, is_workday, description: is_workday ? '工作日' : '假日' }
      });
      created++;
    }
    res.json({ message: `成功產生 ${created} 天預設行事曆` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '產生行事曆失敗' });
  }
};

exports.syncGovCalendar = async (req, res) => {
  try {
    const { year } = req.params;
    const axios = require('axios');
    const url = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`;
    
    const response = await axios.get(url);
    const data = response.data;
    
    let updated = 0;
    
    for (const day of data) {
      // day.date is YYYYMMDD -> YYYY-MM-DD
      const dateStr = `${day.date.substring(0, 4)}-${day.date.substring(4, 6)}-${day.date.substring(6, 8)}`;
      const is_workday = !day.isHoliday;
      let description = day.description || '';
      
      if (is_workday && !description) description = '工作日';
      if (!is_workday && !description) description = '假日';

      await req.db.calendarDay.upsert({
        where: { date: dateStr },
        update: { is_workday, description },
        create: { date: dateStr, is_workday, description }
      });
      updated++;
    }
    
    res.json({ message: `成功同步 ${updated} 天政府行事曆` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '同步政府行事曆失敗，請確認年份是否正確' });
  }
};
