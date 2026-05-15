// 驗證所有後端模組能正確 require，不會拋出錯誤
const checks = [
  'src/controllers/roleController',
  'src/middlewares/permissionMiddleware',
  'src/routes/roleRoutes',
  'src/controllers/employeeController',
  'src/index',
];

let allOk = true;
for (const mod of checks) {
  try {
    require('./' + mod);
    console.log('✅ OK:', mod);
  } catch (e) {
    console.error('❌ FAIL:', mod, '\n  ', e.message);
    allOk = false;
  }
}
console.log(allOk ? '\n🎉 All modules loaded successfully!' : '\n⚠️  Some modules failed to load.');
process.exit(allOk ? 0 : 1);
