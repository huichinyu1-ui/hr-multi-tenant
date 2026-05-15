const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const data = [
    { type: 'DEPARTMENT', label: '行政部', value: '行政部' },
    { type: 'DEPARTMENT', label: '技術部', value: '技術部' },
    { type: 'DEPARTMENT', label: '財務部', value: '財務部' },
    { type: 'DEPARTMENT', label: '業務部', value: '業務部' },
    { type: 'POSITION', label: '總經理', value: '總經理' },
    { type: 'POSITION', label: '經理', value: '經理' },
    { type: 'POSITION', label: '主管', value: '主管' },
    { type: 'POSITION', label: '專員', value: '專員' },
    { type: 'EMPLOYMENT_TYPE', label: '全職正職', value: 'FULL_TIME' },
    { type: 'EMPLOYMENT_TYPE', label: '兼職/工讀', value: 'PART_TIME' },
    { type: 'EMPLOYMENT_TYPE', label: '約聘人員', value: 'CONTRACT' },
  ];

  for (const item of data) {
    await prisma.metadata.upsert({
      where: { type_value: { type: item.type, value: item.value } },
      update: {},
      create: item
    });
  }
  console.log('Seed metadata success');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
