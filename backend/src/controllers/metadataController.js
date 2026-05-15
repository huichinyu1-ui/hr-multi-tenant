// 移除全域 prisma
const { PrismaClient } = require('@prisma/client');

exports.getAllMetadata = async (req, res) => {
  const { type } = req.query;
  try {
    const where = type ? { type } : {};
    const metadata = await req.db.metadata.findMany({ where });
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: '獲取元數據失敗' });
  }
};

exports.createMetadata = async (req, res) => {
  const { type, label, value } = req.body;
  try {
    const metadata = await req.db.metadata.create({
      data: { type, label, value }
    });
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: '創建元數據失敗' });
  }
};

exports.updateMetadata = async (req, res) => {
  const { id } = req.params;
  const { label, value } = req.body;
  try {
    const updated = await req.db.metadata.update({
      where: { id: parseInt(id) },
      data: { label, value }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新元數據失敗' });
  }
};

exports.batchUpdateMetadata = async (req, res) => {
  const { settings } = req.body;
  try {
    for (const s of settings) {
      if (s.id) {
        await req.db.metadata.update({
          where: { id: s.id },
          data: { value: String(s.value) }
        });
      } else if (s.label) {
        // 如果沒有 ID，則根據 label 更新 (常用於 Settings.jsx)
        await req.db.metadata.updateMany({
          where: { type: 'SYSTEM_SETTING', label: s.label },
          data: { value: String(s.value) }
        });
      }
    }
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('Batch Update Error:', error);
    res.status(500).json({ error: '批次更新失敗' });
  }
};

exports.deleteMetadata = async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.metadata.delete({ where: { id: parseInt(id) } });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除元數據失敗' });
  }
};
