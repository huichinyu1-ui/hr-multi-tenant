const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('正在初始化員工帳號與權限...');
  
  const employees = await prisma.employee.findMany();
  
  for (const emp of employees) {
    const username = emp.code;
    const isFirst = (emp.id === employees[0].id);
    
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        username: username,
        role: isFirst ? 'ADMIN' : 'EMPLOYEE'
      }
    });
    console.log(`員工 ${emp.name} 帳號設為: ${username}, 角色: ${isFirst ? 'ADMIN' : 'EMPLOYEE'}`);
  }
  
  console.log('初始化完成！預設密碼均為: password123');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
