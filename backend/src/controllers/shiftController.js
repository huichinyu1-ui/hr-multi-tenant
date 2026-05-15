// 移除全域 prisma

exports.getAllShifts = async (req, res) => {
  try {
    const shifts = await req.db.workShift.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { id: 'asc' }
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: '獲取班別失敗' });
  }
};

exports.createShift = async (req, res) => {
  try {
    const {
      code, name, work_start, work_end,
      rest_start, rest_end,
      overtime_start,
      late_buffer_mins, punch_in_window_mins, overtime_min_unit
    } = req.body;

    const shift = await req.db.workShift.create({
      data: {
        code, name, work_start, work_end,
        rest_start: rest_start || null,
        rest_end: rest_end || null,
        overtime_start: overtime_start || null,
        late_buffer_mins: parseInt(late_buffer_mins) || 0,
        punch_in_window_mins: parseInt(punch_in_window_mins) || 240,
        overtime_min_unit: parseInt(overtime_min_unit) || 30,
      }
    });
    res.status(201).json(shift);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: '班別代碼已存在' });
    res.status(500).json({ error: '新增班別失敗' });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const {
      name, work_start, work_end,
      rest_start, rest_end,
      overtime_start,
      late_buffer_mins, punch_in_window_mins, overtime_min_unit
    } = req.body;

    const shift = await req.db.workShift.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name, work_start, work_end,
        rest_start: rest_start || null,
        rest_end: rest_end || null,
        overtime_start: overtime_start || null,
        late_buffer_mins: parseInt(late_buffer_mins) || 0,
        punch_in_window_mins: parseInt(punch_in_window_mins) || 240,
        overtime_min_unit: parseInt(overtime_min_unit) || 30,
      }
    });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: '更新班別失敗' });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    await req.db.workShift.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: '班別已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除班別失敗，請先解除指派給員工的關聯' });
  }
};
